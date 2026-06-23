# SSCYL Portfolio — 完整交接文档 (2026-06-23)

## 一、项目速览

| 项目 | 值 |
|------|-----|
| **名称** | SSCYL Portfolio（陈涛涛个人作品集） |
| **线上** | https://sscyl.top |
| **后台** | https://sscyl.top/admin |
| **部署** | Vercel (sscyl/portfolio)，自动从 GitHub master 部署 |
| **数据库** | **Supabase 项目 `hnujowombcgfxledpnxe`** |
| **代码** | GitHub `sscyl-top/portfolio`，master 分支 |
| **本地路径** | `D:\上山采月亮的台式\作品集网站\2026-作品集网站` |
| **技术栈** | Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Supabase + Three.js + GSAP |

---

## 二、当前紧急问题：text_content 表缺失

### 现象
访问 `https://sscyl.top/admin/settings/text-content` 显示：
```
数据库读取失败：Could not find the table 'public.text_content' in the schema cache
```

### 根本原因
**SQL 建表语句没有在正确的 Supabase 项目上执行。** 注意：本项目 Supabase 项目 ID 是 `hnujowombcgfxledpnxe`，不要把 SQL 执行到别的 Supabase 项目上。

### 解决方法（一步到位）

1. 打开 **https://supabase.com/dashboard/project/hnujowombcgfxledpnxe/sql/new**
2. 粘贴并执行以下 SQL：

```sql
-- 依赖准备：确保 private schema 和辅助函数存在
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

-- 建表
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

-- 索引
CREATE INDEX idx_text_content_key ON public.text_content(key);
CREATE INDEX idx_text_content_page ON public.text_content(page);

-- RLS
ALTER TABLE public.text_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manages text_content"
  ON public.text_content FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "public reads text_content"
  ON public.text_content FOR SELECT TO anon, authenticated
  USING (is_active = true AND deleted_at IS NULL);

-- 权限
REVOKE ALL ON public.text_content FROM anon, authenticated;
GRANT SELECT ON public.text_content TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.text_content TO authenticated;
GRANT ALL ON public.text_content TO service_role;

-- 触发器
DROP TRIGGER IF EXISTS set_text_content_updated_at ON public.text_content;
CREATE TRIGGER set_text_content_updated_at
  BEFORE UPDATE ON public.text_content
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- 种子数据
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
```

3. 执行成功后，刷新 `https://sscyl.top/admin/settings/text-content`，应该看到 21 条记录。

---

## 三、潜在 Auth 问题：admin 角色元数据编码问题

### 现象
在后台登录后，可能出现「无权访问」或功能受限的情况。

### 原因
Supabase auth 表的 `raw_user_meta_data` 或 `raw_app_meta_data` 中，`"role": "admin"` 如果使用了**弯引号** `\u201c\u201d` 而非直引号 `""`，`private.is_admin()` 函数会匹配失败。

### 排查方法
在 Supabase SQL Editor 执行：
```sql
SELECT id, email, raw_app_meta_data 
FROM auth.users 
WHERE email = '3624457672@qq.com';
```

检查 `raw_app_meta_data` 中 `role` 是否为 `"admin"`（直引号）。如果是弯引号，需要修正：
```sql
UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(
  raw_app_meta_data, '{role}', '"admin"'
)
WHERE email = '3624457672@qq.com';
```

---

## 四、邮箱不一致问题

项目中有**两个邮箱**混用：

| 邮箱 | 用途 | 出现位置 |
|------|------|----------|
| `3624457672@qq.com` | 管理员登录 | `src/lib/admin.ts` (defaultAdminEmail)、Vercel `ADMIN_EMAIL` 环境变量 |
| `hello@sscyl.top` | 公开联系邮箱 | `src/data/portfolio.ts` socialLinks、resume.contact.email、`src/components/home/CapabilityBands.tsx`、`src/app/api/contact/route.ts` |

这两个邮箱的角色是分开的（admin 登录 vs 公开联系），设计上没问题。但如果用户想统一用一个邮箱，需要排查以下文件：

| 文件 | 当前值 | 
|------|--------|
| `src/data/portfolio.ts:98` | `mailto:hello@sscyl.top` |
| `src/data/portfolio.ts:122` | `email: "hello@sscyl.top"` |
| `src/components/home/CapabilityBands.tsx:312` | 硬编码 `hello@sscyl.top {progress}%` |
| `src/components/home/CapabilityBands.tsx:337` | 硬编码 `mailto:hello@sscyl.top` |
| `src/app/api/contact/route.ts:9` | `notificationRecipient = "hello@sscyl.top"` |

