import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { getBackendReadiness } from '@/lib/supabase/config'

// 注：使用 service client（不依赖 cookies）以允许页面被 ISR 缓存
// text_content 表的所有查询都通过 .eq('is_active', true).is('deleted_at', null) 显式过滤，
// 不需要 RLS（行级安全）。改为 server client 会让所有调用此函数的页面强制 dynamic。

export type TextContentItem = {
  id: string
  key: string
  content: string
  font_size?: string | null
  font_family?: string | null
  font_weight?: string | null
  color?: string | null
  page: string
  section?: string | null
  sort_order: number
  is_active: boolean
}

// 获取单个文字内容（服务端）
export async function getTextContentByKey(
  key: string,
  fallback?: string
): Promise<{ content: string; styles: Record<string, string> }> {
  try {
    const readiness = getBackendReadiness()
    if (!readiness.supabase) {
      return { content: fallback || key, styles: {} }
    }

    const supabase = createSupabaseServiceClient()

    const { data, error } = await supabase
      .from('text_content')
      .select('*')
      .eq('key', key)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return { content: fallback || key, styles: {} }
    }

    const styles: Record<string, string> = {}
    if (data.font_size) styles.fontSize = data.font_size
    if (data.font_family) styles.fontFamily = data.font_family
    if (data.font_weight) styles.fontWeight = data.font_weight
    if (data.color) styles.color = data.color

    return {
      content: data.content,
      styles,
    }
  } catch {
    return { content: fallback || key, styles: {} }
  }
}

// 获取多个文字内容（服务端，一次性获取）
export async function getTextContentsByKeys(
  keys: string[]
): Promise<Record<string, { content: string; styles: Record<string, string> }>> {
  try {
    const readiness = getBackendReadiness()
    if (!readiness.supabase) {
      const result: Record<string, { content: string; styles: Record<string, string> }> = {}
      keys.forEach((key) => {
        result[key] = { content: key, styles: {} }
      })
      return result
    }

    const supabase = createSupabaseServiceClient()

    const { data, error } = await supabase
      .from('text_content')
      .select('*')
      .in('key', keys)
      .eq('is_active', true)
      .is('deleted_at', null)

    if (error || !data) {
      const result: Record<string, { content: string; styles: Record<string, string> }> = {}
      keys.forEach((key) => {
        result[key] = { content: key, styles: {} }
      })
      return result
    }

    const result: Record<string, { content: string; styles: Record<string, string> }> = {}
    data.forEach((item) => {
      const styles: Record<string, string> = {}
      if (item.font_size) styles.fontSize = item.font_size
      if (item.font_family) styles.fontFamily = item.font_family
      if (item.font_weight) styles.fontWeight = item.font_weight
      if (item.color) styles.color = item.color

      result[item.key] = {
        content: item.content,
        styles,
      }
    })

    // 确保所有可能的 key 都有返回值
    keys.forEach((key) => {
      if (!result[key]) {
        result[key] = { content: key, styles: {} }
      }
    })

    return result
  } catch {
    const result: Record<string, { content: string; styles: Record<string, string> }> = {}
    keys.forEach((key) => {
      result[key] = { content: key, styles: {} }
    })
    return result
  }
}

// 将文字内容解析为字符串数组，用于 ticker 等多条目场景
// 若内容以 '[' 开头，则尝试 JSON.parse；失败或不是数组时返回 [content]
export function parseTextContentArray(content: string): string[] {
  const trimmed = content.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string')
      }
    } catch {
      // 解析失败时回退到单条目
    }
  }
  return [content]
}

// 获取单个 key 的数组内容（服务端）
export async function getTextContentArrayByKey(
  key: string,
  fallback?: string[],
): Promise<string[]> {
  const item = await getTextContentByKey(key)
  if (item.content === key && fallback) {
    return fallback
  }
  const arr = parseTextContentArray(item.content)
  return arr.length > 0 ? arr : fallback ?? []
}
