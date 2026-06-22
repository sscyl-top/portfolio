# CT DESIGN Portfolio — 部署操作手册

## 前置条件
- 一个 [Supabase](https://supabase.com) 账号
- 一个 [Vercel](https://vercel.com) 账号（用 GitHub 登录）

---

## 第一步：GitHub 推送代码

本机代码已全部提交，推送到 GitHub：

```bash
git remote add origin https://github.com/你的用户名/portfolio.git
git push -u origin master
```

（如果你已经有 GitHub repo 且关联过，直接 `git push`）

---

## 第二步：Supabase 生产数据库

### 2.1 创建项目
1. 打开 https://app.supabase.com
2. 点击 **New project**
3. 输入项目名称（如 `portfolio-prod`），设置数据库密码（记住它）
4. Region 选 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**——离中国近
5. 等项目创建完成（约 2 分钟）

### 2.2 运行迁移
1. 在 Supabase 控制台左侧菜单 → **SQL Editor**
2. 点击 **New query**
3. 打开本项目里的 `deploy.sql` 文件，复制全部内容
4. 粘贴到 SQL Editor，点击 **Run**
5. 左侧表列表应出现 `works`、`categories`、`media_assets`、`contact_messages` 等表

### 2.3 创建管理员用户
1. 左侧菜单 → **Authentication** → **Users** → **Add user**
2. Email: `3624457672@qq.com`
3. 设置一个强密码
4. 创建后，点击该用户 → 找到 **App metadata** 编辑框
5. 填入：`{ "role": "admin" }`
6. 保存

### 2.4 获取连接信息
1. 左侧菜单 → **Settings** → **API**
2. 记下以下三个值：
   - **Project URL**（示例 `https://xxx.supabase.co`）
   - **anon public key**（以 `eyJh...` 开头的长字符串）
   - **service_role key**（以 `eyJh...` 开头，secret 那一栏）

---

## 第三步：Vercel 部署

### 3.1 导入项目
1. 打开 https://vercel.com
2. 点击 **New Project**
3. 选择你的 GitHub repo（包含本项目的那个）
4. Vercel 自动识别为 Next.js 项目

### 3.2 配置环境变量
在部署配置页展开 **Environment Variables**，添加以下变量：

| 变量名 | 值 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 第二步 2.4 的 Project URL | Supabase 项目地址 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 第二步 2.4 的 anon key | 公开密钥 |
| `SUPABASE_SECRET_KEY` | 第二步 2.4 的 service_role key | 服务端密钥 |
| `CONTACT_RATE_LIMIT_SECRET` | 随便生成一个随机字符串 | 表单限流用 |
| `ADMIN_EMAIL` | `3624457672@qq.com` | 管理员邮箱 |
| `RESEND_API_KEY` | 暂时留空 | 邮件通知（可选） |
| `RESEND_FROM_EMAIL` | 暂时留空 | 邮件通知（可选） |

### 3.3 部署
点击 **Deploy**，等待完成。部署成功后 Vercel 会给你一个域名（如 `portfolio-xxx.vercel.app`）。

---

## 第四步：种子导入静态作品数据

1. 打开 `https://你的域名.vercel.app/admin/login`
2. 用管理员邮箱和密码登录
3. 左侧导航 → **作品**
4. 点击 **导入当前作品** 按钮
5. 等待完成——所有静态作品数据会导入 CMS

前台 `/works` 现在应该显示真实的 CMS 作品列表。

---

## 第五步（可选）：自定义域名

1. Vercel 项目 → **Settings** → **Domains**
2. 添加 `sscyl.top` 或子域名
3. 按提示在域名 DNS 处添加 CNAME 记录

---

## 验证清单

- [ ] 能访问 `https://域名/works` 看到作品列表
- [ ] 能访问 `https://域名/works/rj-tech-brand-system` 看到详情
- [ ] 能访问 `https://域名/admin/login` 登录后台
- [ ] 登录后能看到仪表盘（显示作品数/消息数）
- [ ] 能在后台创建新作品、上传媒体文件
- [ ] `/resume` 页面正常显示