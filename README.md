# CHEN TAOTAO Portfolio

Next.js 16 portfolio site with a Supabase-backed CMS, admin dashboard, media library, contact messages, and private work preview links.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, and Storage
- Vitest and Testing Library

## Local Development

```bash
npm install
npx supabase start
npx supabase db reset
npm run dev
```

Open:

- Site: `http://localhost:3000`
- Admin: `http://localhost:3000/admin/login`
- Supabase Studio: `http://127.0.0.1:54323`

Local admin account:

- Email: `3624457672@qq.com`
- Password: configured in local Supabase Auth

## Useful Commands

```bash
npm test
npm run lint
npm run build
npm run cms:check
npm run cms:make-admin -- 3624457672@qq.com
```

## CMS Flow

1. Log in at `/admin/login`.
2. Open `/admin/works`.
3. Import current static works, or create drafts.
4. Edit metadata, media, taxonomy, content blocks, and private preview links.
5. Upload portfolio media in `/admin/media`.
6. Configure site metadata in `/admin/settings` and `/admin/pages`.

Published works appear on `/works` and `/works/[slug]`. Private works only render through generated preview links.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md).
