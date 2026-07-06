-- 1) Service provider categories
CREATE TABLE public.service_provider_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  icon TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_provider_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active categories"
  ON public.service_provider_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admins manage categories"
  ON public.service_provider_categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER set_updated_at_categories
  BEFORE UPDATE ON public.service_provider_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Service providers (registration submissions)
CREATE TYPE public.provider_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.service_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  category_id UUID REFERENCES public.service_provider_categories(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  description TEXT,
  website_url TEXT,
  logo_url TEXT,
  status public.provider_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit provider registration"
  ON public.service_providers FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

CREATE POLICY "Owners view own provider entry"
  ON public.service_providers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Public view approved providers"
  ON public.service_providers FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Super admins manage providers"
  ON public.service_providers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER set_updated_at_providers
  BEFORE UPDATE ON public.service_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Service requests (from organizers)
CREATE TYPE public.service_request_status AS ENUM ('new', 'in_review', 'assigned', 'closed', 'cancelled');

CREATE TABLE public.service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL,
  category_id UUID REFERENCES public.service_provider_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date DATE,
  city TEXT,
  budget NUMERIC,
  contact_phone TEXT,
  status public.service_request_status NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  assigned_provider_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers create own requests"
  ON public.service_requests FOR INSERT
  TO authenticated
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizers view own requests"
  ON public.service_requests FOR SELECT
  TO authenticated
  USING (organizer_id = auth.uid());

CREATE POLICY "Organizers update own pending requests"
  ON public.service_requests FOR UPDATE
  TO authenticated
  USING (organizer_id = auth.uid() AND status IN ('new'))
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Super admins manage all requests"
  ON public.service_requests FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER set_updated_at_requests
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Partner brands (discounts)
CREATE TYPE public.discount_type AS ENUM ('percent', 'fixed');

CREATE TABLE public.partner_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  category TEXT,
  discount_code TEXT NOT NULL,
  discount_type public.discount_type NOT NULL DEFAULT 'percent',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  terms TEXT,
  website_url TEXT,
  expires_at TIMESTAMPTZ,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view active partners"
  ON public.partner_brands FOR SELECT
  TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Super admins manage partner brands"
  ON public.partner_brands FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER set_updated_at_partners
  BEFORE UPDATE ON public.partner_brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();