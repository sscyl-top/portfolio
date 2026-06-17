# Codex Handoff For Next Account

Use this file as the first thing to read after switching Codex accounts.

## Current Safe Point

- Workspace: `D:\上山采月亮的台式\作品集网站\2026-作品集网站`
- Latest completed feature commit before this handoff: `5922b66 Use image logo and simplify works CTA`
- Latest handoff commit: `fc52d61 Update handoff backup bundle path`
- The worktree was clean when this handoff was checked.
- Local git bundle backup:
  `D:\上山采月亮的台式\作品集网站\portfolio-site-backup-latest.bundle`

## How To Continue

1. Open this same folder in Codex:
   `D:\上山采月亮的台式\作品集网站\2026-作品集网站`
2. Check state:
   ```bash
   git status --short
   git log --oneline -8
   ```
3. Start local preview:
   ```bash
   npm run dev
   ```
4. Open:
   `http://localhost:3000`

If Next.js shows a Turbopack runtime overlay, stop the local `next dev` process, delete `.next/dev`, and restart `npm run dev`.

## First Prompt For The New Account

Copy this into the new Codex account:

```text
请先阅读 HANDOFF_NEXT_ACCOUNT.md、AGENTS.md，然后检查 git status 和 git log --oneline -8。这个项目是 Next.js 16 个人作品集网站，请延续当前 /works 页面视觉迭代，不要重做项目。继续开发前请先确认当前状态和最近提交。
```

## If The Folder Is Lost

The normal path is to keep using the existing workspace folder. If the folder is accidentally damaged or lost, restore from the bundle:

```bash
cd "D:\上山采月亮的台式\作品集网站"
git clone "D:\上山采月亮的台式\作品集网站\portfolio-site-backup-latest.bundle" "2026-作品集网站-restored"
cd "2026-作品集网站-restored"
npm install
npm run dev
```

The restored folder name can be changed later. Prefer continuing in the original folder if it still exists.

## Must-Know Project Rules

- Read `AGENTS.md` first. This project uses Next.js 16, and the repo explicitly says to read the relevant docs under `node_modules/next/dist/docs/` before writing code.
- Use App Router patterns.
- Keep large media out of Git and out of the Next.js deployment bundle. Real works, GIFs, and videos should later live in object storage.
- Use mock data in `src/data/portfolio.ts` until the CMS phase starts.

## Current Routes

- `/`: homepage with visual/particle direction and resume-strength narrative.
- `/works`: current main iteration target.
- `/works/[slug]`: work detail template.
- `/resume`: resume page with download links.
- `/admin`: placeholder for future CMS/admin phase.

## Current `/works` Design State

The page is structured as:

1. Representative works
   - 7-card fan layout.
   - Uses `src/components/works/RepresentativeWorks.tsx`.

2. All works
   - Centered category tabs.
   - No `全部` tab.
   - Default tab: `视觉设计`.
   - Cards are now reference-style: no border, large rounded image area, text below.
   - Uses `src/components/works/WorksExplorer.tsx`.

3. Composite design
   - 16-card dense wall.
   - Ends with a large CTA card.
   - Uses `src/components/works/CompositeDesignWall.tsx`.

## Latest User Direction Already Applied

- Navigation right logo changed from text to image format.
- Bottom CTA logo changed from text to image format.
- Image placeholder file: `public/brand/infinite-progress-logo.svg`.
- The logo keeps cut-in animation.
- Bottom CTA card:
  - Uses a dark cyan/black palette.
  - No contour/line texture.
  - No large headline text.
  - No current helmet/person placeholder.
  - Figure/image slot is intentionally disabled with `ctaFigureSrc = ""`.
  - If `ctaFigureSrc` is later set, that image will sit in front of the scrolling text.
- CTA buttons remain centered:
  - `查看简历` -> `/resume`
  - `聘用联系` -> email, highlighted
  - `商业咨询` -> email

## Key Files

- `src/components/site/SiteHeader.tsx`
- `src/components/works/WorksPageShell.tsx`
- `src/components/works/RepresentativeWorks.tsx`
- `src/components/works/WorksExplorer.tsx`
- `src/components/works/CompositeDesignWall.tsx`
- `src/app/globals.css`
- `src/data/portfolio.ts`
- `public/brand/infinite-progress-logo.svg`

## Verification Commands

Run these before saying a change is done:

```bash
npm run lint
npm test
npm run build
```

Most recent verification before this handoff:

- `npm run lint`: passed
- `npm test`: passed, 2 files / 8 tests
- `npm run build`: passed

## Git Checkpoints

Recent useful commits:

- `5922b66 Use image logo and simplify works CTA`
- `aedf5c6 Match work cards and CTA reference`
- `9ff8656 Refine works spacing and bottom CTA`
- `7d20635 Restore works filters and continuous glow backdrop`
- `f69e733 Tune representative fan layout`
- `1e8f068 Checkpoint portfolio works experience`
- `3a7f93a Initial commit from Create Next App`

## Suggested Next Steps

- Continue visual tuning from the browser comments.
- If replacing the bottom CTA logo, replace `public/brand/infinite-progress-logo.svg` first.
- If adding a figure/driver/person image, add the asset under `public/` temporarily and set `ctaFigureSrc` in `CompositeDesignWall.tsx`. Later this should become a CMS field.
- Do not start Payload CMS yet unless the user explicitly shifts from visual MVP to backend/admin work.

## Known Encoding Note

If Windows PowerShell displays Chinese in this file as mojibake, read it with:

```powershell
Get-Content -LiteralPath "HANDOFF_NEXT_ACCOUNT.md" -Encoding UTF8
```

The file content itself is UTF-8.
