
-- Fix overly permissive UPDATE on event_guests for RSVP
DROP POLICY "Public confirm rsvp" ON public.event_guests;
CREATE POLICY "Public confirm rsvp" ON public.event_guests
  FOR UPDATE TO anon, authenticated
  USING (rsvp_status IN ('not_sent', 'invited'))
  WITH CHECK (rsvp_status = 'confirmed');

-- Fix overly permissive INSERT on reservations  
DROP POLICY "Public insert reservations" ON public.reservations;
CREATE POLICY "Public insert reservations" ON public.reservations
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    venue_id IN (SELECT id FROM venues WHERE status = 'approved' AND is_active = true)
  );
