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

// PATCH /api/text-content — 更新单个 key 的 content（需管理员鉴权）
export async function PATCH(request: NextRequest) {
  // 鉴权：requireAdmin 失败会抛出 redirect，这里捕获并返回 401
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { key, content } = await request.json()

    if (!key || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'key and content are required' },
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
      .update({ content })
      .eq('key', key)
      .is('deleted_at', null)
      .select('content')
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, content: data.content })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
