
-- Drop old whatsapp_settings table (replaced by new system)
DROP TABLE IF EXISTS public.whatsapp_settings;

-- WhatsApp connections: how each account sends messages
CREATE TABLE public.whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  account_type text NOT NULL DEFAULT 'organizer' CHECK (account_type IN ('organizer', 'venue')),
  connection_type text NOT NULL DEFAULT 'deeplink' CHECK (connection_type IN ('rest_api', 'qr_gateway', 'nakfeek', 'deeplink')),
  provider_name text,
  endpoint_url text,
  auth_method text CHECK (auth_method IN ('bearer', 'api_key', 'basic', NULL)),
  auth_value text,
  body_template jsonb DEFAULT '{"to": "{{phone}}", "message": "{{message}}"}'::jsonb,
  instance_id text,
  is_active boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  last_tested_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own connections" ON public.whatsapp_connections
  FOR ALL TO authenticated
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

CREATE POLICY "Super admins manage all connections" ON public.whatsapp_connections
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- WhatsApp quota: per-account message limits
CREATE TABLE public.whatsapp_quota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE,
  account_type text NOT NULL DEFAULT 'organizer',
  plan_monthly_quota integer NOT NULL DEFAULT 0,
  messages_used_this_month integer NOT NULL DEFAULT 0,
  overage_rate_sar numeric NOT NULL DEFAULT 0.10,
  credit_balance_sar numeric NOT NULL DEFAULT 0.00,
  reset_date date NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month')::date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own quota" ON public.whatsapp_quota
  FOR SELECT TO authenticated
  USING (account_id = auth.uid());

CREATE POLICY "Super admins manage all quotas" ON public.whatsapp_quota
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- WhatsApp message logs: every message sent
CREATE TABLE public.whatsapp_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  account_type text NOT NULL DEFAULT 'organizer',
  method text NOT NULL CHECK (method IN ('nakfeek', 'external', 'deeplink')),
  to_phone text NOT NULL,
  message_body text,
  related_to text CHECK (related_to IN ('event', 'reservation', 'rsvp', 'manual', NULL)),
  related_id uuid,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  is_overage boolean NOT NULL DEFAULT false,
  cost_sar numeric DEFAULT 0,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own logs" ON public.whatsapp_message_logs
  FOR SELECT TO authenticated
  USING (account_id = auth.uid());

CREATE POLICY "Edge functions insert logs" ON public.whatsapp_message_logs
  FOR INSERT TO authenticated
  WITH CHECK (account_id = auth.uid());

CREATE POLICY "Super admins manage all logs" ON public.whatsapp_message_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- WhatsApp topups: credit purchases
CREATE TABLE public.whatsapp_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  account_type text NOT NULL DEFAULT 'organizer',
  amount_sar numeric NOT NULL,
  payment_reference text,
  paid_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own topups" ON public.whatsapp_topups
  FOR SELECT TO authenticated
  USING (account_id = auth.uid());

CREATE POLICY "Super admins manage all topups" ON public.whatsapp_topups
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));
