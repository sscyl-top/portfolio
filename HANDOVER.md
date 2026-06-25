# 项目交接文档

> 最后更新：2026-06-26
> 仓库：https://github.com/sscyl-top/portfolio
> 线上地址：https://sscyl.top

---

## 一、COS 迁移：怎么做的

### 1.1 背景

项目原本用 **Supabase Storage**（bucket 名 `portfolio-media`）存储所有媒体文件。后来引入了 **腾讯云 COS** 作为可选存储后端，配置 COS 环境变量后优先级高于 Supabase。

这导致了一个**混合存储问题**：
- COS 配置前上传的旧文件在 Supabase 上
- COS 配置后新上传的文件在 COS 上
- 但 `buildPublicMediaUrl()` 在 `isCosConfigured()` 为 true 时统一返回 COS URL
- 结果：旧文件的 URL 指向 COS，但 COS 上没有这些文件 → 404 → 图片/视频不显示

### 1.2 迁移过程

写了一个一次性 Node.js 脚本（已用完删除，未提交到 git），逻辑如下：

```
1. 用 Supabase service key 查询 media_assets 表所有未删除记录
2. 对每条记录：
   a. 用 HEAD 请求检查 COS 上是否已存在该文件
   b. 已存在 → 跳过
   c. 不存在 → 从 Supabase 公开 URL 下载 → 用 cos-nodejs-sdk-v5 上传到 COS
3. 只复制不删除，不修改 Supabase 原文件
```

**迁移结果**：共 169 个文件，迁移 168 个，跳过 1 个（已在 COS），失败 0 个。

### 1.3 配套的代码修改

| 文件 | 修改内容 |
|------|----------|
| `next.config.ts` | `images.remotePatterns` 添加 `*.myqcloud.com`，让 next/image 能加载 COS 图片 |
| `src/lib/cms/repository.ts` | `buildMediaUrl()` 函数：视频/PDF 原来硬编码 Supabase URL，改为统一用 `buildPublicMediaUrl()` |
| `src/lib/cms/repository.ts` | `getUrlForId()` 和 `toPublicMediaUrl()` 改用 `buildPublicMediaUrl()` |
| `src/lib/cms/media-url.ts` | `buildPublicMediaUrl()` 根据 `isCosConfigured()` 路由到 COS 或 Supabase |

### 1.4 如果将来需要重新迁移

迁移脚本的核心代码逻辑（重新编写时参考）：

```javascript
import { createClient } from "@supabase/supabase-js";
import COS from "cos-nodejs-sdk-v5";
import { readFile } from "fs/promises";

// 从 .env.local 读取环境变量
const envText = await readFile(".env.local", "utf-8");
const env = {};
envText.split("\n").forEach((line) => {
  const m = line.match(/^\s*([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});

// COS 凭证（通过命令行环境变量传入，不写入文件）
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID || env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY || env.COS_SECRET_KEY,
});
const cosBucket = process.env.COS_BUCKET || env.COS_BUCKET;
const cosRegion = process.env.COS_REGION || env.COS_REGION;

// Supabase 客户端（需要 service key 跳过 RLS）
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

// 查询所有媒体文件
const { data: mediaList } = await sb
  .from("media_assets")
  .select("id,storage_key,mime_type,original_name")
  .is("deleted_at", null);

// 逐个迁移
for (const media of mediaList) {
  const cosUrl = `https://${cosBucket}.cos.${cosRegion}.myqcloud.com/${media.storage_key}`;
  
  // 检查 COS 是否已存在
  const headResp = await fetch(cosUrl, { method: "HEAD" });
  if (headResp.status === 200) continue; // 已存在跳过
  
  // 从 Supabase 下载
  const sbFileUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio-media/${media.storage_key}`;
  const dlResp = await fetch(sbFileUrl);
  if (!dlResp.ok) continue;
  
  const buffer = Buffer.from(await dlResp.arrayBuffer());
  
  // 上传到 COS
  await new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: cosBucket,
      Region: cosRegion,
      Key: media.storage_key,
      Body: buffer,
      ContentType: media.mime_type,
    }, (err) => err ? reject(err) : resolve());
  });
}
```

