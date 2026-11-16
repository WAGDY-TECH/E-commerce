import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useStore, uid } from '../store/AppStore'
import { DataTable, type Column } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { Modal } from '../components/Modal'
import { fmtDate, daysUntil } from '../lib/util'
import { CALIBRATION_RESULTS, type CalibrationRecord } from '../types'

export function CalibrationPage() {
  const { t, lang } = useI18n()
  const { db, currentUser, can, scopedAssets, update, setToast, logMovement, notify } = useStore()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<'records' | 'due' | 'expired'>(params.get('due') === '1' ? 'due' : 'records')
  const [modal, setModal] = useState(false)
  const [filterResult, setFilterResult] = useState('')

  const assets = useMemo(() => scopedAssets(), [scopedAssets])
  const nameOf = (assetId: string) => {
    const a = db.assets.find(x => x.id === assetId)
    return a ? `${a.asset_code} — ${lang === 'ar' ? a.name_ar : a.name_en}` : '—'
  }

  const records = useMemo(
    () => db.calibration_records
      .filter(c => assets.some(a => a.id === c.asset_id))
      .sort((a, b) => b.performed_at.localeCompare(a.performed_at)),
    [db.calibration_records, assets],
  )
  const filtered = filterResult ? records.filter(r => r.result === filterResult) : records

  const reminders = db.settings.calibration_reminders ?? [90, 30, 7, 0]
  const maxReminder = Math.max(...reminders, 30)
  const dueSoon = assets.filter(a => {
    if (!a.calibration_required || !a.next_calibration_date) return false
    const d = daysUntil(a.next_calibration_date)
    return d !== null && d >= 0 && d <= maxReminder
  }).sort((a, b) => (a.next_calibration_date ?? '').localeCompare(b.next_calibration_date ?? ''))
  const expired = assets.filter(a => {
    if (!a.calibration_required || !a.next_calibration_date) return false
    return (daysUntil(a.next_calibration_date) ?? 1) < 0
  })
  const expiredCerts = records.filter(r => r.due_date && (daysUntil(r.due_date) ?? 1) < 0)

  const [form, setForm] = useState({
    asset_id: '', check_type: 'periodic', performed_by: currentUser ? (lang === 'ar' ? currentUser.full_name_ar : currentUser.full_name_en) : '',
    certificate_number: '', performed_at: new Date().toISOString().slice(0, 10), due_date: '', result: 'pass', measurement_range: '', notes: '',
  })

  const save = () => {
    if (!form.asset_id || !currentUser) return
    const rec: CalibrationRecord = {
      id: uid('cal'),
      asset_id: form.asset_id,
      check_type: form.check_type,
      performed_by: form.performed_by || (lang === 'ar' ? currentUser.full_name_ar : currentUser.full_name_en),
      certificate_number: form.certificate_number || undefined,
      performed_at: form.performed_at,
      due_date: form.due_date || undefined,
      result: form.result as CalibrationRecord['result'],
      measurement_range: form.measurement_range || undefined,
      notes: form.notes || undefined,
    }
    update(draft => {
      draft.calibration_records.unshift(rec)
      const a = draft.assets.find(x => x.id === form.asset_id)
      if (a && form.due_date) a.next_calibration_date = form.due_date
    }, {
      action_ar: 'تسجيل معايرة', action_en: 'Record calibration', entity_type: 'calibration',
      entity_id: nameOf(form.asset_id), new_value: t(`cal.result.${form.result}`),
    })
    logMovement(form.asset_id, 'تسجيل فحص معايرة', 'Calibration recorded', t(`cal.result.${form.result}`))
    const d = daysUntil(form.due_date)
    if (d !== null && d <= 30) {
      notify({
        type_ar: 'معايرة مستحقة', type_en: 'Calibration due',
        message_ar: `المعايرة التالية للأصل ${nameOf(form.asset_id)} بعد ${d} يومًا`,
        message_en: `Next calibration for ${nameOf(form.asset_id)} in ${d} days`,
        severity: d <= 7 ? 'warning' : 'info', user_id: 'all', link: '/calibration',
      })
    }
    setToast(t('common.updated'))
    setModal(false)
    setForm(f => ({ ...f, asset_id: '', certificate_number: '', due_date: '', notes: '', measurement_range: '' }))
  }

  const columns: Column<CalibrationRecord>[] = [
    { key: 'asset', label: t('cal.asset'), value: r => nameOf(r.asset_id) },
    { key: 'type', label: t('cal.checkType'), value: r => r.check_type },
    { key: 'result', label: t('cal.result'), value: r => r.result, render: r => <StatusBadge kind="calibration" value={r.result} /> },
    { key: 'performed', label: t('cal.performedAt'), value: r => r.performed_at, render: r => fmtDate(r.performed_at, lang) },
    { key: 'due', label: t('cal.dueDate'), value: r => r.due_date ?? '', render: r => {
      const d = daysUntil(r.due_date)
      if (d === null) return '—'
      return <span className={`badge ${d < 0 ? 'red' : d <= 30 ? 'amber' : 'green'}`}>{fmtDate(r.due_date, lang)}</span>
    } },
    { key: 'cert', label: t('cal.certificateNumber'), value: r => r.certificate_number ?? '', hideable: true },
    { key: 'by', label: t('cal.performedBy'), value: r => r.performed_by, hideable: true },
  ]

  return (
    <div>
      <div className="page-head">
        <h1>{t('cal.title')}</h1>
        <div className="actions">
          {can('calibration.record') && <button className="btn" onClick={() => setModal(true)}>＋ {t('cal.addRecord')}</button>}
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => setTab('records')}><div className="kpi-label"><span>{t('cal.records')}</span><span>🎯</span></div><div className="kpi-value">{records.length}</div></div>
        <div className="kpi-card alert-amber" onClick={() => setTab('due')}><div className="kpi-label"><span>{t('cal.dueSoon')}</span><span>⏰</span></div><div className="kpi-value">{dueSoon.length}</div></div>
        <div className="kpi-card alert-red" onClick={() => setTab('expired')}><div className="kpi-label"><span>{t('cal.expiredCerts')}</span><span>⛔</span></div><div className="kpi-value">{expiredCerts.length}</div></div>
      </div>

      <div className="tabs">
        <button className={tab === 'records' ? 'active' : ''} onClick={() => setTab('records')}>{t('cal.periodicResults')}</button>
        <button className={tab === 'due' ? 'active' : ''} onClick={() => setTab('due')}>{t('cal.dueSoon')}</button>
        <button className={tab === 'expired' ? 'active' : ''} onClick={() => setTab('expired')}>{t('cal.expiredCerts')}</button>
      </div>

      {tab === 'records' && (
        <div className="card">
          <div className="filter-bar">
            <div className="field">
              <select value={filterResult} onChange={e => setFilterResult(e.target.value)}>
                <option value="">{t('cal.result')}</option>
                {CALIBRATION_RESULTS.map(r => <option key={r} value={r}>{t(`cal.result.${r}`)}</option>)}
              </select>
            </div>
          </div>
          <DataTable rows={filtered} columns={columns} rowKey={r => r.id} exportBaseName="calibration-records" />
        </div>
      )}

      {tab === 'due' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('cal.asset')}</th><th>{t('cal.dueDate')}</th><th>{t('common.status')}</th><th></th></tr></thead>
              <tbody>
                {dueSoon.map(a => {
                  const d = daysUntil(a.next_calibration_date) ?? 0
                  return (
                    <tr key={a.id}>
                      <td>{nameOf(a.id)}</td>
                      <td>{fmtDate(a.next_calibration_date, lang)}</td>
                      <td><span className={`badge ${d <= 7 ? 'red' : 'amber'}`}>{d}</span></td>
                      <td>{can('calibration.record') && <button className="btn sm secondary" onClick={() => { setForm(f => ({ ...f, asset_id: a.id })); setModal(true) }}>{t('cal.addRecord')}</button>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {dueSoon.length === 0 && <div className="empty-state">{t('common.noResults')}</div>}
          </div>
        </div>
      )}

      {tab === 'expired' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('cal.asset')}</th><th>{t('cal.dueDate')}</th><th>{t('common.status')}</th><th></th></tr></thead>
              <tbody>
                {expired.map(a => (
                  <tr key={a.id}>
                    <td>{nameOf(a.id)}</td>
                    <td>{fmtDate(a.next_calibration_date, lang)}</td>
                    <td><span className="badge red">{t('assets.calibrationStatus.due')}</span></td>
                    <td>{can('calibration.record') && <button className="btn sm" onClick={() => { setForm(f => ({ ...f, asset_id: a.id })); setModal(true) }}>{t('cal.addRecord')}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expired.length === 0 && <div className="empty-state">{t('common.noResults')}</div>}
          </div>
        </div>
      )}

      {modal && (
        <Modal
          title={t('cal.addRecord')}
          wide
          onClose={() => { setModal(false); setParams({}) }}
          footer={
            <>
              <button className="btn secondary" onClick={() => setModal(false)}>{t('common.cancel')}</button>
              <button className="btn" onClick={save} disabled={!form.asset_id}>{t('common.save')}</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field"><label>{t('cal.asset')} <span className="req">*</span></label>
              <select value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))}>
                <option value="">{t('common.select')}</option>
                {assets.filter(a => a.calibration_required).map(a => <option key={a.id} value={a.id}>{a.asset_code} — {lang === 'ar' ? a.name_ar : a.name_en}</option>)}
              </select></div>
            <div className="field"><label>{t('cal.checkType')}</label>
              <input value={form.check_type} onChange={e => setForm(f => ({ ...f, check_type: e.target.value }))} /></div>
            <div className="field"><label>{t('cal.performedBy')}</label>
              <input value={form.performed_by} onChange={e => setForm(f => ({ ...f, performed_by: e.target.value }))} /></div>
            <div className="field"><label>{t('cal.certificateNumber')}</label>
              <input value={form.certificate_number} onChange={e => setForm(f => ({ ...f, certificate_number: e.target.value }))} /></div>
            <div className="field"><label>{t('cal.performedAt')}</label>
              <input type="date" value={form.performed_at} onChange={e => setForm(f => ({ ...f, performed_at: e.target.value }))} /></div>
            <div className="field"><label>{t('cal.dueDate')}</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            <div className="field"><label>{t('cal.result')}</label>
              <select value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))}>
                {CALIBRATION_RESULTS.map(r => <option key={r} value={r}>{t(`cal.result.${r}`)}</option>)}
              </select></div>
            <div className="field"><label>{t('cal.range')}</label>
              <input value={form.measurement_range} onChange={e => setForm(f => ({ ...f, measurement_range: e.target.value }))} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>{t('common.notes')}</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
