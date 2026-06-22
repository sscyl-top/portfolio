# CT DESIGN Portfolio — 部署操作手册

## 你只需要做这些:

### 第一步：创建 GitHub 仓库 (1 分钟)

1. 打开 https://github.com/new
2. 仓库名填 `portfolio`（任意），Private/Public 随意
3. 不要勾选 "Add a README file"——我们要推现有代码
4. 创建后把仓库 URL 告诉我（格式: `https://github.com/你的用户名/portfolio.git`）
5. 我来负责 push 所有代码

### 第二步：Supabase (5 分钟)
我帮你准备好 deploy.sql 后，你执行以下：

1. 打开 https://app.supabase.com → New project
2. 项目名 `portfolio`，设一个数据库密码（记住它）
3. Region 选 Tokyo 或 Singapore
4. 创建后等待完成 → 左侧 SQL Editor → New query
5. 把这个项目中 `deploy.sql` **全部内容** 复制粘贴进去 → Run
6. 左侧 Authentication → Users → Add user：
   - Email: `3624457672@qq.com`
   - 设一个强密码
7. 创建后点该用户 → App metadata 填入: `{ "role": "admin" }` → Save
8. Settings → API → 记下 **Project URL** 和 **anon public key** 和 **service_role key**

### 第三步：Vercel (5 分钟)
你执行以下：

1. 打开 https://vercel.com/new
2. 选择你的 GitHub 仓库 `portfolio` → Import
3. 展开 Environment Variables，添加:

| 变量名 | 值 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 第二步第 8 条的 Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 第二步第 8 条的 anon key |
| `SUPABASE_SECRET_KEY` | 第二步第 8 条的 service_role key |
| `CONTACT_RATE_LIMIT_SECRET` | 随便打一串随机字符（比如 `abc123xyz789`） |
| `ADMIN_EMAIL` | `3624457672@qq.com` |

4. 点击 Deploy → 等 2 分钟

### 第四步：种子数据 (1 分钟)
你执行以下：

1. 打开 `https://你的域名.vercel.app/admin/login`
2. 用 `3624457672@qq.com` + 你设置的密码登录
3. 左侧 → 作品 → 点击 **导入当前作品** 按钮

### 完成！
打开 `https://你的域名.vercel.app` 和 `/works`、`/resume` 检查。