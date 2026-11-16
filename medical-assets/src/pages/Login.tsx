import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useStore } from '../store/AppStore'

export function LoginPage() {
  const { t, lang, setLang } = useI18n()
  const { db, login } = useStore()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const res = login(username, password)
    if (res === 'ok') navigate('/')
    else if (res === 'locked') setError(t('login.locked'))
    else setError(t('login.error'))
  }

  const hospital = lang === 'ar' ? db.settings.hospital_name_ar : db.settings.hospital_name_en

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <span className="logo">＋</span>
          <div>
            <h2 style={{ margin: 0 }}>{t('app.name')}</h2>
            <small style={{ color: 'var(--text-secondary)' }}>{hospital}</small>
          </div>
          <button className="btn secondary sm" style={{ marginInlineStart: 'auto' }} onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
        </div>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>{t('login.username')}</label>
            <input value={username} onChange={e => setUsername(e.target.value)} autoFocus autoComplete="username" />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label>{t('login.password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <button className="btn" style={{ width: '100%', justifyContent: 'center' }} type="submit">{t('login.submit')}</button>
        </form>
        <div className="demo-accounts">
          <small style={{ color: 'var(--text-secondary)' }}>{t('login.demoAccounts')}</small>
          {db.users.filter(u => u.active).map(u => {
            const role = db.roles.find(r => r.id === u.role_id)
            return (
              <button key={u.id} onClick={() => { setUsername(u.username); setPassword(u.password); setError(null) }}>
                <span className="u">{u.username} / {u.password}</span>
                <span className="r"> — {lang === 'ar' ? u.full_name_ar : u.full_name_en} ({role ? (lang === 'ar' ? role.name_ar : role.name_en) : ''})</span>
              </button>
            )
          })}
          <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: 6 }}>{t('login.demoHint')}</small>
        </div>
      </div>
    </div>
  )
}
