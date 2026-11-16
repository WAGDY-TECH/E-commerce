import React from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { I18nProvider, useI18n } from './i18n'
import { StoreProvider, useStore } from './store/AppStore'
import { Layout, RequirePerm } from './components/Layout'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { AssetsPage } from './pages/Assets'
import { AssetFormPage } from './pages/AssetForm'
import { AssetDetailsPage } from './pages/AssetDetails'
import { MaintenancePage } from './pages/Maintenance'
import { CalibrationPage } from './pages/Calibration'
import { TransfersPage } from './pages/Transfers'
import { StructurePage } from './pages/Structure'
import { VendorsPage } from './pages/Vendors'
import { UsersPage } from './pages/Users'
import { ReportsPage } from './pages/Reports'
import { NotificationsPage } from './pages/Notifications'
import { AuditPage } from './pages/AuditLog'
import { SettingsPage } from './pages/Settings'

function SessionExpired() {
  const { t } = useI18n()
  const navigate = useNavigate()
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="empty-state">
          <div className="icon">⏳</div>
          <h2>{t('errors.session.title')}</h2>
          <p>{t('errors.session.text')}</p>
          <button className="btn" onClick={() => navigate('/login')}>{t('login.submit')}</button>
        </div>
      </div>
    </div>
  )
}

function NotFound() {
  const { t } = useI18n()
  return (
    <div className="card">
      <div className="empty-state">
        <div className="icon">🧭</div>
        <h2>{t('errors.404.title')}</h2>
        <p>{t('errors.404.text')}</p>
      </div>
    </div>
  )
}

function Shell() {
  const { currentUser, sessionExpired } = useStore()
  if (sessionExpired) return <SessionExpired />
  if (!currentUser) return <Navigate to="/login" replace />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<RequirePerm perm="dashboard.view"><DashboardPage /></RequirePerm>} />
        <Route path="/assets" element={<RequirePerm perm="assets.view"><AssetsPage /></RequirePerm>} />
        <Route path="/assets/new" element={<RequirePerm perm="assets.create"><AssetFormPage /></RequirePerm>} />
        <Route path="/assets/:id" element={<RequirePerm perm="assets.view"><AssetDetailsPage /></RequirePerm>} />
        <Route path="/assets/:id/edit" element={<RequirePerm perm="assets.edit"><AssetFormPage /></RequirePerm>} />
        <Route path="/maintenance" element={<RequirePerm perm={['maintenance.create', 'maintenance.handle', 'workorders.edit']}><MaintenancePage /></RequirePerm>} />
        <Route path="/calibration" element={<RequirePerm perm={['calibration.record', 'assets.view']}><CalibrationPage /></RequirePerm>} />
        <Route path="/transfers" element={<RequirePerm perm={['transfers.create', 'transfers.approve', 'assets.view']}><TransfersPage /></RequirePerm>} />
        <Route path="/structure" element={<RequirePerm perm={['structure.manage', 'assets.view']}><StructurePage /></RequirePerm>} />
        <Route path="/vendors" element={<RequirePerm perm={['vendors.manage', 'assets.view']}><VendorsPage /></RequirePerm>} />
        <Route path="/reports" element={<RequirePerm perm="reports.view"><ReportsPage /></RequirePerm>} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/users" element={<RequirePerm perm="users.manage"><UsersPage /></RequirePerm>} />
        <Route path="/settings" element={<RequirePerm perm="settings.manage"><SettingsPage /></RequirePerm>} />
        <Route path="/audit" element={<RequirePerm perm="audit.view"><AuditPage /></RequirePerm>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function AuthGate() {
  const { currentUser } = useStore()
  return currentUser ? <Navigate to="/" replace /> : <LoginPage />
}

function StoreBridge() {
  const { lang } = useI18n()
  return (
    <StoreProvider lang={lang}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<AuthGate />} />
          <Route path="*" element={<Shell />} />
        </Routes>
      </HashRouter>
    </StoreProvider>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <StoreBridge />
    </I18nProvider>
  )
}
