# SSCYL Portfolio — 当前项目交接文档

> 生成时间：2026-06-23
> 对应 commit：当前工作区最新状态（未提交）
> 本地路径：`D:\上山采月亮的台式\作品集网站\2026-作品集网站`

---

## 一、项目基本信息

| 项目 | 信息 |
|------|------|
| **名称** | SSCYL Portfolio（陈涛涛个人作品集） |
| **线上地址** | https://sscyl.top |
| **后台地址** | https://sscyl.top/admin |
| **GitHub 仓库** | https://github.com/sscyl-top/portfolio.git（master 分支） |
| **部署平台** | Vercel（项目 `sscyl/portfolio`），自动从 GitHub master 部署 |
| **数据库** | Supabase 项目 `hnujowombcgfxledpnxe` |
| **技术栈** | Next.js 16.2.9 + React 19 + TypeScript 5 + Tailwind CSS 4 + Supabase + Three.js + GSAP |

---

## 二、已完成核心功能

### 2.1 前台页面

- **首页** `/`：3D 粒子动画、核心优势段落、作品展示、联系 CTA
- **作品列表** `/works`：代表作轮播、分类筛选、复合设计墙
- **作品详情** `/works/[slug]`：动态 CMS 内容块渲染
- **简历页** `/resume`：完整从 CMS 读取并渲染

### 2.2 后台管理（`/admin`）

登录后可用功能：

| 模块 | 路径 | 功能 |
|------|------|------|
| **仪表盘** | `/admin` | 管理员入口 |
| **数据分析** | `/admin/analytics` | 访客统计、页面浏览、设备/来源分析、最近访问 |
| **站点设置** | `/admin/settings` | 站点名称、Logo、头像、分享缩略图、SEO、社交链接、默认主题 |
| **全局文字** | `/admin/settings/text-content` | 前台文字 CMS 管理 |
| **作品管理** | `/admin/works` | 列表、搜索、状态筛选、批量操作、导入静态作品 |
| **作品编辑** | `/admin/works/[id]` | 三段式作品上传器、内容块编辑、版本历史、定时发布、私密分享 |
| **分类/标签** | `/admin/categories` | 增删改查作品分类与标签 |
| **媒体库** | `/admin/media` | 文件上传/管理 |
| **留言管理** | `/admin/messages` | 联系表单留言查看 |
| **简历管理** | `/admin/resume` | 完整编辑简历所有区块 |

### 2.3 作品上传流程（参考站酷）

- 三段式向导：媒体上传 → 元数据 → 内容块编辑
- 拖拽上传、多选文件
- 支持 JPG/PNG/GIF/MP4/PDF 等格式
- 单文件最高 10GB
- 上传后自动生成内容块
- 图片可设置 focal point、caption

### 2.4 状态与版本控制

- 作品状态：`draft` / `published` / `private`
- 私密分享：生成 preview token，仅链接可见
- 自动版本归档：每次修改作品后自动保存快照
- 版本历史面板：查看历史、一键回滚、回滚后再前进
- 定时发布：`scheduled_publish_at` 字段 + 手动/自动发布机制

### 2.5 性能与 SEO

- PWA：`manifest.ts` + `robots.ts`
- Sitemap 自动生成（包含 CMS 作品）
- 图片懒加载 + Next.js Image 优化
- CMS 媒体自动转 WebP
- CDN：Supabase Storage + Next.js Image Optimization

---

## 三、本次新增/修改重点

### 3.1 简历页完整 CMS 化

- 数据库：`resumes` 表新增 `highlights`、`expertise`、`experience`、`campus`、`education`、`services`、`downloads` JSON 列
- 迁移文件：`supabase/migrations/20260626000000_resume_full_cms.sql`
- 后台组件：`src/components/admin/ResumeEditor.tsx`
- 数据层：`src/lib/cms/resume.ts`（类型定义 + `getResumeData()`）
- 前台页面：`src/app/resume/page.tsx` 已改为从 CMS 读取完整数据
- 保存逻辑：`src/app/admin/(protected)/resume/actions.ts` 扩展为保存所有字段

### 3.2 作品管理增强

- `src/app/admin/(protected)/works/actions.ts` 新增批量操作：
  - `batchDeleteWorks`
  - `batchUpdateWorkStatus`
  - `batchUpdateWorkPlacement`
  - `publishScheduledWorks`
- `src/app/admin/(protected)/works/page.tsx` 新增状态筛选、搜索框
- `src/components/admin/WorkBatchToolbar.tsx` 批量选择/操作组件

### 3.3 性能 SEO 补全

- 新增 `src/app/robots.ts`
- `src/lib/cms/repository.ts` WebP 优化函数整理

---

## 四、数据库迁移清单

按时间顺序执行：

| 文件 | 说明 |
|------|------|
| `supabase/migrations/20260620135759_create_contact_messages.sql` | 联系表单留言表 |
| `supabase/migrations/20260621085855_create_cms_foundation.sql` | CMS 基础表（works、media、categories、tags、blocks、versions 等） |
| `supabase/migrations/20260622121458_create_resumes.sql` | 简历基本表 |
| `supabase/migrations/20260623082900_create_text_content.sql` | 全局文字表 |
| `supabase/migrations/20260623091000_insert_extra_text_content.sql` | 全局文字种子数据 |
| `supabase/migrations/20260624000000_fix_text_content_production.sql` | 全局文字最终修复版 |
| `supabase/migrations/20260625010000_work_scheduled_publish.sql` | 作品定时发布字段 |
| `supabase/migrations/20260626000000_resume_full_cms.sql` | 简历完整 CMS 字段 |

