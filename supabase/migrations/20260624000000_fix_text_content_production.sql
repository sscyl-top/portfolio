-- ============================================================================
-- 独立版：线上生产环境 text_content 表 + 种子数据
-- 在 Supabase SQL Editor 中执行：
-- https://supabase.com/dashboard/project/hnujowombcgfxledpnxe/sql/new
-- ============================================================================

-- ── 依赖准备：确保 private schema 和辅助函数存在 ──
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── 建表 ──
DROP TABLE IF EXISTS public.text_content CASCADE;

CREATE TABLE public.text_content (
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

-- ── 索引 ──
CREATE INDEX idx_text_content_key ON public.text_content(key);
CREATE INDEX idx_text_content_page ON public.text_content(page);

-- ── RLS ──
ALTER TABLE public.text_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manages text_content"
  ON public.text_content FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "public reads text_content"
  ON public.text_content FOR SELECT TO anon, authenticated
  USING (is_active = true AND deleted_at IS NULL);

-- ── 权限 ──
REVOKE ALL ON public.text_content FROM anon, authenticated;
GRANT SELECT ON public.text_content TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.text_content TO authenticated;
GRANT ALL ON public.text_content TO service_role;

-- ── 触发器 ──
DROP TRIGGER IF EXISTS set_text_content_updated_at ON public.text_content;
CREATE TRIGGER set_text_content_updated_at
  BEFORE UPDATE ON public.text_content
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ── 种子数据 ──
INSERT INTO public.text_content (key, content, font_size, font_family, font_weight, color, page, section, sort_order) VALUES
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
ON CONFLICT (key) DO NOTHING;
