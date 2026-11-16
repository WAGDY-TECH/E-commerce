import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useStore, uid } from '../store/AppStore'
import { fmtDate, dateInput } from '../lib/util'
import { ASSET_STATUSES, RISK_LEVELS, type Asset } from '../types'

export function AssetFormPage() {
  const { t, lang } = useI18n()
  const { db, update, setToast, logMovement } = useStore()
  const navigate = useNavigate()
  const { id } = useParams()
  const existing = id ? db.assets.find(a => a.id === id) : undefined

  const blank = useMemo<Asset>(() => ({
    id: uid('a'),
    asset_code: `AST-${String(db.assets.length + 1).padStart(4, '0')}`,
    name_ar: '',
    name_en: '',
    category_id: db.categories[0]?.id ?? '',
    status: 'draft',
    risk_level: 'medium',
    clinical_use: true,
    calibration_required: false,
    department_id: db.departments[0]?.id ?? '',
    location_id: db.locations[0]?.id ?? '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }), [db])

  const [form, setForm] = useState<Asset>(existing ?? blank)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (patch: Partial<Asset>) => setForm(f => ({ ...f, ...patch }))

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.asset_code.trim()) e.asset_code = t('validation.required')
    if (!form.name_ar.trim()) e.name_ar = t('validation.required')
    if (!form.name_en.trim()) e.name_en = t('validation.required')
    if (!form.category_id) e.category_id = t('validation.required')
    if (!form.department_id) e.department_id = t('validation.required')
    if (!form.location_id) e.location_id = t('validation.required')
    if (db.assets.some(a => a.asset_code === form.asset_code.trim() && a.id !== form.id)) e.asset_code = t('validation.duplicateCode')
    if (form.serial_number && db.assets.some(a => a.serial_number === form.serial_number && a.id !== form.id)) e.serial_number = t('validation.duplicateSerial')
    if (form.purchase_date && form.warranty_end_date && form.purchase_date > form.warranty_end_date) e.warranty_end_date = t('validation.dateOrder')
    if (form.purchase_cost !== undefined && Number.isNaN(form.purchase_cost)) e.purchase_cost = t('validation.number')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = () => {
    if (!validate()) return
    const clean: Asset = { ...form, asset_code: form.asset_code.trim(), updated_at: new Date().toISOString() }
    if (existing) {
      update(draft => {
        const idx = draft.assets.findIndex(a => a.id === existing.id)
        draft.assets[idx] = clean
      }, {
        action_ar: 'تعديل أصل', action_en: 'Update asset', entity_type: 'asset',
        entity_id: clean.asset_code,
        old_value: `${existing.name_ar} · ${existing.status}`,
        new_value: `${clean.name_ar} · ${clean.status}`,
      })
      if (existing.location_id !== clean.location_id || existing.department_id !== clean.department_id) {
        logMovement(clean.id, 'تحديث موقع الأصل', 'Asset location updated', `${existing.location_id} → ${clean.location_id}`)
      }
    } else {
      update(draft => { draft.assets.push(clean) }, {
        action_ar: 'إضافة أصل', action_en: 'Create asset', entity_type: 'asset',
        entity_id: clean.asset_code, new_value: clean.name_ar,
      })
      logMovement(clean.id, 'إضافة الأصل إلى النظام', 'Asset registered')
    }
    setToast(t('common.updated'))
    navigate(`/assets/${clean.id}`)
  }

  const err = (k: string) => errors[k] ? <div className="error">{errors[k]}</div> : null

  return (
    <div>
      <div className="page-head">
        <h1>{existing ? `${t('assets.edit')} — ${existing.asset_code}` : t('assets.add')}</h1>
        <div className="actions">
          <button className="btn secondary" onClick={() => navigate(-1)}>{t('common.back')}</button>
          <button className="btn" onClick={save}>{t('common.save')}</button>
        </div>
      </div>

      <form onSubmit={e => { e.preventDefault(); save() }}>
        <fieldset className="section-box">
          <legend>{t('assets.section.basic')}</legend>
          <div className="form-grid">
            <div className="field"><label>{t('assets.code')} <span className="req">*</span></label>
              <input value={form.asset_code} onChange={e => set({ asset_code: e.target.value })} />{err('asset_code')}</div>
            <div className="field"><label>{t('assets.serial')}</label>
              <input value={form.serial_number ?? ''} onChange={e => set({ serial_number: e.target.value })} />{err('serial_number')}</div>
            <div className="field"><label>{t('assets.nameAr')} <span className="req">*</span></label>
              <input value={form.name_ar} onChange={e => set({ name_ar: e.target.value })} />{err('name_ar')}</div>
            <div className="field"><label>{t('assets.nameEn')} <span className="req">*</span></label>
              <input dir="ltr" value={form.name_en} onChange={e => set({ name_en: e.target.value })} />{err('name_en')}</div>
            <div className="field"><label>{t('assets.category')} <span className="req">*</span></label>
              <select value={form.category_id} onChange={e => set({ category_id: e.target.value })}>
                {db.categories.map(c => <option key={c.id} value={c.id}>{lang === 'ar' ? c.name_ar : c.name_en}</option>)}
              </select>{err('category_id')}</div>
            <div className="field"><label>{t('common.status')}</label>
              <select value={form.status} onChange={e => set({ status: e.target.value as Asset['status'] })}>
                {ASSET_STATUSES.map(s => <option key={s} value={s}>{t(`assets.status.${s}`)}</option>)}
              </select></div>
            <div className="field"><label>{t('assets.riskLevel')}</label>
              <select value={form.risk_level} onChange={e => set({ risk_level: e.target.value as Asset['risk_level'] })}>
                {RISK_LEVELS.map(r => <option key={r} value={r}>{t(`assets.risk.${r}`)}</option>)}
              </select></div>
            <div className="field"><label>{t('assets.clinicalUse')}</label>
              <div className="checkbox-row"><input type="checkbox" checked={form.clinical_use} onChange={e => set({ clinical_use: e.target.checked })} />{form.clinical_use ? t('common.yes') : t('common.no')}</div></div>
            <div className="field"><label>{t('assets.calibrationRequired')}</label>
              <div className="checkbox-row"><input type="checkbox" checked={form.calibration_required} onChange={e => set({ calibration_required: e.target.checked })} />{form.calibration_required ? t('common.yes') : t('common.no')}</div></div>
            <div className="field"><label>{t('assets.brand')}</label>
              <input value={form.brand ?? ''} onChange={e => set({ brand: e.target.value })} /></div>
            <div className="field"><label>{t('assets.model')}</label>
              <input value={form.model ?? ''} onChange={e => set({ model: e.target.value })} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>{t('common.description')}</label>
              <textarea value={form.description ?? ''} onChange={e => set({ description: e.target.value })} /></div>
          </div>
        </fieldset>

        <fieldset className="section-box">
          <legend>{t('assets.section.location')}</legend>
          <div className="form-grid">
            <div className="field"><label>{t('common.department')} <span className="req">*</span></label>
              <select value={form.department_id} onChange={e => set({ department_id: e.target.value })}>
                {db.departments.map(d => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en}</option>)}
              </select>{err('department_id')}</div>
            <div className="field"><label>{t('common.location')} <span className="req">*</span></label>
              <select value={form.location_id} onChange={e => set({ location_id: e.target.value })}>
                {db.locations.map(l => <option key={l.id} value={l.id}>{lang === 'ar' ? l.building_ar : l.building_en} / {lang === 'ar' ? l.room_ar : l.room_en}</option>)}
              </select>{err('location_id')}</div>
            <div className="field"><label>{t('assets.assignedTo')}</label>
              <select value={form.assigned_to ?? ''} onChange={e => set({ assigned_to: e.target.value || undefined })}>
                <option value="">{t('common.none')}</option>
                {db.users.map(u => <option key={u.id} value={u.id}>{lang === 'ar' ? u.full_name_ar : u.full_name_en}</option>)}
              </select></div>
            <div className="field"><label>{t('assets.owningDept')}</label>
              <select value={form.owning_department_id ?? ''} onChange={e => set({ owning_department_id: e.target.value || undefined })}>
                <option value="">{t('common.none')}</option>
                {db.departments.map(d => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en}</option>)}
              </select></div>
          </div>
        </fieldset>

        <fieldset className="section-box">
          <legend>{t('assets.section.financial')}</legend>
          <div className="form-grid">
            <div className="field"><label>{t('assets.purchaseDate')}</label>
              <input type="date" value={dateInput(form.purchase_date)} onChange={e => set({ purchase_date: e.target.value })} /></div>
            <div className="field"><label>{t('assets.purchaseCost')}</label>
              <input type="number" min="0" value={form.purchase_cost ?? ''} onChange={e => set({ purchase_cost: e.target.value === '' ? undefined : Number(e.target.value) })} />{err('purchase_cost')}</div>
            <div className="field"><label>{t('assets.currency')}</label>
              <input value={form.currency ?? 'SAR'} onChange={e => set({ currency: e.target.value })} /></div>
            <div className="field"><label>{t('assets.poNumber')}</label>
              <input value={form.po_number ?? ''} onChange={e => set({ po_number: e.target.value })} /></div>
            <div className="field"><label>{t('assets.supplier')}</label>
              <select value={form.supplier_id ?? ''} onChange={e => set({ supplier_id: e.target.value || undefined })}>
                <option value="">{t('common.none')}</option>
                {db.suppliers.map(s => <option key={s.id} value={s.id}>{lang === 'ar' ? s.name_ar : s.name_en}</option>)}
              </select></div>
            <div className="field"><label>{t('assets.warrantyMonths')}</label>
              <input type="number" min="0" value={form.warranty_months ?? ''} onChange={e => set({ warranty_months: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
            <div className="field"><label>{t('assets.warrantyEnd')}</label>
              <input type="date" value={dateInput(form.warranty_end_date)} onChange={e => set({ warranty_end_date: e.target.value })} />{err('warranty_end_date')}</div>
            <div className="field"><label>{t('assets.lifeYears')}</label>
              <input type="number" min="0" value={form.expected_life_years ?? ''} onChange={e => set({ expected_life_years: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
            <div className="field"><label>{t('assets.costCenter')}</label>
              <input value={form.cost_center ?? ''} onChange={e => set({ cost_center: e.target.value })} /></div>
          </div>
        </fieldset>

        <fieldset className="section-box">
          <legend>{t('assets.section.technical')}</legend>
          <div className="form-grid">
            <div className="field"><label>{t('assets.maintenanceInterval')}</label>
              <input type="number" min="0" value={form.maintenance_interval_days ?? ''} onChange={e => set({ maintenance_interval_days: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
            <div className="field"><label>{t('assets.nextCalibration')}</label>
              <input type="date" value={dateInput(form.next_calibration_date)} onChange={e => set({ next_calibration_date: e.target.value })} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>{t('assets.safetyReq')}</label>
              <textarea value={form.safety_requirements ?? ''} onChange={e => set({ safety_requirements: e.target.value })} /></div>
          </div>
        </fieldset>

        <fieldset className="section-box">
          <legend>{t('assets.section.documents')}</legend>
          <div className="form-grid">
            <div className="field"><label>{t('assets.image')}</label>
              <input value={form.image_url ?? ''} onChange={e => set({ image_url: e.target.value })} placeholder="https://…" /></div>
            <div className="field"><label>{t('common.attachments')}</label>
              <input disabled placeholder={t('common.uploadFile')} />
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>{t('assets.doc.other')}: PDF/JPG/PNG</div></div>
          </div>
        </fieldset>

        <div className="modal-actions no-print">
          <button type="button" className="btn secondary" onClick={() => navigate(-1)}>{t('common.cancel')}</button>
          <button type="submit" className="btn">{t('common.save')}</button>
        </div>
      </form>
      {existing && <small style={{ color: 'var(--text-secondary)' }}>{t('common.created')}: {fmtDate(existing.created_at, lang)} · {t('common.updated')}: {fmtDate(existing.updated_at, lang)}</small>}
    </div>
  )
}
