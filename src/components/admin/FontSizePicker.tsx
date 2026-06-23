'use client'

import { SelectHTMLAttributes } from 'react'

const FONT_SIZES = [
  { value: '', label: '默认' },
  { value: 'text-xs', label: 'XS (12px)' },
  { value: 'text-sm', label: 'SM (14px)' },
  { value: 'text-base', label: 'Base (16px)' },
  { value: 'text-lg', label: 'LG (18px)' },
  { value: 'text-xl', label: 'XL (20px)' },
  { value: 'text-2xl', label: '2XL (24px)' },
  { value: 'text-3xl', label: '3XL (30px)' },
  { value: 'text-4xl', label: '4XL (36px)' },
  { value: 'text-5xl', label: '5XL (48px)' },
  { value: 'text-6xl', label: '6XL (60px)' },
  { value: 'text-7xl', label: '7XL (72px)' },
  { value: 'text-8xl', label: '8XL (96px)' },
  { value: 'text-9xl', label: '9XL (128px)' },
]

export function FontSizePicker({
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
      {FONT_SIZES.map((size) => (
        <option key={size.value} value={size.value}>
          {size.label}
        </option>
      ))}
    </select>
  )
}
