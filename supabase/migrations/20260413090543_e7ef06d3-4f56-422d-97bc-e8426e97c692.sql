
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS max_attendees_per_event integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_total_attendees integer DEFAULT NULL;
