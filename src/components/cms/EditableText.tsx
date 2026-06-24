'use client'

import { useState, useEffect, useRef } from 'react'
import { Pencil, Check, X } from 'lucide-react'

type EditableTextProps = {
  textKey: string
  fallback: string
  className?: string
  /** HTML tag to render — defaults to span */
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'strong' | 'em'
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// 客户端组件：管理员可在前台直接编辑（所见即所得），非管理员等同 DynamicText
export function EditableText({
  textKey,
  fallback,
  className,
  as: Tag = 'span',
}: EditableTextProps) {
  const [content, setContent] = useState(fallback)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const elementRef = useRef<HTMLElement>(null)
  const isSavingRef = useRef(false)

  // 首次加载：拉取文字内容 + 检查管理员状态
  useEffect(() => {
    fetch(`/api/text-content?key=${encodeURIComponent(textKey)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.content) {
          setContent(data.content)
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
  }, [textKey])

  // 进入编辑态：聚焦并将光标定位到末尾
  useEffect(() => {
    if (!isEditing) return
    const el = elementRef.current
    if (!el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false) // false = 末尾
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [isEditing])

  const startEditing = () => {
    setSaveStatus('idle')
    setIsEditing(true)
  }

  // 保存：读取 innerText（非 innerHTML，避免 XSS），PATCH 到 API
  const save = async () => {
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
        body: JSON.stringify({ key: textKey, content: newContent }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setContent(data.content ?? newContent)
        setSaveStatus('saved')
        setIsEditing(false)
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        throw new Error(data.error || 'Save failed')
      }
    } catch {
      // 保存失败：恢复原内容，显示红色错误
      el.innerText = content
      setSaveStatus('error')
      setIsEditing(false)
      setTimeout(() => setSaveStatus('idle'), 2000)
    } finally {
      isSavingRef.current = false
    }
  }

  const handleBlur = () => {
    // 仅在当前可编辑时保存（避免退出编辑态触发的二次保存）
    if (elementRef.current?.isContentEditable) {
      save()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      save()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = Tag as any

  // 非管理员：完全等同 DynamicText，无任何编辑入口
  if (!isAdmin) {
    return (
      <Comp className={className}>
        {isLoading ? fallback : content}
      </Comp>
    )
  }

  // 管理员：虚线边框 + 铅笔图标，可进入 contentEditable 编辑
  const editBorder = isEditing
    ? 'border border-cyan/60 outline-none rounded'
    : 'border border-dashed border-cyan/30 rounded'

  return (
    <Comp
      ref={elementRef}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`${className ?? ''} relative ${editBorder}`.trim()}
    >
      {content}
      {!isEditing && (
        <button
          type="button"
          onClick={startEditing}
          className="absolute left-full top-1/2 ml-1 inline-flex -translate-y-1/2 items-center text-cyan/70 transition hover:text-cyan"
          title="编辑"
          aria-label="编辑文字"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {saveStatus === 'saved' && (
        <Check className="absolute left-full top-1/2 ml-1 h-3.5 w-3.5 -translate-y-1/2 text-green-500" />
      )}
      {saveStatus === 'error' && (
        <X className="absolute left-full top-1/2 ml-1 h-3.5 w-3.5 -translate-y-1/2 text-red-500" />
      )}
    </Comp>
  )
}
