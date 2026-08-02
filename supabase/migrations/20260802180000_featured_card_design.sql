-- Featured cards design options (same experience as private invitations):
-- design: Nakfeek design JSON (colors, fonts, layout, ornament, frame, extras)
-- use_custom_template + custom_template_url + name_overlay: uploaded own design
ALTER TABLE public.event_featured_cards
  ADD COLUMN IF NOT EXISTS design jsonb,
  ADD COLUMN IF NOT EXISTS use_custom_template boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_template_url text,
  ADD COLUMN IF NOT EXISTS name_overlay jsonb;
