import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useStore, uid } from '../store/AppStore'
import { DataTable, type Column } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { Modal } from '../components/Modal'
import { fmtDate, fmtDateTime, daysUntil } from '../lib/util'
import { MAINTENANCE_TYPES, PRIORITIES, REQUEST_STATUSES, type MaintenancePlan, type MaintenanceRequest, type WorkOrder } from '../types'

const OPEN: string[] = ['new', 'reviewed', 'assigned', 'in_progress', 'waiting_part', 'waiting_vendor']

export function MaintenancePage() {
  const { t, lang } = useI18n()
  const { db, currentUser, can, scopedAssets, scopedDepartments, update, setToast, notify, logMovement } = useStore()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<'requests' | 'orders' | 'plans'>('requests')

  const [reqModal, setReqModal] = useState<boolean>(params.get('new') === '1')
  const [detail, setDetail] = useState<MaintenanceRequest | null>(null)
  const [woEdit, setWoEdit] = useState<WorkOrder | null>(null)

  const [form, setForm] = useState({
    asset_id: '', type: 'corrective', priority: 'medium', problem_description: '', notes: '',
  })

  const assets = useMemo(() => scopedAssets(), [scopedAssets])
  const deptIds = useMemo(() => scopedDepartments(), [scopedDepartments])
  const userName = (id: string | undefined) => {
    const u = db.users.find(x => x.id === id)
    return u ? (lang === 'ar' ? u.full_name_ar : u.full_name_en) : '—'
  }
  const assetOf = (assetId: string) => db.assets.find(a => a.id === assetId)

  const requests = useMemo(
    () => db.maintenance_requests
      .filter(r => deptIds.includes(r.department_id) || assets.some(a => a.id === r.asset_id))
      .sort((a, b) => b.reported_at.localeCompare(a.reported_at)),
    [db.maintenance_requests, deptIds, assets],
  )
  const orders = useMemo(
    () => db.work_orders.filter(w => requests.some(r => r.id === w.request_id)),
    [db.work_orders, requests],
  )

  const submitRequest = () => {
    if (!form.asset_id || !form.problem_description.trim() || !currentUser) return
    const asset = assetOf(form.asset_id)
    if (!asset) return
    const now = new Date().toISOString()
    const req: MaintenanceRequest = {
      id: uid('mr'),
      request_number: `MR-${String(db.maintenance_requests.length + 1).padStart(4, '0')}`,
      asset_id: asset.id,
      requested_by: currentUser.id,
      department_id: asset.department_id,
      type: form.type as MaintenanceRequest['type'],
      problem_description: form.problem_description,
      priority: form.priority as MaintenanceRequest['priority'],
      reported_at: now,
      status: 'new',
      notes: form.notes || undefined,
    }
    update(draft => {
      draft.maintenance_requests.unshift(req)
    }, {
      action_ar: 'إنشاء طلب صيانة', action_en: 'Create maintenance request', entity_type: 'maintenance_request',
      entity_id: req.request_number, new_value: req.problem_description.slice(0, 60),
    })
    logMovement(asset.id, 'فتح طلب صيانة', 'Maintenance request opened', req.request_number)
    notify({
      type_ar: 'طلب صيانة جديد', type_en: 'New maintenance request',
      message_ar: `طلب صيانة جديد #${req.request_number} للأصل ${asset.asset_code}`,
      message_en: `New request #${req.request_number} for asset ${asset.asset_code}`,
      severity: req.priority === 'critical' ? 'danger' : 'info', user_id: 'all', link: '/maintenance',
    })
    setToast(t('common.updated'))
    setReqModal(false)
    setForm({ asset_id: '', type: 'corrective', priority: 'medium', problem_description: '', notes: '' })
    setParams({})
  }

  const changeRequestStatus = (r: MaintenanceRequest, status: string) => {
    update(draft => {
      const target = draft.maintenance_requests.find(x => x.id === r.id)
      if (target) target.status = status as MaintenanceRequest['status']
      if (status === 'closed' || status === 'completed') {
        const a = draft.assets.find(x => x.id === r.asset_id)
        if (a && a.status === 'in_maintenance' && !draft.maintenance_requests.some(x => x.asset_id === r.asset_id && x.id !== r.id && OPEN.includes(x.status))) {
          a.status = 'available'
        }
      }
    }, {
      action_ar: 'تحديث حالة طلب الصيانة', action_en: 'Update request status', entity_type: 'maintenance_request',
      entity_id: r.request_number, old_value: r.status, new_value: status,
    })
    setDetail(null)
    setToast(t('common.updated'))
  }

  const saveWorkOrder = () => {
    if (!woEdit) return
    update(draft => {
      const idx = draft.work_orders.findIndex(w => w.id === woEdit.id)
      draft.work_orders[idx] = woEdit
      if (woEdit.status === 'completed') {
        const r = draft.maintenance_requests.find(x => x.id === woEdit.request_id)
        if (r) r.status = 'completed'
      }
    }, {
      action_ar: 'تحديث أمر العمل', action_en: 'Update work order', entity_type: 'work_order',
      entity_id: woEdit.order_number, new_value: woEdit.status,
    })
    setWoEdit(null)
    setToast(t('common.updated'))
  }

  const generateTasks = (plan: MaintenancePlan) => {
    if (!currentUser) return
    const now = new Date().toISOString()
    const candidates = assets.filter(a =>
      (!plan.category_id || a.category_id === plan.category_id) &&
      a.status !== 'out_of_service' && a.status !== 'archived')
    update(draft => {
      candidates.forEach(a => {
        draft.maintenance_requests.unshift({
          id: uid('mr'),
          request_number: `MR-${String(draft.maintenance_requests.length + 1).padStart(4, '0')}`,
          asset_id: a.id,
          requested_by: currentUser.id,
          department_id: a.department_id,
          type: 'preventive',
          problem_description: lang === 'ar' ? `صيانة وقائية مجدولة: ${plan.name_ar}` : `Scheduled preventive maintenance: ${plan.name_en}`,
          priority: 'medium',
          reported_at: now,
          status: 'new',
        })
      })
      const p = draft.maintenance_plans.find(x => x.id === plan.id)
      if (p) {
        p.last_generated = now.slice(0, 10)
        p.next_due = new Date(Date.now() + plan.interval_days * 86400000).toISOString().slice(0, 10)
      }
    }, {
      action_ar: 'توليد مهام صيانة وقائية', action_en: 'Generate preventive tasks', entity_type: 'maintenance_plan',
      entity_id: plan.name_ar, new_value: `${candidates.length}`,
    })
    setToast(t('common.updated'))
  }

  const reqColumns: Column<MaintenanceRequest>[] = [
    { key: 'num', label: t('maint.requestNumber'), value: r => r.request_number, render: r => <a onClick={e => { e.stopPropagation(); setDetail(r) }}>#{r.request_number}</a> },
    { key: 'asset', label: t('maint.asset'), value: r => { const a = assetOf(r.asset_id); return a ? (lang === 'ar' ? a.name_ar : a.name_en) : '' } },
    { key: 'type', label: t('maint.type'), value: r => t(`maint.type.${r.type}`) },
    { key: 'priority', label: t('common.priority'), value: r => r.priority, render: r => <StatusBadge kind="priority" value={r.priority} /> },
    { key: 'status', label: t('common.status'), value: r => r.status, render: r => <StatusBadge kind="request" value={r.status} /> },
    { key: 'reported', label: t('maint.reportedAt'), value: r => r.reported_at, render: r => fmtDate(r.reported_at, lang) },
    { key: 'by', label: t('maint.requestedBy'), value: r => userName(r.requested_by), hideable: true },
  ]

  const woColumns: Column<WorkOrder>[] = [
    { key: 'num', label: t('maint.orderNumber'), value: w => w.order_number },
    { key: 'req', label: t('maint.requests'), value: w => { const r = db.maintenance_requests.find(x => x.id === w.request_id); return r?.request_number ?? '' } },
    { key: 'tech', label: t('maint.technician'), value: w => userName(w.technician_id) },
    { key: 'due', label: t('maint.dueDate'), value: w => w.due_date ?? '', render: w => {
      const d = daysUntil(w.due_date)
      if (w.status === 'completed' || w.status === 'closed' || d === null) return fmtDate(w.due_date, lang)
      return <span className={`badge ${d < 0 ? 'red' : d <= 3 ? 'amber' : 'gray'}`}>{fmtDate(w.due_date, lang)}</span>
    } },
    { key: 'status', label: t('common.status'), value: w => w.status, render: w => <StatusBadge kind="request" value={w.status} /> },
    { key: 'cost', label: t('maint.cost'), value: w => w.cost ?? 0, hideable: true },
  ]

  const overdueCount = requests.filter(r => OPEN.includes(r.status) && (Date.now() - new Date(r.reported_at).getTime()) > 7 * 86400000).length
  const preventive = requests.filter(r => r.type === 'preventive')
  const compliance = preventive.length
    ? Math.round((preventive.filter(r => r.status === 'completed' || r.status === 'closed').length / preventive.length) * 100)
    : 100

  return (
    <div>
      <div className="page-head">
        <h1>{t('maint.title')}</h1>
        <div className="actions">
          {can('maintenance.create') && <button className="btn" onClick={() => setReqModal(true)}>＋ {t('maint.newRequest')}</button>}
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-label"><span>{t('maint.requests')}</span><span>📨</span></div><div className="kpi-value">{requests.filter(r => OPEN.includes(r.status)).length}</div></div>
        <div className="kpi-card alert-red"><div className="kpi-label"><span>{t('maint.overdueRequests')}</span><span>⏰</span></div><div className="kpi-value">{overdueCount}</div></div>
        <div className="kpi-card"><div className="kpi-label"><span>{t('maint.complianceRate')}</span><span>✅</span></div><div className="kpi-value">{compliance}%</div></div>
        <div className="kpi-card"><div className="kpi-label"><span>{t('maint.workOrders')}</span><span>🔧</span></div><div className="kpi-value">{orders.filter(w => !['completed', 'closed'].includes(w.status)).length}</div></div>
      </div>

      <div className="tabs">
        <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>{t('maint.requests')}</button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>{t('maint.workOrders')}</button>
        <button className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}>{t('maint.plans')}</button>
      </div>

      {tab === 'requests' && (
        <div className="card">
          <DataTable rows={requests} columns={reqColumns} rowKey={r => r.id} exportBaseName="maintenance-requests" onRowClick={setDetail} />
        </div>
      )}

      {tab === 'orders' && (
        <div className="card">
          <DataTable
            rows={orders}
            columns={woColumns}
            rowKey={w => w.id}
            exportBaseName="work-orders"
            onRowClick={w => { if (can('workorders.edit')) setWoEdit({ ...w }) }}
          />
        </div>
      )}

      {tab === 'plans' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('maint.planName')}</th><th>{t('maint.interval')}</th><th>{t('maint.grace')}</th><th>{t('maint.nextDue')}</th><th>{t('common.status')}</th><th></th></tr></thead>
              <tbody>
                {db.maintenance_plans.map(p => {
                  const overdue = p.next_due && new Date(p.next_due).getTime() < Date.now()
                  return (
                    <tr key={p.id}>
                      <td><strong>{lang === 'ar' ? p.name_ar : p.name_en}</strong></td>
                      <td>{p.interval_days}</td>
                      <td>{p.grace_days}</td>
                      <td>{p.next_due ? <span className={`badge ${overdue ? 'red' : 'gray'}`}>{fmtDate(p.next_due, lang)}</span> : '—'}</td>
                      <td><span className={`badge ${p.active ? 'green' : 'gray'}`}>{p.active ? t('users.active') : t('users.inactive')}</span></td>
                      <td>{can('maintenance.handle') && <button className="btn sm" onClick={() => generateTasks(p)}>{t('maint.generateTasks')}</button>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reqModal && (
        <Modal
          title={t('maint.newRequest')}
          onClose={() => { setReqModal(false); setParams({}) }}
          footer={
            <>
              <button className="btn secondary" onClick={() => { setReqModal(false); setParams({}) }}>{t('common.cancel')}</button>
              <button className="btn" onClick={submitRequest} disabled={!form.asset_id || !form.problem_description.trim()}>{t('common.save')}</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field"><label>{t('maint.asset')} <span className="req">*</span></label>
              <select value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))}>
                <option value="">{t('common.select')}</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.asset_code} — {lang === 'ar' ? a.name_ar : a.name_en}</option>)}
              </select></div>
            <div className="field"><label>{t('maint.type')}</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {MAINTENANCE_TYPES.map(m => <option key={m} value={m}>{t(`maint.type.${m}`)}</option>)}
              </select></div>
            <div className="field"><label>{t('common.priority')}</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{t(`maint.priority.${p}`)}</option>)}
              </select></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>{t('maint.problem')} <span className="req">*</span></label>
              <textarea value={form.problem_description} onChange={e => setForm(f => ({ ...f, problem_description: e.target.value }))} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>{t('common.notes')}</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal
          title={`#${detail.request_number}`}
          wide
          onClose={() => setDetail(null)}
          footer={
            <>
              <button className="btn secondary" onClick={() => setDetail(null)}>{t('common.close')}</button>
              {can('maintenance.handle') && !['closed', 'completed', 'rejected', 'cancelled'].includes(detail.status) && (
                <button className="btn" onClick={() => changeRequestStatus(detail, 'closed')}>{t('maint.closeRequest')}</button>
              )}
            </>
          }
        >
          <div className="detail-grid" style={{ marginBottom: 14 }}>
            <div className="item"><div className="k">{t('maint.asset')}</div><div className="v">{(() => { const a = assetOf(detail.asset_id); return a ? `${a.asset_code} — ${lang === 'ar' ? a.name_ar : a.name_en}` : '—' })()}</div></div>
            <div className="item"><div className="k">{t('maint.type')}</div><div className="v">{t(`maint.type.${detail.type}`)}</div></div>
            <div className="item"><div className="k">{t('common.priority')}</div><div className="v"><StatusBadge kind="priority" value={detail.priority} /></div></div>
            <div className="item"><div className="k">{t('common.status')}</div><div className="v"><StatusBadge kind="request" value={detail.status} /></div></div>
            <div className="item"><div className="k">{t('maint.reportedAt')}</div><div className="v">{fmtDateTime(detail.reported_at, lang)}</div></div>
            <div className="item"><div className="k">{t('maint.requestedBy')}</div><div className="v">{userName(detail.requested_by)}</div></div>
          </div>
          <div className="field"><label>{t('maint.problem')}</label><div>{detail.problem_description}</div></div>
          {detail.notes && <div className="field" style={{ marginTop: 10 }}><label>{t('common.notes')}</label><div>{detail.notes}</div></div>}
          {can('maintenance.handle') && (
            <div className="field" style={{ marginTop: 14 }}>
              <label>{t('common.status')}</label>
              <select value={detail.status} onChange={e => changeRequestStatus(detail, e.target.value)}>
                {REQUEST_STATUSES.map(s => <option key={s} value={s}>{t(`maint.status.${s}`)}</option>)}
              </select>
            </div>
          )}
          {(() => {
            const wo = db.work_orders.find(w => w.request_id === detail.id)
            if (!wo) return null
            return (
              <div style={{ marginTop: 14 }}>
                <h3>{t('maint.workOrder')} #{wo.order_number}</h3>
                <div className="detail-grid">
                  <div className="item"><div className="k">{t('maint.diagnosis')}</div><div className="v">{wo.diagnosis ?? '—'}</div></div>
                  <div className="item"><div className="k">{t('maint.actionsTaken')}</div><div className="v">{wo.actions_taken ?? '—'}</div></div>
                  <div className="item"><div className="k">{t('maint.partsUsed')}</div><div className="v">{wo.parts_used ?? '—'}</div></div>
                  <div className="item"><div className="k">{t('maint.cost')}</div><div className="v">{wo.cost ?? '—'}</div></div>
                </div>
                {can('workorders.edit') && <button className="btn secondary sm" style={{ marginTop: 10 }} onClick={() => setWoEdit({ ...wo })}>{t('common.edit')}</button>}
              </div>
            )
          })()}
        </Modal>
      )}

      {woEdit && (
        <Modal
          title={`${t('maint.workOrder')} #${woEdit.order_number}`}
          wide
          onClose={() => setWoEdit(null)}
          footer={
            <>
              <button className="btn secondary" onClick={() => setWoEdit(null)}>{t('common.cancel')}</button>
              <button className="btn" onClick={saveWorkOrder}>{t('common.save')}</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field"><label>{t('maint.technician')}</label>
              <select value={woEdit.technician_id ?? ''} onChange={e => setWoEdit(w => w ? { ...w, technician_id: e.target.value || undefined } : w)}>
                <option value="">{t('common.select')}</option>
                {db.users.map(u => <option key={u.id} value={u.id}>{lang === 'ar' ? u.full_name_ar : u.full_name_en}</option>)}
              </select></div>
            <div className="field"><label>{t('common.status')}</label>
              <select value={woEdit.status} onChange={e => setWoEdit(w => w ? { ...w, status: e.target.value as WorkOrder['status'] } : w)}>
                {REQUEST_STATUSES.map(s => <option key={s} value={s}>{t(`maint.status.${s}`)}</option>)}
              </select></div>
            <div className="field"><label>{t('maint.startDate')}</label>
              <input type="date" value={woEdit.start_date?.slice(0, 10) ?? ''} onChange={e => setWoEdit(w => w ? { ...w, start_date: e.target.value } : w)} /></div>
            <div className="field"><label>{t('maint.dueDate')}</label>
              <input type="date" value={woEdit.due_date?.slice(0, 10) ?? ''} onChange={e => setWoEdit(w => w ? { ...w, due_date: e.target.value } : w)} /></div>
            <div className="field"><label>{t('maint.completedDate')}</label>
              <input type="date" value={woEdit.completed_date?.slice(0, 10) ?? ''} onChange={e => setWoEdit(w => w ? { ...w, completed_date: e.target.value } : w)} /></div>
            <div className="field"><label>{t('maint.laborHours')}</label>
              <input type="number" min="0" step="0.5" value={woEdit.labor_hours ?? ''} onChange={e => setWoEdit(w => w ? { ...w, labor_hours: e.target.value === '' ? undefined : Number(e.target.value) } : w)} /></div>
            <div className="field"><label>{t('maint.cost')}</label>
              <input type="number" min="0" value={woEdit.cost ?? ''} onChange={e => setWoEdit(w => w ? { ...w, cost: e.target.value === '' ? undefined : Number(e.target.value) } : w)} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>{t('maint.diagnosis')}</label>
              <textarea value={woEdit.diagnosis ?? ''} onChange={e => setWoEdit(w => w ? { ...w, diagnosis: e.target.value } : w)} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>{t('maint.actionsTaken')}</label>
              <textarea value={woEdit.actions_taken ?? ''} onChange={e => setWoEdit(w => w ? { ...w, actions_taken: e.target.value } : w)} /></div>
            <div className="field"><label>{t('maint.partsUsed')}</label>
              <input value={woEdit.parts_used ?? ''} onChange={e => setWoEdit(w => w ? { ...w, parts_used: e.target.value } : w)} /></div>
            <div className="field"><label>{t('maint.testResult')}</label>
              <input value={woEdit.test_result ?? ''} onChange={e => setWoEdit(w => w ? { ...w, test_result: e.target.value } : w)} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>{t('maint.recommendation')}</label>
              <textarea value={woEdit.recommendation ?? ''} onChange={e => setWoEdit(w => w ? { ...w, recommendation: e.target.value } : w)} /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
