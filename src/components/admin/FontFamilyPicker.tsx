'use client'

import { SelectHTMLAttributes } from 'react'

const FONT_FAMILIES = [
  { value: '', label: '默认' },
  { value: 'font-sans', label: 'Sans (无衬线)' },
  { value: 'font-serif', label: 'Serif (衬线)' },
  { value: 'font-mono', label: 'Mono (等宽)' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
]

export function FontFamilyPicker({
  name,
  defaultValue,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
      {...props}
    >
      {FONT_FAMILIES.map((font) => (
        <option key={font.value} value={font.value}>
          {font.label}
        </option>
      ))}
    </select>
  )
}
