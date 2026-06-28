'use client'

import { useState, useEffect } from 'react'

type TextClientProps = {
  k: string
  fallback: string
  className?: string
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'strong' | 'em' | 'a'
  href?: string
}

export function TextClient({
  k: textKey,
  fallback,
  className,
  as: Tag = 'span',
  href,
}: TextClientProps) {
  const [content, setContent] = useState(fallback)
  const [styles, setStyles] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/text-content?key=${encodeURIComponent(textKey)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.success) {
          if (data.content && data.content !== textKey) setContent(data.content)
          if (data.styles) setStyles(data.styles)
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
    return () => { cancelled = true }
  }, [textKey])

  // 使用 any 以支持动态 HTML 标签类型（div | span）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = Tag as any

  const fontSizeClass = styles.fontSize ?? ''
  const fontWeightClass = styles.fontWeight ?? ''
  const combinedClassName = [className, fontSizeClass, fontWeightClass].filter(Boolean).join(' ')

  const styleObj: React.CSSProperties = {}
  if (styles.fontFamily) styleObj.fontFamily = styles.fontFamily
  if (styles.color) styleObj.color = styles.color

  const dataAttrs: Record<string, string> = {
    'data-text-key': textKey,
  }
  if (loaded) dataAttrs['data-text-loaded'] = 'true'
  if (styles.fontSize) dataAttrs['data-font-size'] = styles.fontSize
  if (styles.fontFamily) dataAttrs['data-font-family'] = styles.fontFamily
  if (styles.fontWeight) dataAttrs['data-font-weight'] = styles.fontWeight
  if (styles.color) dataAttrs['data-color'] = styles.color

  const linkProps = Tag === 'a' && href ? { href } : {}

  return (
    <Comp className={combinedClassName} style={styleObj} {...dataAttrs} {...linkProps}>
      {content}
    </Comp>
  )
}
