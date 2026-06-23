# 全局文字管理功能 — 交接文档

## 一、功能概述

后台「全局文字」管理页面，路径：`/admin/settings/text-content`

- **侧边栏入口**：已存在（`src/components/admin/AdminNav.tsx` 第 23 行）
- **页面组件**：`src/app/admin/(protected)/settings/text-content/page.tsx`
- **Server Actions**：`src/app/admin/(protected)/settings/text-content/actions.ts`
- **数据库表**：`public.text_content`

**前后端代码已完整，无需修改。唯一问题是数据库中缺少这张表。**

---

## 二、当前错误

```
Could not find the table 'public.text_content' in the schema cache
```

线上 `sscyl.top/admin/settings/text-content` 页面报此错。

---

## 三、失败原因分析（核心）

### 根本原因：SQL 执行到了错误的 Supabase 项目

项目存在 **两个 Supabase 实例**：

| 环境 | Supabase URL | 状态 |
|------|-------------|------|
| 本地开发 | `http://127.0.0.1:54321`（Supabase Local） | `.env.local` 中配置 |
| 线上生产 | 由 Vercel 环境变量 `NEXT_PUBLIC_SUPABASE_URL` 决定 | 在 Vercel Dashboard 设置 |

**用户执行 SQL 的 Supabase 项目 ≠ 线上网站连接的 Supabase 项目。**

从截图来看：
- 用户 SQL Editor 中操作的是 `sscyl.top` 项目（URL 栏可见）
- 但线上网站实际连接的可能是另一个项目（如之前出现的 `hnujowombcgfxledpnxe`）

所以不管 SQL 执行多少次、多么正确，只要不在**正确的项目**上执行，线上永远找不到这张表。

### 次要原因：我的失误
1. 没有第一时间检查 `.env.local` 确认本地和线上的 Supabase URL 是否一致
2. 没有要求用户提供 Vercel 环境变量中的真实 Supabase URL 来交叉验证
3. 给了 3 个版本的 SQL 浪费了时间（语法问题 + 项目搞错）
4. 每次都让用户手动执行 SQL，而不是找到自动化方式

---

## 四、解决步骤（给下一个模型）

### 步骤 1：确认线上 Supabase 项目

**必须先确认**：Vercel 线上环境变量 `NEXT_PUBLIC_SUPABASE_URL` 的值是多少。
- 去 [Vercel Dashboard](https://vercel.com) → 项目 Settings → Environment Variables 查看
- 记下这个 URL 中的 project ID（格式类似 `xxxxxxxxxxxx.supabase.co`）

### 步骤 2：去**正确的** Supabase 项目执行 SQL

用步骤 1 拿到的 project ID，打开对应的 Supabase 项目：
```
https://supabase.com/dashboard/project/{PROJECT_ID}
```
→ SQL Editor → 执行以下 SQL（完整版，一次性搞定）：

```sql
-- 如果表已存在先删掉重建
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

CREATE INDEX idx_text_content_key ON public.text_content(key);
CREATE INDEX idx_text_content_page ON public.text_content(page);

ALTER TABLE public.text_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manages text_content"
  ON public.text_content FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "public reads text_content"
  ON public.text_content FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL);

REVOKE ALL ON public.text_content FROM anon, authenticated;
GRANT SELECT ON public.text_content TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.text_content TO authenticated;
GRANT ALL ON public.text_content TO service_role;

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
('footer.copyright', '© 2026 SSCYL Portfolio', NULL, NULL, NULL, NULL, 'global', 'footer', 3);
```

### 步骤 3：验证

执行完 SQL 后，刷新 `https://sscyl.top/admin/settings/text-content`，应能看到 21 条文字记录的表格。

---

## 五、相关文件清单

| 文件 | 用途 |
|------|------|
| `src/components/admin/AdminNav.tsx:23` | 侧边栏「全局文字」导航入口 |
| `src/app/admin/(protected)/settings/text-content/page.tsx` | 页面 UI（列表+创建表单） |
| `src/app/admin/(protected)/settings/text-content/actions.ts` | Server Action（创建/删除） |
| `supabase/migrations/20260623082900_create_text_content.sql` | 建表迁移 |
| `supabase/migrations/20260623091000_insert_extra_text_content.sql` | 数据插入 |

## 六、注意事项

1. **RLS 权限模式必须与 CMS 其他表一致**：管理员用 `private.is_admin()`，公开读用 `deleted_at IS NULL`
2. 本地 `.env.local` 指向 `127.0.0.1:54321`（Supabase Local），本地开发需确保 local Supabase 也执行了建表 SQL
3. 代码已提交并推送到 GitHub (`aaa008f`)，Vercel 已自动部署，**不需要再部署**
