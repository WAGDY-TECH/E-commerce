import React, { useState } from 'react'
import { useI18n } from '../i18n'
import { useStore } from '../store/AppStore'

export function SettingsPage() {
  const { t, lang, setLang } = useI18n()
  const { db, update, setToast, resetData } = useStore()
  const [form, setForm] = useState({
    hospital_name_ar: db.settings.hospital_name_ar,
    hospital_name_en: db.settings.hospital_name_en,
    session_timeout_minutes: db.settings.session_timeout_minutes,
    reminders: (db.settings.calibration_reminders ?? [90, 30, 7, 0]).join(', '),
  })

  const save = () => {
    const reminders = form.reminders.split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n) && n >= 0)
    update(draft => {
      draft.settings = {
        ...draft.settings,
        hospital_name_ar: form.hospital_name_ar,
        hospital_name_en: form.hospital_name_en,
        session_timeout_minutes: form.session_timeout_minutes,
        calibration_reminders: reminders,
      }
    }, {
      action_ar: 'تعديل الإعدادات', action_en: 'Update settings', entity_type: 'settings',
      new_value: JSON.stringify({ timeout: form.session_timeout_minutes, reminders }),
    })
    setToast(t('settings.saved'))
  }

  const backup = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mams-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="page-head">
        <h1>{t('settings.title')}</h1>
        <div className="actions"><button className="btn" onClick={save}>{t('common.save')}</button></div>
      </div>

      <fieldset className="section-box">
        <legend>{t('settings.general')}</legend>
        <div className="form-grid">
          <div className="field"><label>{t('settings.hospitalNameAr')}</label>
            <input value={form.hospital_name_ar} onChange={e => setForm(f => ({ ...f, hospital_name_ar: e.target.value }))} /></div>
          <div className="field"><label>{t('settings.hospitalNameEn')}</label>
            <input dir="ltr" value={form.hospital_name_en} onChange={e => setForm(f => ({ ...f, hospital_name_en: e.target.value }))} /></div>
          <div className="field"><label>{t('settings.language')}</label>
            <select value={lang} onChange={e => setLang(e.target.value as 'ar' | 'en')}>
              <option value="ar">العربية (RTL)</option>
              <option value="en">English (LTR)</option>
            </select></div>
        </div>
      </fieldset>

      <fieldset className="section-box">
        <legend>{t('settings.reminders')}</legend>
        <div className="form-grid">
          <div className="field"><label>{t('cal.dueDate')}</label>
            <input value={form.reminders} onChange={e => setForm(f => ({ ...f, reminders: e.target.value }))} placeholder="90, 30, 7, 0" /></div>
          <div className="field"><label>{t('settings.sessionTimeout')}</label>
            <input type="number" min="5" value={form.session_timeout_minutes} onChange={e => setForm(f => ({ ...f, session_timeout_minutes: Number(e.target.value) }))} /></div>
        </div>
      </fieldset>

      <fieldset className="section-box">
        <legend>{t('settings.backup')}</legend>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn secondary" onClick={backup}>⬇ {t('settings.downloadBackup')}</button>
          <button className="btn danger" onClick={() => { if (confirm(t('settings.resetConfirm'))) { resetData(); setToast(t('settings.resetData')) } }}>
            ↺ {t('settings.resetData')}
          </button>
        </div>
      </fieldset>

      <fieldset className="section-box">
        <legend>{t('settings.about')}</legend>
        <div className="detail-grid">
          <div className="item"><div className="k">{t('app.name')}</div><div className="v">v1.0</div></div>
          <div className="item"><div className="k">Storage</div><div className="v">localStorage (mams.db.v1)</div></div>
          <div className="item"><div className="k">Security</div><div className="v">{lang === 'ar' ? 'عرض تجريبي — كلمات المرور غير مشفّرة' : 'Demo build — passwords stored in plain text'}</div></div>
        </div>
      </fieldset>
    </div>
  )
}
