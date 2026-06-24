-- =====================================================================
-- 生产环境迁移脚本（合并 4 个迁移，按时间戳顺序执行）
-- 项目：2026 作品集网站 (Supabase: hnujowombcgfxledpnxe)
-- 用法：在 Supabase Dashboard → SQL Editor → New query 粘贴全文 → Run
-- 幂等性说明：work_versions.label 与 scheduled_publish_at 使用 IF NOT EXISTS，
--             可重复执行；analytics 表为首次创建，若已存在请先 DROP 或跳过对应段落。
-- =====================================================================

-- =====================================================================
-- 迁移 1: 20260623120000_add_label_to_work_versions.sql
-- 为 work_versions 表添加 label 列（版本备注），配合版本控制 UI
-- =====================================================================

alter table public.work_versions
  add column if not exists label text;

comment on column public.work_versions.label is '版本备注，可为空';


-- =====================================================================
-- 迁移 2: 20260624010000_admin_analytics.sql
-- 后台数据分析模块：访问、页面浏览、作品统计、评论、点赞
-- =====================================================================

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  ip_hash text,
  country text,
  region text,
  city text,
  user_agent text,
  device_type text,
  os text,
  browser text,
  referer text,
  landing_path text,
  created_at timestamptz not null default now()
);

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  path text not null,
  work_slug text,
  referrer text,
  device_type text,
  created_at timestamptz not null default now()
);

create table public.work_views (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  view_date date not null default current_date,
  view_count integer not null default 1 check (view_count >= 0),
  unique (work_id, view_date)
);

create table public.work_comments (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  author_name text not null default '',
  content text not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.work_likes (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  session_id text not null,
  created_at timestamptz not null default now(),
  unique (work_id, session_id)
);

-- 索引

create index visits_created_at_idx
  on public.visits (created_at desc);

create index visits_session_id_created_at_idx
  on public.visits (session_id, created_at desc);

create index visits_ip_hash_created_at_idx
  on public.visits (ip_hash, created_at desc);

create index page_views_created_at_idx
  on public.page_views (created_at desc);

create index page_views_visit_id_idx
  on public.page_views (visit_id);

create index page_views_path_created_at_idx
  on public.page_views (path, created_at desc);

create index page_views_work_slug_created_at_idx
  on public.page_views (work_slug, created_at desc);

create index work_views_work_id_idx
  on public.work_views (work_id);

create index work_views_view_date_idx
  on public.work_views (view_date desc);

create index work_comments_work_id_created_at_idx
  on public.work_comments (work_id, created_at desc);

create index work_comments_created_at_idx
  on public.work_comments (created_at desc);

create index work_likes_work_id_idx
  on public.work_likes (work_id);

create index work_likes_session_id_idx
  on public.work_likes (session_id);

-- 增量更新作品浏览量的安全函数

create or replace function public.increment_work_view(p_work_id uuid, p_view_date date)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.work_views (work_id, view_date, view_count)
  values (p_work_id, p_view_date, 1)
  on conflict (work_id, view_date)
  do update set view_count = public.work_views.view_count + 1;
$$;

-- 统计最近活跃独立会话数

create or replace function public.count_distinct_sessions_since(p_since timestamptz)
returns integer
language sql
security definer
set search_path = ''
as $$
  select count(distinct v.session_id)::integer
  from public.page_views pv
  join public.visits v on v.id = pv.visit_id
  where pv.created_at >= p_since;
$$;

-- 统计独立访客总数

create or replace function public.count_unique_visitors()
returns integer
language sql
security definer
set search_path = ''
as $$
  select count(distinct session_id)::integer
  from public.visits
  where session_id is not null;
$$;

-- 更新时间戳触发器

create or replace function public.set_work_comment_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_work_comments_updated_at on public.work_comments;
create trigger set_work_comments_updated_at
before update on public.work_comments
for each row execute function public.set_work_comment_updated_at();

-- 启用 RLS

alter table public.visits enable row level security;
alter table public.page_views enable row level security;
alter table public.work_views enable row level security;
alter table public.work_comments enable row level security;
alter table public.work_likes enable row level security;

-- 回收默认权限并重新授予

revoke all on public.visits, public.page_views, public.work_views,
  public.work_comments, public.work_likes
  from anon, authenticated;

-- 管理员拥有完整读写权限

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'visits', 'page_views', 'work_views', 'work_comments', 'work_likes'
  ] loop
    execute format(
      'drop policy if exists "admin manages %1$s" on public.%1$I',
      table_name
    );
    execute format(
      'create policy "admin manages %1$s" on public.%1$I for all '
      'to authenticated using (private.is_admin()) '
      'with check (private.is_admin())',
      table_name
    );
  end loop;
