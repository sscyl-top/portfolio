-- =====================================================================
-- 生产环境待执行迁移（2026-06-24 检查后生成）
-- 项目：Supabase hnujowombcgfxledpnxe
-- 用法：Supabase Dashboard → SQL Editor → New query → 粘贴全文 → Run
-- 幂等：所有语句含 IF NOT EXISTS / IF EXISTS，可重复执行
-- =====================================================================

-- ─── 迁移 1: work_versions.label 列 ───
ALTER TABLE public.work_versions
  ADD COLUMN IF NOT EXISTS label text;
COMMENT ON COLUMN public.work_versions.label IS '版本备注，可为空';

-- ─── 迁移 2: works.scheduled_publish_at 列 ───
ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz;
CREATE INDEX IF NOT EXISTS works_scheduled_publish_at_idx
  ON public.works (scheduled_publish_at)
  WHERE status = 'draft' AND scheduled_publish_at IS NOT NULL;
COMMENT ON COLUMN public.works.scheduled_publish_at IS '定时发布时间，到达该时间后由任务自动改为已发布';

-- ─── 迁移 3: text_content 表（如不存在则创建）───
-- 注意：此脚本含 DROP TABLE IF EXISTS，会清空已有 text_content 数据
-- 如果 text_content 已存在且有数据，请注释掉下一行
-- DROP TABLE IF EXISTS public.text_content CASCADE;

CREATE TABLE IF NOT EXISTS public.text_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  font_size TEXT,
  font_family TEXT,
  font_weight TEXT,
  color TEXT,
  page TEXT NOT NULL,
  section TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_text_content_key ON public.text_content(key);
CREATE INDEX IF NOT EXISTS idx_text_content_page ON public.text_content(page);

ALTER TABLE public.text_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin manages text_content" ON public.text_content;
CREATE POLICY "admin manages text_content"
  ON public.text_content FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "public reads text_content" ON public.text_content;
CREATE POLICY "public reads text_content"
  ON public.text_content FOR SELECT TO anon, authenticated
  USING (is_active = true AND deleted_at IS NULL);

REVOKE ALL ON public.text_content FROM anon, authenticated;
GRANT SELECT ON public.text_content TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.text_content TO authenticated;
GRANT ALL ON public.text_content TO service_role;

-- 种子数据（仅在表为空时插入）
INSERT INTO public.text_content (key, content, font_size, font_family, font_weight, color, page, section, sort_order)
SELECT * FROM (VALUES
  ('global.nav.home', '首页', 'text-sm', 'font-sans', 'font-medium', 'text-white', 'global', 'navigation', 1),
  ('global.nav.works', '全部作品', 'text-sm', 'font-sans', 'font-medium', 'text-white', 'global', 'navigation', 2),
  ('global.nav.resume', '简历', 'text-sm', 'font-sans', 'font-medium', 'text-white', 'global', 'navigation', 3),
  ('global.nav.admin', '管理', 'text-sm', 'font-sans', 'font-medium', 'text-white/60', 'global', 'navigation', 4),
  ('global.footer.copyright', '© 2026 上山采月亮. All rights reserved.', 'text-xs', 'font-sans', 'font-normal', 'text-white/40', 'global', 'footer', 1),
  ('global.footer.built', 'Built with Next.js', 'text-xs', 'font-sans', 'font-normal', 'text-white/40', 'global', 'footer', 2),
  ('home.hero.title', '视觉设计师', 'text-6xl', 'font-sans', 'font-bold', 'text-white', 'home', 'hero', 1),
  ('home.hero.subtitle', '专注品牌设计与 AI 设计', 'text-xl', 'font-sans', 'font-normal', 'text-white/70', 'home', 'hero', 2),
  ('home.hero.cta', '查看作品', 'text-base', 'font-sans', 'font-medium', 'text-black', 'home', 'hero', 3),
  ('home.strengths.title', '专业能力', 'text-3xl', 'font-sans', 'font-semibold', 'text-white', 'home', 'strengths', 1),
  ('brand.logo_alt', '无限进步', NULL, NULL, NULL, NULL, 'global', 'navigation', 5),
  ('hero.title.desktop', '让品牌视觉拥有可被记住的数字现场', NULL, NULL, NULL, NULL, 'home', 'hero', 4),
  ('hero.title.mobile', '让品牌视觉拥有被记住的数字现场', NULL, NULL, NULL, NULL, 'home', 'hero', 5),
  ('hero.experience', '品牌视觉与商业设计实践', NULL, NULL, NULL, NULL, 'home', 'hero', 6),
  ('hero.cta.works', '查看作品', NULL, NULL, NULL, NULL, 'home', 'hero', 7),
  ('hero.cta.resume', '下载简历', NULL, NULL, NULL, NULL, 'home', 'hero', 8),
  ('contact.invitation', '期待一起共事：', NULL, NULL, NULL, NULL, 'home', 'contact', 1),
  ('cta.works', '浏览作品', NULL, NULL, NULL, NULL, 'home', 'cta', 1),
  ('cta.resume', '查看简历', NULL, NULL, NULL, NULL, 'home', 'cta', 2),
  ('cta.hiring', '聘用联系', NULL, NULL, NULL, NULL, 'home', 'cta', 3),
  ('footer.copyright', '© 2026 SSCYL Portfolio', NULL, NULL, NULL, NULL, 'global', 'footer', 3)
) AS t(key, content, font_size, font_family, font_weight, color, page, section, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.text_content LIMIT 1);

-- ─── 完成标记 ───
SELECT 'DONE' AS result;
