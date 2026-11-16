import React, { useState } from 'react'
import { useI18n } from '../i18n'
import { useStore, uid } from '../store/AppStore'
import { Modal } from '../components/Modal'
import { fmtDate, daysUntil, fmtMoney } from '../lib/util'
import type { Contract, Supplier, Warranty } from '../types'

type EditState = { kind: 'supplier' | 'contract' | 'warranty'; item: Record<string, unknown>; isNew: boolean } | null

export function VendorsPage() {
  const { t, lang } = useI18n()
  const { db, can, update, setToast } = useStore()
  const [tab, setTab] = useState<'suppliers' | 'contracts' | 'warranties'>('suppliers')
  const [edit, setEdit] = useState<EditState>(null)
  const editing = edit?.item ?? null
  const canManage = can('vendors.manage')

  const supName = (id?: string) => {
    const s = db.suppliers.find(x => x.id === id)
    return s ? (lang === 'ar' ? s.name_ar : s.name_en) : '—'
  }
  const assetName = (id: string) => {
    const a = db.assets.find(x => x.id === id)
    return a ? `${a.asset_code} — ${lang === 'ar' ? a.name_ar : a.name_en}` : id
  }

  const save = () => {
    if (!edit || !editing) return
    const { kind, item, isNew } = edit
    update(draft => {
      if (kind === 'supplier') {
        const idx = draft.suppliers.findIndex(s => s.id === item.id)
        if (idx >= 0) draft.suppliers[idx] = item as unknown as Supplier
        else draft.suppliers.push(item as unknown as Supplier)
      } else if (kind === 'contract') {
        const idx = draft.contracts.findIndex(c => c.id === item.id)
        if (idx >= 0) draft.contracts[idx] = item as unknown as Contract
        else draft.contracts.push(item as unknown as Contract)
      } else {
        const idx = draft.warranties.findIndex(w => w.id === item.id)
        if (idx >= 0) draft.warranties[idx] = item as unknown as Warranty
        else draft.warranties.push(item as unknown as Warranty)
      }
    }, {
      action_ar: `${isNew ? 'إضافة' : 'تعديل'} ${kind === 'supplier' ? 'مورد' : kind === 'contract' ? 'عقد' : 'ضمان'}`,
      action_en: `${isNew ? 'Create' : 'Update'} ${kind}`,
      entity_type: kind,
      entity_id: String(item.contract_number ?? item.warranty_number ?? item.name_ar ?? item.id ?? ''),
    })
    setEdit(null)
    setToast(t('common.updated'))
  }

  const remove = (kind: 'supplier' | 'contract' | 'warranty', id: string) => {
    if (!confirm(t('common.confirmDelete'))) return
    update(draft => {
      if (kind === 'supplier') draft.suppliers = draft.suppliers.filter(s => s.id !== id)
      else if (kind === 'contract') draft.contracts = draft.contracts.filter(c => c.id !== id)
      else draft.warranties = draft.warranties.filter(w => w.id !== id)
    }, {
      action_ar: 'حذف', action_en: 'Delete', entity_type: kind, entity_id: id,
    })
    setToast(t('common.deleted'))
  }

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="field"><label>{label}</label>{children}</div>
  )
  const setItem = (patch: Record<string, unknown>) =>
    setEdit(e => (e ? { ...e, item: { ...e.item, ...patch } } : e))

  const expiringSoon = (end?: string) => {
    const d = daysUntil(end)
    return d !== null && d >= 0 && d <= 60
  }

  return (
    <div>
      <div className="page-head">
        <h1>{t('vend.title')}</h1>
        {canManage && (
          <div className="actions">
            {tab === 'suppliers' && <button className="btn" onClick={() => setEdit({ kind: 'supplier', isNew: true, item: { id: uid('sup'), name_ar: '', name_en: '', active: true } })}>＋ {t('vend.addSupplier')}</button>}
            {tab === 'contracts' && <button className="btn" onClick={() => setEdit({ kind: 'contract', isNew: true, item: { id: uid('con'), contract_number: '', supplier_id: db.suppliers[0]?.id ?? '', type_ar: '', type_en: '', start_date: new Date().toISOString().slice(0, 10), end_date: '', asset_ids: [] } })}>＋ {t('vend.addContract')}</button>}
            {tab === 'warranties' && <button className="btn" onClick={() => setEdit({ kind: 'warranty', isNew: true, item: { id: uid('war'), asset_id: db.assets[0]?.id ?? '', supplier_id: db.suppliers[0]?.id ?? '', warranty_number: '', start_date: new Date().toISOString().slice(0, 10), end_date: '' } })}>＋ {t('vend.addWarranty')}</button>}
          </div>
        )}
      </div>

      <div className="tabs">
        <button className={tab === 'suppliers' ? 'active' : ''} onClick={() => setTab('suppliers')}>{t('vend.suppliers')}</button>
        <button className={tab === 'contracts' ? 'active' : ''} onClick={() => setTab('contracts')}>{t('vend.contracts')}</button>
        <button className={tab === 'warranties' ? 'active' : ''} onClick={() => setTab('warranties')}>{t('vend.warranties')}</button>
      </div>

      {tab === 'suppliers' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('vend.commercialName')}</th><th>{t('vend.registration')}</th><th>{t('vend.contactPerson')}</th><th>{t('vend.phone')}</th><th>{t('vend.productTypes')}</th><th>{t('common.status')}</th><th></th></tr></thead>
              <tbody>
                {db.suppliers.map(s => (
                  <tr key={s.id}>
                    <td><strong>{lang === 'ar' ? s.name_ar : s.name_en}</strong></td>
                    <td>{s.registration_number ?? '—'}</td>
                    <td>{s.contact_person ?? '—'}</td>
                    <td dir="ltr">{s.phone ?? '—'}</td>
                    <td>{s.product_types ?? '—'}</td>
                    <td><span className={`badge ${s.active ? 'green' : 'gray'}`}>{s.active ? t('users.active') : t('users.inactive')}</span></td>
                    <td>{canManage && <button className="btn sm secondary" onClick={() => setEdit({ kind: 'supplier', isNew: false, item: { ...s } })}>{t('common.edit')}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'contracts' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('vend.contractNumber')}</th><th>{t('vend.suppliers')}</th><th>{t('vend.contractType')}</th><th>{t('vend.startDate')}</th><th>{t('vend.endDate')}</th><th>{t('vend.value')}</th><th>{t('vend.linkedAssets')}</th><th></th></tr></thead>
              <tbody>
                {db.contracts.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.contract_number}</strong></td>
                    <td>{supName(c.supplier_id)}</td>
                    <td>{lang === 'ar' ? c.type_ar : c.type_en}</td>
                    <td>{fmtDate(c.start_date, lang)}</td>
                    <td>
                      <span className={`badge ${(daysUntil(c.end_date) ?? 1) < 0 ? 'red' : expiringSoon(c.end_date) ? 'amber' : 'green'}`}>
                        {fmtDate(c.end_date, lang)}
                      </span>
                      {expiringSoon(c.end_date) && <span className="badge amber" style={{ marginInlineStart: 6 }}>{t('vend.expiringSoon')}</span>}
                    </td>
                    <td>{fmtMoney(c.value, 'SAR')}</td>
                    <td>{c.asset_ids.length}</td>
                    <td>
                      {canManage && (
                        <>
                          <button className="btn sm secondary" onClick={() => setEdit({ kind: 'contract', isNew: false, item: { ...c } })}>{t('common.edit')}</button>{' '}
                          <button className="btn sm danger" onClick={() => remove('contract', c.id)}>{t('common.delete')}</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'warranties' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('vend.warrantyNumber')}</th><th>{t('maint.asset')}</th><th>{t('vend.suppliers')}</th><th>{t('vend.startDate')}</th><th>{t('vend.endDate')}</th><th></th></tr></thead>
              <tbody>
                {db.warranties.map(w => {
                  const d = daysUntil(w.end_date)
                  return (
                    <tr key={w.id}>
                      <td><strong>{w.warranty_number ?? w.id}</strong></td>
                      <td>{assetName(w.asset_id)}</td>
                      <td>{supName(w.supplier_id)}</td>
                      <td>{fmtDate(w.start_date, lang)}</td>
                      <td>
                        <span className={`badge ${d !== null && d < 0 ? 'red' : expiringSoon(w.end_date) ? 'amber' : 'green'}`}>{fmtDate(w.end_date, lang)}</span>
                        {d !== null && d < 0 && <span className="badge red" style={{ marginInlineStart: 6 }}>{t('assets.warrantyStatus.expired')}</span>}
                      </td>
                      <td>
                        {canManage && (
                          <>
                            <button className="btn sm secondary" onClick={() => setEdit({ kind: 'warranty', isNew: false, item: { ...w } })}>{t('common.edit')}</button>{' '}
                            <button className="btn sm danger" onClick={() => remove('warranty', w.id)}>{t('common.delete')}</button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {edit && editing && (
        <Modal
          title={t('common.edit')}
          wide
          onClose={() => setEdit(null)}
          footer={
            <>
              <button className="btn secondary" onClick={() => setEdit(null)}>{t('common.cancel')}</button>
              <button className="btn" onClick={save}>{t('common.save')}</button>
            </>
          }
        >
          <div className="form-grid">
            {edit.kind === 'supplier' && (
              <>
                <F label={`${t('vend.commercialName')} (AR)`}><input value={String(editing.name_ar ?? '')} onChange={e => setItem({ name_ar: e.target.value })} /></F>
                <F label={`${t('vend.commercialName')} (EN)`}><input dir="ltr" value={String(editing.name_en ?? '')} onChange={e => setItem({ name_en: e.target.value })} /></F>
                <F label={t('vend.registration')}><input value={String(editing.registration_number ?? '')} onChange={e => setItem({ registration_number: e.target.value })} /></F>
                <F label={t('vend.contactPerson')}><input value={String(editing.contact_person ?? '')} onChange={e => setItem({ contact_person: e.target.value })} /></F>
                <F label="Email"><input dir="ltr" value={String(editing.email ?? '')} onChange={e => setItem({ email: e.target.value })} /></F>
                <F label={t('vend.phone')}><input dir="ltr" value={String(editing.phone ?? '')} onChange={e => setItem({ phone: e.target.value })} /></F>
                <F label={t('vend.address')}><input value={String(editing.address ?? '')} onChange={e => setItem({ address: e.target.value })} /></F>
                <F label={t('vend.productTypes')}><input value={String(editing.product_types ?? '')} onChange={e => setItem({ product_types: e.target.value })} /></F>
                <F label={t('common.status')}>
                  <div className="checkbox-row"><input type="checkbox" checked={Boolean(editing.active)} onChange={e => setItem({ active: e.target.checked })} />{Boolean(editing.active) ? t('users.active') : t('users.inactive')}</div>
                </F>
              </>
            )}
            {edit.kind === 'contract' && (
              <>
                <F label={t('vend.contractNumber')}><input value={String(editing.contract_number ?? '')} onChange={e => setItem({ contract_number: e.target.value })} /></F>
                <F label={t('vend.suppliers')}>
                  <select value={String(editing.supplier_id ?? '')} onChange={e => setItem({ supplier_id: e.target.value })}>
                    {db.suppliers.map(s => <option key={s.id} value={s.id}>{lang === 'ar' ? s.name_ar : s.name_en}</option>)}
                  </select>
                </F>
                <F label={`${t('vend.contractType')} (AR)`}><input value={String(editing.type_ar ?? '')} onChange={e => setItem({ type_ar: e.target.value })} /></F>
                <F label={`${t('vend.contractType')} (EN)`}><input dir="ltr" value={String(editing.type_en ?? '')} onChange={e => setItem({ type_en: e.target.value })} /></F>
                <F label={t('vend.startDate')}><input type="date" value={String(editing.start_date ?? '').slice(0, 10)} onChange={e => setItem({ start_date: e.target.value })} /></F>
                <F label={t('vend.endDate')}><input type="date" value={String(editing.end_date ?? '').slice(0, 10)} onChange={e => setItem({ end_date: e.target.value })} /></F>
                <F label={t('vend.value')}><input type="number" min="0" value={String(editing.value ?? '')} onChange={e => setItem({ value: e.target.value === '' ? undefined : Number(e.target.value) })} /></F>
                <F label={t('vend.scope')}><input value={String(editing.scope ?? '')} onChange={e => setItem({ scope: e.target.value })} /></F>
                <F label={t('vend.linkedAssets')}>
                  <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
                    {db.assets.slice(0, 30).map(a => {
                      const ids = (editing.asset_ids as string[]) ?? []
                      return (
                        <label key={a.id} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={ids.includes(a.id)}
                            onChange={() => setItem({ asset_ids: ids.includes(a.id) ? ids.filter(x => x !== a.id) : [...ids, a.id] })}
                          />
                          {a.asset_code} — {lang === 'ar' ? a.name_ar : a.name_en}
                        </label>
                      )
                    })}
                  </div>
                </F>
              </>
            )}
            {edit.kind === 'warranty' && (
              <>
                <F label={t('vend.warrantyNumber')}><input value={String(editing.warranty_number ?? '')} onChange={e => setItem({ warranty_number: e.target.value })} /></F>
                <F label={t('maint.asset')}>
                  <select value={String(editing.asset_id ?? '')} onChange={e => setItem({ asset_id: e.target.value })}>
                    {db.assets.map(a => <option key={a.id} value={a.id}>{a.asset_code} — {lang === 'ar' ? a.name_ar : a.name_en}</option>)}
                  </select>
                </F>
                <F label={t('vend.suppliers')}>
                  <select value={String(editing.supplier_id ?? '')} onChange={e => setItem({ supplier_id: e.target.value || undefined })}>
                    <option value="">{t('common.none')}</option>
                    {db.suppliers.map(s => <option key={s.id} value={s.id}>{lang === 'ar' ? s.name_ar : s.name_en}</option>)}
                  </select>
                </F>
                <F label={t('vend.startDate')}><input type="date" value={String(editing.start_date ?? '').slice(0, 10)} onChange={e => setItem({ start_date: e.target.value })} /></F>
                <F label={t('vend.endDate')}><input type="date" value={String(editing.end_date ?? '').slice(0, 10)} onChange={e => setItem({ end_date: e.target.value })} /></F>
                <F label={t('vend.terms')}><input value={String(editing.terms ?? '')} onChange={e => setItem({ terms: e.target.value })} /></F>
                <F label={t('vend.contactPerson')}><input value={String(editing.contact ?? '')} onChange={e => setItem({ contact: e.target.value })} /></F>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
