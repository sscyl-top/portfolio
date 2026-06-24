<!--
  CHATLOG.md — SSCYL Portfolio 开发全记录
  用途：API 登录切换至 GPT Plus 登录后延续开发 / 项目交接
  生成时间：2026-06-24
  覆盖范围：2026-06-17 ~ 2026-06-24 全部对话与决策
-->

# SSCYL Portfolio — 开发全记录

---

## 一、项目速览

| 项目 | 值 |
|------|-----|
| **名称** | SSCYL Portfolio（陈涛涛个人作品集） |
| **定位** | 80% 面试作品集 + 20% 设计服务接单入口 |
| **线上** | https://sscyl.top |
| **后台** | https://sscyl.top/admin |
| **部署** | Vercel（`sscyl/portfolio`），自动从 GitHub master 部署 |
| **数据库** | Supabase 项目 `hnujowombcgfxledpnxe` |
| **代码** | GitHub `sscyl-top/portfolio`，master 分支 |
| **本地路径** | `D:\上山采月亮的台式\作品集网站\2026-作品集网站\` |
| **技术栈** | Next.js 16.2.9 + React 19.2.4 + TypeScript 5 + Tailwind CSS 4 + Supabase + Three.js + GSAP |

---

## 二、开发时间线

### Phase 0：项目初始化（2026-06-17 ~ 06-19）

- 基于 Next.js 16 App Router 脚手架创建项目
- 搭建前四页面：首页 `/`、作品列表 `/works`、作品详情 `/works/[slug]`、简历 `/resume`
- 首页：Three.js 3D 粒子动画、GSAP 动效、Hero 浮动卡片
- 作品列表：分类标签、代表人物、复合设计墙
- 作品详情：Behance 风格详情模板
- 简历页：PPT 风格 Web 简历
- 静态数据：`src/data/portfolio.ts`
- 管理后台预留：`/admin`

### Phase 1：CMS 基础设施（2026-06-20 ~ 06-21）

- **Supabase 接入**：配置 anon key + service_role key
- **数据库建表**：
  - `20260620135759_create_contact_messages.sql` — 联系表单留言表
  - `20260621085855_create_cms_foundation.sql` — CMS 基础（works, media, categories, tags, blocks, versions, site_settings, pages 等）
  - `20260622121458_create_resumes.sql` — 简历表
- **CMS 类型层**：`src/lib/cms/types.ts`、`src/lib/cms/validation.ts`、`src/lib/cms/repository.ts`
- **管理员鉴权**：`src/lib/admin-session.ts` — 检查邮箱匹配 `ADMIN_EMAIL` + `app_metadata.role === "admin"`
- **Admin Shell**：登录页 `/admin/login`、受保护布局、导航组件
- **Vitest 测试**：21 个测试文件，99 个测试全部通过
- **联系表单后端**：Resend 邮件发送 + 限流保护

### Phase 2：作品与媒体管理（2026-06-22）

#### P0：媒体块 & 图库块编辑
- 新增 server actions：`updateMediaBlock`、`updateGalleryBlock`
- UI 改造：`MediaBlockCard` / `GalleryBlockCard` 从只读改为可编辑表单
- 提交 `e86c61c`，构建通过，Vercel 自动部署

#### P1：调色板编辑 + Slug 自动生成
- `workUpdateSchema` 新增 `palette` 字段（hex 颜色数组）
- `PaletteEditor` 组件：色板展示 + 逗号分隔 hex 输入
- `SlugInput.tsx` 客户端组件：点"从标题生成"按钮调用 `suggestSlug(title)` server action
- 提交 `e86c61c`（含入上一 commit）

#### P2：媒体库搜索 + 可视化选择器
- `admin/media` 页面新增搜索框（`ilike` 模糊匹配）+ 类型下拉筛选
- 新建 `src/components/admin/MediaPicker.tsx`：
  - 缩略图网格展示（image/video/其他）
  - single 模式（radio）+ multi 模式（checkbox）
  - 选中态蓝色边框 + "已选"/"✓" 标签
  - 已选计数 + 一键清除
- 集成到作品编辑页：新增媒体块→single、新增图库块→multi、编辑已有块预选
- 提交 `a4becad`

#### 补充：Video / BeforeAfter / PDF 块类型
- 新增 `VideoBlockCard`、`BeforeAfterBlockCard`、`PdfBlockCard`
- 新增 `createVideoBlock`、`updateVideoBlock`、`createPdfBlock`、`updatePdfBlock` 等 server actions
- 现在 6 种块类型全部可编辑：text / media / gallery / video / before_after / pdf
- 提交 `2e78502`

#### 补充：前台渲染 video / pdf / before_after
- 所有单媒体 action 创建/更新时解析 `media_assets` 并存储 `media_ref`
- `toPublicBlocks` 映射支持 video / pdf / before_after
- 前台 `/works/[slug]`：video 块内嵌 `<video controls>` 播放器，PDF 块保持链接按钮
- 提交 `aff69e2`

#### 精细完善 Part 2
- before/after 块：从占位文字改为 `WorkMediaFrame` 实际图片渲染
- video 块：从链接按钮改为内嵌 `<video controls>` 播放器
- `generateMetadata()` 生成 OG/Twitter Card 标签
- 块拖拽排序：`BlockListWrapper.tsx` + `reorderWorkBlocks` server action
- Skeleton 加载状态：5 个 `loading.tsx` 覆盖全部主要页面
- MediaPicker 增强：客户端搜索、类型/排序筛选、全选/取消
- 提交 `f77170f` + `ae910fd`

#### 全面补齐 Part 3
- SEO：`robots.txt` + 动态 `sitemap.ts`
- 全局错误边界：`src/app/error.tsx`
- Admin 仪表盘增强：5 个统计卡片 + 快捷操作按钮 + 最近更新 + 最近消息
- 简历 CMS 同步：`/resume` 页面从同步改为异步，`getResumeData()` 从 Supabase 读取
- 联系表单客户端验证：姓名/邮箱/消息验证 + 错误态样式
- 提交 `0806c0d`

### Phase 3：简历 + UI 微调（2026-06-22 ~ 06-23 凌晨）

- 简历页 UI 微调：输入框边框降淡、手机端 hero 放大
- 联系卡片手机端优化：标签字号调整、输入框收窄、字段顺序调整
- 提交 `228dd10`、`2a5f3ba`

### Phase 4：全局文字管理 + VisualBlockEditor（2026-06-23）

#### 全局文字管理功能
- 数据表：`text_content`（21 条种子数据）
- 后台页面：`/admin/settings/text-content`
- 问题：生产环境 Supremease 缺 `text_content` 表
- 修复：创建 `supabase/migrations/20260624000000_fix_text_content_production.sql`（含建表+RLS+种子数据）
- 线上缓存问题：Vercel ISR/CDN 缓存旧错误页面 → 添加 `export const dynamic = "force-dynamic"` 解决
- 提交 `aaa008f` + `bcf75f4` + `969caa5`

#### VisualBlockEditor 改造
- 新建 `src/components/admin/VisualBlockEditor.tsx` 替换旧 `BlockEditor`
- 功能：
  1. 卡片式垂直堆叠块列表，显示类型图标和预览
  2. HTML5 拖拽排序（拖拽手柄）
  3. **文件拖拽上传**：拖文件到任意位置，自动识别类型并创建块
  4. 多文件批量上传
  5. 内联文本编辑（防抖保存）
  6. 块间 "+" 触发按钮，点击弹出添加菜单
  7. 添加内容块菜单：选择块类型 → 文本直接创建，媒体类型触发文件选择
  8. 删除块按钮

#### 第二轮完善（下午）
- **内联媒体编辑**：`InlineMediaEditor` 组件（显示预览 + 编辑说明文字 + 更换媒体 + 裁剪）
- **图库块创建流程**：菜单选择"图库"后触发多选文件输入
- **Before/After 块创建流程**：菜单选择"对比"后依次选择 before/after 图片
- **图片裁剪**：`ImageCropper` 组件（react-image-crop），支持自由裁剪 + 固定比例（1:1, 4:3, 16:9）
- 新增 `src/lib/cms/upload-media.ts`（含 `uploadMediaBlob`）

#### B2 布局系统实现（20:00）
- 用户需求：类似 Behance 的布局体验（B2 方向）— 纵向流式 + 可调整列宽
- `VisualBlockEditor.tsx` 添加 `LayoutBar` 组件：
  - 宽度选择：通栏(full) / 约束(contained, 默认) / 窄版(narrow)
  - 文本块：额外显示对齐选择（左对齐/居中）
  - 图库块：额外显示列数选择（2/3/4列）
- `BlockLayout` 类型：`{ width?, align?, columns? }`
- 前台 `/works/[slug]`：根据 `layout` 应用宽度/对齐/列数

### Phase 5：数据分析 + 版本历史 + 定时发布 + 管理后台增强（2026-06-23 深夜）

#### 数据分析模块
- 数据表：`visits`、`page_views`、`work_views`、`work_comments`、`work_likes`（含 RLS）
- `src/lib/cms/analytics.ts`：IP 哈希处理、会话管理（30 分钟窗口）、Zod 验证
- `AnalyticsTracker.tsx`：过滤 bot/admin/api，`sendBeacon` 优先 + `fetch` 兜底
- `LiveVisitors.tsx`：轮询 10s，正确处理 interval 和 mounted 状态
- 后台仪表盘：`/admin/analytics`

#### 作品版本历史
- 数据库：`work_versions` 表新增 `label` 列
- `src/lib/cms/versions.ts`：回滚前自动备份（后悔药），深相等比较定位当前版本
- `src/components/admin/VersionHistoryPanel.tsx`：客户端组件，正确使用 `useTransition`

#### 定时发布
- 数据库：`works.scheduled_publish_at` 字段
- API：`/api/admin/works/publish-scheduled` — `CRON_SECRET` 鉴权
- 手动触发 + Vercel Cron 自动触发

#### 管理后台增强
- `WorkWizard.tsx`：三段式作品上传向导（站酷风格）
  - 媒体上传 → 元数据 → 内容块编辑
  - 标题自动生成 slug
- `WorkBatchToolbar.tsx`：批量选择/操作
  - `batchDeleteWorks`、`batchUpdateWorkStatus`、`batchUpdateWorkPlacement`
- `WorkQuickUploader.tsx`：快捷上传
- `SettingsMediaUploader.tsx`：站点设置媒体上传
- `HomeSectionOrderEditor.tsx`：首页板块排序

#### SEO 补齐
- `manifest.ts`：PWA
- `robots.ts`：Disallow /admin 和 /api，指向 sitemap

#### 提交与部署
- Commit `398febf`：61 个文件（37 改 + 24 新），+1941/-1332 行
- 已推送到 GitHub master，Vercel 自动部署已触发
- ⚠️ 4 个 SQL 迁移需在线上 Supabase 手动执行
- 生成合并迁移脚本 `apply-migrations-production.sql`（含 `drop policy if exists` 幂等处理）

---

## 三、当前状态

### 构建状态

| 指标 | 状态 | 备注 |
|------|------|------|
| 编译 | ✅ 通过 | 7.3s |
| TypeScript | ✅ 通过 | 5.9s（可能需清理 `.next` 缓存避免 EBUSY） |
| 测试 | ✅ 全通 | 21 test files，99 tests，6.24s |
| Lint | ✅ 0 errors | 20 warnings |
| 线上构建 | ✅ 通过 | Vercel Linux 构建不受 Windows EBUSY 影响 |

### 已部署功能清单

**前台页面：**
- `/` 首页 — 3D 粒子动画 + Hero 浮动卡片 + 优势段落 + 作品展示 + 联系 CTA
- `/works` — 作品列表 + 分类筛选 + 复合设计墙
- `/works/[slug]` — 动态 CMS 内容块渲染（6 种块类型 + B2 布局系统）
- `/resume` — 从 CMS 读取 + 静态回退

**后台管理（`/admin`）：**
- 仪表盘（统计卡片 + 快捷操作 + 最近更新/消息）
- 数据分析（访问统计 + 页面浏览 + 设备/来源分析 + 实时访客）
- 作品管理（列表/搜索/状态筛选/批量操作/导入静态作品）
- 作品编辑（三段式向导 + 6 种内容块 + 拖拽排序 + 文件拖拽上传 + 图片裁剪 + B2 布局 + 版本历史 + 定时发布 + 私密分享）
- 分类/标签管理
- 媒体库（上传/管理/可视化选择器/搜索/排序）
- 留言管理
- 站点设置（名称/Logo/头像/SEO/社交链接/默认主题）
- 全局文字（21 条 CMS 管理）
- 简历管理

### 待办事项

| 项目 | 优先级 | 说明 |
|------|--------|------|
| 执行线上 SQL 迁移 | **P0** | 4 个迁移脚本需在 Supabase Dashboard 执行，见 `apply-migrations-production.sql` |
| 验证 Vercel 部署 | **P0** | 确认 `398febf` 构建成功 + 新功能可用 |
| 管理员直引号验证 | **P1** | Supabase `raw_app_meta_data` 中 role 必须为 `"admin"`（直引号，非弯引号 `"admin"`） |
| 媒体存储迁移 COS | **P2** | 方案已确认，待用户开通腾讯云 COS 香港区域后执行（预计 2.5–3.5 天） |
| 重复迁移文件清理 | **P3** | `20260624020000_*` 和 `20260625010000_*` 内容重复，可去重 |
| VisualBlockEditor 未使用变量 | **P3** | `draggedBlockId`、`baStep`、`dragOverIndex` — 疑似开发中功能 |
| `<img>` vs `<Image />` | **P3** | 20 处使用原生 `<img>`，部分为刻意（外部 URL），需逐处确认 |
| DynamicText 未集成前台 | **P3** | 组件存在但未被任何页面引用，前台文字全部来自静态 `portfolio.ts` |

---

## 四、环境变量配置

在 `.env.local`（本地）和 Vercel Environment Variables（生产）中配置：

| 变量名 | 说明 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon public key |
| `SUPABASE_SECRET_KEY` | Supabase service_role key（服务端专用） |
| `ADMIN_EMAIL` | 管理员邮箱，默认 `3624457672@qq.com` |
| `RESEND_API_KEY` | Resend 邮件 API Key（可选） |
| `RESEND_FROM_EMAIL` | 发信地址，如 `contact@sscyl.top` |
| `CONTACT_RATE_LIMIT_SECRET` | 联系表单限流密钥（随机字符串） |
| `NEXT_PUBLIC_SITE_URL` | 站点完整 URL，默认 `https://sscyl.top` |
| `CRON_SECRET` | 定时发布 API 鉴权密钥（可选，用于 Vercel Cron） |

