
CREATE TABLE public.event_featured_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  role_label text,
  description text,
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_featured_cards_event ON public.event_featured_cards(event_id);

ALTER TABLE public.event_featured_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own featured cards"
ON public.event_featured_cards
FOR ALL
TO authenticated
USING (event_id IN (
  SELECT e.id FROM public.events e
  JOIN public.organizations o ON e.organization_id = o.id
  WHERE o.owner_id = auth.uid()
))
WITH CHECK (event_id IN (
  SELECT e.id FROM public.events e
  JOIN public.organizations o ON e.organization_id = o.id
  WHERE o.owner_id = auth.uid()
));

CREATE POLICY "Super admins manage all featured cards"
ON public.event_featured_cards
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Checked-in attendees view featured cards"
ON public.event_featured_cards
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND event_id IN (
    SELECT r.event_id FROM public.registrations r
    WHERE r.attendee_id = auth.uid()
      AND r.checked_in_at IS NOT NULL
  )
);

CREATE TRIGGER update_event_featured_cards_updated_at
BEFORE UPDATE ON public.event_featured_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
