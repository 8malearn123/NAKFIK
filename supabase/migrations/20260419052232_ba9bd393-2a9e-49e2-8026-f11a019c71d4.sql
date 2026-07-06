ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS validity_months integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0;