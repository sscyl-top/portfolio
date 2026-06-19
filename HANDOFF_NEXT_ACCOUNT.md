# Codex Handoff For Next Account

Use this file as the first thing to read after switching Codex accounts.

## Current Safe Point

- Workspace: `D:\上山采月亮的台式\作品集网站\2026-作品集网站`
- The latest homepage particle checkpoint is the newest commit shown by `git log --oneline -8`.
- The worktree was verified with lint, tests, build, and `git diff --check` before checkpointing.
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
请先阅读 HANDOFF_NEXT_ACCOUNT.md、AGENTS.md，然后检查 git status 和 git log --oneline -8。这个项目是 Next.js 16 个人作品集网站，请继续当前首页第一屏之后的 USTA 风格核心优势粒子段落，不要重做首页第一屏或 /works。rocket.glb 和 satellite.glb 已通过 MeshSurfaceSampler 接入；继续对比 USTA 参考站微调模型轮廓、蓝/金/灰白粒子配色、点径、滚动 morph 和鼠标交互即可。
```

## Current Homepage Particle Work

The active target is the homepage core-strengths section after the first hero. The first hero must remain unchanged.

Implemented in `src/components/home/CapabilityBands.tsx`:

- Five alternating strength panels; odd panels place text left and particles right, even panels reverse this.
- Text becomes fully active earlier while entering the viewport.
- Circular particles with varied sizes and twinkle.
- Sky-blue, gold, and restrained pearly white spatial color clusters driven by animated 3D value noise.
- Domain-warped, irregular S-shaped color movement instead of a single linear sweep.
- Strong cursor repel, swirl, scatter, and slower regroup behavior across the whole viewport.
- About 14% ambient particles spread across the full screen; model regions remain denser.
- Continuous left/right particle-stage travel tied to vertical scroll progress.
- Continuous shape-to-shape morph tied to scroll progress, with extra scroll scatter during transitions.
- Real GLTF/GLB surface sampling for rocket, satellite, Earth, and astronaut using Three.js `MeshSurfaceSampler`.
- Rocket is mirrored so its head faces left and scaled larger; Earth is enlarged by about 50%.
- Particle canvas has `pointer-events: none` so the WebGL layer does not capture wheel/pointer hit testing.

Local model assets:

- `public/models/particles/rocket.glb` (valid GLB 2.0, 95,040 bytes, 7 meshes)
- `public/models/particles/satellite.glb` (valid GLB 2.0, 1,280,136 bytes, 21 meshes)
- `public/models/particles/earth.gltf`
- `public/models/particles/astronaut.gltf`

Preferred replacement-model requirements: one GLB per object, clear silhouette, centered origin, applied transforms, no textures or animation required, roughly 1-10 MB, and licensed for portfolio use.

Reference/reverse-analysis files remain outside the repo at:

- `D:\上山采月亮的台式\作品集网站\逆向报告`
- Original discovered filenames: `rocket_v2.33f015f5.gltf` and `satellite_v2.76b104df.gltf`
- Original particle shaders: `shader_42_VERTEX_SHADER.glsl` and `shader_43_FRAGMENT_SHADER.glsl`

Browser verification completed:

- WebGL shader compiled without runtime errors.
- Rocket and satellite now render from supplied GLB models instead of procedural outlines.
- Earth GLTF rendered as a larger particle sphere, scaled up for stronger presence.
- Sky-blue/gold/pearl regions visibly cluster instead of random per-particle coloring.
- Ambient particles cover the viewport.
- Wheel input changed `window.scrollY` by the expected delta in both content and particle regions.
- Scroll investigation found no source-level `wheel` preventDefault handlers; `html/body` both compute to `overflow: visible`.
- The particle canvas computes to `pointer-events: none`; automation wheel input still changes `window.scrollY` by the expected delta.
- A 45-frame browser sample averaged 16.38 ms with no frame above 33 ms, so the reported physical mouse-wheel failure was not reproduced in automation.
- On the next account, test one physical wheel gesture in both the in-app browser and external Edge. If external Edge scrolls and the in-app browser does not, treat it as browser-container focus rather than adding a forced `window.scrollBy` handler.
- If scrolling appears frozen, restart `npm run dev`; running `next build` alongside an old dev process previously left HMR stale.

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

## Homepage Particle State (2026-06-18)

- The first hero layout/content is preserved.
- `AmbientParticles.tsx` now uses a custom round-point shader. Hero particles keep their original neutral color, and large square GL points are clamped out.
- The hard divider between the hero and the resume-strength particle section was removed and replaced with a soft black overlap gradient.
- `CapabilityBands.tsx` loads the rocket, satellite, earth, and astronaut models and samples their real mesh surfaces.
- Mesh samples are distributed by triangle surface area, with a small edge-sampling share for clearer silhouettes.
- Rocket is mirrored and rotated to roughly 45 degrees toward the upper-left, with a subtle procedural tail-fin supplement.
- Earth slightly prioritizes the continent mesh and its boundary edges.
- Astronaut uses a 42% primary mesh share, equal secondary-part distribution, and 12% edge samples so the helmet/limbs read without the hose dominating.
- Shape progress is calculated from the five strength panels themselves, not the extra expertise/footer screen. Text activation and particle formation are now synchronized.
- Particle sides alternate correctly: strength 1 right, 2 left, 3 right, 4 left, 5 right.
- Mouse hover disturbance is intentionally subtle. Wheel/scroll movement remains the primary morph interaction.
- Blue and gold are guaranteed to coexist through a stable spatial partition blended with faster moving noise fields.
- The fifth shape is now a set of smooth overlapping orbital ribbons rather than sharp polylines.
- The homepage ends with `Browse works / View resume / Hiring contact` CTAs; Browse works is highlighted.
- Stable QA anchors: `/#strength-1` through `/#strength-5`, and `/#home-cta`.
- The latest shader pass follows the extracted USTA transition profile more closely: scroll morphing uses a cubic sine envelope, expands at mid-transition, then converges quickly near the next panel.
- Particle sizes now use a softer `1.8` power distribution, producing mostly solid circular points with a restrained share of larger halo points instead of uniformly tiny or blurry dots.
- Blue/gold/pearl color clusters use faster domain-warped 3D noise, so all three palettes remain visible while their grouped regions drift over time instead of sweeping linearly across the model.
- Mouse motion is now separated from global scroll scatter. The cursor creates a local radial opening, tangential flow, and short directional wake; leaving the area smoothly restores the sampled model surface instead of shaking the entire shape.
- The pointer response curve lives in `src/components/home/particleMotion.ts` and reuses one output object in the 9,000-particle hot loop to avoid per-frame garbage collection.
- Incoming strength copy becomes fully active at 72% of viewport height, so titles turn white before reaching the visual center.

Latest verification for this state:

- `npm run lint`: passed
- `npm test`: passed, 3 files / 13 tests
- `npm run build`: passed, 19 static pages generated

Recommended next fidelity step: add subtle selective Bloom with `@react-three/postprocessing`, limited to the largest 8-12% of particles. Do not apply full-screen bloom, because it will blur the model silhouettes again.

## Known Encoding Note

If Windows PowerShell displays Chinese in this file as mojibake, read it with:

```powershell
Get-Content -LiteralPath "HANDOFF_NEXT_ACCOUNT.md" -Encoding UTF8
```

The file content itself is UTF-8.
