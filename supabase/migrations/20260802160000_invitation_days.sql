-- الدعوات الخاصة متعددة الأيام:
-- أيام داخل المناسبة الواحدة + سجل مسح للضيوف (دخول/خروج) موسوم باليوم،
-- فيصير حضور كل يوم مستقلاً مع بقاء كل شيء تحت نفس الدعوة.

CREATE TABLE IF NOT EXISTS public.invitation_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.private_invitations(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  day_date DATE NOT NULL,
  title TEXT,
  notes TEXT, -- التجهيزات اليومية
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invitation_id, day_number)
);

ALTER TABLE public.invitation_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own invitation days"
  ON public.invitation_days FOR ALL TO authenticated
  USING (invitation_id IN (
    SELECT i.id FROM public.private_invitations i
    JOIN public.organizations o ON o.id = i.organization_id
    WHERE o.owner_id = auth.uid()
  ))
  WITH CHECK (invitation_id IN (
    SELECT i.id FROM public.private_invitations i
    JOIN public.organizations o ON o.id = i.organization_id
    WHERE o.owner_id = auth.uid()
  ));

CREATE POLICY "Super admins manage all invitation days"
  ON public.invitation_days FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- سجل مسح ضيوف الدعوة — كل دخول/خروج بيومه
CREATE TABLE IF NOT EXISTS public.invitation_guest_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.private_invitations(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.private_invitation_guests(id) ON DELETE CASCADE,
  day_id UUID REFERENCES public.invitation_days(id) ON DELETE SET NULL,
  scan_type TEXT NOT NULL DEFAULT 'entry' CHECK (scan_type IN ('entry', 'exit')),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scanned_by UUID
);

ALTER TABLE public.invitation_guest_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own guest scans"
  ON public.invitation_guest_scans FOR ALL TO authenticated
  USING (invitation_id IN (
    SELECT i.id FROM public.private_invitations i
    JOIN public.organizations o ON o.id = i.organization_id
    WHERE o.owner_id = auth.uid()
  ))
  WITH CHECK (invitation_id IN (
    SELECT i.id FROM public.private_invitations i
    JOIN public.organizations o ON o.id = i.organization_id
    WHERE o.owner_id = auth.uid()
  ));

CREATE POLICY "Super admins manage all guest scans"
  ON public.invitation_guest_scans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_inv_guest_scans_guest ON public.invitation_guest_scans(guest_id);
CREATE INDEX IF NOT EXISTS idx_inv_guest_scans_inv ON public.invitation_guest_scans(invitation_id);
