import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useStore } from '../store/AppStore'
import { StatusBadge } from '../components/StatusBadge'
import { fmtDate, fmtDateTime, daysUntil } from '../lib/util'
import type { Asset } from '../types'

type PeriodKey = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

const OPEN_REQUEST: string[] = ['new', 'reviewed', 'assigned', 'in_progress', 'waiting_part', 'waiting_vendor']
const ACTIVE_ASSET: string[] = ['active', 'available', 'in_use']

function periodStart(p: PeriodKey, customFrom: string): number {
  if (p === 'custom' && customFrom) return new Date(customFrom).getTime()
  const now = new Date()
  if (p === 'today') return new Date(now.toDateString()).getTime()
  const ms = { week: 7, month: 30, quarter: 90, year: 365 }[p as 'week' | 'month' | 'quarter' | 'year'] ?? 30
  return Date.now() - ms * 86400000
}

function BarChart({ data }: { data: { label: string; value: number; tone?: string }[] }) {
  const max = Math.max(1, ...data.map(d => d.value))
  return (
    <div className="bar-chart">
      {data.map(d => (
        <div className="bar-row" key={d.label}>
          <span>{d.label}</span>
          <div className="bar-track"><div className={`bar-fill ${d.tone ?? ''}`} style={{ width: `${(d.value / max) * 100}%` }} /></div>
          <span>{d.value}</span>
        </div>
      ))}
    </div>
  )
}

