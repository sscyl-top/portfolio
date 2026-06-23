import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getBackendReadiness } from '@/lib/supabase/config'

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

    const supabase = await createSupabaseServerClient()

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

    const supabase = await createSupabaseServerClient()

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
