ALTER TABLE public.networking_profiles
  ADD COLUMN IF NOT EXISTS card_logo_url text,
  ADD COLUMN IF NOT EXISTS ring_color text,
  ADD COLUMN IF NOT EXISTS bg_color_from text,
  ADD COLUMN IF NOT EXISTS bg_color_to text,
  ADD COLUMN IF NOT EXISTS tier_label text;