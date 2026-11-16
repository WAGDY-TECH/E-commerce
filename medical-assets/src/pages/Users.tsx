import React, { useState } from 'react'
import { useI18n } from '../i18n'
import { useStore, uid } from '../store/AppStore'
import { Modal } from '../components/Modal'
import { PERMISSION_LIST } from '../data/seed'
import type { PermissionKey, Role, User } from '../types'

const PERMISSION_ENTRIES = (Object.entries(PERMISSION_LIST) as [PermissionKey, { ar: string; en: string }][])

type EditState = { kind: 'user' | 'role'; item: Record<string, unknown>; isNew: boolean } | null

export function UsersPage() {
  const { t, lang } = useI18n()
  const { db, update, setToast } = useStore()
  const [tab, setTab] = useState<'users' | 'roles'>('users')
  const [edit, setEdit] = useState<EditState>(null)
  const editing = edit?.item ?? null

  const roleName = (id: string) => {
    const r = db.roles.find(x => x.id === id)
    return r ? (lang === 'ar' ? r.name_ar : r.name_en) : '—'
  }
  const deptName = (id?: string) => {
    const d = db.departments.find(x => x.id === id)
    return d ? (lang === 'ar' ? d.name_ar : d.name_en) : '—'
  }

  const save = () => {
    if (!edit || !editing) return
    const { kind, item, isNew } = edit
    update(draft => {
      if (kind === 'user') {
        const idx = draft.users.findIndex(u => u.id === item.id)
        if (idx >= 0) draft.users[idx] = item as unknown as User
        else {
          const u = item as unknown as User
          draft.users.push({ ...u, created_at: u.created_at ?? new Date().toISOString() })
        }
      } else {
        const idx = draft.roles.findIndex(r => r.id === item.id)
        if (idx >= 0) draft.roles[idx] = item as unknown as Role
        else draft.roles.push(item as unknown as Role)
      }
    }, {
      action_ar: kind === 'user'
        ? (isNew ? 'إضافة مستخدم' : 'تعديل مستخدم')
        : 'تعديل صلاحيات الدور',
      action_en: kind === 'user' ? (isNew ? 'Create user' : 'Update user') : 'Update role permissions',
      entity_type: kind,
      entity_id: String(item.username ?? item.name_ar ?? item.id ?? ''),
      new_value: kind === 'role' ? JSON.stringify(item.permissions ?? []) : undefined,
    })
    setEdit(null)
    setToast(t('common.updated'))
  }

  const togglePerm = (p: PermissionKey) => {
    setEdit(e => {
      if (!e) return e
      const perms = ((e.item.permissions as PermissionKey[]) ?? []).slice()
      const idx = perms.indexOf(p)
      if (idx >= 0) perms.splice(idx, 1)
      else perms.push(p)
      return { ...e, item: { ...e.item, permissions: perms } }
    })
  }

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="field"><label>{label}</label>{children}</div>
  )
  const setItem = (patch: Record<string, unknown>) =>
    setEdit(e => (e ? { ...e, item: { ...e.item, ...patch } } : e))

  return (
    <div>
      <div className="page-head">
        <h1>{t('users.title')}</h1>
        <div className="actions">
          {tab === 'users' && <button className="btn" onClick={() => setEdit({ kind: 'user', isNew: true, item: { id: uid('u'), username: '', full_name_ar: '', full_name_en: '', email: '', password: '', role_id: db.roles[0]?.id ?? '', active: true, created_at: new Date().toISOString() } })}>＋ {t('users.addUser')}</button>}
          {tab === 'roles' && <button className="btn" onClick={() => setEdit({ kind: 'role', isNew: true, item: { id: uid('role'), name_ar: '', name_en: '', permissions: [], data_scope: 'department' } })}>＋ {t('users.addRole')}</button>}
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>{t('common.user')}</button>
        <button className={tab === 'roles' ? 'active' : ''} onClick={() => setTab('roles')}>{t('users.roles')}</button>
      </div>

      {tab === 'users' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('users.username')}</th><th>{t('common.name')}</th><th>{t('users.email')}</th><th>{t('common.role')}</th><th>{t('common.department')}</th><th>{t('common.status')}</th><th></th></tr></thead>
              <tbody>
                {db.users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.username}</strong></td>
                    <td>{lang === 'ar' ? u.full_name_ar : u.full_name_en}</td>
                    <td dir="ltr">{u.email}</td>
                    <td>{roleName(u.role_id)}</td>
                    <td>{deptName(u.department_id)}</td>
                    <td><span className={`badge ${u.active ? 'green' : 'gray'}`}>{u.active ? t('users.active') : t('users.inactive')}</span></td>
                    <td><button className="btn sm secondary" onClick={() => setEdit({ kind: 'user', isNew: false, item: { ...u } })}>{t('common.edit')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'roles' && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('common.role')}</th><th>{t('users.permissions')}</th><th>{t('users.dataScope')}</th><th></th></tr></thead>
              <tbody>
                {db.roles.map(r => (
                  <tr key={r.id}>
                    <td><strong>{lang === 'ar' ? r.name_ar : r.name_en}</strong></td>
                    <td>{r.permissions.length} / {PERMISSION_ENTRIES.length}</td>
                    <td>{t(`users.scope.${r.data_scope}`)}</td>
                    <td><button className="btn sm secondary" onClick={() => setEdit({ kind: 'role', isNew: false, item: { ...r, permissions: [...r.permissions] } })}>{t('common.edit')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {edit && editing && (
        <Modal
          title={edit.kind === 'user' ? t('users.addUser') : t('users.addRole')}
          wide
          onClose={() => setEdit(null)}
          footer={
            <>
              <button className="btn secondary" onClick={() => setEdit(null)}>{t('common.cancel')}</button>
              <button className="btn" onClick={save}>{t('common.save')}</button>
            </>
          }
        >
          {edit.kind === 'user' ? (
            <div className="form-grid">
              <F label={t('users.username')}><input dir="ltr" value={String(editing.username ?? '')} onChange={e => setItem({ username: e.target.value })} /></F>
              <F label={t('users.password')}><input dir="ltr" value={String(editing.password ?? '')} onChange={e => setItem({ password: e.target.value })} /></F>
              <F label={`${t('common.name')} (AR)`}><input value={String(editing.full_name_ar ?? '')} onChange={e => setItem({ full_name_ar: e.target.value })} /></F>
              <F label={`${t('common.name')} (EN)`}><input dir="ltr" value={String(editing.full_name_en ?? '')} onChange={e => setItem({ full_name_en: e.target.value })} /></F>
              <F label={t('users.email')}><input dir="ltr" value={String(editing.email ?? '')} onChange={e => setItem({ email: e.target.value })} /></F>
              <F label={t('common.role')}>
                <select value={String(editing.role_id ?? '')} onChange={e => setItem({ role_id: e.target.value })}>
                  {db.roles.map(r => <option key={r.id} value={r.id}>{lang === 'ar' ? r.name_ar : r.name_en}</option>)}
                </select>
              </F>
              <F label={t('common.department')}>
                <select value={String(editing.department_id ?? '')} onChange={e => setItem({ department_id: e.target.value || undefined })}>
                  <option value="">{t('common.none')}</option>
                  {db.departments.map(d => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en}</option>)}
                </select>
              </F>
              <F label={t('common.status')}>
                <div className="checkbox-row"><input type="checkbox" checked={Boolean(editing.active)} onChange={e => setItem({ active: e.target.checked })} />{Boolean(editing.active) ? t('users.active') : t('users.inactive')}</div>
              </F>
            </div>
          ) : (
            <>
              <div className="form-grid" style={{ marginBottom: 14 }}>
                <F label={`${t('common.role')} (AR)`}><input value={String(editing.name_ar ?? '')} onChange={e => setItem({ name_ar: e.target.value })} /></F>
                <F label={`${t('common.role')} (EN)`}><input dir="ltr" value={String(editing.name_en ?? '')} onChange={e => setItem({ name_en: e.target.value })} /></F>
                <F label={t('users.dataScope')}>
                  <select value={String(editing.data_scope ?? 'department')} onChange={e => setItem({ data_scope: e.target.value })}>
                    <option value="all">{t('users.scope.all')}</option>
                    <option value="department">{t('users.scope.department')}</option>
                    <option value="own">{t('users.scope.own')}</option>
                  </select>
                </F>
              </div>
              <label style={{ fontWeight: 600, fontSize: 13 }}>{t('users.permissions')}</label>
              <div className="permission-grid" style={{ marginTop: 8 }}>
                {PERMISSION_ENTRIES.map(([key, p]) => {
                  const perms = (editing.permissions as PermissionKey[]) ?? []
                  return (
                    <label key={key} className="checkbox-row">
                      <input type="checkbox" checked={perms.includes(key)} onChange={() => togglePerm(key)} />
                      {lang === 'ar' ? p.ar : p.en}
                    </label>
                  )
                })}
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
