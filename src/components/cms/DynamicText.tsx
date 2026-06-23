'use client'

import { useState, useEffect } from 'react'

type DynamicTextProps = {
  textKey: string
  fallback: string
  className?: string
  /** HTML tag to render — defaults to span */
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'strong' | 'em'
}

// 客户端组件：从 API 获取动态文字
export function DynamicText({
  textKey,
  fallback,
  className,
  as: Tag = 'span',
}: DynamicTextProps) {
  const [content, setContent] = useState(fallback)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/text-content?key=${encodeURIComponent(textKey)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.content) {
          setContent(data.content)
        }
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [textKey])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = Tag as any

  return (
    <Comp className={className}>
      {isLoading ? fallback : content}
    </Comp>
  )
}

// 服务端函数：获取单个文字内容
export async function getDynamicText(
  textKey: string,
  fallback: string
): Promise<string> {
  try {
    const { getBackendReadiness } = await import('@/lib/supabase/config')
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')

    const readiness = getBackendReadiness()
    if (!readiness.supabase) {
      return fallback
    }

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('text_content')
      .select('content')
      .eq('key', textKey)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return fallback
    }

    return data.content
  } catch {
    return fallback
  }
}
