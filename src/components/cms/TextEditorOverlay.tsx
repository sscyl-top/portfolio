'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Check, X, Type, Palette, Bold, Save } from 'lucide-react'
import { FONT_FAMILIES, FONT_SIZES, FONT_WEIGHTS } from '@/lib/fonts'

type ActiveEditor = {
  key: string
  el: HTMLElement
  originalContent: string
  originalStyles: Record<string, string>
} | null

export function TextEditorOverlay() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [active, setActive] = useState<ActiveEditor>(null)
  const [styles, setStyles] = useState<Record<string, string>>({})
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set())
  const panelRef = useRef<HTMLDivElement>(null)
  const isSavingRef = useRef(false)

  useEffect(() => {
    fetch('/api/admin/check')
      .then((res) => res.json())
      .then((data) => setIsAdmin(Boolean(data.isAdmin)))
      .catch(() => setIsAdmin(false))
  }, [])

  const updatePanelPosition = useCallback((el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    const panelWidth = 280
    const panelHeight = 220
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

  const loadGoogleFont = useCallback((fontFamily: string) => {
    const googleFonts = ['Inter', 'Roboto', 'Open Sans', 'Playfair Display', 'Noto Sans SC']
    const match = googleFonts.find((f) => fontFamily.includes(f))
    if (!match || loadedFonts.has(match)) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(match).replace(/%20/g, '+')}:wght@300;400;500;600;700;800;900&display=swap`
    document.head.appendChild(link)
    setLoadedFonts((prev) => new Set(prev).add(match))
  }, [loadedFonts])

  const startEditing = useCallback((el: HTMLElement) => {
    const key = el.getAttribute('data-text-key')
    if (!key) return

    el.setAttribute('contenteditable', 'true')
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)

    el.classList.add('outline', 'outline-2', 'outline-cyan/60', 'rounded', 'outline-offset-2')

    const existingStyles: Record<string, string> = {}
    if (el.dataset.fontSize) existingStyles.fontSize = el.dataset.fontSize
    if (el.dataset.fontFamily) {
      existingStyles.fontFamily = el.dataset.fontFamily
      loadGoogleFont(el.dataset.fontFamily)
    }
    if (el.dataset.fontWeight) existingStyles.fontWeight = el.dataset.fontWeight
    if (el.dataset.color) existingStyles.color = el.dataset.color

    setActive({ key, el, originalContent: el.innerText, originalStyles: { ...existingStyles } })
    setStyles(existingStyles)
    setSaveStatus('idle')
    requestAnimationFrame(() => updatePanelPosition(el))
  }, [updatePanelPosition, loadGoogleFont])

  const cancelEditing = useCallback(() => {
    if (!active) return
    active.el.innerText = active.originalContent
    active.el.removeAttribute('contenteditable')
    active.el.classList.remove('outline', 'outline-2', 'outline-cyan/60', 'rounded', 'outline-offset-2')
    setActive(null)
    setSaveStatus('idle')
  }, [active])

  const save = useCallback(async () => {
    if (!active || isSavingRef.current) return
    isSavingRef.current = true
    setSaveStatus('saving')
    try {
      const newContent = active.el.innerText
      const res = await fetch('/api/text-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: active.key,
          content: newContent,
          font_size: styles.fontSize ?? '',
          font_family: styles.fontFamily ?? '',
          font_weight: styles.fontWeight ?? '',
          color: styles.color ?? '',
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        active.el.removeAttribute('contenteditable')
        active.el.classList.remove('outline', 'outline-2', 'outline-cyan/60', 'rounded', 'outline-offset-2')
        if (data.styles) {
          if (data.styles.fontSize) active.el.dataset.fontSize = data.styles.fontSize
          if (data.styles.fontFamily) active.el.dataset.fontFamily = data.styles.fontFamily
          if (data.styles.fontWeight) active.el.dataset.fontWeight = data.styles.fontWeight
          if (data.styles.color) active.el.dataset.color = data.styles.color
        }
        setSaveStatus('saved')
        setActive(null)
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        throw new Error(data.error)
      }
    } catch {
      if (active) active.el.innerText = active.originalContent
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } finally {
      isSavingRef.current = false
    }
  }, [active, styles])

  const handleStyleChange = (field: string, value: string) => {
    setStyles((prev) => {
      const next = { ...prev }
      if (value) {
        next[field] = value
        if (field === 'fontFamily') loadGoogleFont(value)
      } else {
        delete next[field]
      }
      if (active) {
        if (field === 'fontSize' && value) active.el.classList.add(value)
        else if (field === 'fontSize') {
          FONT_SIZES.forEach(s => s.value && active.el.classList.remove(s.value))
        }
        if (field === 'fontWeight' && value) active.el.classList.add(value)
        else if (field === 'fontWeight') {
          FONT_WEIGHTS.forEach(w => w.value && active.el.classList.remove(w.value))
        }
        if (field === 'fontFamily') active.el.style.fontFamily = value
        if (field === 'color') active.el.style.color = value
      }
      return next
    })
  }

  useEffect(() => {
    if (!isAdmin) return

    const handleDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const editable = target.closest('[data-text-key]') as HTMLElement | null
      if (!editable || editable.closest('[data-editing]')) return
      if (active) {
        save()
      }
      e.preventDefault()
      startEditing(editable)
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (!active) return
      if (active.el.contains(e.target as Node) || panelRef.current?.contains(e.target as Node)) return
      save()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!active) return
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelEditing()
      }
    }

    const handleScroll = () => {
      if (active) updatePanelPosition(active.el)
    }

    document.addEventListener('dblclick', handleDblClick)
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)

    document.querySelectorAll('[data-text-key]').forEach((el) => {
      (el as HTMLElement).classList.add('hover:outline', 'hover:outline-1', 'hover:outline-dashed', 'hover:outline-cyan/40', 'hover:rounded', 'hover:outline-offset-2', 'cursor-text')
    })

    return () => {
      document.removeEventListener('dblclick', handleDblClick)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [isAdmin, active, startEditing, save, cancelEditing, updatePanelPosition])

  useEffect(() => {
    if (!isAdmin) return
    const observer = new MutationObserver(() => {
      document.querySelectorAll('[data-text-key]').forEach((el) => {
        const htmlEl = el as HTMLElement
        if (!htmlEl.dataset.hintBound) {
          htmlEl.dataset.hintBound = 'true'
          htmlEl.classList.add('hover:outline', 'hover:outline-1', 'hover:outline-dashed', 'hover:outline-cyan/40', 'hover:rounded', 'hover:outline-offset-2', 'cursor-text')
          const fontSize = htmlEl.dataset.fontSize
          const fontWeight = htmlEl.dataset.fontWeight
          const fontFamily = htmlEl.dataset.fontFamily
          const color = htmlEl.dataset.color
          if (fontSize) htmlEl.classList.add(fontSize)
          if (fontWeight) htmlEl.classList.add(fontWeight)
          if (fontFamily) {
            htmlEl.style.fontFamily = fontFamily
            loadGoogleFont(fontFamily)
          }
          if (color) htmlEl.style.color = color
        }
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [isAdmin, loadGoogleFont])

  if (!isAdmin) return null

  return (
    <>
      {saveStatus === 'saved' && createPortal(
        <div className="fixed bottom-20 left-1/2 z-[9999] -translate-x-1/2 rounded-full bg-green-500/90 px-4 py-2 text-sm text-white shadow-lg">
          <Check className="mr-1 inline h-4 w-4" /> 已保存
        </div>,
        document.body
      )}
      {saveStatus === 'error' && createPortal(
        <div className="fixed bottom-20 left-1/2 z-[9999] -translate-x-1/2 rounded-full bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg">
          <X className="mr-1 inline h-4 w-4" /> 保存失败
        </div>,
        document.body
      )}

      {active && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999] w-72 rounded-lg border border-white/15 bg-[#0d0d0d]/95 p-3 shadow-2xl backdrop-blur-md"
          style={{ top: panelPos.top, left: panelPos.left }}
          onMouseDown={(e) => e.stopPropagation()}
          data-editing="true"
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
                onClick={cancelEditing}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mb-2 text-[10px] text-white/30 font-mono truncate">key: {active.key}</div>

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
        </div>,
        document.body
      )}
    </>
  )
}
