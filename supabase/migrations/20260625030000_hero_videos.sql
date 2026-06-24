-- 为首页 Hero 第一屏添加 4 个视频字段（主卡片+3个小卡片）
alter table public.site_settings
  add column if not exists hero_main_video_media_id uuid references public.media_assets(id),
  add column if not exists hero_side1_video_media_id uuid references public.media_assets(id),
  add column if not exists hero_side2_video_media_id uuid references public.media_assets(id),
  add column if not exists hero_side3_video_media_id uuid references public.media_assets(id);
