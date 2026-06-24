# SSCYL Portfolio — 监督者交接文档

> 生成时间：2026-06-24
> 角色：项目监督者（监督与纠错）
> 最新 commit：`398febf` feat: 数据分析、版本历史、定时发布、SEO 及管理后台增强
> 本地路径：`D:\上山采月亮的台式\作品集网站\2026-作品集网站`

---

## 一、项目当前健康状态

| 指标 | 状态 | 备注 |
|------|------|------|
| **构建** | ✅ 通过 | 编译 7.3s，TypeScript 5.9s（需清理 `.next` 缓存避免 EBUSY） |
| **测试** | ✅ 全通过 | 21 test files，59 tests，duration 6.24s |
| **Lint** | ✅ 0 errors | 20 warnings（从 21 降至 20，监督者修复 1 处） |
| **安全鉴权** | ✅ 正确 | 所有 admin API 均使用 `requireAdmin` / `getAuthorizedAdmin` |
| **数据库迁移** | ⚠️ 待执行 | 4 个迁移脚本需在生产 Supabase 执行（见下文） |

---

## 二、监督者已完成的工作

### 2.1 代码修复

#### 修复 1：移除未使用变量 `insertData`

- **文件**：[src/app/api/media/register/route.ts](file:///d:/上山采月亮的台式/作品集网站/2026-作品集网站/src/app/api/media/register/route.ts#L54)
- **问题**：`const { data: insertData, error: dbError }` 中 `insertData` 被赋值但从未使用，产生 lint 警告
- **修复**：改为 `const { error: dbError }`
- **验证**：lint 警告从 21 降至 20

### 2.2 代码审查通过

以下新增模块经审查代码质量良好，无需修改：

| 模块 | 文件 | 审查结论 |
|------|------|----------|
| **数据分析** | `src/lib/cms/analytics.ts` | IP 哈希处理正确，Zod 验证完整，会话管理合理（30 分钟窗口） |
| **实时访客** | `src/app/admin/(protected)/analytics/LiveVisitors.tsx` | 轮询 10s，正确清理 interval 和 mounted 状态 |
| **访客追踪** | `src/components/admin/AnalyticsTracker.tsx` | 正确过滤 bot/admin/api，sendBeacon 优先 + fetch 兜底 |
| **版本控制** | `src/lib/cms/versions.ts` | 回滚前自动备份（后悔药），深相等比较定位当前版本 |
| **版本 UI** | `src/components/admin/VersionHistoryPanel.tsx` | 客户端组件正确使用 useTransition，回滚/前进共用底层逻辑 |
| **定时发布** | `src/app/api/admin/works/publish-scheduled/route.ts` | CRON_SECRET 鉴权正确 |
| **拖拽上传** | `src/components/admin/DragDropUpload.tsx` | 10GB 限制，多选支持，useCallback 优化 |
| **三段式上传** | `src/components/admin/WorkWizard.tsx` | 站酷式流程，标题自动生成 slug |

### 2.3 安全审查

| API 路由 | 鉴权方式 | 结论 |
|----------|----------|------|
| `/api/media/sign-upload` | `getAuthorizedAdmin` | ✅ |
| `/api/media/upload` | `getAuthorizedAdmin` | ✅ |
| `/api/media/register` | `getAuthorizedAdmin` | ✅ |
| `/api/admin/analytics/live` | `requireAdmin` | ✅ |
| `/api/admin/works/publish-scheduled` | `CRON_SECRET` | ✅ |
| `/api/track` | 公开（访客追踪） | ✅ 无需鉴权 |
| `/api/text-content` | 公开（只读 CMS） | ✅ 无需鉴权 |
| `/api/contact` | 公开（联系表单） | ✅ 无需鉴权 |

---

## 三、发现但未处理的问题（避免冲突）

### 3.1 重复的数据库迁移文件（冗余，不报错）

存在两个功能完全相同的迁移文件：

| 文件 | 时间戳 | 内容 |
|------|--------|------|
| `supabase/migrations/20260624020000_add_work_scheduled_publish.sql` | 2026-06-24 02:00 | 添加 `scheduled_publish_at` 字段 |
| `supabase/migrations/20260625010000_work_scheduled_publish.sql` | 2026-06-25 01:00 | 同上（重复） |

**未处理原因**：两者均使用 `if not exists`，不会报错。可能是其他开发者重复创建，删除可能引发冲突。

### 3.2 VisualBlockEditor 未使用变量（疑似开发中功能）

[VisualBlockEditor.tsx](file:///d:/上山采月亮的台式/作品集网站/2026-作品集网站/src/components/admin/VisualBlockEditor.tsx) 中以下变量被赋值但未读取：

- `draggedBlockId`（第 256 行）— 疑似拖拽块功能开发中
- `baStep`（第 268 行）— 疑似 before/after 块步骤管理开发中
- `dragOverIndex` 作为 `BlockCard` prop 传入但未使用（第 1078 行）

**未处理原因**：可能是其他开发者正在开发的功能，删除会破坏其工作。

### 3.3 `<img>` vs `<Image />` 警告

多处使用 `<img>` 而非 Next.js `<Image />`，主要在：
- `VisualBlockEditor.tsx`（8 处）
- `ImageCropper.tsx`（1 处）
- `PdfBlockRenderer.tsx`（1 处）
- `admin/page.tsx`（2 处）

**未处理原因**：部分是刻意用于外部 URL，修改需逐个确认。

---

## 四、其他开发者正在进行的工作（未提交）

### 4.1 简历 CMS 完整化

| 新增文件 | 说明 |
|----------|------|
| `src/lib/cms/resume.ts` | 简历 CMS 数据层，支持 experience/campus/education/expertise 等完整结构 |
| `src/components/admin/ResumeEditor.tsx` | 简历编辑器组件 |
| `supabase/migrations/20260626000000_resume_full_cms.sql` | resumes 表新增 highlights/expertise/experience/campus/education/services/downloads 字段 |

**修改文件**：
- `src/app/admin/(protected)/resume/actions.ts`（+179 行）
- `src/app/admin/(protected)/resume/page.tsx`
- `src/app/resume/page.tsx`（前台改为从 CMS 读取）

### 4.2 留言管理增强

- `src/app/admin/(protected)/messages/page.tsx`（+133 行）
- `src/app/admin/(protected)/messages/MessageList.tsx`

### 4.3 作品批量操作增强

- `src/components/admin/WorkBatchToolbar.tsx`（+83 行）
- `src/app/admin/(protected)/works/actions.ts`（+35 行）

### 4.4 VisualBlockEditor 清理

- `src/components/admin/VisualBlockEditor.tsx`（-7 行，可能是清理未使用代码）

---

## 五、待执行的数据库迁移

以下迁移脚本需要在生产 Supabase 项目（`hnujowombcgfxledpnxe`）中执行：

| 顺序 | 文件 | 说明 | 紧急度 |
|------|------|------|--------|
| 1 | `20260623120000_add_label_to_work_versions.sql` | work_versions 表新增 label 列 | ⚠️ 中（版本备注功能依赖） |
| 2 | `20260624010000_admin_analytics.sql` | 分析模块表（visits/page_views/work_views/work_comments/work_likes）+ RPC 函数 | ⚠️ 高（数据分析功能依赖） |
| 3 | `20260624020000_add_work_scheduled_publish.sql` | works 表新增 scheduled_publish_at 字段 | ⚠️ 中（定时发布依赖） |
| 4 | `20260625010000_work_scheduled_publish.sql` | 与 #3 重复（可跳过） | 可跳过 |
| 5 | `20260626000000_resume_full_cms.sql` | resumes 表新增完整 CMS 字段 + 种子数据 | ⚠️ 中（简历 CMS 依赖，未提交） |

**执行方式**：在 Supabase Dashboard SQL Editor 中逐个执行，或使用 `apply-migrations-production.sql`（项目根目录已有聚合脚本）。

---

## 六、项目架构关键约定

### 6.1 技术栈

- **Next.js 16.2.9**（App Router + Turbopack）— 注意：此版本有破坏性变更，需阅读 `node_modules/next/dist/docs/`
- **React 19.2.4** + TypeScript 5
- **Supabase**（Auth + Database + Storage）
- **Tailwind CSS 4** + Three.js + GSAP

### 6.2 代码规范

- **Server Actions + FormData** 模式，无需客户端状态管理
- **服务器组件**不能有事件处理器（`onClick`/`onSubmit` 等），需拆分为客户端组件
- **Zod schema** 验证所有输入
- **软删除策略**（`deleted_at` 字段），不物理删除（评论除外，评论用物理删除）
- **RLS** + `private.is_admin()` 函数控制管理员权限
- **版本控制**：`work_versions` 表存储 JSONB 快照，回滚前自动备份当前状态

### 6.3 关键文件位置

| 功能 | 文件 |
|------|------|
| 管理员鉴权 | `src/lib/admin-session.ts` |
| Supabase 客户端 | `src/lib/supabase/server.ts` / `service.ts` |
| CMS 数据层 | `src/lib/cms/repository.ts` |
| 分析模块 | `src/lib/cms/analytics.ts` |
| 版本控制 | `src/lib/cms/versions.ts` |
| 媒体上传 | `src/lib/cms/upload-media.ts` |
| 媒体 URL 构建 | `src/lib/cms/media-url.ts` |
| 作品 Server Actions | `src/app/admin/(protected)/works/actions.ts` |

---

## 七、后续监督建议

### 7.1 重点关注

1. **简历 CMS 完整化**：其他开发者正在开发，需关注迁移脚本执行后前台 `/resume` 页面是否正常渲染
2. **留言管理增强**：关注新增功能是否有鉴权问题
3. **VisualBlockEditor 清理**：关注清理是否影响现有功能

### 7.2 定期检查项

- `npm run lint` — 确保 0 errors
- `npm run build` — 确保 TypeScript 通过（EBUSY 是 Windows 文件锁，清理 `.next` 即可）
- `npm test` — 确保 59 tests 全通过
- `git log` — 关注其他开发者新提交
- 数据库迁移是否已在生产执行

### 7.3 已知 Windows 环境问题

- **EBUSY 错误**：`npm run build` 时 `.next/diagnostics/build-diagnostics.json` 被锁定。解决：`Remove-Item -Recurse -Force .next` 后重新构建
- **PowerShell 不支持 `&&`**：需用 `;` 分隔命令或分开执行
- **中文路径**：构建产物路径含中文，某些情况下可能导致模块找不到，清理 `.next` 即可

---

## 八、交接文档索引

项目内现有交接文档（按时间排序）：

| 文件 | 说明 |
|------|------|
| `HANDOFF.md` | 早期交接 |
| `HANDOFF_2026.md` | 项目交接 |
| `HANDOFF_FINAL.md` | 2026-06-23 完整交接 |
| `HANDOFF_TEXT_CONTENT.md` | 文字内容模块交接 |
| `HANDOFF_NEXT_ACCOUNT.md` | Codex 账户交接 |
| `HANDOFF_CURRENT.md` | 当前项目交接（2026-06-23） |
| `HANDOFF_2026_06_24.md` | 2026-06-24 更新交接 |
| **HANDOFF_SUPERVISOR.md`** | **本文档（监督者视角）** |

---

## 九、联系方式

- **管理员邮箱**：`3624457672@qq.com`
- **GitHub**：`sscyl-top/portfolio`
- **线上**：https://sscyl.top

---

> 本文档由监督者生成，记录项目当前状态、已完成工作、发现的问题及后续建议。
> 如有疑问，请参考项目内的其他交接文档或联系开发者。
