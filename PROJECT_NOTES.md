# Portfolio Site Notes

## Current Direction

This project is a personal portfolio for CHEN TAOTAO / CT DESIGN.

Primary positioning:

- 80% job interview portfolio.
- 20% design service contact entry.
- Main navigation: `首页`, `全部作品`, `简历`.

Home page rule:

- Do not show selected works or portfolio cards on the home page.
- Use the home page to show visual impact, interaction quality, resume strengths, and positioning.
- Works should live in `/works` and `/works/[slug]`.

## Current Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- GSAP
- Three.js / React Three Fiber
- Vitest and Testing Library

## Routes

- `/`: USTA/PPT-inspired motion and particle hero with a large video-slot card, followed by PPT-style capability narrative sections.
- `/works`: PPT-aligned representative works section, categorized project archive, then a dedicated composite-design wall.
- `/works/[slug]`: Behance-style detail template with text, image placeholders, and before/after blocks.
- `/resume`: PPT-inspired web resume page with compact PDF/JPG download buttons and no large resume image preview.
- `/admin`: reserved roadmap page for the later Payload CMS backend.

## Data

Mock data lives in `src/data/portfolio.ts`.

The same shape should be migrated into Payload CMS later:

- `Work`
- `Resume`
- `SiteSettings`
- `Media`
- `Categories`

Do not put large portfolio media files into Git, the Next.js app directory, or the deployment bundle. Use object storage after the backend phase starts.

Resume download assets:

- JPG: `public/resume/chen-taotao-resume.jpg`
- PDF: `public/resume/chen-taotao-resume.pdf`

Home hero video:

- The first-screen hero card is designed as a video stage.
- When a real video is ready, add it in a later pass and wire it into `src/components/home/HeroShowcase.tsx`.

Works page structure:

- Representative works are controlled by `featuredPriority` in `src/data/portfolio.ts`.
- The representative section currently exposes 7 cards.
- Category tabs intentionally do not render an `全部` button. The default state shows all case works, and the visible tabs are `视觉设计`, `品牌全案`, `概念设计`, `包装设计`, `电商设计`, `工作案例`.
- `复合设计` is intentionally not a category tab. It is rendered as the final dedicated section.

## Commands

```bash
npm run dev
npm test
npm run lint
npm run build
```

Latest verification:

- `npm test`
- `npm run lint`
- `npm run build`
- Browser DOM checks on desktop and mobile confirmed no horizontal overflow on `/`, `/works`, or `/resume`.
- Browser check confirmed the home Three.js canvas renders and the resume page does not include a large resume image preview.