运行方式（PowerShell，通过环境变量传入 COS 凭证，不写入文件）：

```powershell
$env:COS_SECRET_ID="..."; $env:COS_SECRET_KEY="..."; $env:COS_BUCKET="..."; $env:COS_REGION="..."; node scripts/migrate.mjs
```

---

## 二、重要知识点和数据

### 2.1 存储架构

```
                    ┌─────────────────────────────────┐
                    │     buildPublicMediaUrl()        │
                    │  (src/lib/cms/media-url.ts)      │
                    └──────────┬───────────┬──────────┘
                               │           │
                    isCosConfigured()?    else
                       true │             │ false
                           ▼               ▼
                   COS URL            Supabase URL
              *.myqcloud.com     *.supabase.co/storage/...
```

**关键函数调用链**：
- `buildPublicMediaUrl(storageKey)` → 如果 COS 已配置返回 COS URL，否则返回 Supabase URL
- `buildOptimizedMediaUrl(storageKey, options)` → 图片优化，COS 模式下直接返回原 URL（COS 不支持 Supabase 的图片优化参数），Supabase 模式下附加 `?width=&height=&format=` 参数
- `buildCosPublicUrl(storageKey)` → 如果有 `COS_CDN_DOMAIN` 返回 CDN URL，否则返回 `https://{bucket}.cos.{region}.myqcloud.com/{key}`

### 2.2 上传流程

```
客户端 (浏览器)
   │
   ├── 1. POST /api/media/sign-upload  ← 获取签名上传 URL
   │       └── isCosConfigured()?
   │            ├── true  → createCosSignedUploadUrl() → 返回 COS 预签名 PUT URL
   │            └── false → supabase.storage.createSignedUploadUrl() → 返回 Supabase 签名 URL
   │
   ├── 2. XHR PUT signedUrl  ← 直接上传文件到 COS 或 Supabase
   │
   └── 3. POST /api/media/register  ← 注册到 media_assets 表
```

**客户端上传函数**：`src/lib/cms/upload-media.ts` 的 `uploadMediaFiles()`
**签名 URL 路由**：`src/app/api/media/sign-upload/route.ts`
**注册路由**：`src/app/api/media/register/route.ts`
**服务端上传/删除**：`src/app/admin/(protected)/media/actions.ts`（用于 PDF 转图等场景）

### 2.3 环境变量

**Supabase（必需）**：
| 变量名 | 用途 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 公开密钥（客户端用） |
| `SUPABASE_SECRET_KEY` | Supabase 服务密钥（服务端用，跳过 RLS） |

**腾讯云 COS（可选，配置后优先于 Supabase）**：
| 变量名 | 用途 |
|--------|------|
| `COS_SECRET_ID` | 腾讯云 API 密钥 ID |
| `COS_SECRET_KEY` | 腾讯云 API 密钥 |
| `COS_BUCKET` | COS 桶名（格式 `name-appid`，如 `sscyl-top-1445831022`） |
| `COS_REGION` | COS 地域（如 `ap-guangzhou`） |
| `COS_CDN_DOMAIN` | 可选，CDN 加速域名 |

**其他**：
| 变量名 | 用途 |
|--------|------|
| `RESEND_API_KEY` | 邮件发送 |
| `RESEND_FROM_EMAIL` | 发件人地址 |
| `ADMIN_EMAIL` | 管理员邮箱 |
| `CONTACT_RATE_LIMIT_SECRET` | 联系表单限流 |

### 2.4 COS 配置数据

- **Bucket**: `sscyl-top-1445831022`
- **Region**: `ap-guangzhou`
- **访问权限**: 公开读取
- **CORS**: 需配置允许浏览器直传（PUT 方法，Origin 为站点域名）
- **SDK**: `cos-nodejs-sdk-v5@^2.15.4`（仅服务端使用）

### 2.5 数据库结构（关键表）

**media_assets 表**：
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid | 主键 |
| `storage_key` | text | 存储路径（如 `uploads/2026/06/uuid-filename.mp4`） |
| `mime_type` | text | MIME 类型 |
| `original_name` | text | 原始文件名 |
| `alt_text` | text | 替代文本 |
| `byte_size` | bigint | 文件大小 |
| `deleted_at` | timestamptz | 软删除时间 |

