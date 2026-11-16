import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useStore } from '../store/AppStore'
import { fmtDateTime } from '../lib/util'

export function NotificationsPage() {
  const { t, lang } = useI18n()
  const { db, currentUser, markNotificationsRead } = useStore()
  const navigate = useNavigate()

  const items = useMemo(() =>
    db.notifications
      .filter(n => n.user_id === 'all' || n.user_id === currentUser?.id)
      .sort((a, b) => b.at.localeCompare(a.at)),
  [db.notifications, currentUser])

  const unread = items.filter(n => !n.read).length

  const icon = (sev: string) => (sev === 'danger' ? '⛔' : sev === 'warning' ? '⚠️' : 'ℹ️')

  return (
    <div>
      <div className="page-head">
        <h1>{t('notif.title')}</h1>
        <div className="actions">
          {unread > 0 && <button className="btn secondary" onClick={() => markNotificationsRead()}>{t('notif.markAllRead')} ({unread})</button>}
        </div>
      </div>
      <div className="card">
        {items.map(n => (
          <div
            key={n.id}
            className={`notif-item${n.read ? '' : ' unread'}`}
            style={{ cursor: n.link ? 'pointer' : 'default' }}
            onClick={() => {
              markNotificationsRead([n.id])
              if (n.link) navigate(n.link)
            }}
          >
            <span className="nicon">{icon(n.severity)}</span>
            <div style={{ flex: 1 }}>
              <div><strong>{lang === 'ar' ? n.type_ar : n.type_en}</strong> — {lang === 'ar' ? n.message_ar : n.message_en}</div>
              <div className="when">{fmtDateTime(n.at, lang)}</div>
            </div>
            {!n.read && <span className="badge blue">{t('notif.unread')}</span>}
          </div>
        ))}
        {items.length === 0 && <div className="empty-state"><div className="icon">🔔</div>{t('notif.empty')}</div>}
      </div>
    </div>
  )
}
