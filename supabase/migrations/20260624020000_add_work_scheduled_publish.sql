-- 作品定时发布支持

alter table public.works
  add column if not exists scheduled_publish_at timestamptz null;

create index if not exists works_scheduled_publish_at_idx
  on public.works (scheduled_publish_at)
  where status = 'draft' and scheduled_publish_at is not null;
