-- ============================================================================
-- 简历 CMS 列补充（resumes 表新增 7 个 JSONB 列）
-- 原因：20260626000000_resume_full_cms.sql 未在生产库生效，导致保存报错
--        "Could not find the 'campus' column of 'resumes' in the schema cache"
--
-- 用法：Supabase Dashboard → SQL Editor → New query → 粘贴全文 → Run
-- 幂等性：全部 IF NOT EXISTS，可安全重复执行
-- ============================================================================

alter table public.resumes
  add column if not exists highlights  jsonb not null default '[]'::jsonb,
  add column if not exists expertise  jsonb not null default '[]'::jsonb,
  add column if not exists experience  jsonb not null default '[]'::jsonb,
  add column if not exists campus      jsonb not null default '[]'::jsonb,
  add column if not exists education   jsonb not null default '{}'::jsonb,
  add column if not exists services    jsonb not null default '[]'::jsonb,
  add column if not existS downloads   jsonb not null default '{}'::jsonb;

-- 验证
select
  (select count(*) from information_schema.columns where table_name='resumes' and column_name='highlights')  as highlights,
  (select count(*) from information_schema.columns where table_name='resumes' and column_name='expertise')  as expertise,
  (select count(*) from information_schema.columns where table_name='resumes' and column_name='experience') as experience,
  (select count(*) from information_schema.columns where table_name='resumes' and column_name='campus')      as campus,
  (select count(*) from information_schema.columns where table_name='resumes' and column_name='education')   as education,
  (select count(*) from information_schema.columns where table_name='resumes' and column_name='services')    as services,
  (select count(*) from information_schema.columns where table_name='resumes' and column_name='downloads')   as downloads,
  'COLUMNS_FIXED' as result;
