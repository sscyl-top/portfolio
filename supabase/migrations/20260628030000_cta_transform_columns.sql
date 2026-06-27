-- Add CTA image transform columns (scale, offset X/Y) for composite design wall bottom CTA area
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS cta_card_scale numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS cta_card_offset_x numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cta_card_offset_y numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cta_figure_scale numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS cta_figure_offset_x numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cta_figure_offset_y numeric NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
