import React, { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useStore, uid } from '../store/AppStore'
import { DataTable, type Column } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { Modal } from '../components/Modal'
import { MultiSelect } from '../components/MultiSelect'
import { fmtDate, daysUntil, downloadCSV } from '../lib/util'
import { ASSET_STATUSES, type Asset } from '../types'

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') inQ = false
      else field += c
    } else if (c === '"') inQ = true
    else if (c === ',') { cur.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      cur.push(field); field = ''
      if (cur.some(f => f.trim() !== '')) rows.push(cur)
      cur = []
    } else field += c
  }
  if (field || cur.length) { cur.push(field); rows.push(cur) }
  return rows
}

const IMPORT_HEADERS = ['asset_code', 'name_ar', 'name_en', 'serial_number', 'category_id', 'department_id', 'location_id', 'status', 'purchase_date', 'purchase_cost', 'warranty_end_date', 'next_calibration_date']

interface ImportRow { data: Record<string, string>; errors: string[] }

export function AssetsPage() {
  const { t, lang } = useI18n()
  const { db, can, scopedAssets, update, setToast, notify } = useStore()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') ?? ''

  const [statuses, setStatuses] = useState<string[]>(params.get('status') ? [params.get('status')!] : [])
  const [category, setCategory] = useState('')
  const [department, setDepartment] = useState('')
  const [location, setLocation] = useState('')
  const [supplier, setSupplier] = useState('')
  const [purchaseFrom, setPurchaseFrom] = useState('')
  const [purchaseTo, setPurchaseTo] = useState('')
  const [warrantyTo, setWarrantyTo] = useState('')
  const [needsAction, setNeedsAction] = useState(false)
  const [noImage, setNoImage] = useState(false)
  const [noSerial, setNoSerial] = useState(false)
  const [warrantyExpired, setWarrantyExpired] = useState(false)
  const [noMaintenance, setNoMaintenance] = useState(false)

  const [importOpen, setImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null)
  const [importMode, setImportMode] = useState<'valid' | 'all'>('valid')
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const deptName = (id?: string) => {
    const d = db.departments.find(x => x.id === id)
    return d ? (lang === 'ar' ? d.name_ar : d.name_en) : '—'
  }
  const locLabel = (id?: string) => {
    const l = db.locations.find(x => x.id === id)
    return l ? `${lang === 'ar' ? l.building_ar : l.building_en} / ${lang === 'ar' ? l.room_ar : l.room_en}` : '—'
  }
  const catName = (id?: string) => {
    const c = db.categories.find(x => x.id === id)
    return c ? (lang === 'ar' ? c.name_ar : c.name_en) : '—'
  }
  const nameOf = (a: Asset) => (lang === 'ar' ? a.name_ar : a.name_en)

  const rows = useMemo(() => {
    let base = view === 'archive' ? db.assets.filter(a => a.archived_at) : scopedAssets()
    if (view === 'missing') base = base.filter(a => a.status === 'lost' || a.status === 'stolen')
    if (view === 'outOfService') base = base.filter(a => a.status === 'out_of_service')
    return base.filter(a => {
      if (statuses.length && !statuses.includes(a.status)) return false
      if (category && a.category_id !== category) return false
      if (department && a.department_id !== department) return false
      if (location && a.location_id !== location) return false
      if (supplier && a.supplier_id !== supplier) return false
      if (purchaseFrom && (!a.purchase_date || a.purchase_date < purchaseFrom)) return false
      if (purchaseTo && (!a.purchase_date || a.purchase_date > purchaseTo)) return false
      if (warrantyTo && (!a.warranty_end_date || a.warranty_end_date > warrantyTo)) return false
      if (warrantyExpired && (!a.warranty_end_date || new Date(a.warranty_end_date).getTime() >= Date.now())) return false
      if (noImage && a.image_url) return false
      if (noSerial && a.serial_number) return false
      if (noMaintenance && db.maintenance_requests.some(r => r.asset_id === a.id)) return false
      if (needsAction) {
        const calDue = a.calibration_required && a.next_calibration_date && (daysUntil(a.next_calibration_date) ?? 999) <= 30
        const wExpired = a.warranty_end_date && new Date(a.warranty_end_date).getTime() < Date.now()
        const open = db.maintenance_requests.some(r => r.asset_id === a.id && ['new', 'reviewed', 'assigned', 'in_progress', 'waiting_part', 'waiting_vendor'].includes(r.status))
        if (!calDue && !wExpired && !open) return false
      }
      return true
    })
  }, [db, view, statuses, category, department, location, supplier, purchaseFrom, purchaseTo, warrantyTo, needsAction, noImage, noSerial, warrantyExpired, noMaintenance, scopedAssets])

  const columns: Column<Asset>[] = [
    { key: 'code', label: t('assets.code'), value: a => a.asset_code, render: a => <strong>{a.asset_code}</strong> },
    { key: 'name', label: t('common.name'), value: a => nameOf(a), render: a => <a onClick={e => { e.stopPropagation(); navigate(`/assets/${a.id}`) }}>{nameOf(a)}</a> },
    { key: 'serial', label: t('assets.serial'), value: a => a.serial_number ?? '' },
    { key: 'category', label: t('assets.category'), value: a => catName(a.category_id), hideable: true },
    { key: 'dept', label: t('common.department'), value: a => deptName(a.department_id), hideable: true },
    { key: 'loc', label: t('common.location'), value: a => locLabel(a.location_id), hideable: true },
    { key: 'status', label: t('common.status'), value: a => a.status, render: a => <StatusBadge kind="asset" value={a.status} /> },
    { key: 'warranty', label: t('assets.warrantyEnd'), value: a => a.warranty_end_date ?? '', render: a => {
      const d = daysUntil(a.warranty_end_date)
      if (d === null) return '—'
      return <span className={`badge ${d < 0 ? 'red' : d <= 60 ? 'amber' : 'green'}`}>{fmtDate(a.warranty_end_date, lang)}</span>
    }, hideable: true },
    { key: 'cal', label: t('assets.nextCalibration'), value: a => a.next_calibration_date ?? '', render: a => {
      const d = daysUntil(a.next_calibration_date)
      if (d === null) return '—'
      return <span className={`badge ${d < 0 ? 'red' : d <= 30 ? 'amber' : 'gray'}`}>{fmtDate(a.next_calibration_date, lang)}</span>
    }, hideable: true },
  ]

  const setView = (v: string) => {
    const p = new URLSearchParams()
    if (v) p.set('view', v)
    setParams(p)
    setStatuses([])
  }

  const downloadTemplate = () => {
    downloadCSV('assets-import-template.csv', IMPORT_HEADERS, [[
      'AST-1001', 'جهاز مثال', 'Sample Device', 'SN-001', 'cat-monitors', 'dep-icu', 'loc-2', 'available', '2024-01-15', '25000', '2027-01-15', '2026-06-01',
    ]])
  }

  const onFile = (f: File | null) => {
    setImportError(null)
    if (!f) return
    const isCsv = f.type === 'text/csv' || f.name.toLowerCase().endsWith('.csv')
    if (!isCsv) { setImportError(t('validation.fileType')); return }
    if (f.size > 2 * 1024 * 1024) { setImportError(t('validation.fileSize')); return }
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const table = parseCsv(text)
      if (table.length < 2) { setImportError(t('common.noResults')); return }
      const headers = table[0].map(h => h.trim())
      const parsed: ImportRow[] = table.slice(1).map(cells => {
        const data: Record<string, string> = {}
        headers.forEach((h, i) => { data[h] = (cells[i] ?? '').trim() })
        const errors: string[] = []
        if (!data.asset_code) errors.push(t('validation.required') + ': asset_code')
        if (!data.name_ar) errors.push(t('validation.required') + ': name_ar')
        if (!data.name_en) errors.push(t('validation.required') + ': name_en')
        if (data.category_id && !db.categories.some(c => c.id === data.category_id)) errors.push(t('validation.required') + ': category_id')
        if (data.department_id && !db.departments.some(d => d.id === data.department_id)) errors.push(t('validation.required') + ': department_id')
        if (data.location_id && !db.locations.some(l => l.id === data.location_id)) errors.push(t('validation.required') + ': location_id')
        if (data.status && !ASSET_STATUSES.includes(data.status as never)) errors.push(t('validation.required') + ': status')
        if (data.asset_code && db.assets.some(a => a.asset_code === data.asset_code)) errors.push(t('validation.duplicateCode'))
        if (data.serial_number && db.assets.some(a => a.serial_number === data.serial_number)) errors.push(t('validation.duplicateSerial'))
        return { data, errors }
      })
      const seen = new Set<string>()
      parsed.forEach(r => {
        const code = r.data.asset_code
        if (code) {
          if (seen.has(code) && !r.errors.includes(t('validation.duplicateCode'))) r.errors.push(t('validation.duplicateCode'))
          seen.add(code)
        }
      })
      setImportRows(parsed)
    }
    reader.readAsText(f, 'utf-8')
  }

  const runImport = () => {
    if (!importRows) return
    const chosen = importMode === 'valid' ? importRows.filter(r => r.errors.length === 0) : importRows
    const now = new Date().toISOString()
    update(draft => {
      chosen.forEach(r => {
        const d = r.data
        const asset: Asset = {
          id: uid('a'),
          asset_code: d.asset_code || `AST-IMP-${draft.assets.length + 1}`,
          serial_number: d.serial_number || undefined,
          name_ar: d.name_ar || '—',
          name_en: d.name_en || '—',
          category_id: d.category_id || draft.categories[0].id,
          status: (ASSET_STATUSES as readonly string[]).includes(d.status) ? d.status as Asset['status'] : 'draft',
          risk_level: 'medium',
          clinical_use: true,
          calibration_required: !!d.next_calibration_date,
          department_id: d.department_id || draft.departments[0].id,
          location_id: d.location_id || draft.locations[0].id,
          purchase_date: d.purchase_date || undefined,
          purchase_cost: d.purchase_cost ? Number(d.purchase_cost) : undefined,
          warranty_end_date: d.warranty_end_date || undefined,
          next_calibration_date: d.next_calibration_date || undefined,
          created_at: now,
          updated_at: now,
        }
        draft.assets.push(asset)
      })
    }, {
      action_ar: 'استيراد أصول', action_en: 'Import assets', entity_type: 'asset',
      new_value: `${chosen.length}`,
    })
    setImportOpen(false)
    setImportRows(null)
    setToast(t('assets.importDone', { n: String(chosen.length) }))
    notify({
      type_ar: 'استيراد', type_en: 'Import',
      message_ar: `تم استيراد ${chosen.length} أصلًا`, message_en: `${chosen.length} assets imported`,
      severity: 'info', user_id: 'all', link: '/assets',
    })
  }

  const archiveAsset = (a: Asset) => {
    if (!confirm(t('common.confirmArchive'))) return
    update(draft => {
      const target = draft.assets.find(x => x.id === a.id)
      if (target) target.archived_at = new Date().toISOString()
    }, { action_ar: 'أرشفة أصل', action_en: 'Archive asset', entity_type: 'asset', entity_id: a.asset_code })
    setToast(t('common.archived'))
  }

  const validCount = importRows?.filter(r => r.errors.length === 0).length ?? 0

  return (
    <div>
      <div className="page-head">
        <h1>{t('assets.title')}</h1>
        <div className="actions">
          {can('assets.create') && <button className="btn" onClick={() => navigate('/assets/new')}>＋ {t('assets.add')}</button>}
          {can('assets.create') && <button className="btn secondary" onClick={() => { setImportRows(null); setImportError(null); setImportOpen(true) }}>{t('assets.import')}</button>}
          <button className="btn secondary no-print" onClick={() => window.print()}>🖨 {t('common.print')}</button>
        </div>
      </div>

      <div className="tabs no-print">
        <button className={view === '' ? 'active' : ''} onClick={() => setView('')}>{t('assets.title')}</button>
        <button className={view === 'archive' ? 'active' : ''} onClick={() => setView('archive')}>{t('assets.view.archive')}</button>
        <button className={view === 'missing' ? 'active' : ''} onClick={() => setView('missing')}>{t('assets.view.missing')}</button>
        <button className={view === 'outOfService' ? 'active' : ''} onClick={() => setView('outOfService')}>{t('assets.view.outOfService')}</button>
      </div>

      <div className="card no-print">
        <div className="filter-bar">
          <MultiSelect
            placeholder={t('assets.filter.multiStatus')}
            options={ASSET_STATUSES.map(s => ({ value: s, label: t(`assets.status.${s}`) }))}
            selected={statuses}
            onChange={setStatuses}
          />
          <div className="field">
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">{t('assets.filter.category')}</option>
              {db.categories.map(c => <option key={c.id} value={c.id}>{lang === 'ar' ? c.name_ar : c.name_en}</option>)}
            </select>
          </div>
          <div className="field">
            <select value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="">{t('assets.filter.department')}</option>
              {db.departments.map(d => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en}</option>)}
            </select>
          </div>
          <div className="field">
            <select value={location} onChange={e => setLocation(e.target.value)}>
              <option value="">{t('assets.filter.location')}</option>
              {db.locations.map(l => <option key={l.id} value={l.id}>{lang === 'ar' ? l.building_ar : l.building_en} / {lang === 'ar' ? l.room_ar : l.room_en}</option>)}
            </select>
          </div>
          <div className="field">
            <select value={supplier} onChange={e => setSupplier(e.target.value)}>
              <option value="">{t('assets.filter.supplier')}</option>
              {db.suppliers.map(s => <option key={s.id} value={s.id}>{lang === 'ar' ? s.name_ar : s.name_en}</option>)}
            </select>
          </div>
          <div className="field"><input type="date" title={t('assets.filter.purchaseFrom')} value={purchaseFrom} onChange={e => setPurchaseFrom(e.target.value)} /></div>
          <div className="field"><input type="date" title={t('assets.filter.purchaseTo')} value={purchaseTo} onChange={e => setPurchaseTo(e.target.value)} /></div>
          <div className="field"><input type="date" title={t('assets.filter.warrantyTo')} value={warrantyTo} onChange={e => setWarrantyTo(e.target.value)} /></div>
          <label className="checkbox-row"><input type="checkbox" checked={needsAction} onChange={e => setNeedsAction(e.target.checked)} />{t('assets.filter.needsAction')}</label>
          <label className="checkbox-row"><input type="checkbox" checked={noImage} onChange={e => setNoImage(e.target.checked)} />{t('assets.filter.noImage')}</label>
          <label className="checkbox-row"><input type="checkbox" checked={noSerial} onChange={e => setNoSerial(e.target.checked)} />{t('assets.filter.noSerial')}</label>
          <label className="checkbox-row"><input type="checkbox" checked={warrantyExpired} onChange={e => setWarrantyExpired(e.target.checked)} />{t('assets.filter.warrantyExpired')}</label>
          <label className="checkbox-row"><input type="checkbox" checked={noMaintenance} onChange={e => setNoMaintenance(e.target.checked)} />{t('assets.filter.noMaintenance')}</label>
          <button className="btn ghost sm" onClick={() => { setStatuses([]); setCategory(''); setDepartment(''); setLocation(''); setSupplier(''); setPurchaseFrom(''); setPurchaseTo(''); setWarrantyTo(''); setNeedsAction(false); setNoImage(false); setNoSerial(false); setWarrantyExpired(false); setNoMaintenance(false) }}>{t('common.reset')}</button>
        </div>
      </div>

      <div className="card">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={a => a.id}
          searchValue={a => `${a.asset_code} ${a.serial_number ?? ''} ${nameOf(a)} ${a.brand ?? ''} ${a.model ?? ''}`}
          exportBaseName="assets"
          onRowClick={a => navigate(`/assets/${a.id}`)}
        />
      </div>

      {importOpen && (
        <Modal
          title={t('assets.importTitle')}
          wide
          onClose={() => setImportOpen(false)}
          footer={
            <>
              <button className="btn secondary" onClick={() => setImportOpen(false)}>{t('common.cancel')}</button>
              <button className="btn" disabled={!importRows || validCount === 0} onClick={runImport}>{t('assets.importRun')}</button>
            </>
          }
        >
          <div className="filter-bar">
            <button className="btn secondary sm" onClick={downloadTemplate}>⬇ {t('assets.importTemplate')}</button>
            <button className="btn secondary sm" onClick={() => fileRef.current?.click()}>{t('assets.importBrowse')}</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => onFile(e.target.files?.[0] ?? null)} />
            <div className="field">
              <select value={importMode} onChange={e => setImportMode(e.target.value as 'valid' | 'all')}>
                <option value="valid">{t('assets.importModeValidOnly')}</option>
                <option value="all">{t('assets.importModeAll')}</option>
              </select>
            </div>
          </div>
          {importError && <div className="login-error">{importError}</div>}
          {importRows && (
            <>
              <p>
                {t('assets.importValidRows')}: <strong>{validCount}</strong> / {importRows.length}
                {importRows.some(r => r.errors.length > 0) && <> · <span className="badge red">{t('assets.importErrors')}: {importRows.filter(r => r.errors.length > 0).length}</span></>}
              </p>
              <div className="table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table className="table">
                  <thead><tr><th>#</th><th>{t('assets.code')}</th><th>{t('common.name')}</th><th>{t('common.status')}</th></tr></thead>
                  <tbody>
                    {importRows.map((r, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{r.data.asset_code || '—'}</td>
                        <td>{r.data.name_ar || r.data.name_en || '—'}</td>
                        <td>
                          {r.errors.length === 0
                            ? <span className="badge green">✓</span>
                            : <span className="badge red" title={r.errors.join(' · ')}>{r.errors[0]}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
