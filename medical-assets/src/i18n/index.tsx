import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Lang } from '../types'
import { ar } from './ar'
import { en } from './en'

const dictionaries: Record<Lang, Record<string, string>> = { ar, en }

interface I18nContextValue {
  lang: Lang
  dir: 'rtl' | 'ltr'
  setLang: (l: Lang) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('mams.lang')
    return saved === 'en' ? 'en' : 'ar'
  })

  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    localStorage.setItem('mams.lang', lang)
  }, [lang, dir])

  const setLang = (l: Lang) => setLangState(l)

  const t = (key: string, params?: Record<string, string | number>) => {
    let text = dictionaries[lang][key] ?? dictionaries.en[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
    }
    return text
  }

  return (
    <I18nContext.Provider value={{ lang, dir, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('I18nProvider missing')
  return ctx
}
