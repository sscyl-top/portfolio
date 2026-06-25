-- 音乐播放器设置表
create table if not exists public.music_settings (
  id boolean primary key default true,
  hide_frontend boolean not null default false,
  hide_backend boolean not null default false,
  tip_messages jsonb not null default '[]'::jsonb,
  playing_label text not null default '正在播放',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint music_settings_single_row check (id = true)
);

insert into public.music_settings (id, hide_frontend, hide_backend, tip_messages, playing_label)
values (true, false, false, '[]'::jsonb, '正在播放')
on conflict (id) do nothing;

alter table public.music_settings enable row level security;

create policy "music_settings_public_read" on public.music_settings
  for select using (true);

create policy "music_settings_admin_write" on public.music_settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 给音乐分类添加emoji字段
alter table public.music_categories
  add column if not exists emoji text not null default '🎵';

-- 更新默认分类的emoji
update public.music_categories set emoji = '🌿' where key = 'relax' and emoji = '🎵';
update public.music_categories set emoji = '🔥' where key = 'energetic' and emoji = '🎵';
update public.music_categories set emoji = '🌊' where key = 'summer' and emoji = '🎵';
update public.music_categories set emoji = '😎' where key = 'badass' and emoji = '🎵';
