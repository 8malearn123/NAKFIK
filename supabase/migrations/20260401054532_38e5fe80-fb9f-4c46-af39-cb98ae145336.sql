
-- =============================================
-- 1. User Roles table (separate from profiles)
-- =============================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'organizer', 'venue_owner');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Only super_admins can read all roles; users can read their own
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- 2. Organizations table
-- =============================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  owner_id UUID NOT NULL,
  subscription_plan TEXT NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'pro', 'enterprise')),
  subscription_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners manage own org"
  ON public.organizations FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Super admins manage all orgs"
  ON public.organizations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Public can view active orgs"
  ON public.organizations FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- =============================================
-- 3. Team Members table
-- =============================================
CREATE TYPE public.team_role AS ENUM ('admin', 'event_manager', 'checkin_staff', 'reporter');

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role team_role NOT NULL DEFAULT 'event_manager',
  invited_by UUID,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view own team"
  ON public.team_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
  );

CREATE POLICY "Org owners manage team"
  ON public.team_members FOR ALL TO authenticated
  USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

-- =============================================
-- 4. Events table
-- =============================================
CREATE TYPE public.event_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected', 'cancelled', 'completed');
CREATE TYPE public.event_category AS ENUM ('conference', 'workshop', 'seminar', 'meetup', 'other');
CREATE TYPE public.event_type AS ENUM ('public', 'private');

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  type event_type NOT NULL DEFAULT 'public',
  status event_status NOT NULL DEFAULT 'draft',
  category event_category NOT NULL DEFAULT 'conference',
  cover_image_url TEXT,
  venue_name TEXT,
  venue_address TEXT,
  venue_map_url TEXT,
  is_online BOOLEAN NOT NULL DEFAULT false,
  online_link TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,
  max_attendees INT,
  current_attendees_count INT NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT true,
  rejection_reason TEXT,
  private_link UUID UNIQUE DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Organizers see own events
CREATE POLICY "Organizers manage own events"
  ON public.events FOR ALL TO authenticated
  USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

-- Super admin sees all
CREATE POLICY "Super admins manage all events"
  ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Public sees published public events
CREATE POLICY "Public can view published events"
  ON public.events FOR SELECT TO anon, authenticated
  USING (status = 'published' AND type = 'public');

-- =============================================
-- 5. Sessions table
-- =============================================
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  speaker_name TEXT,
  speaker_bio TEXT,
  speaker_avatar_url TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location TEXT,
  session_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions follow event access"
  ON public.sessions FOR SELECT TO anon, authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE status = 'published' AND type = 'public'));

CREATE POLICY "Organizers manage own sessions"
  ON public.sessions FOR ALL TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())))
  WITH CHECK (event_id IN (SELECT id FROM public.events WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())));

CREATE POLICY "Super admins manage all sessions"
  ON public.sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- 6. Tickets table
-- =============================================
CREATE TYPE public.ticket_type AS ENUM ('free', 'paid', 'vip');

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  type ticket_type NOT NULL DEFAULT 'free',
  price DECIMAL(10,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  quantity_total INT NOT NULL DEFAULT 100,
  quantity_sold INT NOT NULL DEFAULT 0,
  sale_start TIMESTAMPTZ,
  sale_end TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active tickets"
  ON public.tickets FOR SELECT TO anon, authenticated
  USING (is_active = true AND event_id IN (SELECT id FROM public.events WHERE status = 'published'));

CREATE POLICY "Organizers manage own tickets"
  ON public.tickets FOR ALL TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())))
  WITH CHECK (event_id IN (SELECT id FROM public.events WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())));

-- =============================================
-- 7. Registrations table
-- =============================================
CREATE TYPE public.registration_status AS ENUM ('pending', 'confirmed', 'cancelled', 'checked_in');
CREATE TYPE public.payment_status AS ENUM ('free', 'paid', 'refunded');

CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL,
  ticket_id UUID REFERENCES public.tickets(id),
  status registration_status NOT NULL DEFAULT 'confirmed',
  qr_code TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  payment_status payment_status NOT NULL DEFAULT 'free',
  amount_paid DECIMAL(10,2) DEFAULT 0,
  registered_at TIMESTAMPTZ DEFAULT now(),
  checked_in_at TIMESTAMPTZ
);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Attendees see own registrations
CREATE POLICY "Attendees view own registrations"
  ON public.registrations FOR SELECT TO authenticated
  USING (attendee_id = auth.uid());

-- Attendees can register
CREATE POLICY "Attendees can register"
  ON public.registrations FOR INSERT TO authenticated
  WITH CHECK (attendee_id = auth.uid());

-- Organizers see registrations for their events
CREATE POLICY "Organizers view event registrations"
  ON public.registrations FOR SELECT TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())));

-- Organizers can update registrations (check-in)
CREATE POLICY "Organizers update registrations"
  ON public.registrations FOR UPDATE TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())))
  WITH CHECK (event_id IN (SELECT id FROM public.events WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())));

-- Super admin
CREATE POLICY "Super admins manage all registrations"
  ON public.registrations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- 8. Invitations table
-- =============================================
CREATE TYPE public.invitation_status AS ENUM ('sent', 'accepted', 'declined');

CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  email TEXT,
  phone TEXT,
  status invitation_status NOT NULL DEFAULT 'sent',
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  sent_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own invitations"
  ON public.invitations FOR ALL TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())))
  WITH CHECK (event_id IN (SELECT id FROM public.events WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())));

-- Public can view invitation by token (for accept/decline)
CREATE POLICY "Public view invitation by token"
  ON public.invitations FOR SELECT TO anon, authenticated
  USING (true);

-- =============================================
-- 9. Certificates table
-- =============================================
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  certificate_url TEXT,
  template_used TEXT,
  issued_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendees view own certificates"
  ON public.certificates FOR SELECT TO authenticated
  USING (attendee_id = auth.uid());

CREATE POLICY "Organizers manage certificates"
  ON public.certificates FOR ALL TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())))
  WITH CHECK (event_id IN (SELECT id FROM public.events WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())));

-- =============================================
-- 10. Reviews table
-- =============================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  attendee_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendees manage own reviews"
  ON public.reviews FOR ALL TO authenticated
  USING (attendee_id = auth.uid())
  WITH CHECK (attendee_id = auth.uid());

CREATE POLICY "Public view reviews"
  ON public.reviews FOR SELECT TO anon, authenticated
  USING (true);

-- =============================================
-- 11. Storage buckets
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('event-covers', 'event-covers', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for event-covers
CREATE POLICY "Anyone can view event covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-covers');

CREATE POLICY "Authenticated users can upload event covers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-covers');

CREATE POLICY "Users can update own event covers"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-covers');

-- Storage policies for logos
CREATE POLICY "Anyone can view logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can upload logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos');

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- =============================================
-- 12. Update profiles to allow organizers to view attendee names for registrations
-- =============================================
CREATE POLICY "Organizers can view attendee profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR id IN (
      SELECT r.attendee_id FROM public.registrations r
      JOIN public.events e ON r.event_id = e.id
      JOIN public.organizations o ON e.organization_id = o.id
      WHERE o.owner_id = auth.uid()
    )
  );

-- =============================================
-- 13. Function to increment attendee count
-- =============================================
CREATE OR REPLACE FUNCTION public.increment_attendee_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.events
  SET current_attendees_count = current_attendees_count + 1
  WHERE id = NEW.event_id;
  
  UPDATE public.tickets
  SET quantity_sold = quantity_sold + 1
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_registration_created
  AFTER INSERT ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_attendee_count();