> 注意：所有 SQL 必须在正确的 Supabase 项目 `hnujowombcgfxledpnxe` 上执行。

---

## 五、关键文件索引

### 5.1 数据与配置

| 文件 | 说明 |
|------|------|
| `src/data/portfolio.ts` | 静态作品、简历、导航、站点设置回退数据 |
| `src/lib/cms/repository.ts` | CMS 数据仓库（Supabase 查询 + 静态回退） |
| `src/lib/cms/resume.ts` | 简历类型定义与读取函数 |
| `src/lib/cms/versions.ts` | 作品版本控制逻辑 |
| `src/lib/cms/analytics.ts` | 数据分析统计逻辑 |
| `src/lib/supabase/config.ts` | Supabase 环境变量读取 |
| `src/lib/supabase/server.ts` | 服务端 Supabase 客户端 |
| `src/lib/admin-session.ts` | 管理员鉴权 |

### 5.2 后台页面与 Actions

| 文件 | 说明 |
|------|------|
| `src/app/admin/(protected)/works/page.tsx` | 作品列表 + 批量操作 |
| `src/app/admin/(protected)/works/actions.ts` | 作品 Server Actions（CRUD、批量、定时发布、私密链接） |
| `src/app/admin/(protected)/works/[id]/page.tsx` | 作品编辑页 |
| `src/components/admin/WorkWizard.tsx` | 三段式作品上传向导 |
| `src/components/admin/WorkBatchToolbar.tsx` | 作品批量操作工具栏 |
| `src/app/admin/(protected)/resume/page.tsx` | 简历管理页 |
| `src/app/admin/(protected)/resume/actions.ts` | 简历保存 Server Action |
| `src/components/admin/ResumeEditor.tsx` | 简历完整编辑器 |
| `src/app/admin/(protected)/settings/page.tsx` | 站点设置 |
| `src/app/admin/(protected)/settings/text-content/page.tsx` | 全局文字管理 |
| `src/app/admin/(protected)/analytics/page.tsx` | 数据分析仪表盘 |

### 5.3 前台页面

| 文件 | 说明 |
|------|------|
| `src/app/page.tsx` | 首页 |
| `src/app/works/page.tsx` | 作品列表 |
| `src/app/works/[slug]/page.tsx` | 作品详情 |
| `src/app/resume/page.tsx` | 简历页 |
| `src/app/sitemap.ts` | 动态 Sitemap |
| `src/app/robots.ts` | Robots.txt |
| `src/app/manifest.ts` | PWA Manifest |

---

## 六、环境变量

### 本地开发（`.env.local`）

```
NEXT_PUBLIC_SUPABASE_URL=<Supabase Project URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_SECRET_KEY=<service_role key>
CONTACT_RATE_LIMIT_SECRET=<随机字符串>
ADMIN_EMAIL=3624457672@qq.com
```

### Vercel 线上

在 Vercel Dashboard → 项目 Settings → Environment Variables 中配置同上变量。

---

## 七、本地开发与部署

### 常用命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 测试
npm test

# lint
npm run lint
```

### 部署

push 到 GitHub `master` 分支后，Vercel 自动构建部署。
手动部署：

```bash
npx vercel deploy --prod --yes --token <VERCEL_TOKEN>
```

---

## 八、待完成工作

### 8.1 已知待办

- [ ] 定时发布自动触发：已提供 `/api/admin/works/publish-scheduled` API 和后台"发布到期草稿"按钮，可配置 Vercel Cron 实现完全自动化
- [ ] 首页移动端细节优化（导航栏 logo、核心优势间距、CTA 横排等）
- [ ] 联系表单邮件发送需配置 Resend
- [ ] 更多真机测试（iOS Safari、Android Chrome、微信内置浏览器）
- [ ] 3D 粒子在低端机上的性能优化

### 8.2 可继续迭代

- [ ] 作品批量拖拽排序
- [ ] 媒体库支持文件夹/标签管理
- [ ] 前台可视化编辑（所见即所得）
- [ ] 分享卡片二维码自动生成
- [ ] Lighthouse 持续优化

---

## 九、常见问题与注意事项

1. **Supabase 项目 ID 是 `hnujowombcgfxledpnxe`**，所有 SQL 必须在该项目上执行。
2. **管理员角色**：Auth 用户 `app_metadata` 中必须包含 `"role": "admin"`（直引号），否则 `private.is_admin()` 会失败。
3. **软删除**：所有 delete 操作都使用 `deleted_at` 字段，不物理删除。
4. **静态回退**：当 Supabase 不可用时，前台自动回退到 `src/data/portfolio.ts` 的静态数据。
5. **临时文件**：部署前检查是否有 `temp_*` 文件，避免构建失败。
6. **编码问题**：如果中文显示为问号，检查 SQL 执行时的编码和 `portfolio.ts` 中的 `hasEncodingCorruption` 检测逻辑。

---

## 十、下一步建议

1. **提交并推送当前改动**：当前工作区有未提交代码，建议 commit 后 push 到 GitHub 以触发 Vercel 自动部署。
2. **执行最新数据库迁移**：在 Supabase SQL Editor 中执行 `20260626000000_resume_full_cms.sql`。
3. **验证后台**：登录 `/admin/resume` 测试新增/修改工作经验、校园经历等功能。
4. **验证前台**：访问 `/resume` 确认 CMS 数据正确渲染。

---

**最后验证结果**：

- `npm run build`：通过
- `npm test`：21 个测试文件 / 59 个测试全部通过
