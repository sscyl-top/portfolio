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

### 系统性功能测试结果（2026-06-30 完整测试，全部通过）

> 本次测试用 Playwright 自动化执行，覆盖前台+后台+数据库全链路。

| # | 测试项 | 结果 | 说明 |
|---|--------|------|------|
| 1 | 前台首页 hero 视频显示 | ✅ 通过 | 4个视频全部加载成功（readyState=4），主视频正在播放，图片正常 |
| 2 | 视频字段清空→保存→恢复 | ✅ 通过 | hero_side3 清空→保存持久化→刷新确认为空→恢复原值→保存持久化，全链路正常 |
| 3 | 作品列表页 /works | ✅ 通过 | 31个作品卡片，图片全部加载，无破损 |
| 4 | 作品详情页 | ✅ 通过 | 标题/H1/3图全部正常，无破损图 |
| 5 | 媒体库页面 | ✅ 通过 | 324文件，虚拟滚动+懒加载正常工作，滚动后图片渐次加载（非破损） |
| 6 | 前台主题切换 | ✅ 通过 | 首页不显切换按钮（符合设计），/works 切换 light→dark 成功，按钮 aria-label 正确反转 |
| 7 | 后台 CTA transform 保存 | ✅ 通过 | cta_card_scale 1.2→1.5 保存持久化成功，刷新确认，已恢复1.2 |
| 8 | 后台作品管理 | ✅ 通过 | 17个作品，编辑页字段（title/subtitle/summary/cover）全部正常 |

### 重要发现（修正之前的误判）
- **site_settings 表的 cta_*_scale/offset 列实际是存在的**（CTA transform 值保存测试通过，值持久化成功）
- 之前会话判断"缺失列"可能是误判，或豆包在期间补充了迁移
- 但 `cta_figure_light_media_id` 列仍可能缺失（未单独测试），保留列过滤逻辑作为安全网

### 待解决的问题（需要用户操作）
1. **site_settings 表 schema 确认**
   - 之前判断 cta_*_scale 等列缺失，但测试发现实际存在
   - 建议：在 Supabase Dashboard 执行 `SELECT column_name FROM information_schema.columns WHERE table_name = 'site_settings'` 确认完整列清单
   - 如果 `cta_figure_light_media_id` 缺失，需要手动 ALTER TABLE 添加

2. **媒体库测试垃圾文件**
   - `__migration_test.mp4`、`__verify_test.mp4`、`__preview_test.mp4` 需要清理

3. **新上传视频完整流程未测**
   - 缺少本地测试视频文件，未做"上传新视频→保存→刷新"测试
   - 已通过"清空→保存→恢复"测试验证 hidden input 提交链路正常

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
