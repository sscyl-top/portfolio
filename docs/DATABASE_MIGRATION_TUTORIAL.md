# 📘 Supabase 数据库迁移完整教程

## 🎯 目标
在 Supabase 中创建 `text_content` 表，用于存储和管理前台所有可编辑的文字内容。

---

## 📋 方法一：使用 Supabase CLI（推荐）

### 步骤 1：检查 Supabase CLI 是否已安装

在终端运行：
```bash
supabase --version
```

**如果显示版本号**（如 `1.78.0`），跳过步骤 2。

**如果显示错误**，需要先安装：

<details>
<summary>📥 点击查看安装方法（Windows）</summary>

#### 方法 A：使用 Scoop（推荐）
```bash
# 1. 安装 Scoop（如果还没有）
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# 2. 安装 Supabase CLI
scoop install supabase
```

#### 方法 B：使用 npm（全局安装）
```bash
npm install -g supabase
```

#### 方法 C：下载可执行文件
1. 访问：https://github.com/supabase/cli/releases/latest
2. 下载 `supabase_windows_amd64.exe`
3. 重命名为 `supabase.exe`
4. 放到 `C:\Windows\System32` 或添加到 PATH

</details>

---

### 步骤 2：登录 Supabase CLI

```bash
supabase login
```

**操作流程**：
1. 浏览器会自动打开 Supabase 官网
2. 登录你的账号
3. 授权 CLI 访问
4. 回到终端，应该显示 "Logged in" 成功

---

### 步骤 3：链接你的项目

进入你的项目根目录：
```bash
cd "D:\上山采月亮的台式\作品集网站\2026-作品集网站"
```

链接 Supabase 项目：
```bash
supabase link --project-ref hnujowombcgfxledpnxe
```

**说明**：
- `--project-ref` 是你的 Supabase 项目 ID
- 可以从 Supabase 控制台 URL 中找到：`https://supabase.com/dashboard/project/hnujowombcgfxledpnxe`

---

### 步骤 4：运行迁移

**预览迁移（推荐先做这一步）**：
```bash
supabase db diff --use-migra
```

**执行迁移**：
```bash
supabase db push
```

**预期输出**：
```
Applying migration 20260623082900_create_text_content.sql...
✔ Finished supabase db push
```

---

### 步骤 5：验证迁移是否成功

#### 方法 A：使用 Supabase 控制台
1. 访问：https://supabase.com/dashboard/project/hnujowombcgfxledpnxe
2. 点击左侧 **Table Editor**
3. 查看是否有 `text_content` 表
4. 点击表名，查看是否有预设的数据（10 条）

#### 方法 B：使用 SQL Editor
1. 点击左侧 **SQL Editor**
2. 运行以下查询：
```sql
SELECT * FROM text_content;
```
3. 应该看到 10 条预设数据

---

## 📋 方法二：手动在 Supabase 控制台运行 SQL（简单直接）

如果你不想折腾 CLI，可以直接在控制台运行 SQL。

### 步骤 1：打开 SQL Editor

1. 访问：https://supabase.com/dashboard/project/hnujowombcgfxledpnxe
2. 点击左侧 **SQL Editor** 图标（`<>` 符号）

---

### 步骤 2：复制并粘贴迁移 SQL

打开文件：
```
D:\上山采月亮的台式\作品集网站\2026-作品集网站\supabase\migrations\20260623082900_create_text_content.sql
```

**全选并复制所有内容**（Ctrl+A → Ctrl+C）

---

### 步骤 3：运行 SQL

1. 在 SQL Editor 中粘贴（Ctrl+V）
2. 点击 **Run** 按钮（右上角，蓝色）
3. 等待执行完成

**预期结果**：
- 底部显示 "Success. No rows returned"
- 或者显示 "10 rows affected"

---

### 步骤 4：验证

同方法一的步骤 5。

---

## 🚨 常见问题排查

### 问题 1：`supabase: command not found`
**原因**：CLI 未安装或未添加到 PATH

**解决**：
- 重新安装（见步骤 1）
- 或使用方法二（手动运行 SQL）

---

### 问题 2：`Failed to connect to Supabase`
**原因**：网络问题或项目 ID 错误

**解决**：
```bash
# 检查项目 ID 是否正确
supabase projects list
```

---

### 问题 3：`permission denied`
**原因**：没有登录或没有项目权限

**解决**：
```bash
supabase login
supabase link --project-ref hnujowombcgfxledpnxe
```

---

### 问题 4：SQL 运行报错 `relation "text_content" already exists`
**原因**：表已经存在

**解决**：
```sql
-- 删除已存在的表（谨慎！会丢失数据）
DROP TABLE IF EXISTS text_content CASCADE;

-- 然后重新运行迁移 SQL
```

---

## ✅ 成功标志

当你完成迁移后，应该能在 Supabase 控制台看到：

1. **Table Editor** 中有 `text_content` 表
2. 表中有以下字段：
   - `id` (UUID)
   - `key` (text)
   - `content` (text)
   - `font_size` (text)
   - `font_family` (text)
   - `font_weight` (text)
   - `color` (text)
   - `page` (text)
   - `section` (text)
   - `sort_order` (int4)
   - `is_active` (bool)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)
   - `deleted_at` (timestamptz)

3. 有 10 条预设数据（导航、Hero、Footer 等）

---

## 🎯 下一步

迁移成功后，回到项目目录，运行开发服务器：

```bash
cd "D:\上山采月亮的台式\作品集网站\2026-作品集网站"
npm run dev
```

然后访问：http://localhost:3000/admin/settings/text-content

应该能看到全局文字管理页面！

---

## 📞 需要帮助？

如果遇到任何问题，截图错误信息发给我，我会帮你解决。😊

---

**教程版本**: 2026-06-23  
**适用项目**: 2026 作品集网站  
**作者**: WorkBuddy AI
