import React, { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { downloadCSV } from '../lib/util'

export interface Column<T> {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
  value?: (row: T) => string | number
  hideable?: boolean
}

export function DataTable<T>({ rows, columns, rowKey, pageSize = 10, searchValue, exportBaseName, onRowClick, emptyText }: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  pageSize?: number
  searchValue?: (row: T) => string
  exportBaseName?: string
  onRowClick?: (row: T) => void
  emptyText?: string
}) {
  const { t, lang } = useI18n()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [page, setPage] = useState(1)
  const [hidden, setHidden] = useState<string[]>([])
  const [colsOpen, setColsOpen] = useState(false)

  const visibleColumns = columns.filter(c => !hidden.includes(c.key))

  const filtered = useMemo(() => {
    let out = rows
    if (query.trim() && searchValue) {
      const q = query.trim().toLowerCase()
      out = out.filter(r => searchValue(r).toLowerCase().includes(q))
    }
    if (sort) {
      const col = columns.find(c => c.key === sort.key)
      if (col?.value) {
        out = [...out].sort((a, b) => {
          const va = col.value!(a)
          const vb = col.value!(b)
          if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sort.dir
          return String(va).localeCompare(String(vb), lang === 'ar' ? 'ar' : 'en') * sort.dir
        })
      }
    }
    return out
  }, [rows, query, sort, columns, searchValue, lang])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pages)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const exportCsv = () => {
    if (!exportBaseName) return
    downloadCSV(
      `${exportBaseName}-${new Date().toISOString().slice(0, 10)}.csv`,
      visibleColumns.map(c => c.label),
      filtered.map(r => visibleColumns.map(c => (c.value ? c.value(r) : ''))),
    )
  }

  const toggleCol = (key: string) =>
    setHidden(h => (h.includes(key) ? h.filter(k => k !== key) : [...h, key]))

  return (
    <div>
      {(searchValue || exportBaseName || columns.some(c => c.hideable)) && (
        <div className="filter-bar">
          {searchValue && (
            <div className="field search-field">
              <input
                className="search-input"
                placeholder={t('common.search')}
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(1) }}
              />
            </div>
          )}
          {columns.some(c => c.hideable) && (
            <div style={{ position: 'relative' }}>
              <button className="btn secondary sm" onClick={() => setColsOpen(o => !o)}>{t('common.columns')}</button>
              {colsOpen && (
                <div className="card no-print" style={{ position: 'absolute', zIndex: 40, margin: 0, minWidth: 200, padding: 10 }}>
                  {columns.filter(c => c.hideable).map(c => (
                    <label key={c.key} className="checkbox-row">
                      <input type="checkbox" checked={!hidden.includes(c.key)} onChange={() => toggleCol(c.key)} />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          {exportBaseName && (
            <button className="btn secondary sm" onClick={exportCsv}>⬇ {t('common.export')}</button>
          )}
        </div>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {visibleColumns.map(c => (
                <th
                  key={c.key}
                  style={c.value ? { cursor: 'pointer' } : undefined}
                  onClick={c.value ? () => setSort(s => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 })) : undefined}
                >
                  {c.label}{sort?.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(row => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? 'clickable' : ''}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {visibleColumns.map(c => (
                  <td key={c.key}>{c.render ? c.render(row) : (c.value ? c.value(row) : '—')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {pageRows.length === 0 && <div className="empty-state">{emptyText ?? t('common.noResults')}</div>}
      </div>
      {pages > 1 && (
        <div className="pagination">
          <span>{t('common.page', { page: String(safePage), pages: String(pages) })} · {t('common.total')}: {filtered.length}</span>
          <button className="btn secondary sm" disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}>{t('common.prev')}</button>
          <button className="btn secondary sm" disabled={safePage >= pages} onClick={() => setPage(p => p + 1)}>{t('common.next')}</button>
        </div>
      )}
    </div>
  )
}
