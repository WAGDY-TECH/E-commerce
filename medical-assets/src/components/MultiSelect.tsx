import React, { useState } from 'react'

export function MultiSelect({ options, selected, onChange, placeholder }: {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v])
  const label = selected.length === 0
    ? placeholder
    : selected.length <= 2
      ? options.filter(o => selected.includes(o.value)).map(o => o.label).join(', ')
      : `${placeholder} (${selected.length})`
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="btn secondary sm" style={{ minHeight: 36, maxWidth: 220 }} onClick={() => setOpen(o => !o)}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span> ▾
      </button>
      {open && (
        <div className="card no-print" style={{ position: 'absolute', zIndex: 40, margin: 0, minWidth: 220, maxHeight: 260, overflowY: 'auto', padding: 10 }}>
          {options.map(o => (
            <label key={o.value} className="checkbox-row">
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
              {o.label}
            </label>
          ))}
          {selected.length > 0 && (
            <button type="button" className="btn ghost sm" onClick={() => onChange([])}>✕</button>
          )}
        </div>
      )}
    </div>
  )
}
