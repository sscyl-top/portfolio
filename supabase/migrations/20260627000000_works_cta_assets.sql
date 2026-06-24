-- ========================================================================
-- 网站设置扩展：导航栏头像 + 作品终场 CTA 双层素材
-- 对应功能：2.2 导航栏头像上传、2.3 全部作品终场 CTA 双层 PNG 素材
-- 用法：Supabase Dashboard → SQL Editor → 粘贴全文 → Run
-- 幂等：所有语句含 IF NOT EXISTS，可重复执行
-- ========================================================================

-- 导航栏头像（site_settings.avatar_media_id）
alter table public.site_settings
  add column if not exists avatar_media_id uuid references public.media(id) on delete set null;
comment on column public.site_settings.avatar_media_id is '导航栏头像媒体 ID，为空时回退显示品牌 Logo';

-- 作品终场背景卡（site_settings.cta_card_media_id）
alter table public.site_settings
  add column if not exists cta_card_media_id uuid references public.media(id) on delete set null;
comment on column public.site_settings.cta_card_media_id is '全部作品页终场 CTA 背景卡 PNG';

-- 作品终场人物图（site_settings.cta_figure_media_id）
alter table public.site_settings
  add column if not exists cta_figure_media_id uuid references public.media(id) on delete set null;
comment on column public.site_settings.cta_figure_media_id is '全部作品页终场 CTA 人物图 PNG（带透明通道）';

-- 验证
select
  (select count(*) from information_schema.columns where table_name='site_settings' and column_name='avatar_media_id')  as avatar_media_id,
  (select count(*) from information_schema.columns where table_name='site_settings' and column_name='cta_card_media_id')  as cta_card_media_id,
  (select count(*) from information_schema.columns where table_name='site_settings' and column_name='cta_figure_media_id') as cta_figure_media_id,
  'COLUMNS_ADDED' as result;
