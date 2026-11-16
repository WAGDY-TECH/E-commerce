import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useStore } from '../store/AppStore'
import { initials } from '../lib/util'
import type { PermissionKey } from '../types'

interface NavItem {
  to: string
  labelKey: string
  icon: string
  show: () => boolean
}

export function Layout() {
  const { t, lang, setLang } = useI18n()
  const { db, currentUser, currentRole, can, logout, toast, setToast, touchSession } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const userId = currentUser?.id ?? 'anon'
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(`mams.sidebar.${userId}`) === '1')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(`mams.sidebar.${userId}`, collapsed ? '1' : '0')
  }, [collapsed, userId])

  useEffect(() => { touchSession() }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(id)
  }, [toast, setToast])

  const anyMaint = can('maintenance.create') || can('maintenance.handle') || can('workorders.edit')
  const items: NavItem[] = [
    { to: '/', labelKey: 'nav.dashboard', icon: '📊', show: () => can('dashboard.view') },
    { to: '/assets', labelKey: 'nav.assets', icon: '🩺', show: () => can('assets.view') },
    { to: '/maintenance', labelKey: 'nav.maintenance', icon: '🔧', show: () => anyMaint },
    { to: '/calibration', labelKey: 'nav.calibration', icon: '🎯', show: () => can('calibration.record') || can('assets.view') },
    { to: '/transfers', labelKey: 'nav.transfers', icon: '🔄', show: () => can('transfers.create') || can('transfers.approve') || can('assets.view') },
    { to: '/structure', labelKey: 'nav.structure', icon: '🏢', show: () => can('structure.manage') || can('assets.view') },
    { to: '/vendors', labelKey: 'nav.vendors', icon: '📋', show: () => can('vendors.manage') || can('assets.view') },
    { to: '/reports', labelKey: 'nav.reports', icon: '📈', show: () => can('reports.view') },
    { to: '/notifications', labelKey: 'nav.notifications', icon: '🔔', show: () => true },
    { to: '/users', labelKey: 'nav.users', icon: '👥', show: () => can('users.manage') },
    { to: '/settings', labelKey: 'nav.settings', icon: '⚙️', show: () => can('settings.manage') },
    { to: '/audit', labelKey: 'nav.audit', icon: '🕵️', show: () => can('audit.view') },
  ]
  const visibleItems = items.filter(it => it.show())

  const unread = db.notifications.filter(
    n => !n.read && (n.user_id === 'all' || n.user_id === currentUser?.id),
  ).length

  const hospitalName = lang === 'ar' ? db.settings.hospital_name_ar : db.settings.hospital_name_en
  const displayName = currentUser ? (lang === 'ar' ? currentUser.full_name_ar : currentUser.full_name_en) : ''
  const roleName = currentRole ? (lang === 'ar' ? currentRole.name_ar : currentRole.name_en) : ''

  return (
    <div className={`app-shell${collapsed ? ' collapsed' : ''}`}>
      <aside className={`sidebar${mobileOpen ? '' : ' hidden-mobile'}`}>
        <div className="sidebar-brand">
          <span className="logo">＋</span>
          <span>{t('app.short')}</span>
        </div>
        <nav>
          {visibleItems.map(it => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="icon">{it.icon}</span>
              <span className="label">{t(it.labelKey)}</span>
              {it.to === '/notifications' && unread > 0 && <span className="nav-badge">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}>
            <span>{collapsed ? '»' : '«'}</span>
            <span className="label">{t(collapsed ? 'nav.expand' : 'nav.collapse')}</span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn hidden-desktop" onClick={() => setMobileOpen(o => !o)} aria-label="menu">☰</button>
          <div className="page-title">{hospitalName} · {t('app.name')}</div>
          <div className="no-print" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="icon-btn" title={t('topbar.language')} onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
              {lang === 'ar' ? 'EN' : 'ع'}
            </button>
            <button className="icon-btn" title={t('topbar.notifications')} onClick={() => navigate('/notifications')}>
              🔔{unread > 0 && <span className="dot-badge">{unread}</span>}
            </button>
            <div className="user-chip">
              <div className="avatar">{initials(displayName)}</div>
              <div className="meta">
                <div className="name">{displayName}</div>
                <div className="role">{roleName}</div>
              </div>
            </div>
            <button className="btn secondary sm" onClick={() => { logout(); navigate('/login') }}>{t('nav.logout')}</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export function RequirePerm({ perm, children }: { perm: PermissionKey | PermissionKey[]; children: React.ReactNode }) {
  const { can } = useStore()
  const { t } = useI18n()
  const ok = Array.isArray(perm) ? perm.some(p => can(p)) : can(perm)
  if (!ok) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="icon">🔒</div>
          <h2>{t('errors.403.title')}</h2>
          <p>{t('errors.403.text')}</p>
        </div>
      </div>
    )
  }
  return <>{children}</>
}