---

## 五、管理员账号配置

1. 在 Supabase Dashboard → Authentication → Users 中创建用户
   - Email: `3624457672@qq.com`
   - 密码: 用户指定
2. 点击该用户 → **App metadata** 填入：
   ```json
   { "role": "admin" }
   ```
3. 确保 `raw_app_meta_data` 中的 `role` 值为 `"admin"`（直引号，非弯引号 `"admin"`）
4. 鉴权逻辑：[src/lib/admin-session.ts](D:\上山采月亮的台式\作品集网站\2026-作品集网站\src\lib\admin-session.ts)
   - 检查邮箱匹配 `ADMIN_EMAIL`
   - 检查 `app_metadata.role === "admin"`

---

## 六、常用命令

| 命令 | 说明 |
|---|---|
| `npm install` | 安装依赖 |
| `npm run dev` | 启动开发服务器（http://localhost:3000） |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | ESLint 检查 |
| `npm test` | Vitest 单元测试（99 个测试） |
| `npm run cms:check` | 检查 Supabase 连接状态 |
| `npm run cms:make-admin` | 将用户提升为管理员 |

---

## 七、数据库迁移清单

**Supabase 项目 ID：`hnujowombcgfxledpnxe`**

在 Supabase SQL Editor 中按顺序执行：