---

## 五、媒体上传 UUID 问题（nil UUID）

### 现象
后台创建媒体时，可能出现 `id` 为 `00000000-0000-0000-0000-000000000000` 的情况。

### 原因
`gen_random_uuid()` 需要在 Supabase 中正确配置 `pgcrypto` 扩展或使用 Postgres 13+ 内置函数。如果扩展未启用，会导致 nil UUID。

### 解决方法
检查 Supabase SQL Editor 中执行：
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## 六、内容块 heading 默认值「问号」问题

### 现象
作品详情页的新增 content block，heading 默认显示了「?」而不是空或有意义的默认值。

### 解决方案
这个逻辑应该在 ContentBlockForm 组件中。检查新建 block 时 heading 字段的初始值，确保不是空字符串触发占位符显示「?」。

---

## 七、关键文件速查

### 后台全局文字管理
| 文件 | 用途 |
|------|------|
| `src/app/admin/(protected)/settings/text-content/page.tsx` | 后台文字管理页面 UI |
| `src/app/admin/(protected)/settings/text-content/actions.ts` | Server Actions (创建/删除) |
| `src/lib/cms/text-content.ts` | 服务端读取函数（getTextContentByKey / getTextContentsByKeys）|
| `src/app/api/text-content/route.ts` | API 路由（GET/POST，客户端读取用）|
| `src/components/cms/DynamicText.tsx` | 客户端组件（从 API 获取动态文字）|

### SQL 迁移文件
| 文件 | 说明 |
|------|------|
| `supabase/migrations/20260623082900_create_text_content.sql` | 初版建表 + 种子数据 |
| `supabase/migrations/20260623091000_insert_extra_text_content.sql` | 新增 11 条种子数据 |
| `supabase/migrations/20260624000000_fix_text_content_production.sql` | **最终版（推荐使用）**：包含 private schema + 建表 + 全部 21 条种子数据 |

### 站点设置
| 文件 | 用途 |
|------|------|
| `src/app/admin/(protected)/settings/page.tsx` | 站点设置页面 |
| `src/data/portfolio.ts` | 静态数据（站点名、导航、社交链接、简历数据）|
| `src/lib/cms/repository.ts` | CMS 数据仓库（Supabase 读取 + 静态回退）|

### 认证
| 文件 | 用途 |
|------|------|
| `src/lib/admin.ts` | `isAdminEmail()` + `defaultAdminEmail` |
| `src/lib/admin-session.ts` | `requireAdmin()` 鉴权函数 |
| `src/lib/supabase/config.ts` | Supabase 配置（URL/Key）|

### 首页组件
| 文件 | 行数 | 说明 |
|------|------|------|
| `src/components/home/HeroShowcase.tsx` | 232 | 第一屏：视频卡片 + 浮动装饰卡片 |
| `src/components/home/CapabilityBands.tsx` | 1,575 | 核心优势 5 面板 + 3D 粒子 + Loader/Contact |

---

## 八、注意事项

1. **Supabase 项目 ID 是 `hnujowombcgfxledpnxe`**，不要在别的项目上执行 SQL
2. **所有后台操作走 Server Actions + FormData**，不需要客户端状态管理
3. **软删除策略**：所有表 delete 操作设置 `deleted_at`，不物理删除
4. **前台读取有静态回退**：Supabase 不可用时自动回退到 `src/data/portfolio.ts` 的静态数据
5. **Vercel 自动部署**：push 到 GitHub master 后自动部署，无需手动操作
6. **环境变量在 Vercel Dashboard 管理**：`NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SECRET_KEY`、`ADMIN_EMAIL` 等

---

## 九、已完成的设计调整

以下改动已部署上线，无需重复操作：
- ✅ 首页三张小卡片：无边框、默认黑白、hover 变彩色
- ✅ 三张小卡透明效果
- ✅ 右侧卡片左移 1.5%
- ✅ 工作流搭建和 Agent 设计分类已隐藏
- ✅ 全局文字管理前后端代码已完整

---

**文档生成时间**：2026-06-23 11:59 CST
**覆盖范围**：Section 二（紧急）→ Section 七（速查）→ Section 九（已完成项）
