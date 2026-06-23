-- 作品支持定时发布

alter table public.works
  add column if not exists scheduled_publish_at timestamptz;

create index if not exists works_scheduled_publish_at_idx
  on public.works (scheduled_publish_at)
  where status = 'draft' and scheduled_publish_at is not null;

comment on column public.works.scheduled_publish_at is '定时发布时间，到达该时间后由任务自动改为已发布';
