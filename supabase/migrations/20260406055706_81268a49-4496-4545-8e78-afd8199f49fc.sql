-- Transaction types enum
CREATE TYPE public.transaction_type AS ENUM (
  'ticket_sale', 'ticket_refund', 'subscription_payment', 'payout', 'commission', 'deposit'
);

-- Transaction status enum
CREATE TYPE public.transaction_status AS ENUM (
  'pending', 'completed', 'failed', 'refunded', 'cancelled'
);

-- Payout status enum
CREATE TYPE public.payout_status AS ENUM (
  'pending', 'processing', 'completed', 'failed'
);

-- Subscription status enum
CREATE TYPE public.subscription_status AS ENUM (
  'active', 'past_due', 'cancelled', 'expired', 'trialing'
);

-- Master transaction ledger
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type public.transaction_type NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  commission_rate numeric DEFAULT 0,
  commission_amount numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  account_id uuid NOT NULL,
  account_type text NOT NULL DEFAULT 'organizer',
  buyer_id uuid,
  event_id uuid,
  registration_id uuid,
  reservation_id uuid,
  subscription_id uuid,
  payout_id uuid,
  payment_method text,
  payment_reference text,
  description_ar text,
  description_en text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all transactions" ON public.transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Account owners view own transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (account_id = auth.uid());

-- Commission settings
CREATE TABLE public.commission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  rate_percent numeric NOT NULL DEFAULT 10,
  min_amount numeric DEFAULT 0,
  max_amount numeric,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage commission settings" ON public.commission_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can view active commission rates" ON public.commission_settings
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Payouts
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  account_type text NOT NULL DEFAULT 'organizer',
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  status public.payout_status NOT NULL DEFAULT 'pending',
  bank_name text,
  iban text,
  account_holder_name text,
  period_start date,
  period_end date,
  transactions_count integer DEFAULT 0,
  total_sales numeric DEFAULT 0,
  total_commission numeric DEFAULT 0,
  notes text,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all payouts" ON public.payouts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Account owners view own payouts" ON public.payouts
  FOR SELECT TO authenticated
  USING (account_id = auth.uid());

-- Subscription plans
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  description_ar text,
  description_en text,
  target_type text NOT NULL DEFAULT 'organizer',
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  features jsonb DEFAULT '[]'::jsonb,
  max_events integer,
  max_reservations_per_month integer,
  whatsapp_quota integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  badge_color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Super admins manage plans" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Account subscriptions
CREATE TABLE public.account_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  account_type text NOT NULL DEFAULT 'organizer',
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status public.subscription_status NOT NULL DEFAULT 'active',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  cancel_at_period_end boolean DEFAULT false,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.account_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all subscriptions" ON public.account_subscriptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Account owners view own subscriptions" ON public.account_subscriptions
  FOR SELECT TO authenticated
  USING (account_id = auth.uid());

-- Insert default commission settings
INSERT INTO public.commission_settings (category, rate_percent) VALUES
  ('ticket_sale', 10),
  ('reservation_deposit', 5),
  ('subscription', 0);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name_ar, name_en, target_type, price_monthly, price_yearly, features, max_events, whatsapp_quota, display_order, badge_color) VALUES
  ('مجاني', 'Free', 'organizer', 0, 0, '["3 فعاليات شهرياً", "50 مسجل لكل فعالية", "تقارير أساسية"]'::jsonb, 3, 50, 0, null),
  ('احترافي', 'Pro', 'organizer', 99, 990, '["فعاليات غير محدودة", "500 مسجل لكل فعالية", "تقارير متقدمة", "فريق عمل", "إشعارات واتساب"]'::jsonb, null, 500, 1, '#7c3aed'),
  ('مؤسسي', 'Enterprise', 'organizer', 299, 2990, '["كل مميزات الاحترافي", "مسجلين غير محدود", "دعم أولوية", "API", "واتساب غير محدود"]'::jsonb, null, 5000, 2, '#d97706'),
  ('أساسي', 'Basic', 'venue_owner', 0, 0, '["إدارة حجوزات أساسية", "صفحة حجز عامة", "50 رسالة واتساب"]'::jsonb, null, 50, 0, null),
  ('متقدم', 'Advanced', 'venue_owner', 149, 1490, '["حجوزات غير محدودة", "مخطط أرضية", "تقارير متقدمة", "طاقم عمل", "واتساب 500 رسالة"]'::jsonb, null, 500, 1, '#0d9488'),
  ('بريميوم', 'Premium', 'venue_owner', 349, 3490, '["كل مميزات المتقدم", "موقع مصغر", "API", "دعم أولوية", "واتساب غير محدود"]'::jsonb, null, 5000, 2, '#d97706');