| 序号 | 文件名 | 说明 | 状态 |
|------|--------|------|------|
| 1 | `20260620135759_create_contact_messages.sql` | 联系表单留言表 | ✅ 已执行 |
| 2 | `20260621085855_create_cms_foundation.sql` | CMS 基础（works/media/categories/tags/blocks/versions/pages/site_settings） | ✅ 已执行 |
| 3 | `20260622121458_create_resumes.sql` | 简历表 | ✅ 已执行 |
| 4 | `20260623040000_hero_video_management.sql` | 首页 Hero 视频管理 | ✅ 已执行 |
| 5 | `20260623082900_create_text_content.sql` | 全局文字表 | ✅ 已执行 |
| 6 | `20260623091000_insert_extra_text_content.sql` | 额外文字种子数据 | ✅ 已执行 |
| 7 | `20260623120000_add_label_to_work_versions.sql` | 版本标签列 | ⚠️ 待执行 |
| 8 | `20260624000000_fix_text_content_production.sql` | 生产环境 text_content 修复 | ⚠️ 待执行 |
| 9 | `20260624010000_admin_analytics.sql` | 分析模块（5 个表 + RLS） | ⚠️ 待执行 |
| 10 | `20260624020000_add_work_scheduled_publish.sql` | 定时发布字段 | ⚠️ 待执行 |
| 11 | `20260625010000_work_scheduled_publish.sql` | 定时发布补充 | ⚠️ 待执行 |
| 12 | `20260626000000_resume_full_cms.sql` | 简历完整 CMS | ⚠️ 待执行 |

