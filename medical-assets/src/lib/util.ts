import type { Lang } from '../types'

export function fmtDate(iso: string | undefined | null, lang: Lang): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

export function fmtDateTime(iso: string | undefined | null, lang: Lang): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${fmtDate(iso, lang)} ${d.toLocaleTimeString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

export function fmtMoney(amount: number | undefined, currency: string | undefined): string {
  if (amount === undefined || amount === null) return '—'
  return `${amount.toLocaleString('en-US')} ${currency ?? 'SAR'}`
}

export function daysUntil(iso: string | undefined | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

export function todayISO(): string {
  return new Date().toISOString()
}

export function dateInput(iso: string | undefined | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function csvCell(v: string | number | undefined | null): string {
  const s = String(v ?? '')
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number | undefined | null)[][]) {
  const lines = [headers, ...rows].map(r => r.map(csvCell).join(','))
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('')
}
