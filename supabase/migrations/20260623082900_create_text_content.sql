-- 创建全局文字内容管理表
CREATE TABLE IF NOT EXISTS public.text_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,  -- 唯一标识符，如 "nav.home", "hero.title"
  content TEXT NOT NULL,  -- 文字内容
  font_size TEXT,  -- 字号，如 "text-xl", "32px"
  font_family TEXT,  -- 字体，如 "font-sans", "Inter"
  font_weight TEXT,  -- 字重，如 "font-bold", "700"
  color TEXT,  -- 颜色，如 "text-white", "#FFFFFF"
  page TEXT NOT NULL,  -- 所属页面: "home", "works", "resume", "global"
  section TEXT,  -- 所属区域: "navigation", "hero", "footer"
  sort_order INT DEFAULT 0,  -- 排序
  is_active BOOLEAN DEFAULT true,  -- 是否激活
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_text_content_key ON public.text_content(key);
CREATE INDEX IF NOT EXISTS idx_text_content_page ON public.text_content(page);
CREATE INDEX IF NOT EXISTS idx_text_content_is_active ON public.text_content(is_active);

-- 启用 RLS
ALTER TABLE public.text_content ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许匿名用户读取激活的内容
CREATE POLICY "允许匿名读取激活的文字内容"
  ON public.text_content
  FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

-- 创建策略：允许管理员完全访问
CREATE POLICY "允许管理员完全访问文字内容"
  ON public.text_content
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 创建更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_text_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_text_content_updated_at
  BEFORE UPDATE ON public.text_content
  FOR EACH ROW
  EXECUTE FUNCTION update_text_content_updated_at();

-- 插入默认数据（前台主要文字）
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
('home.strengths.title', '专业能力', 'text-3xl', 'font-sans', 'font-semibold', 'text-white', 'home', 'strengths', 1);