function Trend({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.value))
  return (
    <div className="trend-wrap">
      <div className="trend-chart">
        {data.map(d => (
          <div key={d.label} className="col" style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }} title={`${d.label}: ${d.value}`}>
            <span>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { t, lang } = useI18n()
  const { db, can, scopedAssets, scopedDepartments } = useStore()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<PeriodKey>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const assets = useMemo(() => scopedAssets(), [scopedAssets])
  const deptIds = useMemo(() => scopedDepartments(), [scopedDepartments])
  const inScopeDept = (d?: string) => !!d && deptIds.includes(d)

  const fromTs = periodStart(period, customFrom)
  const toTs = period === 'custom' && customTo ? new Date(customTo).getTime() + 86399000 : Infinity

  const requests = useMemo(
    () => db.maintenance_requests.filter(r => inScopeDept(r.department_id)),
    [db.maintenance_requests, deptIds],
  )
  const periodRequests = requests.filter(r => {
    const ts = new Date(r.reported_at).getTime()
    return ts >= fromTs && ts <= toTs
  })

  const nameOf = (a: Asset) => (lang === 'ar' ? a.name_ar : a.name_en)

  const openRequests = requests.filter(r => OPEN_REQUEST.includes(r.status))
  const overduePlans = db.maintenance_plans.filter(p => p.active && p.next_due && new Date(p.next_due).getTime() < Date.now())
  const calDueSoon = assets.filter(a => {
    if (!a.calibration_required || !a.next_calibration_date) return false
    const d = daysUntil(a.next_calibration_date)
    return d !== null && d <= 30
  })
  const warrantiesExpiring = db.warranties.filter(w => {
    const d = daysUntil(w.end_date)
    return d !== null && d <= 60 && assets.some(a => a.id === w.asset_id)
  })

  const byStatus = useMemo(() => {
    const map = new Map<string, number>()
    assets.forEach(a => map.set(a.status, (map.get(a.status) ?? 0) + 1))
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ label: t(`assets.status.${k}`), value: v, tone: ['lost', 'stolen', 'out_of_service'].includes(k) ? 'bad' : ['in_maintenance', 'temporarily_stopped'].includes(k) ? 'warn' : '' }))
  }, [assets, lang])

  const byDepartment = useMemo(() => {
    return deptIds
      .map(id => {
        const dept = db.departments.find(d => d.id === id)
        return { label: dept ? (lang === 'ar' ? dept.name_ar : dept.name_en) : id, value: assets.filter(a => a.department_id === id).length }
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [deptIds, assets, lang])

  const trend = useMemo(() => {
    const months: { label: string; value: number }[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const count = periodRequests.filter(r => {
        const ts = new Date(r.reported_at).getTime()
        return ts >= d.getTime() && ts < next.getTime()
      }).length
      months.push({ label: d.toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en', { month: 'short' }), value: count })
    }
    return months
  }, [periodRequests, lang])

  const needsAttention = useMemo(() => {
    const out: { asset: Asset; reason: string; cls: string }[] = []
    assets.forEach(a => {
      if (a.calibration_required && a.next_calibration_date) {
        const d = daysUntil(a.next_calibration_date)
        if (d !== null && d <= 30) out.push({ asset: a, reason: t('assets.calibrationStatus.due'), cls: 'amber' })
      }
      if (a.warranty_end_date) {
        const d = daysUntil(a.warranty_end_date)
        if (d !== null && d < 0) out.push({ asset: a, reason: t('assets.warrantyStatus.expired'), cls: 'red' })
      }
      if (['lost', 'stolen', 'out_of_service'].includes(a.status)) {
        out.push({ asset: a, reason: t(`assets.status.${a.status}`), cls: 'red' })
      }
    })
    return out.slice(0, 8)
  }, [assets, lang])

  const upcoming = useMemo(() => {
    const events: { when: string; label: string; asset: string }[] = []
    const horizon = Date.now() + 45 * 86400000
    assets.forEach(a => {
      if (a.calibration_required && a.next_calibration_date && new Date(a.next_calibration_date).getTime() <= horizon) {
        events.push({ when: a.next_calibration_date, label: t('assets.nextCalibration'), asset: nameOf(a) })
      }
      if (a.warranty_end_date && new Date(a.warranty_end_date).getTime() <= horizon) {
        events.push({ when: a.warranty_end_date, label: t('assets.warrantyEnd'), asset: nameOf(a) })
      }
    })
    return events.sort((a, b) => a.when.localeCompare(b.when)).slice(0, 8)
  }, [assets, lang])

  const activity = useMemo(() => {
    return db.movement_logs
      .filter(m => assets.some(a => a.id === m.asset_id))
      .slice(0, 6)
  }, [db.movement_logs, assets])

  const goTo = (path: string) => navigate(path)

  const kpi = (label: string, value: number, tone: string, icon: string, path: string) => (
    <div className={`kpi-card${tone ? ` ${tone}` : ''}`} onClick={() => goTo(path)}>
      <div className="kpi-label"><span>{label}</span><span>{icon}</span></div>
      <div className="kpi-value">{value}</div>
    </div>
  )

  return (
    <div>
      <div className="page-head">
        <h1>{t('dash.title')}</h1>
        <div className="actions">
          {can('assets.create') && <button className="btn" onClick={() => goTo('/assets/new')}>＋ {t('dash.quickAddAsset')}</button>}
          {can('maintenance.create') && <button className="btn secondary" onClick={() => goTo('/maintenance?new=1')}>🔧 {t('dash.quickNewRequest')}</button>}
          {can('transfers.create') && <button className="btn secondary" onClick={() => goTo('/transfers?new=1')}>🔄 {t('dash.quickTransfer')}</button>}
        </div>
      </div>

      <div className="filter-bar no-print">
        <div className="field">
          <select value={period} onChange={e => setPeriod(e.target.value as PeriodKey)}>
            <option value="today">{t('dash.filter.today')}</option>
            <option value="week">{t('dash.filter.week')}</option>
            <option value="month">{t('dash.filter.month')}</option>
            <option value="quarter">{t('dash.filter.quarter')}</option>
            <option value="year">{t('dash.filter.year')}</option>
            <option value="custom">{t('dash.filter.custom')}</option>
          </select>
        </div>
        {period === 'custom' && (
          <>
            <div className="field"><input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} /></div>
            <div className="field"><input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} /></div>
          </>
        )}
      </div>

      <div className="kpi-grid">
        {kpi(t('dash.totalAssets'), assets.length, '', '🩺', '/assets')}
        {kpi(t('dash.activeAssets'), assets.filter(a => ACTIVE_ASSET.includes(a.status)).length, '', '✅', '/assets?status=active')}
        {kpi(t('dash.underMaintenance'), assets.filter(a => a.status === 'in_maintenance').length, 'alert-amber', '🔧', '/assets?status=in_maintenance')}
        {kpi(t('dash.outOfService'), assets.filter(a => a.status === 'out_of_service').length, 'alert-red', '⛔', '/assets?status=out_of_service')}
        {kpi(t('dash.openRequests'), openRequests.length, '', '📨', '/maintenance')}
        {kpi(t('dash.overdueMaintenance'), overduePlans.length, 'alert-red', '⏰', '/maintenance')}
        {kpi(t('dash.calibrationDue'), calDueSoon.length, 'alert-amber', '🎯', '/calibration?due=1')}
        {kpi(t('dash.warrantiesExpiring'), warrantiesExpiring.length, 'alert-amber', '📜', '/vendors')}
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3>{t('dash.byStatus')}</h3>
          <BarChart data={byStatus} />
        </div>
        <div className="card">
          <h3>{t('dash.byDepartment')}</h3>
          <BarChart data={byDepartment} />
        </div>

        <div className="card">
          <h3>{t('dash.recentRequests')}</h3>
          {periodRequests.slice(0, 5).map(r => {
            const asset = db.assets.find(a => a.id === r.asset_id)
            return (
              <div className="stat-mini" key={r.id} style={{ cursor: 'pointer' }} onClick={() => goTo('/maintenance')}>
                <span>#{r.request_number} · {asset ? nameOf(asset) : '—'}</span>
                <StatusBadge kind="request" value={r.status} />
              </div>
            )
          })}
          {periodRequests.length === 0 && <div className="empty-state">{t('common.noResults')}</div>}
        </div>

        <div className="card">
          <h3>{t('dash.needsAttention')}</h3>
          {needsAttention.map((n, i) => (
            <div className="stat-mini" key={i} style={{ cursor: 'pointer' }} onClick={() => goTo(`/assets/${n.asset.id}`)}>
              <span>{nameOf(n.asset)} <span className={`badge ${n.cls}`}>{n.reason}</span></span>
              <span>›</span>
            </div>
          ))}
          {needsAttention.length === 0 && <div className="empty-state">{t('common.noResults')}</div>}
        </div>

        <div className="card">
          <h3>{t('dash.upcomingCalendar')}</h3>
          {upcoming.map((e, i) => (
            <div className="stat-mini" key={i}>
              <span>{e.asset} — {e.label}</span>
              <span>{fmtDate(e.when, lang)}</span>
            </div>
          ))}
          {upcoming.length === 0 && <div className="empty-state">{t('common.noResults')}</div>}
        </div>

        <div className="card">
          <h3>{t('dash.requestsTrend')}</h3>
          <Trend data={trend} />
        </div>

        <div className="card full">
          <h3>{t('dash.recentActivity')}</h3>
          <ul className="timeline">
            {activity.map(m => {
              const asset = db.assets.find(a => a.id === m.asset_id)
              const user = db.users.find(u => u.id === m.user_id)
              return (
                <li key={m.id}>
                  <div>{asset ? nameOf(asset) : '—'} — {lang === 'ar' ? m.action_ar : m.action_en}{m.details ? ` · ${m.details}` : ''}</div>
                  <div className="when">{user ? (lang === 'ar' ? user.full_name_ar : user.full_name_en) : ''} · {fmtDateTime(m.at, lang)}</div>
                </li>
              )
            })}
          </ul>
          {activity.length === 0 && <div className="empty-state">{t('common.noResults')}</div>}
        </div>
      </div>
    </div>
  )
}
