
-- private_invitations table
CREATE TABLE public.private_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  host_name TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  venue_name TEXT,
  venue_address TEXT,
  venue_map_url TEXT,
  dress_code TEXT,
  contact_phone TEXT,
  contact_whatsapp TEXT,
  contact_email TEXT,
  gift_notes TEXT,
  gift_iban TEXT,
  gift_bank_name TEXT,
  gift_account_holder TEXT,
  allow_companions BOOLEAN NOT NULL DEFAULT false,
  max_companions INTEGER NOT NULL DEFAULT 0,
  theme_color TEXT NOT NULL DEFAULT '#492C5A',
  accent_color TEXT NOT NULL DEFAULT '#CC8E3D',
  font_family TEXT NOT NULL DEFAULT 'Cairo',
  cover_image_url TEXT,
  background_image_url TEXT,
  custom_message TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.private_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners manage own invitations"
  ON public.private_invitations FOR ALL TO authenticated
  USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Super admins manage all invitations"
  ON public.private_invitations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Public view active invitations"
  ON public.private_invitations FOR SELECT TO anon, authenticated
  USING (status = 'active');

CREATE TRIGGER update_private_invitations_updated_at
  BEFORE UPDATE ON public.private_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- guests table
CREATE TABLE public.private_invitation_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.private_invitations(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  guest_email TEXT,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  rsvp_status TEXT NOT NULL DEFAULT 'pending',
  companions_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  invite_sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.private_invitation_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners manage own invitation guests"
  ON public.private_invitation_guests FOR ALL TO authenticated
  USING (invitation_id IN (
    SELECT pi.id FROM public.private_invitations pi
    JOIN public.organizations o ON o.id = pi.organization_id
    WHERE o.owner_id = auth.uid()
  ))
  WITH CHECK (invitation_id IN (
    SELECT pi.id FROM public.private_invitations pi
    JOIN public.organizations o ON o.id = pi.organization_id
    WHERE o.owner_id = auth.uid()
  ));

CREATE POLICY "Super admins manage all invitation guests"
  ON public.private_invitation_guests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Public view guest by token"
  ON public.private_invitation_guests FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Public confirm rsvp"
  ON public.private_invitation_guests FOR UPDATE TO anon, authenticated
  USING (rsvp_status IN ('pending', 'invited'))
  WITH CHECK (rsvp_status IN ('confirmed', 'declined'));

CREATE TRIGGER update_private_invitation_guests_updated_at
  BEFORE UPDATE ON public.private_invitation_guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pig_invitation ON public.private_invitation_guests(invitation_id);
CREATE INDEX idx_pi_org ON public.private_invitations(organization_id);
