-- 为作品终场 CTA 面板增加滚动条幅 logo 素材配置
alter table public.site_settings
  add column if not exists cta_ticker_logo_media_id uuid references public.media_assets(id);
