
ALTER TABLE public.private_invitations
  ADD COLUMN IF NOT EXISTS custom_template_url text,
  ADD COLUMN IF NOT EXISTS use_custom_template boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS name_overlay jsonb NOT NULL DEFAULT '{
    "xPct": 50,
    "yPct": 22,
    "widthPct": 70,
    "fontSize": 32,
    "fontFamily": "Amiri",
    "fontWeight": 700,
    "color": "#FFFFFF",
    "textAlign": "center",
    "letterSpacing": 0,
    "prefix": "",
    "suffix": "",
    "shadow": true
  }'::jsonb;
