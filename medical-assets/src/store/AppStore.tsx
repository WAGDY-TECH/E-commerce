import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AppNotification, AppSettings, Asset, AuditLogEntry, Database, Lang, MovementLog,
  PermissionKey, Role, User,
} from '../types'
import { seedDatabase } from '../data/seed'

const STORAGE_KEY = 'mams.db.v1'
const SESSION_KEY = 'mams.session.v1'

function loadDb(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Database
      if (parsed && parsed.assets && parsed.users) return parsed
    }
  } catch {
    /* corrupted storage falls through to reseed */
  }
  return seedDatabase()
}

function persist(db: Database) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* storage full: keep working in-memory */
  }
}

export interface Session {
  user_id: string
  last_activity: number
}

interface StoreValue {
  db: Database
  currentUser: User | null
  currentRole: Role | null
  login: (username: string, password: string) => 'ok' | 'bad' | 'locked'
  logout: (reason?: 'manual' | 'timeout') => void
  can: (perm: PermissionKey) => boolean
  inScope: (departmentId?: string, assignedTo?: string) => boolean
  scopedAssets: () => Asset[]
  scopedDepartments: () => string[]
  update: (mutator: (draft: Database) => void, audit?: { action_ar: string; action_en: string; entity_type: string; entity_id?: string; old_value?: string; new_value?: string }) => void
  audit: (action_ar: string, action_en: string, entity_type: string, entity_id?: string, old_value?: string, new_value?: string) => void
  logMovement: (asset_id: string, action_ar: string, action_en: string, details?: string) => void
  notify: (n: Omit<AppNotification, 'id' | 'at' | 'read'>) => void
  markNotificationsRead: (ids?: string[]) => void
  resetData: () => void
  toast: string | null
  setToast: (msg: string | null) => void
  sessionExpired: boolean
  touchSession: () => void
  lang: Lang
}

const StoreContext = createContext<StoreValue | null>(null)

