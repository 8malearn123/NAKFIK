
-- ============================================
-- PART 1: Guest List + RSVP Tables
-- ============================================

-- Guest import batches
CREATE TABLE public.guest_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  imported_by uuid NOT NULL,
  file_name text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  skipped_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  error_report_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.guest_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own batches" ON public.guest_import_batches
  FOR ALL TO authenticated
  USING (event_id IN (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()))
  WITH CHECK (event_id IN (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()));

-- Event guests
CREATE TABLE public.event_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  imported_by uuid NOT NULL,
  guest_name text NOT NULL,
  guest_phone text NOT NULL,
  rsvp_token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  rsvp_status text NOT NULL DEFAULT 'not_sent',
  whatsapp_opened_at timestamptz,
  confirmed_at timestamptz,
  import_batch_id uuid REFERENCES public.guest_import_batches(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.event_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own guests" ON public.event_guests
  FOR ALL TO authenticated
  USING (event_id IN (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()))
  WITH CHECK (event_id IN (SELECT e.id FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()));

-- Public can read guest by rsvp_token (for RSVP page)
CREATE POLICY "Public view guest by token" ON public.event_guests
  FOR SELECT TO anon, authenticated
  USING (true);

-- Super admins
CREATE POLICY "Super admins manage all guests" ON public.event_guests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Public update for RSVP confirmation (anon can confirm)
CREATE POLICY "Public confirm rsvp" ON public.event_guests
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- PART 2: Reservation System Tables
-- ============================================

-- Venue type enum
CREATE TYPE public.venue_type AS ENUM ('cafe', 'restaurant', 'lounge', 'coworking', 'other');
CREATE TYPE public.venue_status AS ENUM ('pending_review', 'approved', 'suspended', 'rejected');
CREATE TYPE public.reservation_status AS ENUM ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.reservation_payment_status AS ENUM ('not_required', 'pending', 'paid', 'refunded');
CREATE TYPE public.venue_staff_role AS ENUM ('manager', 'host', 'viewer');

-- Venues
CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name_ar text NOT NULL,
  name_en text,
  slug text UNIQUE NOT NULL,
  logo_url text,
  cover_photo_url text,
  description_ar text,
  description_en text,
  venue_type public.venue_type NOT NULL DEFAULT 'cafe',
  city text,
  district text,
  address_ar text,
  address_en text,
  maps_url text,
  phone text,
  whatsapp text,
  instagram_url text,
  status public.venue_status NOT NULL DEFAULT 'pending_review',
  rejection_reason text,
  subscription_plan text NOT NULL DEFAULT 'free',
  subscription_expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  booking_page_color text,
  welcome_message_ar text,
  welcome_message_en text,
  booking_advance_days integer NOT NULL DEFAULT 30,
  auto_cancel_after_minutes integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue owners manage own" ON public.venues
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Public view approved venues" ON public.venues
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' AND is_active = true);

CREATE POLICY "Super admins manage all venues" ON public.venues
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Venue operating hours
CREATE TABLE public.venue_operating_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open boolean NOT NULL DEFAULT true,
  open_time time,
  close_time time
);

ALTER TABLE public.venue_operating_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue owners manage hours" ON public.venue_operating_hours
  FOR ALL TO authenticated
  USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()))
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

CREATE POLICY "Public view hours" ON public.venue_operating_hours
  FOR SELECT TO anon, authenticated
  USING (venue_id IN (SELECT id FROM venues WHERE status = 'approved' AND is_active = true));

-- Venue sections
CREATE TABLE public.venue_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text,
  description text,
  is_indoor boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.venue_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue owners manage sections" ON public.venue_sections
  FOR ALL TO authenticated
  USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()))
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

CREATE POLICY "Public view sections" ON public.venue_sections
  FOR SELECT TO anon, authenticated
  USING (venue_id IN (SELECT id FROM venues WHERE status = 'approved' AND is_active = true));

-- Venue tables
CREATE TABLE public.venue_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.venue_sections(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  min_capacity integer NOT NULL DEFAULT 1,
  max_capacity integer NOT NULL DEFAULT 4,
  is_available boolean NOT NULL DEFAULT true,
  notes_ar text,
  position_x integer,
  position_y integer
);

ALTER TABLE public.venue_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue owners manage tables" ON public.venue_tables
  FOR ALL TO authenticated
  USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()))
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

CREATE POLICY "Public view tables" ON public.venue_tables
  FOR SELECT TO anon, authenticated
  USING (venue_id IN (SELECT id FROM venues WHERE status = 'approved' AND is_active = true));

-- Venue slot config
CREATE TABLE public.venue_slot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid UNIQUE NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  slot_duration_minutes integer NOT NULL DEFAULT 60,
  buffer_minutes integer NOT NULL DEFAULT 0,
  min_party_size integer NOT NULL DEFAULT 1,
  max_party_size integer NOT NULL DEFAULT 10,
  advance_booking_hours integer NOT NULL DEFAULT 2,
  requires_deposit boolean NOT NULL DEFAULT false,
  deposit_amount numeric DEFAULT 0,
  allow_table_selection boolean NOT NULL DEFAULT false,
  show_special_requests boolean NOT NULL DEFAULT true,
  auto_confirm boolean NOT NULL DEFAULT true
);

ALTER TABLE public.venue_slot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue owners manage config" ON public.venue_slot_config
  FOR ALL TO authenticated
  USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()))
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

CREATE POLICY "Public view config" ON public.venue_slot_config
  FOR SELECT TO anon, authenticated
  USING (venue_id IN (SELECT id FROM venues WHERE status = 'approved' AND is_active = true));

-- Venue blackout dates
CREATE TABLE public.venue_blackout_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  date date NOT NULL,
  reason_ar text
);

ALTER TABLE public.venue_blackout_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue owners manage blackouts" ON public.venue_blackout_dates
  FOR ALL TO authenticated
  USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()))
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

CREATE POLICY "Public view blackouts" ON public.venue_blackout_dates
  FOR SELECT TO anon, authenticated
  USING (venue_id IN (SELECT id FROM venues WHERE status = 'approved' AND is_active = true));

-- Reservations
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  table_id uuid REFERENCES public.venue_tables(id),
  section_id uuid REFERENCES public.venue_sections(id),
  booking_reference text UNIQUE NOT NULL,
  guest_name text NOT NULL,
  guest_phone text NOT NULL,
  guest_email text,
  party_size integer NOT NULL DEFAULT 1,
  reservation_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status public.reservation_status NOT NULL DEFAULT 'pending',
  special_requests text,
  deposit_paid boolean NOT NULL DEFAULT false,
  deposit_amount numeric DEFAULT 0,
  payment_status public.reservation_payment_status NOT NULL DEFAULT 'not_required',
  confirmed_by uuid,
  cancellation_reason text,
  booking_type text NOT NULL DEFAULT 'online',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue owners manage reservations" ON public.reservations
  FOR ALL TO authenticated
  USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()))
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

CREATE POLICY "Public insert reservations" ON public.reservations
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public view by reference" ON public.reservations
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Super admins manage all reservations" ON public.reservations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Venue staff
CREATE TABLE public.venue_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.venue_staff_role NOT NULL DEFAULT 'host',
  invited_by uuid,
  joined_at timestamptz DEFAULT now()
);

ALTER TABLE public.venue_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue owners manage staff" ON public.venue_staff
  FOR ALL TO authenticated
  USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()))
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

CREATE POLICY "Staff view own" ON public.venue_staff
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Storage bucket for venue photos
INSERT INTO storage.buckets (id, name, public) VALUES ('venue-photos', 'venue-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Add venue_owner to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'venue_owner';
