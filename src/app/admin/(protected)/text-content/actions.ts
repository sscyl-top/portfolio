'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-session'
import { revalidatePath } from 'next/cache'

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
  created_at: string
  updated_at: string
}

export type TextContentFormData = {
  key: string
  content: string
  font_size?: string
  font_family?: string
  font_weight?: string
  color?: string
  page: string
  section?: string
  sort_order?: number
}

// 获取所有文字内容
export async function getTextContent(
  page?: string,
  section?: string
): Promise<{ success: boolean; data?: TextContentItem[]; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient()

    let query = supabase
      .from('text_content')
      .select('*')
      .is('deleted_at', null)
      .order('page', { ascending: true })
      .order('section', { ascending: true })
      .order('sort_order', { ascending: true })

    if (page) {
      query = query.eq('page', page)
    }
    if (section) {
      query = query.eq('section', section)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TextContentItem[] }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

// 根据 key 获取单个文字内容
export async function getTextContentByKey(
  key: string
): Promise<{ success: boolean; data?: TextContentItem; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('text_content')
      .select('*')
      .eq('key', key)
      .is('deleted_at', null)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TextContentItem }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

// 创建新文字内容
export async function createTextContent(
  formData: FormData
): Promise<{ success: boolean; data?: TextContentItem; error?: string }> {
  await requireAdmin()

  try {
    const supabase = await createSupabaseServerClient()

    const key = formData.get('key') as string
    const content = formData.get('content') as string
    const fontSize = formData.get('font_size') as string
    const fontFamily = formData.get('font_family') as string
    const fontWeight = formData.get('font_weight') as string
    const color = formData.get('color') as string
    const page = formData.get('page') as string
    const section = formData.get('section') as string
    const sortOrder = parseInt(formData.get('sort_order') as string) || 0

    // 验证必填字段
    if (!key || !content || !page) {
      return { success: false, error: 'Key、内容和页面为必填项' }
    }

    const { data, error } = await supabase
      .from('text_content')
      .insert({
        key,
        content,
        font_size: fontSize || null,
        font_family: fontFamily || null,
        font_weight: fontWeight || null,
        color: color || null,
        page,
        section: section || null,
        sort_order: sortOrder,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Key 已存在，请使用其他唯一标识' }
      }
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/text-content')
    return { success: true, data: data as TextContentItem }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

// 更新文字内容
export async function updateTextContent(
  formData: FormData
): Promise<{ success: boolean; data?: TextContentItem; error?: string }> {
  await requireAdmin()

  try {
    const supabase = await createSupabaseServerClient()

    const id = formData.get('id') as string
    const key = formData.get('key') as string
    const content = formData.get('content') as string
    const fontSize = formData.get('font_size') as string
    const fontFamily = formData.get('font_family') as string
    const fontWeight = formData.get('font_weight') as string
    const color = formData.get('color') as string
    const page = formData.get('page') as string
    const section = formData.get('section') as string
    const sortOrder = parseInt(formData.get('sort_order') as string) || 0
    const isActive = formData.get('is_active') === 'true'

    if (!id) {
      return { success: false, error: 'ID 不能为空' }
    }

    const { data, error } = await supabase
      .from('text_content')
      .update({
        key,
        content,
        font_size: fontSize || null,
        font_family: fontFamily || null,
        font_weight: fontWeight || null,
        color: color || null,
        page,
        section: section || null,
        sort_order: sortOrder,
        is_active: isActive,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/text-content')
    revalidatePath('/')
    return { success: true, data: data as TextContentItem }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

// 删除文字内容（软删除）
export async function deleteTextContent(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  try {
    const supabase = await createSupabaseServerClient()

    const id = formData.get('id') as string

    if (!id) {
      return { success: false, error: 'ID 不能为空' }
    }

    const { error } = await supabase
      .from('text_content')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/text-content')
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

// 切换激活状态
export async function toggleTextContentActive(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  try {
    const supabase = await createSupabaseServerClient()

    const id = formData.get('id') as string
    const isActive = formData.get('is_active') === 'true'

    const { error } = await supabase
      .from('text_content')
      .update({ is_active: isActive })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/text-content')
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}
