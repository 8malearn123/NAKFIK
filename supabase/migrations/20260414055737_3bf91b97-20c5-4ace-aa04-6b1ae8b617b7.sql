ALTER TABLE public.subscription_plans
ADD COLUMN price_per_event numeric NOT NULL DEFAULT 0;