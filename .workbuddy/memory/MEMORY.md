# 项目约定

## 技术栈
- Next.js 16.2.9 + TypeScript + Tailwind CSS
- Supabase (hnujowombcgfxledpnxe) — 数据库 / Auth / Storage
- Vercel (sscyl/portfolio) — 部署 + 自定义域名 sscyl.top
- Three.js + GSAP — 首页 3D 动画

## Admin 开发模式
- Server Actions + FormData，无需客户端状态管理
- Zod schema 验证所有输入
- 软删除策略 (`deleted_at`)，不物理删除
- 所有 action 内 `requireAdmin()` 鉴权
- `revalidatePath` 刷新前台/后台页面

## 前台数据
- `src/lib/cms/repository.ts` — 只读公共数据层，Supabase 不可用时回退静态数据
- `src/data/portfolio.ts` — 静态 portfolio 数据
- `src/lib/cms/media-url.ts` — 媒体 URL 构建

## 当前开发阶段：Plan 2 — Works & Media
- ✅ P0: 媒体块/图库块编辑（updateMediaBlock / updateGalleryBlock）
- ✅ P1: Palette 颜色编辑器 + Slug 自动生成
- ✅ P2: VideoBlockCard + BeforeAfterBlockCard 编辑组件；所有 5 种块类型编辑可用 (text/media/gallery/video/before_after)
- ✅ PDF 块类型：pdfBlockSchema + createPdfBlock + updatePdfBlock + PdfBlockCard，6 种块类型全部可编辑
- ✅ 前台渲染：media_ref 富化（所有单媒体 action 创建/更新时解析存储媒体引用），toPublicBlocks 支持 video/pdf/before_after 映射，works/[slug] 渲染 video/pdf 块
- ⚠️ text_content 表待上线确认执行 SQL：见 supabase/migrations/20260624000000_fix_text_content_production.sql
- 下一波待办：部署验证 / 微调

## 2026-06-23 全量推送上线（commit 398febf）
- 新增功能模块：数据分析、作品版本历史、定时发布、SEO(manifest/robots)、管理后台增强(WorkWizard/BatchToolbar/QuickUploader/SettingsMediaUploader)
- 4 个 Supabase 迁移待生产库执行：work_versions.label、analytics 5 表+RLS、works.scheduled_publish_at
- 合并迁移脚本：项目根 `apply-migrations-production.sql`（可在 Supabase Dashboard SQL Editor 直接执行，含 drop policy if exists 幂等处理）
- 本地 Windows 构建因僵尸 next build 进程文件锁(EBUSY)无法完成 full build，但 tsc+编译均通过；Vercel Linux 构建不受影响

## 待启动：媒体存储迁移 Supabase Storage → 腾讯云 COS（2026-06-24 决策）
- 动机：解决国内访问延迟（Supabase Storage 海外节点慢）
- 决策：不备案（用户不愿走 ICP 流程），用 COS 香港区域 bucket（BGP 优化线路，中等改善，非国内 CDN 级秒开）
- 仅替换 Storage 层，数据库与 Auth 保留 Supabase（数据库耦合 130+ 调用点，全量迁移成本 2-4 周不划算）
- 图片处理：Supabase `?width=&format=` → 腾讯云数据万象 `imageMogr2`
- 改造文件：新增 `src/lib/storage/cos.ts`、改 `media-url.ts`/`upload/route.ts`/`sign-upload/route.ts`/`media/actions.ts` + 前台 `buildOptimizedMediaUrl` 调用点
- URL 构建已解耦（media-url.ts），迁移后切环境变量即可，storage_key 保持不变
- 预计耗时 2.5–3.5 天；需用户开通 COS+数据万象并提供 SecretId/Key/Region/Bucket
- 状态：方案已确认，等待用户开通 COS 后开始执行
