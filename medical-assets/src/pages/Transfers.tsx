import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useStore, uid } from '../store/AppStore'
import { DataTable, type Column } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { Modal } from '../components/Modal'
import { fmtDate } from '../lib/util'
import type { TransferRequest } from '../types'

export function TransfersPage() {
  const { t, lang } = useI18n()
  const { db, currentUser, can, scopedAssets, update, setToast, logMovement, notify } = useStore()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<'requests' | 'custody'>('requests')
  const [newModal, setNewModal] = useState(params.get('new') === '1')
  const [detail, setDetail] = useState<TransferRequest | null>(null)
  const [handover, setHandover] = useState<TransferRequest | null>(null)
  const [handoverForm, setHandoverForm] = useState({ condition: '', notes: '' })
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    asset_ids: [] as string[], to_location_id: '', to_department_id: '', reason: '', proposed_date: new Date().toISOString().slice(0, 10),
  })

  const assets = useMemo(() => scopedAssets(), [scopedAssets])
  const deptName = (id?: string) => {
    const d = db.departments.find(x => x.id === id)
    return d ? (lang === 'ar' ? d.name_ar : d.name_en) : '—'
  }
  const locLabel = (id?: string) => {
    const l = db.locations.find(x => x.id === id)
    return l ? `${lang === 'ar' ? l.building_ar : l.building_en} / ${lang === 'ar' ? l.room_ar : l.room_en}` : '—'
  }

  const transfers = useMemo(() => {
    const mine = db.transfer_requests.filter(tr =>
      can('transfers.approve') ||
      tr.sent_by === currentUser?.id ||
      tr.asset_ids.some(id => assets.some(a => a.id === id)) ||
      tr.from_department_id === currentUser?.department_id)
    return [...mine].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [db.transfer_requests, currentUser, assets])

  const custody = useMemo(() => {
    return db.departments.map(d => ({
      dept: d,
      total: db.assets.filter(a => a.department_id === d.id && !a.archived_at).length,
      inUse: db.assets.filter(a => a.department_id === d.id && a.status === 'in_use').length,
      available: db.assets.filter(a => a.department_id === d.id && a.status === 'available').length,
    })).filter(c => c.total > 0)
  }, [db])

  const toggleAsset = (id: string) =>
    setForm(f => ({ ...f, asset_ids: f.asset_ids.includes(id) ? f.asset_ids.filter(x => x !== id) : [...f.asset_ids, id] }))

  const submit = () => {
    setError(null)
    if (!currentUser) return
    if (form.asset_ids.length === 0 || !form.to_location_id || !form.to_department_id || !form.reason.trim()) {
      setError(t('common.required'))
      return
    }
    const toLoc = db.locations.find(l => l.id === form.to_location_id)
    if (toLoc && !toLoc.active) { setError(t('struct.inactiveLocation')); return }
    const first = db.assets.find(a => a.id === form.asset_ids[0])
    if (!first) return
    const tr: TransferRequest = {
      id: uid('tr'),
      transfer_number: `TR-${String(db.transfer_requests.length + 1).padStart(4, '0')}`,
      asset_ids: [...form.asset_ids],
      from_location_id: first.location_id,
      to_location_id: form.to_location_id,
      from_department_id: first.department_id,
      to_department_id: form.to_department_id,
      reason: form.reason,
      proposed_date: form.proposed_date,
      sent_by: currentUser.id,
      status: 'pending_approval',
      created_at: new Date().toISOString(),
    }
    update(draft => { draft.transfer_requests.unshift(tr) }, {
      action_ar: 'إنشاء طلب تحويل', action_en: 'Create transfer request', entity_type: 'transfer_request',
      entity_id: tr.transfer_number, new_value: `${tr.asset_ids.length}`,
    })
    tr.asset_ids.forEach(id => logMovement(id, 'إنشاء طلب تحويل', 'Transfer requested', tr.transfer_number))
    notify({
      type_ar: 'طلب تحويل معلق', type_en: 'Transfer pending',
      message_ar: `طلب تحويل #${tr.transfer_number} بانتظار الموافقة`, message_en: `Transfer #${tr.transfer_number} pending approval`,
      severity: 'warning', user_id: 'all', link: '/transfers',
    })
    setToast(t('common.updated'))
    setNewModal(false)
    setForm({ asset_ids: [], to_location_id: '', to_department_id: '', reason: '', proposed_date: new Date().toISOString().slice(0, 10) })
    setParams({})
  }

  const approve = (tr: TransferRequest, ok: boolean) => {
    update(draft => {
      const target = draft.transfer_requests.find(x => x.id === tr.id)
      if (target) target.status = ok ? 'approved' : 'rejected'
    }, {
      action_ar: ok ? 'اعتماد طلب تحويل' : 'رفض طلب تحويل',
      action_en: ok ? 'Approve transfer' : 'Reject transfer',
      entity_type: 'transfer_request', entity_id: tr.transfer_number, new_value: ok ? 'approved' : 'rejected',
    })
    setDetail(null)
    setToast(t('common.updated'))
  }

  const doHandover = () => {
    if (!handover) return
    update(draft => {
      const target = draft.transfer_requests.find(x => x.id === handover.id)
      if (target) {
        target.status = 'handed_over'
        target.handover_condition = handoverForm.condition || undefined
        target.handover_notes = handoverForm.notes || undefined
        target.asset_ids.forEach(id => {
          const a = draft.assets.find(x => x.id === id)
          if (a) a.status = 'in_transfer'
        })
      }
    }, {
      action_ar: 'تسليم أصول تحويل', action_en: 'Hand over transferred assets', entity_type: 'transfer_request',
      entity_id: handover.transfer_number,
    })
    handover.asset_ids.forEach(id => logMovement(id, 'تسليم الأصل للنقل', 'Asset handed over', handover.transfer_number))
    setHandover(null)
    setHandoverForm({ condition: '', notes: '' })
    setToast(t('common.updated'))
  }

  const receive = (tr: TransferRequest) => {
    if (!currentUser) return
    update(draft => {
      const target = draft.transfer_requests.find(x => x.id === tr.id)
      if (target) {
        target.status = 'received'
        target.received_by = currentUser.id
        target.asset_ids.forEach(id => {
          const a = draft.assets.find(x => x.id === id)
          if (a) {
            a.location_id = target.to_location_id
            a.department_id = target.to_department_id
            a.status = 'available'
          }
        })
      }
    }, {
      action_ar: 'استلام أصول تحويل', action_en: 'Receive transferred assets', entity_type: 'transfer_request',
      entity_id: tr.transfer_number, new_value: locLabel(tr.to_location_id),
    })
    tr.asset_ids.forEach(id => logMovement(id, 'استلام الأصل في الموقع الجديد', 'Asset received at new location',
      `${locLabel(tr.from_location_id)} → ${locLabel(tr.to_location_id)}`))
    setDetail(null)
    setToast(t('common.updated'))
  }

  const columns: Column<TransferRequest>[] = [
    { key: 'num', label: t('tr.transferNumber'), value: r => r.transfer_number, render: r => <a onClick={e => { e.stopPropagation(); setDetail(r) }}>#{r.transfer_number}</a> },
    { key: 'assets', label: t('tr.assets'), value: r => r.asset_ids.length, render: r => {
      const first = db.assets.find(a => a.id === r.asset_ids[0])
      return <span>{first ? (lang === 'ar' ? first.name_ar : first.name_en) : '—'}{r.asset_ids.length > 1 ? ` +${r.asset_ids.length - 1}` : ''}</span>
    } },
    { key: 'from', label: t('tr.fromDept'), value: r => deptName(r.from_department_id) },
    { key: 'to', label: t('tr.toDept'), value: r => deptName(r.to_department_id) },
    { key: 'date', label: t('tr.proposedDate'), value: r => r.proposed_date, render: r => fmtDate(r.proposed_date, lang) },
    { key: 'status', label: t('common.status'), value: r => r.status, render: r => <StatusBadge kind="transfer" value={r.status} /> },
  ]

  return (
    <div>
      <div className="page-head">
        <h1>{t('tr.title')}</h1>
        <div className="actions">
          {can('transfers.create') && <button className="btn" onClick={() => setNewModal(true)}>＋ {t('tr.newRequest')}</button>}
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>{t('tr.requests')}</button>
        <button className={tab === 'custody' ? 'active' : ''} onClick={() => setTab('custody')}>{t('tr.custody')}</button>
      </div>

      {tab === 'requests' && (
        <div className="card">
          <DataTable rows={transfers} columns={columns} rowKey={r => r.id} exportBaseName="transfers" onRowClick={setDetail} />
        </div>
      )}

      {tab === 'custody' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('common.department')}</th><th>{t('common.total')}</th><th>{t('assets.status.in_use')}</th><th>{t('assets.status.available')}</th></tr></thead>
              <tbody>
                {custody.map(c => (
                  <tr key={c.dept.id}>
                    <td><strong>{lang === 'ar' ? c.dept.name_ar : c.dept.name_en}</strong></td>
                    <td>{c.total}</td>
                    <td>{c.inUse}</td>
                    <td>{c.available}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {newModal && (
        <Modal
          title={t('tr.newRequest')}
          wide
          onClose={() => { setNewModal(false); setParams({}) }}
          footer={
            <>
              <button className="btn secondary" onClick={() => { setNewModal(false); setParams({}) }}>{t('common.cancel')}</button>
              <button className="btn" onClick={submit}>{t('common.save')}</button>
            </>
          }
        >
          {error && <div className="login-error">{error}</div>}
          <div className="field" style={{ marginBottom: 12 }}>
            <label>{t('tr.assets')} <span className="req">*</span></label>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
              {assets.filter(a => !['in_transfer', 'lost', 'stolen', 'sold_disposed', 'archived'].includes(a.status)).map(a => (
                <label key={a.id} className="checkbox-row">
                  <input type="checkbox" checked={form.asset_ids.includes(a.id)} onChange={() => toggleAsset(a.id)} />
                  {a.asset_code} — {lang === 'ar' ? a.name_ar : a.name_en} ({deptName(a.department_id)})
                </label>
              ))}
            </div>
          </div>
          <div className="form-grid">
            <div className="field"><label>{t('tr.toLocation')} <span className="req">*</span></label>
              <select value={form.to_location_id} onChange={e => {
                const loc = db.locations.find(l => l.id === e.target.value)
                setForm(f => ({ ...f, to_location_id: e.target.value, to_department_id: loc?.department_id ?? f.to_department_id }))
              }}>
                <option value="">{t('common.select')}</option>
                {db.locations.map(l => <option key={l.id} value={l.id}>{locLabel(l.id)}{!l.active ? ` (${t('struct.inactiveLocation')})` : ''}</option>)}
              </select></div>
            <div className="field"><label>{t('tr.toDept')} <span className="req">*</span></label>
              <select value={form.to_department_id} onChange={e => setForm(f => ({ ...f, to_department_id: e.target.value }))}>
                <option value="">{t('common.select')}</option>
                {db.departments.map(d => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en}</option>)}
              </select></div>
            <div className="field"><label>{t('tr.proposedDate')}</label>
              <input type="date" value={form.proposed_date} onChange={e => setForm(f => ({ ...f, proposed_date: e.target.value }))} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>{t('tr.reason')} <span className="req">*</span></label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal
          title={`#${detail.transfer_number}`}
          wide
          onClose={() => setDetail(null)}
          footer={
            <>
              <button className="btn secondary" onClick={() => setDetail(null)}>{t('common.close')}</button>
              {detail.status === 'pending_approval' && can('transfers.approve') && (
                <>
                  <button className="btn danger" onClick={() => approve(detail, false)}>{t('common.reject')}</button>
                  <button className="btn success" onClick={() => approve(detail, true)}>{t('common.approve')}</button>
                </>
              )}
              {detail.status === 'approved' && (can('transfers.approve') || can('transfers.create')) && (
                <button className="btn" onClick={() => setHandover(detail)}>{t('tr.handover')}</button>
              )}
              {detail.status === 'handed_over' && can('transfers.approve') && (
                <button className="btn success" onClick={() => receive(detail)}>{t('tr.receive')}</button>
              )}
            </>
          }
        >
          <div className="detail-grid" style={{ marginBottom: 14 }}>
            <div className="item"><div className="k">{t('tr.fromLocation')}</div><div className="v">{locLabel(detail.from_location_id)}</div></div>
            <div className="item"><div className="k">{t('tr.toLocation')}</div><div className="v">{locLabel(detail.to_location_id)}</div></div>
            <div className="item"><div className="k">{t('tr.fromDept')}</div><div className="v">{deptName(detail.from_department_id)}</div></div>
            <div className="item"><div className="k">{t('tr.toDept')}</div><div className="v">{deptName(detail.to_department_id)}</div></div>
            <div className="item"><div className="k">{t('tr.proposedDate')}</div><div className="v">{fmtDate(detail.proposed_date, lang)}</div></div>
            <div className="item"><div className="k">{t('tr.sentBy')}</div><div className="v">{(() => { const u = db.users.find(x => x.id === detail.sent_by); return u ? (lang === 'ar' ? u.full_name_ar : u.full_name_en) : '—' })()}</div></div>
            <div className="item"><div className="k">{t('common.status')}</div><div className="v"><StatusBadge kind="transfer" value={detail.status} /></div></div>
            {detail.handover_condition && <div className="item"><div className="k">{t('tr.handoverCondition')}</div><div className="v">{detail.handover_condition}</div></div>}
            {detail.handover_notes && <div className="item"><div className="k">{t('tr.handoverNotes')}</div><div className="v">{detail.handover_notes}</div></div>}
          </div>
          <div className="field"><label>{t('tr.reason')}</label><div>{detail.reason}</div></div>
          <h3 style={{ marginTop: 14 }}>{t('tr.assets')}</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('assets.code')}</th><th>{t('common.name')}</th><th>{t('common.status')}</th></tr></thead>
              <tbody>
                {detail.asset_ids.map(aid => {
                  const a = db.assets.find(x => x.id === aid)
                  if (!a) return null
                  return (
                    <tr key={aid}>
                      <td>{a.asset_code}</td>
                      <td>{lang === 'ar' ? a.name_ar : a.name_en}</td>
                      <td><StatusBadge kind="asset" value={a.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {handover && (
        <Modal
          title={t('tr.confirmHandover')}
          onClose={() => setHandover(null)}
          footer={
            <>
              <button className="btn secondary" onClick={() => setHandover(null)}>{t('common.cancel')}</button>
              <button className="btn" onClick={doHandover}>{t('tr.handover')}</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>{t('tr.handoverCondition')}</label>
              <input value={handoverForm.condition} onChange={e => setHandoverForm(f => ({ ...f, condition: e.target.value }))} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>{t('tr.handoverNotes')}</label>
              <textarea value={handoverForm.notes} onChange={e => setHandoverForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
