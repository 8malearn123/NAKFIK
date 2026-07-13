-- صلاحية "نسخ الفعالية" لكل باقة: الأدمن يفعّلها أو يوقفها لكل خطة مستقلة.
-- الافتراضي: مسموح (توافقاً مع السلوك الحالي).

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS allow_duplicate_event boolean NOT NULL DEFAULT true;
