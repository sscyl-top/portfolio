-- 为 work_versions 表添加 label 列
-- 用于存储版本备注，配合版本控制 UI 使用
-- 注意：archiveWorkVersion() 函数会插入 label 字段，缺少此列会导致自动归档静默失败

alter table public.work_versions
  add column if not exists label text;

comment on column public.work_versions.label is '版本备注，可为空';
