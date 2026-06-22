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
- 下一波待办：前台页面渲染 PDF 块、媒体库增强
