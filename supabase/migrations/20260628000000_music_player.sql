-- 背景音乐播放器配置表
create table if not exists public.music_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.music_categories(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 插入四个默认分类
insert into public.music_categories (key, label, sort_order) values
  ('relax', '放松纯音乐', 1),
  ('energetic', '动感串烧', 2),
  ('summer', '清凉夏日', 3),
  ('badass', '听完感觉自己牛逼哄哄', 4)
on conflict (key) do nothing;

-- 启用RLS
alter table public.music_categories enable row level security;
alter table public.music_tracks enable row level security;

-- 公开只读访问
create policy "music_categories_public_read" on public.music_categories
  for select using (true);

create policy "music_tracks_public_read" on public.music_tracks
  for select using (true);

-- 管理员可写
create policy "music_categories_admin_write" on public.music_categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "music_tracks_admin_write" on public.music_tracks
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
