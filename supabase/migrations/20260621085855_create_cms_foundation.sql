create schema if not exists private;
revoke all on schema private from public;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null unique,
  mime_type text not null,
  original_name text not null,
  byte_size bigint not null check (byte_size >= 0),
  width integer,
  height integer,
  duration_ms integer,
  alt_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.site_settings (
  id boolean primary key default true check (id),
  name text not null default '',
  nickname text not null default '',
  default_theme text not null default 'dark',
  font_preset text not null default 'default',
  seo_title text not null default '',
  seo_description text not null default '',
  social_links jsonb not null default '[]'::jsonb,
  logo_media_id uuid references public.media_assets(id),
  avatar_media_id uuid references public.media_assets(id),
  share_media_id uuid references public.media_assets(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  modules jsonb not null default '[]'::jsonb,
  seo_title text not null default '',
  seo_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.works (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text not null default '',
  summary text not null default '',
  year text not null default '',
  client text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'private')),
  private_token_hash text,
  cover_media_id uuid references public.media_assets(id),
  hover_media_id uuid references public.media_assets(id),
  share_media_id uuid references public.media_assets(id),
  palette jsonb not null default '[]'::jsonb,
  is_representative boolean not null default false,
  representative_order integer,
  is_composite boolean not null default false,
  composite_order integer,
  sort_order integer not null default 0,
  seo_title text not null default '',
  seo_description text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.work_categories (
  work_id uuid not null references public.works(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  primary key (work_id, category_id)
);

create table public.work_tags (
  work_id uuid not null references public.works(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete restrict,
  primary key (work_id, tag_id)
);

create table public.work_versions (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (work_id, version_number)
);

create table public.work_blocks (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  block_type text not null check (block_type in ('text', 'media', 'gallery', 'video', 'pdf', 'before_after')),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_usages (
  media_id uuid not null references public.media_assets(id) on delete restrict,
  owner_type text not null check (owner_type in ('site', 'page', 'work', 'block')),
  owner_id text not null,
  field_name text not null,
  primary key (media_id, owner_type, owner_id, field_name)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index works_public_order_idx
  on public.works (status, sort_order, published_at desc)
  where deleted_at is null;
create index categories_visible_order_idx
  on public.categories (is_visible, sort_order)
  where deleted_at is null;
create index work_blocks_order_idx
  on public.work_blocks (work_id, sort_order);
create index audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'admin_profiles', 'site_settings', 'pages', 'categories', 'tags',
    'media_assets', 'works', 'work_blocks'
  ] loop
    execute format(
      'create trigger set_%1$s_updated_at before update on public.%1$I '
      'for each row execute function private.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

alter table public.admin_profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.pages enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.media_assets enable row level security;
alter table public.works enable row level security;
alter table public.work_categories enable row level security;
alter table public.work_tags enable row level security;
alter table public.work_versions enable row level security;
alter table public.work_blocks enable row level security;
alter table public.media_usages enable row level security;
alter table public.audit_logs enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'admin_profiles', 'site_settings', 'pages', 'categories', 'tags',
    'media_assets', 'works', 'work_categories', 'work_tags', 'work_versions',
    'work_blocks', 'media_usages', 'audit_logs'
  ] loop
    execute format(
      'create policy "admin manages %1$s" on public.%1$I for all '
      'to authenticated using (private.is_admin()) '
      'with check (private.is_admin())',
      table_name
    );
  end loop;
end;
$$;

create policy "public reads published works"
on public.works
for select
to anon, authenticated
using (status = 'published' and deleted_at is null);

create policy "public reads site settings"
on public.site_settings for select to anon, authenticated using (true);

create policy "public reads pages"
on public.pages for select to anon, authenticated using (true);

create policy "public reads visible categories"
on public.categories for select to anon, authenticated
using (is_visible and deleted_at is null);

create policy "public reads active tags"
on public.tags for select to anon, authenticated
using (deleted_at is null);

create policy "public reads active media metadata"
on public.media_assets for select to anon, authenticated
using (deleted_at is null);

create policy "public reads published work categories"
on public.work_categories for select to anon, authenticated
using (exists (
  select 1 from public.works
  where works.id = work_categories.work_id
    and works.status = 'published' and works.deleted_at is null
));

create policy "public reads published work tags"
on public.work_tags for select to anon, authenticated
using (exists (
  select 1 from public.works
  where works.id = work_tags.work_id
    and works.status = 'published' and works.deleted_at is null
));

create policy "public reads published work blocks"
on public.work_blocks for select to anon, authenticated
using (is_visible and exists (
  select 1 from public.works
  where works.id = work_blocks.work_id
    and works.status = 'published' and works.deleted_at is null
));

revoke all on public.admin_profiles, public.site_settings, public.pages,
  public.categories, public.tags, public.media_assets, public.works,
  public.work_categories, public.work_tags, public.work_versions,
  public.work_blocks, public.media_usages, public.audit_logs
  from anon, authenticated;

grant select on public.site_settings, public.pages, public.categories,
  public.tags, public.media_assets, public.works, public.work_categories,
  public.work_tags, public.work_blocks to anon, authenticated;
grant select, insert, update, delete on public.admin_profiles,
  public.work_versions, public.media_usages, public.audit_logs to authenticated;
grant insert, update, delete on public.site_settings, public.pages,
  public.categories, public.tags, public.media_assets, public.works,
  public.work_categories, public.work_tags, public.work_versions,
  public.work_blocks, public.media_usages, public.audit_logs to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;

insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do update set public = excluded.public;

create policy "admin uploads portfolio media"
on storage.objects for insert to authenticated
with check (bucket_id = 'portfolio-media' and private.is_admin());

create policy "admin updates portfolio media"
on storage.objects for update to authenticated
using (bucket_id = 'portfolio-media' and private.is_admin())
with check (bucket_id = 'portfolio-media' and private.is_admin());

create policy "admin deletes portfolio media"
on storage.objects for delete to authenticated
using (bucket_id = 'portfolio-media' and private.is_admin());
