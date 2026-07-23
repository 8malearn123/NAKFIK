-- تصنيف المدعوين (VVIP / VIP / Regular) — يحدده المنظم فقط.
-- الضيف يتفاعل مع دعوته عبر دوال RPC محمية لا تعدّل هذا الحقل،
-- وسياسات RLS تقصر التعديل المباشر على مالك الدعوة.

ALTER TABLE public.private_invitation_guests
  ADD COLUMN IF NOT EXISTS guest_tier TEXT NOT NULL DEFAULT 'regular'
  CHECK (guest_tier IN ('vvip', 'vip', 'regular'));