let idCounter = 0
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`

export function StoreProvider({ children, lang }: { children: React.ReactNode; lang: Lang }) {
  const [db, setDb] = useState<Database>(loadDb)
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const [toast, setToast] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const dbRef = useRef(db)
  dbRef.current = db

  useEffect(() => { persist(db) }, [db])

  const currentUser = useMemo(
    () => (session ? db.users.find(u => u.id === session.user_id) ?? null : null),
    [session, db.users],
  )
  const currentRole = useMemo(
    () => (currentUser ? db.roles.find(r => r.id === currentUser.role_id) ?? null : null),
    [currentUser, db.roles],
  )

  const login = useCallback((username: string, password: string): 'ok' | 'bad' | 'locked' => {
    const key = 'mams.loginAttempts'
    const attempts = JSON.parse(localStorage.getItem(key) ?? '{"count":0,"until":0}')
    if (Date.now() < attempts.until) return 'locked'
    const user = dbRef.current.users.find(u => u.username === username.trim())
    if (!user || user.password !== password || !user.active) {
      const count = attempts.count + 1
      localStorage.setItem(key, JSON.stringify({ count, until: count >= 5 ? Date.now() + 60000 : 0 }))
      return 'bad'
    }
    localStorage.setItem(key, '{"count":0,"until":0}')
    const s: Session = { user_id: user.id, last_activity: Date.now() }
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    setSession(s)
    setSessionExpired(false)
    setDb(prev => {
      const entry: AuditLogEntry = {
        id: uid('al'), user_id: user.id, action_ar: 'تسجيل دخول', action_en: 'Login',
        entity_type: 'session', at: new Date().toISOString(), ip: '127.0.0.1',
      } as AuditLogEntry
      return { ...prev, audit_logs: [entry, ...prev.audit_logs] }
    })
    return 'ok'
  }, [])

  const logout = useCallback((reason: 'manual' | 'timeout' = 'manual') => {
    const s = session
    if (s) {
      setDb(prev => {
        const entry: AuditLogEntry = {
          id: uid('al'), user_id: s.user_id,
          action_ar: reason === 'timeout' ? 'خروج بسبب انتهاء الجلسة' : 'تسجيل خروج',
          action_en: reason === 'timeout' ? 'Logout (session timeout)' : 'Logout',
          entity_type: 'session', at: new Date().toISOString(), ip: '127.0.0.1',
        } as AuditLogEntry
        return { ...prev, audit_logs: [entry, ...prev.audit_logs] }
      })
    }
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    if (reason === 'timeout') setSessionExpired(true)
  }, [session])

  useEffect(() => {
    if (!session) return
    const interval = setInterval(() => {
      const timeoutMs = (dbRef.current.settings.session_timeout_minutes || 30) * 60000
      if (Date.now() - session.last_activity > timeoutMs) logout('timeout')
    }, 15000)
    return () => clearInterval(interval)
  }, [session, logout])

  const touchSession = useCallback(() => {
    setSession(prev => {
      if (!prev) return prev
      const s = { ...prev, last_activity: Date.now() }
      localStorage.setItem(SESSION_KEY, JSON.stringify(s))
      return s
    })
  }, [])

  const can = useCallback((perm: PermissionKey) => {
    if (!currentRole || !currentUser?.active) return false
    return currentRole.permissions.includes(perm)
  }, [currentRole, currentUser])

  const scopedDepartments = useCallback((): string[] => {
    if (!currentUser || !currentRole) return []
    if (currentRole.data_scope === 'all') return dbRef.current.departments.map(d => d.id)
    return currentUser.department_id ? [currentUser.department_id] : []
  }, [currentUser, currentRole])

  const inScope = useCallback((departmentId?: string, assignedTo?: string) => {
    if (!currentUser || !currentRole) return false
    if (currentRole.data_scope === 'all') return true
    if (currentRole.data_scope === 'own') return assignedTo === currentUser.id
    return !!departmentId && departmentId === currentUser.department_id
  }, [currentUser, currentRole])

  const scopedAssets = useCallback((): Asset[] => {
    const all = dbRef.current.assets.filter(a => !a.archived_at)
    return all.filter(a => inScope(a.department_id, a.assigned_to))
  }, [inScope])

  const audit = useCallback((
    action_ar: string, action_en: string, entity_type: string, entity_id?: string,
    old_value?: string, new_value?: string,
  ) => {
    const user = dbRef.current.users.find(u => u.id === session?.user_id)
    if (!user) return
    const entry: AuditLogEntry = {
      id: uid('al'), user_id: user.id, action_ar, action_en, entity_type, entity_id,
      old_value, new_value, at: new Date().toISOString(), ip: '127.0.0.1',
    } as AuditLogEntry
    setDb(prev => ({ ...prev, audit_logs: [entry, ...prev.audit_logs] }))
  }, [session])

  const logMovement = useCallback((asset_id: string, action_ar: string, action_en: string, details?: string) => {
    const user = dbRef.current.users.find(u => u.id === session?.user_id)
    if (!user) return
    const mv: MovementLog = {
      id: uid('mv'), asset_id, action_ar, action_en, details,
      user_id: user.id, at: new Date().toISOString(),
    } as MovementLog
    setDb(prev => ({ ...prev, movement_logs: [mv, ...prev.movement_logs] }))
  }, [session])

  const notify = useCallback((n: Omit<AppNotification, 'id' | 'at' | 'read'>) => {
    setDb(prev => ({
      ...prev,
      notifications: [{ ...n, id: uid('nt'), at: new Date().toISOString(), read: false } as AppNotification, ...prev.notifications],
    }))
  }, [])

  const update = useCallback((
    mutator: (draft: Database) => void,
    auditInfo?: { action_ar: string; action_en: string; entity_type: string; entity_id?: string; old_value?: string; new_value?: string },
  ) => {
    const user = dbRef.current.users.find(u => u.id === session?.user_id)
    setDb(prev => {
      const draft: Database = JSON.parse(JSON.stringify(prev))
      mutator(draft)
      if (user && auditInfo) {
        draft.audit_logs = [{
          id: uid('al'), user_id: user.id, action_ar: auditInfo.action_ar, action_en: auditInfo.action_en,
          entity_type: auditInfo.entity_type, entity_id: auditInfo.entity_id,
          old_value: auditInfo.old_value, new_value: auditInfo.new_value,
          at: new Date().toISOString(), ip: '127.0.0.1',
        } as AuditLogEntry, ...draft.audit_logs]
      }
      return draft
    })
  }, [session])

  const markNotificationsRead = useCallback((ids?: string[]) => {
    setDb(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        (!ids || ids.includes(n.id)) && (n.user_id === 'all' || n.user_id === session?.user_id) ? { ...n, read: true } : n),
    }))
  }, [session])

  const resetData = useCallback(() => {
    const fresh = seedDatabase()
    setDb(fresh)
    persist(fresh)
  }, [])

  const value: StoreValue = {
    db, currentUser, currentRole, login, logout, can, inScope, scopedAssets, scopedDepartments,
    update, audit, logMovement, notify, markNotificationsRead, resetData, toast, setToast,
    sessionExpired, touchSession, lang,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('StoreProvider missing')
  return ctx
}