**site_settings 表**（Hero 视频相关字段）：
| 字段 | 说明 |
|------|------|
| `hero_main_video_media_id` | 主卡片视频 |
| `hero_side1_video_media_id` | 小卡片1视频 |
| `hero_side2_video_media_id` | 小卡片2视频 |
| `hero_side3_video_media_id` | 小卡片3视频 |

**works 表**（媒体相关字段）：
| 字段 | 说明 |
|------|------|
| `cover_media_id` | 封面图 |
| `hover_media_id` | 悬停图（复合设计用） |
| `share_media_id` | 分享图 |

### 2.6 关键文件清单

| 文件路径 | 职责 |
|----------|------|
| `src/lib/cos/config.ts` | COS 配置读取、`isCosConfigured()`、`buildCosPublicUrl()`。**不 import SDK**，可安全在客户端使用 |
| `src/lib/cos/client.ts` | COS SDK 客户端、`createCosSignedUploadUrl()`、`uploadCosObject()`、`deleteCosObject()`。**import SDK，仅服务端** |
| `src/lib/cms/media-url.ts` | `buildPublicMediaUrl()`、`buildOptimizedMediaUrl()`。统一 URL 路由 |
| `src/lib/cms/repository.ts` | CMS 数据仓库，读取作品/设置数据，构造媒体 URL |
| `src/lib/cms/upload-media.ts` | 客户端上传函数 `uploadMediaFiles()` |
| `src/app/api/media/sign-upload/route.ts` | 生成签名上传 URL（COS 或 Supabase） |
| `src/app/api/media/register/route.ts` | 注册媒体到数据库 |
| `src/app/admin/(protected)/media/actions.ts` | 服务端上传/删除操作（用 COS SDK） |
| `src/components/admin/SettingsVideoField.tsx` | Hero 视频上传组件 |
| `src/components/admin/SettingsMediaField.tsx` | 图片上传组件 |
| `src/components/works/WorkMediaFrame.tsx` | 作品图片渲染（用 next/image） |
| `next.config.ts` | Next.js 配置，`images.remotePatterns` 控制哪些域名可以走 next/image 优化 |

### 2.7 多开发者隔离策略

此项目有多人（包括 AI agent）同时推送到 master，必须遵循隔离策略：

```bash
# 开发前
git fetch origin
git checkout -b feature/<name>-<YYYYMMDD> origin/master

# 开发完成后
git fetch origin  # 检查远程是否有新提交
git checkout master
git merge feature/<name>
git push origin master

# 回滚用 revert，禁止 force push
git revert <merge-commit-sha>
```

- **禁止** `git push --force` 到 master
- 修改前创建备份 tag：`git tag backup-before-<feature>-<YYYYMMDD> master`
- 推送前确认是 fast-forward：`git log origin/master..HEAD` 只显示自己的提交

---

## 三、遇到问题怎么解决

### 3.1 图片不显示（全黑）

**排查步骤**：
1. 检查 `next.config.ts` 的 `images.remotePatterns` 是否包含 `*.myqcloud.com`
2. 检查 `buildPublicMediaUrl()` 返回的 URL 是否正确（在浏览器开发者工具的 Network 面板看图片请求）
3. 如果 next/image 返回 400 → 域名没配 remotePatterns
4. 如果图片返回 404 → COS 上没有该文件，需要迁移

### 3.2 视频不显示

**排查步骤**：
1. 检查 `repository.ts` 的 `buildMediaUrl()` 是否用 `buildPublicMediaUrl()`（不能硬编码 Supabase URL）
2. 用 curl/HEAD 请求检查 COS URL 是否返回 200
3. 如果 404 → 文件不在 COS 上，需要迁移或重新上传

### 3.3 上传失败

**排查步骤**：
1. 检查 Vercel 环境变量是否配置了 COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION
2. 检查 COS 桶的 CORS 规则是否允许 PUT 方法、允许站点 Origin
3. 检查文件大小是否超过限制（COS 桶 100MB，前端 10GB，Supabase Free 50MB）
4. 查看浏览器控制台的 XHR 错误信息