> 迁移 7–12 也可通过执行根目录 `apply-migrations-production.sql` 一次性完成（含幂等处理）。

**Storage Bucket：** `portfolio-media`（公开读取）

---

## 八、关键文件速查

### 核心业务层

| 文件 | 用途 |
|------|------|
| `src/data/portfolio.ts` | 静态作品数据（CMS 不可用时的回退源） |
| `src/lib/cms/types.ts` | 稳定 TypeScript 契约（CMS 表结构映射） |
| `src/lib/cms/validation.ts` | Zod schemas 数据校验 |
| `src/lib/cms/repository.ts` | 公开只读数据层（Supabase → static fallback） |
| `src/lib/cms/media-url.ts` | 媒体 URL 构建 |
| `src/lib/cms/analytics.ts` | 数据分析模块 |
| `src/lib/cms/versions.ts` | 版本控制模块 |
| `src/lib/cms/upload-media.ts` | 客户端媒体上传工具 |
| `src/lib/admin-session.ts` | 管理员鉴权中间件 |
| `src/lib/supabase/config.ts` | Supabase 配置与就绪检查 |

### 前台页面

| 文件 | 路由 |
|------|------|
| `src/app/page.tsx` | `/` 首页 |
| `src/app/works/page.tsx` | `/works` 作品列表 |
| `src/app/works/[slug]/page.tsx` | `/works/[slug]` 作品详情 |
| `src/app/resume/page.tsx` | `/resume` 简历 |

