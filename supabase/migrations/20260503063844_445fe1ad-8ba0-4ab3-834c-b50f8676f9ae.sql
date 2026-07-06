CREATE TABLE public.featured_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  image_url TEXT,
  starting_price NUMERIC,
  price_unit TEXT DEFAULT 'يبدأ من',
  duration TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.featured_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active services" ON public.featured_services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins manage featured services" ON public.featured_services
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER set_updated_at_featured_services
  BEFORE UPDATE ON public.featured_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TYPE public.service_booking_status AS ENUM ('new', 'contacted', 'confirmed', 'completed', 'cancelled');

CREATE TABLE public.service_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.featured_services(id) ON DELETE CASCADE,
  customer_id UUID,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  event_date DATE,
  city TEXT,
  attendees_count INTEGER,
  notes TEXT,
  status public.service_booking_status NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create booking" ON public.service_bookings
  FOR INSERT TO anon, authenticated WITH CHECK (status = 'new');

CREATE POLICY "Customers view own bookings" ON public.service_bookings
  FOR SELECT TO authenticated USING (customer_id = auth.uid());

CREATE POLICY "Super admins manage all bookings" ON public.service_bookings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER set_updated_at_service_bookings
  BEFORE UPDATE ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();