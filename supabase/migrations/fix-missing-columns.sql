-- ============================================================
-- 一次性修复脚本：添加缺失的数据库列 + 创建 exec_ddl RPC 函数
-- 执行位置：Supabase Dashboard → SQL Editor → 粘贴执行
-- 执行后：所有迁移将自动通过 exec_ddl RPC 运行，无需再配置 DATABASE_URL
-- ============================================================

-- 1. 添加 works.representative_cover_media_id 列（代表作竖版封面）
ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS representative_cover_media_id uuid
  REFERENCES public.media_assets(id);

-- 2. 添加 site_settings.name_media_id 列（站点名称图片）
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS name_media_id uuid
  REFERENCES public.media_assets(id);

-- 3. 添加 site_settings.cta_center_logo_media_id 列（CTA 中央 Logo）
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS cta_center_logo_media_id uuid
  REFERENCES public.media_assets(id);

-- 4. 创建 exec_ddl 函数（供应用通过 service role RPC 调用执行 DDL）
--    仅 service_role 可调用，anon/authenticated 不可访问
CREATE OR REPLACE FUNCTION public.exec_ddl(sql text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  EXECUTE sql;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.exec_ddl(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_ddl(text) TO service_role;

-- 5. 刷新 PostgREST schema cache，让新列立即可见
NOTIFY pgrst, 'reload schema';
