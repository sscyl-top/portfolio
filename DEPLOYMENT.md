# Deployment Checklist

## 1. Supabase

1. Create a Supabase project.
2. Run every SQL file in `supabase/migrations/` in timestamp order.
3. Confirm the `portfolio-media` Storage bucket exists and is public.
4. Create the admin Auth user with the email in `ADMIN_EMAIL`.
5. Assign the admin role:

```bash
npm run cms:make-admin -- 3624457672@qq.com
```

## 2. Environment Variables

Set these in `.env.local` and in Vercel project settings:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
CONTACT_RATE_LIMIT_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=Portfolio Contact <contact@your-domain.com>
ADMIN_EMAIL=3624457672@qq.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

`SUPABASE_SECRET_KEY` and `CONTACT_RATE_LIMIT_SECRET` must stay server-only.

## 3. Verify Before Deploy

```bash
npm test
npm run lint
npm run build
npm run cms:check
```

`cms:check` verifies environment variables, CMS tables, contact messages table, media bucket, and admin role.

## 4. Seed Content

After logging in at `/admin/login`, open `/admin/works` and click `导入当前作品`.

Then configure:

- `/admin/settings`: site name, SEO, social links.
- `/admin/pages`: page metadata.
- `/admin/media`: portfolio media uploads.
- `/admin/works`: work metadata, media, taxonomy, text blocks, private preview links.

## 5. Final Smoke Test

- `/` loads without framework errors.
- `/works` shows published CMS works.
- `/works/[slug]` shows selected CMS media and content blocks.
- A `private` work is hidden without token and visible with a generated preview link.
- `/resume` contact form sends email and stores the message in `/admin/messages`.
