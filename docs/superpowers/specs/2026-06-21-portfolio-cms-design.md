# Portfolio CMS Design

Date: 2026-06-21
Status: Approved

## 1. Objective

Build and deploy a Chinese-language content management system for the existing
portfolio website without redesigning the approved public pages. The system
must let a non-technical owner manage portfolio content, page copy, typography,
media, categories, visibility, ordering, contact messages, and basic analytics.

The primary delivery constraint is speed to production. The first release uses
controlled layout presets instead of unrestricted visual positioning so that
admin changes cannot break desktop or mobile layouts.

## 2. First-Release Scope

The first release includes:

- Administrator authentication and a protected `/admin` application.
- A dashboard for traffic summaries, popular works, drafts, and recent contact
  messages.
- CRUD management for works, categories, tags, page modules, site settings,
  media, and contact messages.
- Draft, published, and private-link work states.
- Representative-work and composite-design placement sourced from the same work
  library, with optional standalone works.
- Multi-category works, tags, custom ordering, visibility switches, and batch
  operations.
- Upload support for JPG, PNG, WebP, GIF, MP4, and PDF files.
- A three-step work publisher with sortable structured content blocks.
- Homepage hero media management, including one large card and three small
  cards, with per-card color or grayscale defaults.
- Controlled global typography, spacing, card-size, and layout presets.
- Site metadata, SEO metadata, social links, logo, avatar, share image, and
  default theme settings.
- Basic first-party page and work analytics.
- The existing contact inbox and email notification capability.
- Soft deletion, reference checks, upload retries, and a simple audit trail.

The first release explicitly defers:

- Arbitrary pixel positioning or unrestricted visual layout editing.
- A general-purpose Notion-compatible editor.
- 10 GB single-file uploads.
- Server-side video transcoding.
- Public comments and likes.
- Scheduled publishing.
- A complete bidirectional multi-version history interface.
- Exact visitor geolocation or long-term raw IP storage.

The schema should leave clear extension points for these deferred capabilities.

## 3. Architecture

The existing Next.js 16 application remains the public site and admin host.
Supabase provides Postgres, Auth, and Storage. Vercel hosts the application.

Core boundaries:

- Public pages read only published CMS records and valid private-link records.
- Admin pages use authenticated server-side operations for content mutations.
- Browser uploads go directly to Supabase Storage and do not proxy large files
  through Vercel Functions.
- Public media is delivered from storage through stable asset records rather
  than embedding storage paths throughout page content.
- Save and publish operations revalidate affected public routes.
- Existing static portfolio data remains available during migration and as a
  temporary deployment fallback until CMS cutover is verified.

This custom architecture is preferred over adding a separate headless CMS
because the public layouts, media-card behavior, composite works, and Chinese
admin workflows require substantial custom integration either way. Reusing the
existing Supabase contact infrastructure minimizes additional services.

## 4. Admin Information Architecture

### 4.1 Dashboard

The dashboard shows total and recent visits, approximate unique visitors,
popular works, traffic sources, device groups, recent messages, drafts, and
content requiring attention. Views produced during an authenticated admin
session are excluded from first-party analytics.

### 4.2 Works

Work management supports create, edit, duplicate, soft delete, restore, search,
filter, custom ordering, and batch actions. A work contains:

- Title, subtitle, slug, summary, year, client, and project metadata.
- Draft, published, or private status.
- Multiple categories and tags.
- Cover media, hover media, color palette, and share media.
- Placement flags and ordering for representative and composite sections.
- SEO title, SEO description, and search visibility.
- An ordered list of structured content blocks.

Private works are excluded from indexes, feeds, and search metadata. They are
available only through a high-entropy access token and may be revoked by
regenerating that token.

### 4.3 Categories and Tags

Categories and tags support creation, editing, deletion, visibility, and custom
ordering. A category cannot be permanently deleted while works still reference
it. The admin must first reassign those works or explicitly remove the
relationships.

### 4.4 Page Content

Homepage, works page, and resume page settings are managed independently.
Editable content includes text, links, media references, module visibility, and
module order. Layout-related controls use named, tested presets for font size,
spacing, alignment, card size, and media treatment.

Homepage hero settings expose one large media card and three small media cards.
Each card supports image, GIF, or MP4 media, a destination link, ordering where
applicable, and a default color mode. The approved default is a color large card
and grayscale small cards that return to color on hover.

### 4.5 Media Library

The media library supports drag-and-drop batch upload, progress, retry, preview,
replacement, ordering, metadata editing, and safe deletion. Asset records store
type, MIME type, byte size, dimensions or duration when available, storage key,
alt text, and usage references.

PDF page count is not restricted by application logic. Upload limits are based
on file byte size and the configured storage plan. Large files use resumable
direct uploads. The initial limit is selected during infrastructure setup from
the actual Supabase plan rather than hard-coded in the design.

The first release accepts browser-compatible MP4 video and does not transcode
incompatible formats. GIF files remain animated. Original images are preserved;
the public site uses storage/CDN transformations when the selected plan supports
them and otherwise serves the original file without a background conversion
pipeline.

### 4.6 Site Settings and Inbox

