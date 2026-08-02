-- تتبع خروج ضيوف الدعوات الخاصة (الدخول موجود مسبقاً في checked_in_at)
-- يُعبأ تلقائياً عند مسح دعوة الضيف على بوابة من نوع "خروج".

ALTER TABLE public.private_invitation_guests
  ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;