### 后台管理

| 文件 | 路由 | 功能 |
|------|------|------|
| `src/app/admin/page.tsx` | `/admin` | 仪表盘 |
| `src/app/admin/(protected)/analytics/page.tsx` | `/admin/analytics` | 数据分析 |
| `src/app/admin/(protected)/works/page.tsx` | `/admin/works` | 作品列表 |
| `src/app/admin/(protected)/works/[id]/page.tsx` | `/admin/works/[id]` | 作品编辑 |
| `src/app/admin/(protected)/media/page.tsx` | `/admin/media` | 媒体库 |
| `src/app/admin/(protected)/resume/page.tsx` | `/admin/resume` | 简历管理 |
| `src/app/admin/(protected)/settings/page.tsx` | `/admin/settings` | 站点设置 |
| `src/app/admin/(protected)/settings/text-content/page.tsx` | `/admin/settings/text-content` | 全局文字 |
| `src/app/admin/login/page.tsx` | `/admin/login` | 登录页 |

### 关键组件

| 文件 | 用途 |
|------|------|
| `src/components/admin/VisualBlockEditor.tsx` | 可视化块编辑器（核心编辑组件） |
| `src/components/admin/MediaPicker.tsx` | 媒体可视化选择器 |
| `src/components/admin/ImageCropper.tsx` | 图片裁剪器 |
| `src/components/admin/WorkWizard.tsx` | 三段式作品上传向导 |
| `src/components/admin/WorkBatchToolbar.tsx` | 批量操作工具栏 |
| `src/components/admin/VersionHistoryPanel.tsx` | 版本历史面板 |
| `src/components/admin/DragDropUpload.tsx` | 拖拽上传组件 |
| `src/components/admin/ResumeEditor.tsx` | 简历编辑器 |
| `src/components/admin/AnalyticsTracker.tsx` | 访问追踪 |
| `src/components/admin/AdminNav.tsx` | 后台导航 |
| `src/components/home/HeroShowcase.tsx` | 首页 Hero 视频卡片 |