Site settings include site name, nickname, logo, avatar, global font choices,
approved typography presets, default theme, SEO defaults, share image, and
social links. The inbox retains hiring and commercial message types, read and
archive states, deletion, and Resend email notifications.

## 5. Publishing Workflow

The work publisher has three steps:

1. Upload and order media. Uploads display per-file progress, retry failures,
   and preserve successfully uploaded files.
2. Enter metadata, categories, tags, color palette, cover and hover media,
   placement, and SEO settings.
3. Compose the project from ordered blocks and preview desktop and mobile
   output before publishing.

Supported first-release blocks are text, full-width media, gallery, video, PDF,
and before/after comparison. Blocks support create, edit, duplicate, hide,
delete, and drag ordering. Their rendering uses fixed public components with
controlled options rather than arbitrary HTML or CSS.

Draft changes autosave after validation. Publishing records a snapshot of the
last published document before replacing it. The initial recovery interface can
restore that previous published snapshot; complete version browsing and forward
navigation remain deferred.

## 6. Data Model Boundaries

The database is organized around these logical entities:

- `admin_profiles`: administrator identity and authorization metadata.
- `site_settings`: singleton global settings and SEO defaults.
- `pages`: page-level copy, metadata, and ordered module configuration.
- `works`: work identity, status, metadata, ordering, placement, and SEO.
- `work_versions`: publication snapshots and recovery metadata.
- `work_blocks`: ordered typed block payloads belonging to a work version.
- `categories` and `tags`: reusable taxonomy with visibility and order.
- Join tables for work-category and work-tag relationships.
- `media_assets`: storage metadata and lifecycle state.
- `media_usages`: explicit references from pages, works, and blocks.
- `contact_messages`: the existing contact inbox.
- `analytics_events` and aggregated summaries: privacy-limited traffic data.
- `audit_logs`: important administrator mutations.

Flexible block payloads and page module settings may use validated JSON, while
searchable, sortable, relational, and authorization-sensitive fields remain
normal columns. Every exposed table has row-level security. Public read access
is limited to published content and approved public settings.

## 7. Analytics and Privacy

The site records page views, work views, approximate unique visitors, timestamps,
referrers, device groups, and coarse country or city data when available. It
does not promise exact real-time visitor identity or exact location.

Raw IP addresses are not retained long term. A rotating, irreversible digest
may be used for approximate uniqueness and abuse prevention. User-agent and
referrer data are normalized before storage to limit unnecessary personal data.
Retention and aggregation rules prevent the raw event table from growing
without bound.

Public likes and comments are deferred because they require moderation, spam
prevention, abuse controls, and additional privacy decisions. Their later
addition must not change the core work model.

## 8. Security and Failure Handling

- Only explicitly authorized admin accounts may enter `/admin` or mutate data.
- Secret and service credentials remain server-only.
- Public database and storage access follows least privilege and row-level
  security.
- File uploads validate MIME type, extension, byte size, and destination.
- Private tokens are high entropy and never included in public lists.
- Destructive actions require confirmation and use soft deletion first.
- Permanent asset deletion is blocked while usage references remain.
- Important publish, delete, restore, and settings operations produce audit
  records.
- Failed saves retain the local draft and provide a Chinese retry message.
- Partial upload failure does not discard completed uploads.
- Publish is transactional from the user's perspective: invalid content remains
  a draft and does not replace the current public version.

## 9. Migration and Delivery

Delivery proceeds in three stages:

1. Infrastructure: create and connect Supabase, add schema, storage, admin Auth,
   policies, and a Vercel preview environment.
2. Core CMS: implement works, taxonomy, page settings, media library, publisher,
   migration from `src/data/portfolio.ts`, private links, and route revalidation.
3. Production readiness: add analytics, dashboard, SEO and sharing controls,
   audit behavior, regression tests, production deployment, and domain setup.

Cutover is complete only after migrated public pages match the approved static
version and a new work can move through upload, draft, preview, publish, private
sharing, and deletion without manual database editing.

The code agent can implement application code, migrations, tests, and deployment
configuration. The owner must complete actions that require personal account
ownership, billing consent, mailbox verification, or domain authorization. Each
such action receives a short Chinese checklist at the point it is required.

## 10. Verification

The release must verify:

- Authorized and unauthorized admin behavior.
- Row-level security and storage policies.
- Work CRUD, taxonomy, ordering, visibility, and all three statuses.
- Representative and composite placement sourced from the work library.
- JPG, PNG, WebP, GIF, MP4, and PDF uploads, including retry behavior.
- Content block ordering and desktop/mobile previews.
- Homepage hero media and color-mode settings.
- Private-link isolation from public listings and metadata.
- Contact submission, inbox actions, and email notification.
- Analytics event deduplication, aggregation, and admin exclusion.
- Migration parity for homepage, works, work detail, and resume pages.
- Automated tests, lint, production build, browser regression checks, and
  database security advisors before production deployment.

## 11. Success Criteria

The first release succeeds when the owner can operate all routine website
content in Chinese from `/admin`, publish mixed-media portfolio projects without
editing code, control public visibility and ordering, review basic traffic and
contact data, and deploy the approved public experience without layout
regressions.
