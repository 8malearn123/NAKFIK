ALTER TABLE public.networking_profiles
  ADD COLUMN IF NOT EXISTS expertise text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS snapchat_handle text,
  ADD COLUMN IF NOT EXISTS instagram_handle text;