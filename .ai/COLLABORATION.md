# AI 协作说明

> 本文件用于多个 AI 助手（如 Trae / 豆包）之间的工作交接，避免重复劳动和互相覆盖。
> 每次会话结束前，请更新本文件。

## 当前工作状态（2026-06-30）

### 最新提交
- `f52bfba` fix(settings): 修复视频上传后保存被清空的问题

### 已修复的问题
1. **视频上传后保存被清空**（commit `f52bfba`）
   - 根因：`site_settings` 表缺失 `cta_figure_light_media_id` 和 `cta_*_scale/offset` 等列，导致 `upsert` 报错，`site_settings` 不更新，只写 `text_content`。`getMediaId` 优先用 `site_settings` 旧值（可能指向被软删的记录），导致预览不显示。
   - 修复：
     - `page.tsx` `getMediaId`：校验 `site_settings` 值是否在媒体列表中，否则用 `text_content` 后备值
     - `actions.ts`：`upsert` 前查询 `site_settings` 实际列，过滤不存在的列，避免报错
   - 数据修复：已用 service key 把 `site_settings.hero_side2_video_media_id` 从 `b6c38aea...`（被软删）更新为 `f1a4ef33...`（有效）

2. **register API 返回值缺失字段**（commit `5846577`）
   - 正常上传成功路径返回值缺少 `storage_key`、`mime_type`、`original_name`、`byte_size`，导致前端无预览
   - 已补全返回字段

### 待解决的问题（需要用户操作）
1. **site_settings 表缺失多个列**（根本问题）
   - 缺失列：`cta_figure_light_media_id`、`cta_card_scale`、`cta_card_offset_x/y`、`cta_figure_scale`、`cta_figure_offset_x/y`、`cta_figure_light_scale`、`cta_figure_light_offset_x/y`、`cta_ticker_logo_scale`、`cta_ticker_logo_offset_x/y`、`cta_center_logo_scale`、`cta_center_logo_offset_x/y`
   - 原因：`DATABASE_URL` 环境变量未设置，`exec_ddl` RPC 函数不存在，迁移无法执行
   - 影响：CTA transform 值只能写入 `text_content` 后备，不能直接用 `site_settings` 列
   - 解决方案（任选其一）：
     - a. 在 Supabase Dashboard → SQL Editor 手动执行 ALTER TABLE 添加列
     - b. 在 Vercel 环境变量设置 `DATABASE_URL`（Supabase → Project Settings → Database → Connection string）
     - c. 在 Supabase 创建 `exec_ddl` RPC 函数（见 `migrations.ts` 注释）

2. **媒体库测试垃圾文件**
   - `__migration_test.mp4`、`__verify_test.mp4`、`__preview_test.mp4` 需要清理

### 备份分支
- `backup/hero-side2-fix-20260630`：本次修复前的状态

## 协作规则

### 提交规范
- **分离提交**：不要把不同作者的修改混在同一个 commit 中
- **提交前**：用 `git status` 检查，只 `git add` 自己修改的文件
- **commit message**：用 `fix(scope): 描述` 或 `feat(scope): 描述` 格式

### 修改前
- **创建备份分支**：`git branch backup/描述-日期`
- **检查 TypeScript 编译**：`npx tsc --noEmit`
- **不要修改对方的文件**：除非明确需要修复 bug

### 部署后
- **验证线上效果**：用浏览器打开线上页面，确认功能正常
- **更新本文件**：记录工作状态、已修复/待解决的问题

## 已知系统状态

### 数据库
- Supabase URL: `https://hnujowombcgfxledpnxe.supabase.co`
- `site_settings` 表现有列：`id, name, nickname, default_theme, font_preset, seo_title, seo_description, social_links, logo_media_id, avatar_media_id, share_media_id, cta_card_media_id, cta_figure_media_id, cta_ticker_logo_media_id, hero_main_video_media_id, hero_side1_video_media_id, hero_side2_video_media_id, hero_side3_video_media_id, name_media_id, cta_center_logo_media_id, created_at, updated_at`
- `media_assets` 表有 `content_hash` 列（已迁移）
- `exec_ddl` RPC 函数不存在
- `DATABASE_URL` 环境变量未设置

### R2 存储
- R2 公开 URL: `https://pub-6f3d26b21fd845dfb5ecab3047a5fded.r2.dev`
- 上传流程：sign-upload → PUT 直传 R2 → register（写库+查重）

### 线上地址
- 前台: `https://sscyl.top`
- 后台: `https://sscyl.top/admin`
