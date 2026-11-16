import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { useI18n } from '../i18n'
import { useStore } from '../store/AppStore'
import { StatusBadge } from '../components/StatusBadge'
import { fmtDate, fmtDateTime, fmtMoney, daysUntil } from '../lib/util'
import type { Asset } from '../types'

export function AssetDetailsPage() {
  const { t, lang } = useI18n()
  const { db, can, update, setToast, logMovement, notify } = useStore()
  const navigate = useNavigate()
  const { id } = useParams()
  const asset = db.assets.find(a => a.id === id)
  const [tab, setTab] = useState('info')
  const [qr, setQr] = useState<string>('')

  const nameOf = (a: Asset) => (lang === 'ar' ? a.name_ar : a.name_en)

  useEffect(() => {
    if (!asset) return
    const link = `${window.location.href.split('#')[0]}#/assets/${asset.id}`
    QRCode.toDataURL(link, { width: 160, margin: 1 })
      .then(setQr)
      .catch(() => setQr(''))
  }, [asset?.id])

  if (!asset) {
    return <div className="card"><div className="empty-state">{t('common.noResults')}</div></div>
  }

  const dept = db.departments.find(d => d.id === asset.department_id)
  const loc = db.locations.find(l => l.id === asset.location_id)
  const cat = db.categories.find(c => c.id === asset.category_id)
  const sup = db.suppliers.find(s => s.id === asset.supplier_id)
  const assignee = db.users.find(u => u.id === asset.assigned_to)

  const changeStatus = (status: string) => {
    const old = asset.status
    update(draft => {
      const a = draft.assets.find(x => x.id === asset.id)
      if (a) a.status = status as Asset['status']
    }, {
      action_ar: 'تغيير حالة الأصل', action_en: 'Change asset status', entity_type: 'asset',
      entity_id: asset.asset_code, old_value: old, new_value: status,
    })
    logMovement(asset.id, `تغيير الحالة: ${old} ← ${status}`, `Status changed: ${old} → ${status}`)
    setToast(t('common.updated'))
  }

  const markLost = () => {
    if (!confirm(t('common.confirm'))) return
    changeStatus('lost')
    notify({
      type_ar: 'أصل مفقود', type_en: 'Lost asset',
      message_ar: `تم الإبلاغ عن فقدان الأصل ${asset.asset_code}`, message_en: `Asset ${asset.asset_code} reported lost`,
      severity: 'danger', user_id: 'all', link: `/assets/${asset.id}`,
    })
  }

  const toggleArchive = () => {
    if (asset.archived_at) {
      if (!confirm(t('common.confirm'))) return
      update(draft => {
        const a = draft.assets.find(x => x.id === asset.id)
        if (a) delete a.archived_at
      }, { action_ar: 'استعادة أصل من الأرشيف', action_en: 'Restore asset from archive', entity_type: 'asset', entity_id: asset.asset_code })
    } else {
      if (!confirm(t('common.confirmArchive'))) return
      update(draft => {
        const a = draft.assets.find(x => x.id === asset.id)
        if (a) a.archived_at = new Date().toISOString()
      }, { action_ar: 'أرشفة أصل', action_en: 'Archive asset', entity_type: 'asset', entity_id: asset.asset_code })
    }
    setToast(t('common.updated'))
  }

  const requests = db.maintenance_requests.filter(r => r.asset_id === asset.id)
  const cals = db.calibration_records.filter(c => c.asset_id === asset.id)
  const movements = db.movement_logs.filter(m => m.asset_id === asset.id)
  const changes = db.audit_logs.filter(l => l.entity_type === 'asset' && l.entity_id === asset.asset_code)
  const warranties = db.warranties.filter(w => w.asset_id === asset.id)
  const contracts = db.contracts.filter(c => c.asset_ids.includes(asset.id))

  const Item = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="item"><div className="k">{k}</div><div className="v">{v}</div></div>
  )

  const wDays = daysUntil(asset.warranty_end_date)
  const cDays = daysUntil(asset.next_calibration_date)

  return (
    <div>
      <div className="breadcrumbs no-print"><a onClick={() => navigate('/assets')}>{t('assets.title')}</a> / {asset.asset_code}</div>
      <div className="page-head">
        <h1>{nameOf(asset)} <StatusBadge kind="asset" value={asset.status} /></h1>
        <div className="actions no-print">
          {can('assets.edit') && <button className="btn" onClick={() => navigate(`/assets/${asset.id}/edit`)}>{t('assets.edit')}</button>}
          {can('maintenance.create') && <button className="btn secondary" onClick={() => navigate('/maintenance?new=1')}>{t('maint.newRequest')}</button>}
          {can('transfers.create') && <button className="btn secondary" onClick={() => navigate('/transfers?new=1')}>{t('tr.newRequest')}</button>}
          {can('assets.edit') && <button className="btn secondary" onClick={markLost}>{t('assets.markLost')}</button>}
          {can('assets.edit') && <button className="btn danger" onClick={() => changeStatus('out_of_service')}>{t('assets.markOOS')}</button>}
          {can('assets.archive') && <button className="btn secondary" onClick={toggleArchive}>{asset.archived_at ? t('common.restore') : t('common.archive')}</button>}
        </div>
      </div>

      <div className="tabs no-print">
        <button className={tab === 'info' ? 'active' : ''} onClick={() => setTab('info')}>{t('assets.tab.info')}</button>
        <button className={tab === 'maintenance' ? 'active' : ''} onClick={() => setTab('maintenance')}>{t('assets.tab.maintenance')}</button>
        <button className={tab === 'calibration' ? 'active' : ''} onClick={() => setTab('calibration')}>{t('assets.tab.calibration')}</button>
        <button className={tab === 'movement' ? 'active' : ''} onClick={() => setTab('movement')}>{t('assets.tab.movement')}</button>
        <button className={tab === 'changes' ? 'active' : ''} onClick={() => setTab('changes')}>{t('assets.tab.changes')}</button>
        <button className={tab === 'documents' ? 'active' : ''} onClick={() => setTab('documents')}>{t('assets.tab.documents')}</button>
      </div>

      {tab === 'info' && (
        <div className="two-col">
          <div className="card">
            <div className="asset-image" style={{ width: '100%' }}>
              {asset.image_url
                ? <img src={asset.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
                : '🩻'}
            </div>
            {qr && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <img src={qr} alt="QR" width={160} style={{ borderRadius: 8, border: '1px solid var(--border)' }} />
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{asset.asset_code}</div>
              </div>
            )}
          </div>
          <div className="card">
            <div className="detail-grid">
              <Item k={t('assets.code')} v={asset.asset_code} />
              <Item k={t('assets.serial')} v={asset.serial_number ?? '—'} />
              <Item k={t('assets.nameAr')} v={asset.name_ar} />
              <Item k={t('assets.nameEn')} v={asset.name_en} />
              <Item k={t('assets.category')} v={cat ? (lang === 'ar' ? cat.name_ar : cat.name_en) : '—'} />
              <Item k={t('assets.brand')} v={asset.brand ?? '—'} />
              <Item k={t('assets.model')} v={asset.model ?? '—'} />
              <Item k={t('common.department')} v={dept ? (lang === 'ar' ? dept.name_ar : dept.name_en) : '—'} />
              <Item k={t('common.location')} v={loc ? `${lang === 'ar' ? loc.building_ar : loc.building_en} / ${lang === 'ar' ? loc.room_ar : loc.room_en}` : '—'} />
              <Item k={t('assets.assignedTo')} v={assignee ? (lang === 'ar' ? assignee.full_name_ar : assignee.full_name_en) : '—'} />
              <Item k={t('assets.riskLevel')} v={<StatusBadge kind="priority" value={asset.risk_level} />} />
              <Item k={t('assets.clinicalUse')} v={asset.clinical_use ? t('common.yes') : t('common.no')} />
              <Item k={t('assets.calibrationRequired')} v={asset.calibration_required ? t('common.yes') : t('common.no')} />
              <Item k={t('assets.purchaseDate')} v={fmtDate(asset.purchase_date, lang)} />
              <Item k={t('assets.purchaseCost')} v={fmtMoney(asset.purchase_cost, asset.currency)} />
              <Item k={t('assets.poNumber')} v={asset.po_number ?? '—'} />
              <Item k={t('assets.supplier')} v={sup ? (lang === 'ar' ? sup.name_ar : sup.name_en) : '—'} />
              <Item k={t('assets.warrantyEnd')} v={asset.warranty_end_date ? (
                <span className={`badge ${wDays !== null && wDays < 0 ? 'red' : wDays !== null && wDays <= 60 ? 'amber' : 'green'}`}>
                  {fmtDate(asset.warranty_end_date, lang)}{wDays !== null && wDays < 0 ? ` · ${t('assets.warrantyStatus.expired')}` : ''}
                </span>
              ) : '—'} />
              <Item k={t('assets.nextCalibration')} v={asset.next_calibration_date ? (
                <span className={`badge ${cDays !== null && cDays < 0 ? 'red' : cDays !== null && cDays <= 30 ? 'amber' : 'gray'}`}>{fmtDate(asset.next_calibration_date, lang)}</span>
              ) : '—'} />
              <Item k={t('assets.maintenanceInterval')} v={asset.maintenance_interval_days ? `${asset.maintenance_interval_days}` : '—'} />
              <Item k={t('assets.costCenter')} v={asset.cost_center ?? '—'} />
              <Item k={t('assets.safetyReq')} v={asset.safety_requirements ?? '—'} />
              <Item k={t('common.description')} v={asset.description ?? '—'} />
            </div>
          </div>
        </div>
      )}

      {tab === 'maintenance' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('maint.requestNumber')}</th><th>{t('maint.type')}</th><th>{t('common.status')}</th><th>{t('common.priority')}</th><th>{t('maint.reportedAt')}</th></tr></thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td>#{r.request_number}</td>
                    <td>{t(`maint.type.${r.type}`)}</td>
                    <td><StatusBadge kind="request" value={r.status} /></td>
                    <td><StatusBadge kind="priority" value={r.priority} /></td>
                    <td>{fmtDate(r.reported_at, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && <div className="empty-state">{t('common.noResults')}</div>}
          </div>
        </div>
      )}

      {tab === 'calibration' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('cal.checkType')}</th><th>{t('cal.result')}</th><th>{t('cal.performedAt')}</th><th>{t('cal.dueDate')}</th><th>{t('cal.certificateNumber')}</th></tr></thead>
              <tbody>
                {cals.map(c => (
                  <tr key={c.id}>
                    <td>{c.check_type}</td>
                    <td><StatusBadge kind="calibration" value={c.result} /></td>
                    <td>{fmtDate(c.performed_at, lang)}</td>
                    <td>{fmtDate(c.due_date, lang)}</td>
                    <td>{c.certificate_number ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cals.length === 0 && <div className="empty-state">{t('common.noResults')}</div>}
          </div>
        </div>
      )}

      {tab === 'movement' && (
        <div className="card">
          <ul className="timeline">
            {movements.map(m => {
              const user = db.users.find(u => u.id === m.user_id)
              return (
                <li key={m.id}>
                  <div>{lang === 'ar' ? m.action_ar : m.action_en}{m.details ? ` · ${m.details}` : ''}</div>
                  <div className="when">{user ? (lang === 'ar' ? user.full_name_ar : user.full_name_en) : ''} · {fmtDateTime(m.at, lang)}</div>
                </li>
              )
            })}
          </ul>
          {movements.length === 0 && <div className="empty-state">{t('common.noResults')}</div>}
        </div>
      )}

      {tab === 'changes' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('audit.at')}</th><th>{t('audit.user')}</th><th>{t('audit.action')}</th><th>{t('audit.oldValue')}</th><th>{t('audit.newValue')}</th></tr></thead>
              <tbody>
                {changes.map(c => {
                  const user = db.users.find(u => u.id === c.user_id)
                  return (
                    <tr key={c.id}>
                      <td>{fmtDateTime(c.at, lang)}</td>
                      <td>{user ? (lang === 'ar' ? user.full_name_ar : user.full_name_en) : c.user_id}</td>
                      <td>{lang === 'ar' ? c.action_ar : c.action_en}</td>
                      <td>{c.old_value ?? '—'}</td>
                      <td>{c.new_value ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {changes.length === 0 && <div className="empty-state">{t('common.noResults')}</div>}
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="card">
          <h3>{t('vend.warranties')}</h3>
          {warranties.map(w => (
            <div className="stat-mini" key={w.id}>
              <span>{w.warranty_number ?? w.id}</span>
              <span>{fmtDate(w.start_date, lang)} → {fmtDate(w.end_date, lang)}</span>
            </div>
          ))}
          {warranties.length === 0 && <div className="empty-state">{t('common.noResults')}</div>}
          <h3 style={{ marginTop: 16 }}>{t('vend.contracts')}</h3>
          {contracts.map(c => (
            <div className="stat-mini" key={c.id}>
              <span>{c.contract_number}</span>
              <span>{fmtDate(c.start_date, lang)} → {fmtDate(c.end_date, lang)}</span>
            </div>
          ))}
          {contracts.length === 0 && <div className="empty-state">{t('common.noResults')}</div>}
        </div>
      )}
    </div>
  )
}
