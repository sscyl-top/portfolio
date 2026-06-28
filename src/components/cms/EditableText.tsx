'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, X, Type, Palette, Bold, Save } from 'lucide-react'
import { FONT_FAMILIES, FONT_SIZES, FONT_WEIGHTS } from '@/lib/fonts'

type EditableTextProps = {
  textKey: string
  fallback: string
  className?: string
  initialContent?: string
  initialStyles?: Record<string, string>
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'strong' | 'em' | 'a'
  href?: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function EditableText({
  textKey,
  fallback,
  className,
  initialContent,
  initialStyles,
  as: Tag = 'span',
  href,
}: EditableTextProps) {
  const [content, setContent] = useState(initialContent ?? fallback)
  const [styles, setStyles] = useState<Record<string, string>>(initialStyles ?? {})
  const [isLoading, setIsLoading] = useState(!initialContent)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })

  const elementRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const isSavingRef = useRef(false)

  useEffect(() => {
    if (initialContent != null) return
    fetch(`/api/text-content?key=${encodeURIComponent(textKey)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.content) setContent(data.content)
          if (data.styles) setStyles(data.styles)
        }
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))

    fetch('/api/admin/check')
      .then((res) => res.json())
      .then((data) => {
        setIsAdmin(Boolean(data.isAdmin))
      })
      .catch(() => setIsAdmin(false))
  }, [textKey, initialContent])

  const updatePanelPosition = useCallback(() => {
    const el = elementRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const panelWidth = 280
    const panelHeight = 200
    let left = rect.left
    let top = rect.bottom + 8
    if (left + panelWidth > window.innerWidth - 16) {
      left = window.innerWidth - panelWidth - 16
    }
    if (top + panelHeight > window.innerHeight - 16) {
      top = rect.top - panelHeight - 8
    }
    if (top < 16) top = 16
    setPanelPos({ top, left })
  }, [])

  const startEditing = useCallback(() => {
    if (!isAdmin) return
    setSaveStatus('idle')
    setIsEditing(true)
    setShowPanel(true)
    requestAnimationFrame(() => {
      updatePanelPosition()
      const el = elementRef.current
      if (el) {
        el.focus()
        const range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(false)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    })
  }, [isAdmin, updatePanelPosition])

  const save = useCallback(async () => {
    if (isSavingRef.current) return
    const el = elementRef.current
    if (!el) return
    const newContent = el.innerText
    isSavingRef.current = true
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/text-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: textKey,
          content: newContent,
          font_size: styles.fontSize ?? '',
          font_family: styles.fontFamily ?? '',
          font_weight: styles.fontWeight ?? '',
          color: styles.color ?? '',
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setContent(data.content ?? newContent)
        if (data.styles) setStyles(data.styles)
        setSaveStatus('saved')
        setIsEditing(false)
        setShowPanel(false)
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        throw new Error(data.error || 'Save failed')
      }
    } catch {
      el.innerText = content
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } finally {
      isSavingRef.current = false
    }
  }, [textKey, content, styles])

  const handleStyleChange = (field: string, value: string) => {
    setStyles((prev) => {
      const next = { ...prev }
      if (value) {
        next[field] = value
      } else {
        delete next[field]
      }
      return next
    })
  }

  useEffect(() => {
    if (!isEditing) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        elementRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return
      }
      save()
    }
    const handleScroll = () => updatePanelPosition()
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', updatePanelPosition)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', updatePanelPosition)
    }
  }, [isEditing, save, updatePanelPosition])

  useEffect(() => {
    if (!isEditing) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        const el = elementRef.current
        if (el) el.innerText = content
        setIsEditing(false)
        setShowPanel(false)
        setSaveStatus('idle')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, save, content])

  // 使用 any 以支持动态 HTML 标签类型（div | span）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = Tag as any

  const fontSizeClass = styles.fontSize ?? ''
  const fontWeightClass = styles.fontWeight ?? ''
  const fontStyleObj: React.CSSProperties = {}
  if (styles.fontFamily) fontStyleObj.fontFamily = styles.fontFamily
  if (styles.color) fontStyleObj.color = styles.color

  const adminClasses = isAdmin
    ? isEditing
      ? 'outline outline-2 outline-cyan/60 rounded outline-offset-2'
      : 'hover:outline hover:outline-1 hover:outline-dashed hover:outline-cyan/40 hover:rounded hover:outline-offset-2 cursor-text'
    : ''

  const combinedClassName = [className, fontSizeClass, fontWeightClass, adminClasses]
    .filter(Boolean)
    .join(' ')

  const linkProps = Tag === 'a' && href ? { href } : {}

  return (
    <>
      <Comp
        ref={elementRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onDoubleClick={isAdmin ? startEditing : undefined}
        className={combinedClassName}
        style={fontStyleObj}
        {...linkProps}
      >
        {isLoading ? fallback : content}
      </Comp>

      {saveStatus === 'saved' && (
        <span className="ml-1 inline-flex items-center text-green-500">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
      {saveStatus === 'error' && (
        <span className="ml-1 inline-flex items-center text-red-500" title="保存失败">
          <X className="h-3.5 w-3.5" />
        </span>
      )}

      {isAdmin && showPanel && (
        <div
          ref={panelRef}
          className="fixed z-[9999] w-72 rounded-lg border border-white/15 bg-[#0d0d0d]/95 p-3 shadow-2xl backdrop-blur-md"
          style={{ top: panelPos.top, left: panelPos.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-white/70">文字样式编辑</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={save}
                disabled={saveStatus === 'saving'}
                className="inline-flex h-6 items-center gap-1 rounded bg-cyan px-2 text-xs font-medium text-black transition hover:bg-white disabled:opacity-50"
              >
                <Save className="h-3 w-3" />
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = elementRef.current
                  if (el) el.innerText = content
                  setIsEditing(false)
                  setShowPanel(false)
                  setSaveStatus('idle')
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="grid grid-cols-[20px_1fr] items-center gap-2">
              <Type className="h-3.5 w-3.5 text-white/50" />
              <select
                value={styles.fontFamily ?? ''}
                onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                className="h-7 rounded border border-white/10 bg-black/40 px-2 text-xs text-white outline-none focus:border-cyan"
                style={styles.fontFamily ? { fontFamily: styles.fontFamily } : {}}
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value || 'inherit' }}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid grid-cols-[20px_1fr] items-center gap-2">
                <span className="text-[10px] text-white/50">字号</span>
                <select
                  value={styles.fontSize ?? ''}
                  onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                  className="h-7 rounded border border-white/10 bg-black/40 px-2 text-xs text-white outline-none focus:border-cyan"
                >
                  {FONT_SIZES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-[20px_1fr] items-center gap-2">
                <Bold className="h-3.5 w-3.5 text-white/50" />
                <select
                  value={styles.fontWeight ?? ''}
                  onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                  className="h-7 rounded border border-white/10 bg-black/40 px-2 text-xs text-white outline-none focus:border-cyan"
                >
                  {FONT_WEIGHTS.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-[20px_1fr] items-center gap-2">
              <Palette className="h-3.5 w-3.5 text-white/50" />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={styles.color ?? '#ffffff'}
                  onChange={(e) => handleStyleChange('color', e.target.value)}
                  className="h-7 w-8 cursor-pointer rounded border border-white/10 bg-transparent"
                />
                <input
                  type="text"
                  value={styles.color ?? ''}
                  onChange={(e) => handleStyleChange('color', e.target.value)}
                  placeholder="#ffffff 或 留空默认"
                  className="h-7 flex-1 rounded border border-white/10 bg-black/40 px-2 text-xs text-white outline-none focus:border-cyan"
                />
                {styles.color && (
                  <button
                    type="button"
                    onClick={() => handleStyleChange('color', '')}
                    className="text-[10px] text-white/40 hover:text-white/70"
                  >
                    重置
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="mt-2 text-[10px] text-white/35">
            双击文字进入编辑 · Ctrl+S 保存 · Esc 取消
          </p>
        </div>
      )}
    </>
  )
}