### API 路由

| 路由 | 鉴权 | 用途 |
|------|------|------|
| `/api/media/sign-upload` | `getAuthorizedAdmin` | 媒体上传签名 |
| `/api/media/upload` | `getAuthorizedAdmin` | 媒体上传 |
| `/api/media/register` | `getAuthorizedAdmin` | 媒体注册 |
| `/api/admin/analytics/live` | `requireAdmin` | 实时访客 |
| `/api/admin/works/publish-scheduled` | `CRON_SECRET` | 定时发布 |
| `/api/track` | 公开 | 访问追踪 |
| `/api/text-content` | 公开（只读） | 文字内容 |
| `/api/contact` | 公开 | 联系表单 |

---

## 九、媒体存储迁移方案（腾讯云 COS）

> 状态：方案已确认，等待用户开通 COS 后执行。**不需要走 ICP 备案流程。**

| 项目 | 说明 |
|------|------|
| 动机 | 解决国内访问 Supabase Storage 延迟问题 |
| 决策 | 不备份，直接用 COS 香港区域 bucket（BGP 优化线路） |
| 范围 | 仅替换 Storage 层，数据库与 Auth 保留 Supabase（数据库耦合 130+ 调用点，全量迁移成本 2–4 周不划算） |
| 图片处理 | Supabase `?width=&format=` → 腾讯云数据万象 `imageMogr2` |
| 改造文件 | 新增 `src/lib/storage/cos.ts`、改 `media-url.ts`/`upload/route.ts`/`sign-upload/route.ts`/`media/actions.ts` + 前台 `buildOptimizedMediaUrl` 调用点 |
| 切换方式 | URL 构建已解耦（media-url.ts），迁移后切环境变量即可，`storage_key` 保持不变 |
| 预计耗时 | 2.5–3.5 天 |
| 前置条件 | 用户开通 COS + 数据万象，提供 SecretId/Key/Region/Bucket |

---

## 十、已知问题与注意事项

1. **Windows 本地 build 可能失败**：原因是 `next build` 进程锁死 `.next/diagnostics/build-diagnostics.json`（EBUSY），不影响 Vercel Linux 构建。可通过 `tsc --noEmit` + 清理 `.next` + 重试解决。
2. **管理员引号问题**：Supabase `raw_app_meta_data` 中如果出现弯引号 `"admin"` 会导致鉴权失败，必须用直引号 `"admin"`。
3. **重复迁移文件**：`20260624020000_*` 和 `20260625010000_*` 内容相同（都加 `scheduled_publish_at`），因 `if not exists` 不报错，可未来去重。
4. **DynamicText 未集成**：`src/components/DynamicText.tsx` 存在但未被任何页面引用，前台文字全部来自静态 `portfolio.ts`。
5. **邮箱不一致**：`ADMIN_EMAIL` 为 `3624457672@qq.com`，需确认与 Supabase Auth 用户邮箱一致。

---

## 十一、建议续研路线

1. **P0：执行线上 SQL 迁移** → 验证 Vercel 部署 → 确认新功能可用
2. **P1：管理员账号验证** → 确认直引号鉴权正常
3. **P2：COS 媒体存储迁移** → 用户开通 COS 后执行（改善国内访问速度）
4. **P3：DynamicText 集成** → 将全局文字 CMS 接入前台页面
5. **P3：代码清理** → 去重迁移文件、清理未使用变量、统一 `<Image />` 使用
6. **后续功能** → 简历完整 CMS 上线（迁移 `20260626000000_resume_full_cms.sql`）、评论系统等

---

> 本文档覆盖 2026-06-17 ~ 2026-06-24 全部开发对话与决策。
> 最后更新：2026-06-24
> 最新 commit：`398febf` feat: 数据分析、版本历史、定时发布、SEO 及管理后台增强
