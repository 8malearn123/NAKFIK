ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS floor_plan_json jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS mini_website_enabled boolean DEFAULT false;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS menu_photos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS gallery_photos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS about_text_ar text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS about_text_en text;