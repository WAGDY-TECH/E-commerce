import React, { useState } from 'react'
import { useI18n } from '../i18n'
import { useStore, uid } from '../store/AppStore'
import { Modal } from '../components/Modal'
import type { AssetCategory, Department, Location } from '../types'

type EditState = { kind: 'location' | 'department' | 'category'; item: Record<string, unknown>; isNew: boolean } | null

export function StructurePage() {
  const { t, lang } = useI18n()
  const { db, can, update, setToast } = useStore()
  const [tab, setTab] = useState<'locations' | 'departments' | 'categories'>('locations')
  const [edit, setEdit] = useState<EditState>(null)
  const editing = edit?.item ?? null

  const canManage = can('structure.manage')
  const kindLabel = (k: string) => (k === 'location' ? t('struct.locations') : k === 'department' ? t('struct.departments') : t('struct.categories'))

  const save = () => {
    if (!edit || !editing) return
    const { kind, item, isNew } = edit
    update(draft => {
      if (kind === 'location') {
        const list = draft.locations
        const idx = list.findIndex(l => l.id === item.id)
        if (idx >= 0) list[idx] = item as unknown as Location
        else list.push(item as unknown as Location)
      } else if (kind === 'department') {
        const list = draft.departments
        const idx = list.findIndex(d => d.id === item.id)
        if (idx >= 0) list[idx] = item as unknown as Department
        else list.push(item as unknown as Department)
      } else {
        const list = draft.categories
        const idx = list.findIndex(c => c.id === item.id)
        if (idx >= 0) list[idx] = item as unknown as AssetCategory
        else list.push(item as unknown as AssetCategory)
      }
    }, {
      action_ar: `${isNew ? 'إضافة' : 'تعديل'} ${kindLabel(kind)}`,
      action_en: `${isNew ? 'Create' : 'Update'} ${kind}`,
      entity_type: kind === 'category' ? 'asset' : kind,
      entity_id: String(item.code ?? item.building_ar ?? item.name_ar ?? item.id ?? ''),
    })
    setEdit(null)
    setToast(t('common.updated'))
  }

  const remove = (kind: 'location' | 'department', id: string) => {
    if (kind === 'location' && db.assets.some(a => a.location_id === id)) {
      setToast(t('struct.hasAssets'))
      return
    }
    if (kind === 'department' && db.assets.some(a => a.department_id === id)) {
      setToast(t('struct.hasAssets'))
      return
    }
    if (!confirm(t('common.confirmDelete'))) return
    update(draft => {
      if (kind === 'location') draft.locations = draft.locations.filter(l => l.id !== id)
      else draft.departments = draft.departments.filter(d => d.id !== id)
    }, {
      action_ar: `حذف ${kindLabel(kind)}`, action_en: `Delete ${kind}`,
      entity_type: kind, entity_id: id,
    })
    setToast(t('common.deleted'))
  }

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="field"><label>{label}</label>{children}</div>
  )
  const setItem = (patch: Record<string, unknown>) =>
    setEdit(e => (e ? { ...e, item: { ...e.item, ...patch } } : e))

  return (
    <div>
      <div className="page-head">
        <h1>{t('struct.title')}</h1>
        {canManage && (
          <div className="actions">
            {tab === 'locations' && <button className="btn" onClick={() => setEdit({ kind: 'location', isNew: true, item: { id: uid('loc'), building_ar: '', building_en: '', floor: '', room_ar: '', room_en: '', active: true } })}>＋ {t('struct.addLocation')}</button>}
            {tab === 'departments' && <button className="btn" onClick={() => setEdit({ kind: 'department', isNew: true, item: { id: uid('dep'), code: '', name_ar: '', name_en: '', active: true } })}>＋ {t('struct.addDept')}</button>}
            {tab === 'categories' && <button className="btn" onClick={() => setEdit({ kind: 'category', isNew: true, item: { id: uid('cat'), name_ar: '', name_en: '', medical: true } })}>＋ {t('struct.addCategory')}</button>}
          </div>
        )}
      </div>

      <div className="tabs">
        <button className={tab === 'locations' ? 'active' : ''} onClick={() => setTab('locations')}>{t('struct.locations')}</button>
        <button className={tab === 'departments' ? 'active' : ''} onClick={() => setTab('departments')}>{t('struct.departments')}</button>
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>{t('struct.categories')}</button>
      </div>

      {tab === 'locations' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('struct.building')}</th><th>{t('struct.floor')}</th><th>{t('struct.wing')}</th><th>{t('struct.room')}</th><th>{t('common.department')}</th><th>{t('common.status')}</th><th></th></tr></thead>
              <tbody>
                {db.locations.map(l => (
                  <tr key={l.id}>
                    <td><strong>{lang === 'ar' ? l.building_ar : l.building_en}</strong></td>
                    <td>{l.floor}</td>
                    <td>{l.wing ?? '—'}</td>
                    <td>{lang === 'ar' ? l.room_ar : l.room_en}</td>
                    <td>{(() => { const d = db.departments.find(x => x.id === l.department_id); return d ? (lang === 'ar' ? d.name_ar : d.name_en) : '—' })()}</td>
                    <td><span className={`badge ${l.active ? 'green' : 'gray'}`}>{l.active ? t('users.active') : t('users.inactive')}</span></td>
                    <td>
                      {canManage && (
                        <>
                          <button className="btn sm secondary" onClick={() => setEdit({ kind: 'location', isNew: false, item: { ...l } })}>{t('common.edit')}</button>{' '}
                          <button className="btn sm danger" onClick={() => remove('location', l.id)}>{t('common.delete')}</button>
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

      {tab === 'departments' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('common.code')}</th><th>{t('common.name')}</th><th>{t('struct.manager')}</th><th>{t('struct.mainLocation')}</th><th>{t('common.status')}</th><th></th></tr></thead>
              <tbody>
                {db.departments.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.code}</strong></td>
                    <td>{lang === 'ar' ? d.name_ar : d.name_en}</td>
                    <td>{(() => { const u = db.users.find(x => x.id === d.manager_user_id); return u ? (lang === 'ar' ? u.full_name_ar : u.full_name_en) : '—' })()}</td>
                    <td>{(() => { const l = db.locations.find(x => x.id === d.main_location_id); return l ? (lang === 'ar' ? l.building_ar : l.building_en) : '—' })()}</td>
                    <td><span className={`badge ${d.active ? 'green' : 'gray'}`}>{d.active ? t('users.active') : t('users.inactive')}</span></td>
                    <td>
                      {canManage && (
                        <>
                          <button className="btn sm secondary" onClick={() => setEdit({ kind: 'department', isNew: false, item: { ...d } })}>{t('common.edit')}</button>{' '}
                          <button className="btn sm danger" onClick={() => remove('department', d.id)}>{t('common.delete')}</button>
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

      {tab === 'categories' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('common.name')}</th><th>{t('struct.medical')}</th><th>{t('common.total')}</th><th></th></tr></thead>
              <tbody>
                {db.categories.map(c => (
                  <tr key={c.id}>
                    <td><strong>{lang === 'ar' ? c.name_ar : c.name_en}</strong></td>
                    <td>{c.medical ? t('struct.medical') : t('struct.administrative')}</td>
                    <td>{db.assets.filter(a => a.category_id === c.id).length}</td>
                    <td>{canManage && <button className="btn sm secondary" onClick={() => setEdit({ kind: 'category', isNew: false, item: { ...c } })}>{t('common.edit')}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {edit && editing && (
        <Modal
          title={`${edit.isNew ? t('common.add') : t('common.edit')} — ${kindLabel(edit.kind)}`}
          onClose={() => setEdit(null)}
          footer={
            <>
              <button className="btn secondary" onClick={() => setEdit(null)}>{t('common.cancel')}</button>
              <button className="btn" onClick={save}>{t('common.save')}</button>
            </>
          }
        >
          <div className="form-grid">
            {edit.kind === 'location' && (
              <>
                <F label={`${t('struct.building')} (AR)`}><input value={String(editing.building_ar ?? '')} onChange={e => setItem({ building_ar: e.target.value })} /></F>
                <F label={`${t('struct.building')} (EN)`}><input dir="ltr" value={String(editing.building_en ?? '')} onChange={e => setItem({ building_en: e.target.value })} /></F>
                <F label={t('struct.floor')}><input value={String(editing.floor ?? '')} onChange={e => setItem({ floor: e.target.value })} /></F>
                <F label={t('struct.wing')}><input value={String(editing.wing ?? '')} onChange={e => setItem({ wing: e.target.value })} /></F>
                <F label={`${t('struct.room')} (AR)`}><input value={String(editing.room_ar ?? '')} onChange={e => setItem({ room_ar: e.target.value })} /></F>
                <F label={`${t('struct.room')} (EN)`}><input dir="ltr" value={String(editing.room_en ?? '')} onChange={e => setItem({ room_en: e.target.value })} /></F>
                <F label={t('common.department')}>
                  <select value={String(editing.department_id ?? '')} onChange={e => setItem({ department_id: e.target.value || undefined })}>
                    <option value="">{t('common.none')}</option>
                    {db.departments.map(d => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en}</option>)}
                  </select>
                </F>
                <F label={t('common.status')}>
                  <div className="checkbox-row"><input type="checkbox" checked={Boolean(editing.active)} onChange={e => setItem({ active: e.target.checked })} />{Boolean(editing.active) ? t('users.active') : t('users.inactive')}</div>
                </F>
              </>
            )}
            {edit.kind === 'department' && (
              <>
                <F label={t('common.code')}><input value={String(editing.code ?? '')} onChange={e => setItem({ code: e.target.value })} /></F>
                <F label="AR"><input value={String(editing.name_ar ?? '')} onChange={e => setItem({ name_ar: e.target.value })} /></F>
                <F label="EN"><input dir="ltr" value={String(editing.name_en ?? '')} onChange={e => setItem({ name_en: e.target.value })} /></F>
                <F label={t('struct.manager')}>
                  <select value={String(editing.manager_user_id ?? '')} onChange={e => setItem({ manager_user_id: e.target.value || undefined })}>
                    <option value="">{t('common.none')}</option>
                    {db.users.map(u => <option key={u.id} value={u.id}>{lang === 'ar' ? u.full_name_ar : u.full_name_en}</option>)}
                  </select>
                </F>
                <F label={t('struct.mainLocation')}>
                  <select value={String(editing.main_location_id ?? '')} onChange={e => setItem({ main_location_id: e.target.value || undefined })}>
                    <option value="">{t('common.none')}</option>
                    {db.locations.map(l => <option key={l.id} value={l.id}>{lang === 'ar' ? l.building_ar : l.building_en} / {lang === 'ar' ? l.room_ar : l.room_en}</option>)}
                  </select>
                </F>
                <F label={t('common.status')}>
                  <div className="checkbox-row"><input type="checkbox" checked={Boolean(editing.active)} onChange={e => setItem({ active: e.target.checked })} />{Boolean(editing.active) ? t('users.active') : t('users.inactive')}</div>
                </F>
              </>
            )}
            {edit.kind === 'category' && (
              <>
                <F label="AR"><input value={String(editing.name_ar ?? '')} onChange={e => setItem({ name_ar: e.target.value })} /></F>
                <F label="EN"><input dir="ltr" value={String(editing.name_en ?? '')} onChange={e => setItem({ name_en: e.target.value })} /></F>
                <F label={t('struct.medical')}>
                  <div className="checkbox-row"><input type="checkbox" checked={Boolean(editing.medical)} onChange={e => setItem({ medical: e.target.checked })} />{Boolean(editing.medical) ? t('struct.medical') : t('struct.administrative')}</div>
                </F>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
