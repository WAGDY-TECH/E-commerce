import React, { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { useStore } from '../store/AppStore'
import { DataTable, type Column } from '../components/DataTable'
import { fmtDate, fmtDateTime, daysUntil, downloadCSV } from '../lib/util'
import { ASSET_STATUSES } from '../types'

type Row = { __i: number } & Record<string, string | number>

interface ReportDef {
  id: string
  icon: string
  labelKey: string
  dateKey?: string
  build: () => { cols: { key: string; label: string }[]; rows: Record<string, string | number>[] }
}

export function ReportsPage() {
  const { t, lang } = useI18n()
  const { db, scopedAssets, scopedDepartments, can, audit, setToast } = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const assets = useMemo(() => scopedAssets(), [scopedAssets])
  const deptIds = useMemo(() => scopedDepartments(), [scopedDepartments])
  const deptName = (id?: string) => {
    const d = db.departments.find(x => x.id === id)
    return d ? (lang === 'ar' ? d.name_ar : d.name_en) : '—'
  }
  const locLabel = (id?: string) => {
    const l = db.locations.find(x => x.id === id)
    return l ? `${lang === 'ar' ? l.building_ar : l.building_en} / ${lang === 'ar' ? l.room_ar : l.room_en}` : '—'
  }
  const assetName = (id: string) => {
    const a = db.assets.find(x => x.id === id)
    return a ? `${a.asset_code} — ${lang === 'ar' ? a.name_ar : a.name_en}` : '—'
  }
  const userName = (id?: string) => {
    const u = db.users.find(x => x.id === id)
    return u ? (lang === 'ar' ? u.full_name_ar : u.full_name_en) : '—'
  }

  const OPEN = ['new', 'reviewed', 'assigned', 'in_progress', 'waiting_part', 'waiting_vendor']
  const scopedRequests = db.maintenance_requests.filter(r => deptIds.includes(r.department_id))

  const reports: ReportDef[] = [
    { id: 'allAssets', icon: '🩺', labelKey: 'reports.allAssets', build: () => ({
      cols: [
        { key: 'code', label: t('assets.code') }, { key: 'name', label: t('common.name') },
        { key: 'cat', label: t('assets.category') }, { key: 'dept', label: t('common.department') },
        { key: 'loc', label: t('common.location') }, { key: 'status', label: t('common.status') },
        { key: 'serial', label: t('assets.serial') }, { key: 'purchase', label: t('assets.purchaseDate') },
        { key: 'cost', label: t('assets.purchaseCost') },
      ],
      rows: assets.map(a => ({
        code: a.asset_code, name: lang === 'ar' ? a.name_ar : a.name_en,
        cat: (() => { const c = db.categories.find(x => x.id === a.category_id); return c ? (lang === 'ar' ? c.name_ar : c.name_en) : '' })(),
        dept: deptName(a.department_id), loc: locLabel(a.location_id),
        status: t(`assets.status.${a.status}`), serial: a.serial_number ?? '',
        purchase: fmtDate(a.purchase_date, lang), cost: a.purchase_cost ?? '',
      })),
    }) },
    { id: 'byStatus', icon: '📊', labelKey: 'reports.byStatus', build: () => ({
      cols: [{ key: 'status', label: t('common.status') }, { key: 'count', label: t('common.total') }],
      rows: ASSET_STATUSES.map(s => ({ status: t(`assets.status.${s}`), count: assets.filter(a => a.status === s).length }))
        .filter(r => Number(r.count) > 0),
    }) },
    { id: 'byDepartment', icon: '🏢', labelKey: 'reports.byDepartment', build: () => ({
      cols: [
        { key: 'dept', label: t('common.department') }, { key: 'total', label: t('common.total') },
        { key: 'active', label: t('dash.activeAssets') }, { key: 'maint', label: t('dash.underMaintenance') },
        { key: 'oos', label: t('dash.outOfService') },
      ],
      rows: deptIds.map(id => ({
        dept: deptName(id),
        total: assets.filter(a => a.department_id === id).length,
        active: assets.filter(a => a.department_id === id && ['active', 'available', 'in_use'].includes(a.status)).length,
        maint: assets.filter(a => a.department_id === id && a.status === 'in_maintenance').length,
        oos: assets.filter(a => a.department_id === id && a.status === 'out_of_service').length,
      })).filter(r => Number(r.total) > 0),
    }) },
    { id: 'byLocation', icon: '📍', labelKey: 'reports.byLocation', build: () => ({
      cols: [{ key: 'loc', label: t('common.location') }, { key: 'count', label: t('common.total') }],
      rows: db.locations.map(l => ({ loc: locLabel(l.id), count: assets.filter(a => a.location_id === l.id).length }))
        .filter(r => Number(r.count) > 0),
    }) },
    { id: 'custody', icon: '🤝', labelKey: 'reports.custody', build: () => ({
      cols: [
        { key: 'dept', label: t('common.department') }, { key: 'total', label: t('common.total') },
        { key: 'inUse', label: t('assets.status.in_use') }, { key: 'available', label: t('assets.status.available') },
      ],
      rows: deptIds.map(id => ({
        dept: deptName(id), total: assets.filter(a => a.department_id === id).length,
        inUse: assets.filter(a => a.department_id === id && a.status === 'in_use').length,
        available: assets.filter(a => a.department_id === id && a.status === 'available').length,
      })).filter(r => Number(r.total) > 0),
    }) },
    { id: 'movements', icon: '🔄', labelKey: 'reports.movements', dateKey: 'date', build: () => ({
      cols: [
        { key: 'date', label: t('common.date') }, { key: 'asset', label: t('maint.asset') },
        { key: 'action', label: t('audit.action') }, { key: 'user', label: t('common.user') },
      ],
      rows: db.movement_logs.map(m => ({
        date: fmtDateTime(m.at, lang), asset: assetName(m.asset_id),
        action: lang === 'ar' ? m.action_ar : m.action_en, user: userName(m.user_id),
      })),
    }) },
    { id: 'openRequests', icon: '📨', labelKey: 'reports.openRequests', dateKey: 'reported', build: () => ({
      cols: [
        { key: 'num', label: t('maint.requestNumber') }, { key: 'asset', label: t('maint.asset') },
        { key: 'type', label: t('maint.type') }, { key: 'priority', label: t('common.priority') },
        { key: 'status', label: t('common.status') }, { key: 'reported', label: t('maint.reportedAt') },
      ],
      rows: scopedRequests.filter(r => OPEN.includes(r.status)).map(r => ({
        num: r.request_number, asset: assetName(r.asset_id), type: t(`maint.type.${r.type}`),
        priority: t(`maint.priority.${r.priority}`), status: t(`maint.status.${r.status}`),
        reported: fmtDate(r.reported_at, lang),
      })),
    }) },
    { id: 'overdueMaintenance', icon: '⏰', labelKey: 'reports.overdueMaintenance', build: () => ({
      cols: [
        { key: 'kind', label: t('common.type') }, { key: 'ref', label: t('common.name') },
        { key: 'due', label: t('maint.dueDate') },
      ],
      rows: [
        ...db.maintenance_plans.filter(p => p.active && p.next_due && new Date(p.next_due).getTime() < Date.now())
          .map(p => ({ kind: t('maint.plans'), ref: lang === 'ar' ? p.name_ar : p.name_en, due: fmtDate(p.next_due, lang) })),
        ...scopedRequests.filter(r => OPEN.includes(r.status) && Date.now() - new Date(r.reported_at).getTime() > 7 * 86400000)
          .map(r => ({ kind: t('maint.requests'), ref: `#${r.request_number} ${assetName(r.asset_id)}`, due: fmtDate(r.reported_at, lang) })),
      ],
    }) },
    { id: 'underMaintenance', icon: '🔧', labelKey: 'reports.underMaintenance', build: () => ({
      cols: [
        { key: 'code', label: t('assets.code') }, { key: 'name', label: t('common.name') },
        { key: 'dept', label: t('common.department') }, { key: 'open', label: t('dash.openRequests') },
      ],
      rows: assets.filter(a => a.status === 'in_maintenance').map(a => ({
        code: a.asset_code, name: lang === 'ar' ? a.name_ar : a.name_en, dept: deptName(a.department_id),
        open: db.maintenance_requests.filter(r => r.asset_id === a.id && OPEN.includes(r.status)).length,
      })),
    }) },
    { id: 'outOfService', icon: '⛔', labelKey: 'reports.outOfService', build: () => ({
      cols: [
        { key: 'code', label: t('assets.code') }, { key: 'name', label: t('common.name') },
        { key: 'dept', label: t('common.department') }, { key: 'reason', label: t('maint.problem') },
      ],
      rows: assets.filter(a => a.status === 'out_of_service').map(a => ({
        code: a.asset_code, name: lang === 'ar' ? a.name_ar : a.name_en, dept: deptName(a.department_id),
        reason: db.maintenance_requests.find(r => r.asset_id === a.id)?.problem_description ?? '',
      })),
    }) },
    { id: 'lostAssets', icon: '🕵️', labelKey: 'reports.lostAssets', build: () => ({
      cols: [
        { key: 'code', label: t('assets.code') }, { key: 'name', label: t('common.name') },
        { key: 'status', label: t('common.status') }, { key: 'dept', label: t('common.department') },
      ],
      rows: assets.filter(a => a.status === 'lost' || a.status === 'stolen').map(a => ({
        code: a.asset_code, name: lang === 'ar' ? a.name_ar : a.name_en,
        status: t(`assets.status.${a.status}`), dept: deptName(a.department_id),
      })),
    }) },
    { id: 'preventive', icon: '🗓️', labelKey: 'reports.preventive', dateKey: 'reported', build: () => ({
      cols: [
        { key: 'num', label: t('maint.requestNumber') }, { key: 'asset', label: t('maint.asset') },
        { key: 'status', label: t('common.status') }, { key: 'reported', label: t('maint.reportedAt') },
      ],
      rows: scopedRequests.filter(r => r.type === 'preventive').map(r => ({
        num: r.request_number, asset: assetName(r.asset_id), status: t(`maint.status.${r.status}`),
        reported: fmtDate(r.reported_at, lang),
      })),
    }) },
    { id: 'maintenanceCost', icon: '💰', labelKey: 'reports.maintenanceCost', build: () => ({
      cols: [
        { key: 'asset', label: t('maint.asset') }, { key: 'count', label: t('common.total') },
        { key: 'hours', label: t('maint.laborHours') }, { key: 'cost', label: t('maint.cost') },
      ],
      rows: assets.map(a => {
        const wos = db.work_orders.filter(w => {
          const r = db.maintenance_requests.find(x => x.id === w.request_id)
          return r?.asset_id === a.id
        })
        return {
          asset: assetName(a.id),
          count: wos.length,
          hours: wos.reduce((s, w) => s + (w.labor_hours ?? 0), 0),
          cost: wos.reduce((s, w) => s + (w.cost ?? 0), 0),
        }
      }).filter(r => Number(r.count) > 0),
    }) },
    { id: 'calibrationDue', icon: '🎯', labelKey: 'reports.calibrationDue', build: () => ({
      cols: [
        { key: 'asset', label: t('cal.asset') }, { key: 'due', label: t('cal.dueDate') },
        { key: 'days', label: t('common.total') },
      ],
      rows: assets.filter(a => a.calibration_required && a.next_calibration_date).map(a => {
        const d = daysUntil(a.next_calibration_date) ?? 0
        return { asset: assetName(a.id), due: fmtDate(a.next_calibration_date, lang), days: d }
      }),
    }) },
    { id: 'warranties', icon: '📜', labelKey: 'reports.warranties', build: () => ({
      cols: [
        { key: 'asset', label: t('maint.asset') }, { key: 'end', label: t('assets.warrantyEnd') },
        { key: 'status', label: t('common.status') },
      ],
      rows: db.warranties.filter(w => assets.some(a => a.id === w.asset_id)).map(w => {
        const d = daysUntil(w.end_date) ?? 0
        return {
          asset: assetName(w.asset_id), end: fmtDate(w.end_date, lang),
          status: d < 0 ? t('assets.warrantyStatus.expired') : d <= 60 ? t('assets.warrantyStatus.expiring') : t('assets.warrantyStatus.active'),
        }
      }),
    }) },
    { id: 'audit', icon: '📋', labelKey: 'reports.audit', dateKey: 'date', build: () => ({
      cols: [
        { key: 'date', label: t('audit.at') }, { key: 'user', label: t('audit.user') },
        { key: 'action', label: t('audit.action') }, { key: 'entity', label: t('audit.entity') },
      ],
      rows: db.audit_logs.map(l => ({
        date: fmtDateTime(l.at, lang), user: userName(l.user_id),
        action: lang === 'ar' ? l.action_ar : l.action_en,
        entity: `${t(`entity.${l.entity_type}`)}${l.entity_id ? ` · ${l.entity_id}` : ''}`,
      })),
    }) },
  ]

  const def = reports.find(r => r.id === selected)

  const built = useMemo(() => {
    if (!def) return { cols: [] as { key: string; label: string }[], rows: [] as Row[] }
    const { cols, rows } = def.build()
    let out = rows
    if (def.dateKey && (from || to)) {
      out = out.filter(r => {
        const raw = String(r[def.dateKey!] ?? '')
        const ts = new Date(raw).getTime()
        if (Number.isNaN(ts)) return true
        if (from && ts < new Date(from).getTime()) return false
        if (to && ts > new Date(to).getTime() + 86399000) return false
        return true
      })
    }
    return { cols, rows: out.map((r, i) => ({ __i: i, ...r }) as Row) }
  }, [def, from, to, lang, db, assets])

  const columns: Column<Row>[] = built.cols.map(c => ({
    key: c.key,
    label: c.label,
    value: (r: Row) => r[c.key],
    hideable: true,
  }))

  const exportCsv = () => {
    if (!def) return
    downloadCSV(
      `${def.id}-${new Date().toISOString().slice(0, 10)}.csv`,
      built.cols.map(c => c.label),
      built.rows.map(r => built.cols.map(c => r[c.key])),
    )
    audit('تصدير تقرير', 'Export report', 'settings', def.id)
  }

  const savePrefs = () => {
    if (!def) return
    try { localStorage.setItem(`mams.rep.${def.id}`, JSON.stringify({ from, to })) } catch { /* ignore */ }
    setToast(t('reports.savedPrefs'))
  }

  if (!can('reports.view')) return null

  return (
    <div>
      <div className="page-head">
        <h1>{t('reports.title')}</h1>
        {def && (
          <div className="actions no-print">
            <button className="btn secondary" onClick={() => setSelected(null)}>{t('common.back')}</button>
            <button className="btn secondary" onClick={savePrefs}>★ {t('reports.savedPrefs')}</button>
            <button className="btn secondary" onClick={exportCsv}>⬇ {t('common.export')}</button>
            <button className="btn" onClick={() => window.print()}>🖨 {t('common.print')}</button>
          </div>
        )}
      </div>

      {!def && (
        <div className="report-list">
          {reports.map(r => (
            <div key={r.id} className="report-item" onClick={() => {
              setSelected(r.id)
              try {
                const saved = JSON.parse(localStorage.getItem(`mams.rep.${r.id}`) ?? '{}')
                setFrom(saved.from ?? '')
                setTo(saved.to ?? '')
              } catch { /* ignore */ }
            }}>
              <span className="icon">{r.icon}</span>
              <span>{t(r.labelKey)}</span>
            </div>
          ))}
        </div>
      )}

      {def && (
        <div className="card">
          <div className="page-head">
            <h3 style={{ margin: 0 }}>{def.icon} {t(def.labelKey)}</h3>
            <small style={{ color: 'var(--text-secondary)' }}>
              {t('reports.generatedAt')}: {fmtDateTime(new Date().toISOString(), lang)}
            </small>
          </div>
          {def.dateKey && (
            <div className="filter-bar no-print">
              <div className="field"><label>{t('common.from')}</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
              <div className="field"><label>{t('common.to')}</label><input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
            </div>
          )}
          <DataTable rows={built.rows} columns={columns} rowKey={(r: Row) => String(r.__i)} pageSize={15} emptyText={t('common.noResults')} />
        </div>
      )}
    </div>
  )
}