### 3.4 混合存储问题（文件在 Supabase 不在 COS）

**症状**：`isCosConfigured()` 返回 true，但部分文件 URL 返回 404。

**解决**：运行迁移脚本把 Supabase 上的文件复制到 COS（见第一章第 4 节）。

### 3.5 COS SDK 泄漏到客户端 bundle

**症状**：构建失败，报错 cos-nodejs-sdk-v5 不能在客户端使用。

**原因**：`cos-nodejs-sdk-v5` 是服务端 SDK，如果客户端组件直接或间接 import 了它，会泄漏到客户端 bundle。

**解决**：
- `src/lib/cos/config.ts` 只导出配置函数（`isCosConfigured`、`buildCosPublicUrl`），**不 import SDK**
- `src/lib/cos/client.ts` import SDK，只在服务端路由/Server Action 中使用
- 客户端组件只能 import `@/lib/cos/config`，不能 import `@/lib/cos/client`

### 3.6 点击上传不弹框（⚠️ 未解决）

**症状**：`SettingsVideoField` 组件中，点击"上传"按钮或点击中间大区域不弹出文件选择框，但拖拽上传正常。

**已尝试的方案**：
1. `label` + `htmlFor` + `sr-only input`（commit 4d95fec）→ 不弹框
2. `document.createElement("input")` + `.click()`（commit 9941432）→ 不弹框
3. 临时 input 挂载到 DOM + `.click()`（commit 9c271c6）→ 不弹框

**当前状态**：三种方案都未解决。拖拽上传正常说明组件正常加载、事件绑定正常。

**后续排查方向**：
1. **确认用户是否硬刷新**：`Ctrl+Shift+R` 强制加载最新 JS bundle，排除浏览器缓存
2. **检查浏览器控制台**：是否有 JS 错误阻止事件处理
3. **检查 CSS 干扰**：是否有 `pointer-events: none` 或 `z-index` 覆盖了按钮
4. **检查 GlobalDragDropPrevention**：`src/components/GlobalDragDropPrevention.tsx` 是否意外拦截了 click 事件（理论上只拦截 drag 事件）
5. **尝试原生 HTML 方案**：绕过 React，用原生 `<input type="file">` + 事件监听
6. **对比 SettingsMediaField**：图片上传组件 `SettingsMediaField` 用的是 `inputRef.current?.click()`（DOM 中的隐藏 input），如果它能弹框而 SettingsVideoField 不能，对比两者差异

### 3.7 数据库字段缺失导致页面崩溃

**症状**：访问页面报 500 错误，日志显示列不存在。

**原因**：Supabase 数据库缺少某些列（如 hero 视频字段）。

**解决**：`src/lib/cms/migrations.ts` 中有自动迁移函数（`runHeroVideosMigration` 等），在 `getSiteSettings()` 中会自动调用。如果自动迁移失败，需要手动在 Supabase SQL Editor 执行 SQL。

### 3.8 Vercel 部署相关

- 推送到 `origin/master` → Vercel 自动部署 → 约 30 秒构建
- Vercel CLI 因中文用户名可能无法登录，可用 Vercel REST API + token 查询部署状态
- 构建用 Next.js 16 + Turbopack
- `/works` 页面有已知的 cookies 动态服务器警告（非致命）

---

## 四、备份 tag 记录

| Tag 名 | 说明 |
|--------|------|
| `backup-before-cos-image-fix-20260626` | 修复 COS 图片全黑问题之前的备份 |

创建备份 tag：`git tag backup-before-<feature>-<YYYYMMDD> master`

---

## 五、安全提醒

- 仓库是 **公开** 的（https://github.com/sscyl-top/portfolio），**永远不要提交密钥**
- COS 密钥（SecretId/SecretKey）只放在 Vercel 环境变量中，不写入代码或 `.env.local`（`.env.local` 已在 `.gitignore` 中）
- 如果密钥泄露（如在对话中出现），立即去腾讯云控制台重新生成，并更新 Vercel 环境变量
