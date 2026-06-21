# 联系表单后台配置

这份文档只配置联系表单子系统。完整 CMS 后台会复用同一个 Supabase 项目、Auth 用户和 Storage 配置。

## 1. Supabase

1. 创建 Supabase 项目。
2. 在项目 SQL Editor 中执行：
   `supabase/migrations/20260620135759_create_contact_messages.sql`
3. 在 Authentication 的 Users 页面创建后台用户：
   `3624457672@qq.com`
4. 为该用户设置强密码，并关闭不需要的公开注册方式。
5. 从项目设置复制 URL、Publishable key 和 Secret key。

## 2. Resend

1. 使用 `3624457672@qq.com` 注册 Resend。
2. 创建 API Key。
3. 测试阶段可使用 Resend 测试发件地址；正式上线前验证自己的域名。
4. 将正式发件地址写入 `RESEND_FROM_EMAIL`。

## 3. 环境变量

复制 `.env.example` 为 `.env.local`，填写：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
CONTACT_RATE_LIMIT_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=Portfolio Contact <contact@your-domain.com>
ADMIN_EMAIL=3624457672@qq.com
```

`CONTACT_RATE_LIMIT_SECRET` 使用随机长字符串，不要提交 `.env.local`。
部署到 Vercel 时，在项目 Settings > Environment Variables 中配置同名变量。

## 4. 验证

1. 打开 `/resume`，分别提交一条聘用联系和商业咨询。
2. 检查 `3624457672@qq.com` 是否收到提醒邮件。
3. 打开 `/admin/login`，使用 Supabase 后台用户登录。
4. 打开 `/admin/messages`，确认消息可标记已读、归档和删除。

## 5. 微信号

简历页终场当前展示微信号 `CTT522423`，不再使用二维码图片。
如需修改，更新 `src/components/resume/ContactFinale.tsx` 中的 `wechatId`。
