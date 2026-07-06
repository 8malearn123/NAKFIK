ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS badge_color text,
  ADD COLUMN IF NOT EXISTS badge_logo_url text,
  ADD COLUMN IF NOT EXISTS badge_tier_label text;