import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getBackendReadiness } from '@/lib/supabase/config'
import { requireAdmin } from '@/lib/admin-session'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/text-content?key=home.hero.title
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Key is required' },
        { status: 400 }
      )
    }

    const readiness = getBackendReadiness()
    if (!readiness.supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('text_content')
      .select('content, font_size, font_family, font_weight, color')
      .eq('key', key)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Text content not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      content: data.content,
      styles: {
        ...(data.font_size && { fontSize: data.font_size }),
        ...(data.font_family && { fontFamily: data.font_family }),
        ...(data.font_weight && { fontWeight: data.font_weight }),
        ...(data.color && { color: data.color }),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

// POST /api/text-content (批量获取)
export async function POST(request: NextRequest) {
  try {
    const { keys } = await request.json()

    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Keys array is required' },
        { status: 400 }
      )
    }

    const readiness = getBackendReadiness()
    if (!readiness.supabase) {
      const result: Record<string, { success: boolean; error: string }> = {}
      keys.forEach((key: string) => {
        result[key] = { success: false, error: 'Database not configured' }
      })
      return NextResponse.json({ success: true, data: result })
    }

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('text_content')
      .select('key, content, font_size, font_family, font_weight, color')
      .in('key', keys)
      .eq('is_active', true)
      .is('deleted_at', null)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    type TextContentResult =
      | { success: true; content: string; styles: Record<string, string> }
      | { success: false; error: string }

    const result: Record<string, TextContentResult> = {}
    keys.forEach((key: string) => {
      const item = data?.find((d) => d.key === key)
      if (item) {
        const styles: Record<string, string> = {}
        if (item.font_size) styles.fontSize = item.font_size
        if (item.font_family) styles.fontFamily = item.font_family
        if (item.font_weight) styles.fontWeight = item.font_weight
        if (item.color) styles.color = item.color

        result[key] = {
          success: true,
          content: item.content,
          styles,
        }
      } else {
        result[key] = { success: false, error: 'Not found' }
      }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

// PATCH /api/text-content — 更新或新建单个 key 的 content 和样式（需管理员鉴权）
// 若 key 不存在则自动创建（upsert），从 key 前缀推断 page（如 "resume.hero.intro" → page="resume"）
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { key, content, font_size, font_family, font_weight, color, page, section } = body

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'key is required' },
        { status: 400 }
      )
    }

    const readiness = getBackendReadiness()
    if (!readiness.supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // 先尝试查找现有记录
    const { data: existing } = await supabase
      .from('text_content')
      .select('id')
      .eq('key', key)
      .is('deleted_at', null)
      .maybeSingle()

    const inferredPage = page ?? key.split('.')[0] ?? 'unknown'

    if (existing) {
      const updates: Record<string, string | null> = {}
      if (typeof content === 'string') updates.content = content
      if (font_size !== undefined) updates.font_size = font_size || null
      if (font_family !== undefined) updates.font_family = font_family || null
      if (font_weight !== undefined) updates.font_weight = font_weight || null
      if (color !== undefined) updates.color = color || null
      if (page !== undefined) updates.page = page
      if (section !== undefined) updates.section = section ?? null

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { success: false, error: 'No fields to update' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('text_content')
        .update(updates)
        .eq('key', key)
        .is('deleted_at', null)
        .select('content, font_size, font_family, font_weight, color')
        .single()

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        content: data.content,
        styles: {
          ...(data.font_size && { fontSize: data.font_size }),
          ...(data.font_family && { fontFamily: data.font_family }),
          ...(data.font_weight && { fontWeight: data.font_weight }),
          ...(data.color && { color: data.color }),
        },
      })
    } else {
      // 不存在则新建
      if (typeof content !== 'string') {
        return NextResponse.json(
          { success: false, error: 'content is required for new record' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('text_content')
        .insert({
          key,
          content,
          page: inferredPage,
          section: section ?? null,
          font_size: font_size || null,
          font_family: font_family || null,
          font_weight: font_weight || null,
          color: color || null,
          is_active: true,
          sort_order: 0,
        })
        .select('content, font_size, font_family, font_weight, color')
        .single()

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        content: data.content,
        styles: {
          ...(data.font_size && { fontSize: data.font_size }),
          ...(data.font_family && { fontFamily: data.font_family }),
          ...(data.font_weight && { fontWeight: data.font_weight }),
          ...(data.color && { color: data.color }),
        },
      })
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