end;
$$;

-- 匿名用户可以写入访问与浏览数据（供前台跟踪使用）

drop policy if exists "public inserts visits" on public.visits;
create policy "public inserts visits"
  on public.visits
  for insert
  to anon
  with check (true);

drop policy if exists "public inserts page views" on public.page_views;
create policy "public inserts page views"
  on public.page_views
  for insert
  to anon
  with check (true);

drop policy if exists "public inserts work views" on public.work_views;
create policy "public inserts work views"
  on public.work_views
  for insert
  to anon
  with check (true);

drop policy if exists "public inserts work comments" on public.work_comments;
create policy "public inserts work comments"
  on public.work_comments
  for insert
  to anon
  with check (true);

drop policy if exists "public inserts work likes" on public.work_likes;
create policy "public inserts work likes"
  on public.work_likes
  for insert
  to anon
  with check (true);

drop policy if exists "public deletes own work likes" on public.work_likes;
create policy "public deletes own work likes"
  on public.work_likes
  for delete
  to anon
  using (session_id = coalesce(current_setting('request.headers.x-session-id', true), ''));

-- 认证用户（含管理员）可以读取统计数据

drop policy if exists "authenticated reads visits" on public.visits;
create policy "authenticated reads visits"
  on public.visits
  for select
  to authenticated
  using (private.is_admin());

drop policy if exists "authenticated reads page views" on public.page_views;
create policy "authenticated reads page views"
  on public.page_views
  for select
  to authenticated
  using (private.is_admin());

drop policy if exists "authenticated reads work views" on public.work_views;
create policy "authenticated reads work views"
  on public.work_views
  for select
  to authenticated
  using (private.is_admin());

drop policy if exists "authenticated reads work comments" on public.work_comments;
create policy "authenticated reads work comments"
  on public.work_comments
  for select
  to authenticated
  using (private.is_admin());

drop policy if exists "authenticated reads work likes" on public.work_likes;
create policy "authenticated reads work likes"
  on public.work_likes
  for select
  to authenticated
  using (private.is_admin());

-- 函数执行权限

grant execute on function public.increment_work_view(uuid, date) to anon, authenticated, service_role;
grant execute on function public.count_distinct_sessions_since(timestamptz) to anon, authenticated, service_role;
grant execute on function public.count_unique_visitors() to anon, authenticated, service_role;

-- 对象级权限

grant select, insert, update, delete on public.visits, public.page_views,
  public.work_views, public.work_comments, public.work_likes to service_role;

grant insert on public.visits, public.page_views, public.work_views,
  public.work_comments, public.work_likes to anon;
grant delete on public.work_likes to anon;

grant select on public.visits, public.page_views, public.work_views,
  public.work_comments, public.work_likes to authenticated;

grant insert, update, delete on public.visits, public.page_views,
  public.work_views, public.work_comments, public.work_likes to authenticated;


-- =====================================================================
-- 迁移 3 & 4: 作品定时发布（合并 20260624020000 + 20260625010000，幂等）
-- works 表新增 scheduled_publish_at 列
-- =====================================================================

alter table public.works
  add column if not exists scheduled_publish_at timestamptz;

create index if not exists works_scheduled_publish_at_idx
  on public.works (scheduled_publish_at)
  where status = 'draft' and scheduled_publish_at is not null;

comment on column public.works.scheduled_publish_at is '定时发布时间，到达该时间后由任务自动改为已发布';

-- =====================================================================
-- 执行完毕。返回 'DONE' 表示脚本运行到末尾。
-- =====================================================================
select 'DONE' as result;
