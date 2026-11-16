import React, { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { useStore } from '../store/AppStore'
import { DataTable, type Column } from '../components/DataTable'
import { fmtDateTime } from '../lib/util'
import type { AuditLogEntry } from '../types'

export function AuditPage() {
  const { t, lang } = useI18n()
  const { db } = useStore()
  const [user, setUser] = useState('')
  const [entity, setEntity] = useState('')
  const [q, setQ] = useState('')

  const rows = useMemo(() =>
    db.audit_logs.filter(l => {
      if (user && l.user_id !== user) return false
      if (entity && l.entity_type !== entity) return false
      if (q.trim()) {
        const hay = `${l.action_ar} ${l.action_en} ${l.entity_id ?? ''} ${l.old_value ?? ''} ${l.new_value ?? ''}`.toLowerCase()
        if (!hay.includes(q.trim().toLowerCase())) return false
      }
      return true
    }),
  [db.audit_logs, user, entity, q])

  const entityTypes = useMemo(() => [...new Set(db.audit_logs.map(l => l.entity_type))], [db.audit_logs])

  const columns: Column<AuditLogEntry>[] = [
    { key: 'at', label: t('audit.at'), value: r => r.at, render: r => fmtDateTime(r.at, lang) },
    { key: 'user', label: t('audit.user'), value: r => { const u = db.users.find(x => x.id === r.user_id); return u ? (lang === 'ar' ? u.full_name_ar : u.full_name_en) : r.user_id } },
    { key: 'action', label: t('audit.action'), value: r => lang === 'ar' ? r.action_ar : r.action_en },
    { key: 'entity', label: t('audit.entity'), value: r => `${t(`entity.${r.entity_type}`)}${r.entity_id ? ` · ${r.entity_id}` : ''}` },
    { key: 'old', label: t('audit.oldValue'), value: r => r.old_value ?? '', hideable: true },
    { key: 'new', label: t('audit.newValue'), value: r => r.new_value ?? '', hideable: true },
    { key: 'ip', label: t('audit.ip'), value: r => r.ip, hideable: true },
  ]

  return (
    <div>
      <div className="page-head">
        <h1>{t('audit.title')}</h1>
      </div>
      <div className="card">
        <div className="filter-bar">
          <div className="field search-field">
            <input className="search-input" placeholder={t('common.search')} value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="field">
            <select value={user} onChange={e => setUser(e.target.value)}>
              <option value="">{t('audit.filter.user')}</option>
              {db.users.map(u => <option key={u.id} value={u.id}>{lang === 'ar' ? u.full_name_ar : u.full_name_en}</option>)}
            </select>
          </div>
          <div className="field">
            <select value={entity} onChange={e => setEntity(e.target.value)}>
              <option value="">{t('audit.filter.entity')}</option>
              {entityTypes.map(et => <option key={et} value={et}>{t(`entity.${et}`)}</option>)}
            </select>
          </div>
          <button className="btn ghost sm" onClick={() => { setUser(''); setEntity(''); setQ('') }}>{t('common.reset')}</button>
        </div>
        <DataTable rows={rows} columns={columns} rowKey={r => r.id} pageSize={15} exportBaseName="audit-log" />
      </div>
    </div>
  )
}
