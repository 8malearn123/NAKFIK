-- helper for timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. networking_profiles
CREATE TABLE public.networking_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_title text,
  company text,
  bio text,
  looking_for text[] DEFAULT '{}',
  linkedin_url text,
  twitter_handle text,
  whatsapp text,
  email_public text,
  website_url text,
  privacy_level text NOT NULL DEFAULT 'event_only' CHECK (privacy_level IN ('event_only','nakfeek_users','public')),
  connect_code text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.networking_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own networking profile"
ON public.networking_profiles FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public can view networking profiles"
ON public.networking_profiles FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Super admins manage all networking_profiles"
ON public.networking_profiles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_networking_profiles_updated_at
BEFORE UPDATE ON public.networking_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. networking_connections
CREATE TABLE public.networking_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  scanner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scanned_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, scanner_id, scanned_id)
);

ALTER TABLE public.networking_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own connections"
ON public.networking_connections FOR SELECT TO authenticated
USING (scanner_id = auth.uid() OR scanned_id = auth.uid());

CREATE POLICY "Users create own scans"
ON public.networking_connections FOR INSERT TO authenticated
WITH CHECK (scanner_id = auth.uid());

CREATE POLICY "Super admins manage all networking_connections"
ON public.networking_connections FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 3. referrals
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referrals"
ON public.referrals FOR SELECT TO authenticated
USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "Authenticated create referrals"
ON public.referrals FOR INSERT TO authenticated
WITH CHECK (referred_id = auth.uid());

CREATE POLICY "Organizers view event referrals"
ON public.referrals FOR SELECT TO authenticated
USING (event_id IN (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()));

CREATE POLICY "Super admins manage all referrals"
ON public.referrals FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 4. attendee_points
CREATE TABLE public.attendee_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points int NOT NULL DEFAULT 0,
  source text NOT NULL CHECK (source IN ('referral','share','attendance','review')),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendee_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own points"
ON public.attendee_points FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users insert own points"
ON public.attendee_points FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Organizers view event points"
ON public.attendee_points FOR SELECT TO authenticated
USING (event_id IN (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()));

CREATE POLICY "Super admins manage all attendee_points"
ON public.attendee_points FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 5. badge_templates
CREATE TABLE public.badge_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  width_mm int NOT NULL DEFAULT 100,
  height_mm int NOT NULL DEFAULT 150,
  background_color text NOT NULL DEFAULT 'FFFFFF',
  text_color text NOT NULL DEFAULT '000000',
  logo_url text,
  elements jsonb DEFAULT '[]'::jsonb,
  ticket_type_styles jsonb DEFAULT '{}'::jsonb,
  printer_type text NOT NULL DEFAULT 'pdf' CHECK (printer_type IN ('zebra','brother','dymo','pdf')),
  printer_connection text DEFAULT 'usb' CHECK (printer_connection IN ('usb','wifi')),
  printer_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.badge_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own badge templates"
ON public.badge_templates FOR ALL TO authenticated
USING (event_id IN (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()))
WITH CHECK (event_id IN (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()));

CREATE POLICY "Super admins manage all badge_templates"
ON public.badge_templates FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_badge_templates_updated_at
BEFORE UPDATE ON public.badge_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. badge_print_log
CREATE TABLE public.badge_print_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.registrations(id) ON DELETE SET NULL,
  printed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  printed_at timestamptz NOT NULL DEFAULT now(),
  is_reprint boolean NOT NULL DEFAULT false
);

ALTER TABLE public.badge_print_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage badge print log"
ON public.badge_print_log FOR ALL TO authenticated
USING (event_id IN (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()))
WITH CHECK (event_id IN (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()));

CREATE POLICY "Super admins manage all badge_print_log"
ON public.badge_print_log FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 7. event share/referral settings
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS social_share_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS social_share_text text,
  ADD COLUMN IF NOT EXISTS social_hashtags text,
  ADD COLUMN IF NOT EXISTS referral_points int NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS share_points int NOT NULL DEFAULT 5;

-- 8. backfill networking_profiles
INSERT INTO public.networking_profiles (user_id)
SELECT id FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.networking_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- 9. auto-create networking_profile on new profile
CREATE OR REPLACE FUNCTION public.create_networking_profile_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.networking_profiles (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_make_networking
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_networking_profile_for_new_user();

-- indexes
CREATE INDEX idx_networking_profiles_connect_code ON public.networking_profiles(connect_code);
CREATE INDEX idx_networking_connections_scanner ON public.networking_connections(scanner_id);
CREATE INDEX idx_networking_connections_event ON public.networking_connections(event_id);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_event ON public.referrals(event_id);
CREATE INDEX idx_attendee_points_user ON public.attendee_points(user_id);
CREATE INDEX idx_badge_print_log_event ON public.badge_print_log(event_id);