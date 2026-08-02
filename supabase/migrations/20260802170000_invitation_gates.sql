-- بوابات الدعوات الخاصة (للمناسبات الكبيرة التي تحتاج دخولاً وخروجاً منظمين)
-- تُدار من داخل نافذة "الأيام" حتى لا تزدحم واجهة الدعوات البسيطة.
-- البوابة يمكن إسنادها لعدة أيام (متعدد-لمتعدد) — وغير المسندة تعمل كل الأيام.

CREATE TABLE IF NOT EXISTS public.invitation_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.private_invitations(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  gate_type TEXT NOT NULL DEFAULT 'entry' CHECK (gate_type IN ('entry', 'exit')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invitation_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own invitation gates"
  ON public.invitation_gates FOR ALL TO authenticated
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

CREATE POLICY "Super admins manage all invitation gates"
  ON public.invitation_gates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ربط البوابة بالأيام التي تخدمها
CREATE TABLE IF NOT EXISTS public.invitation_gate_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id UUID NOT NULL REFERENCES public.invitation_gates(id) ON DELETE CASCADE,
  day_id UUID NOT NULL REFERENCES public.invitation_days(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gate_id, day_id)
);

ALTER TABLE public.invitation_gate_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own invitation gate days"
  ON public.invitation_gate_days FOR ALL TO authenticated
  USING (gate_id IN (
    SELECT g.id FROM public.invitation_gates g
    JOIN public.private_invitations i ON i.id = g.invitation_id
    JOIN public.organizations o ON o.id = i.organization_id
    WHERE o.owner_id = auth.uid()
  ))
  WITH CHECK (gate_id IN (
    SELECT g.id FROM public.invitation_gates g
    JOIN public.private_invitations i ON i.id = g.invitation_id
    JOIN public.organizations o ON o.id = i.organization_id
    WHERE o.owner_id = auth.uid()
  ));

CREATE POLICY "Super admins manage all invitation gate days"
  ON public.invitation_gate_days FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- وسم مسحات الضيوف بالبوابة
ALTER TABLE public.invitation_guest_scans
  ADD COLUMN IF NOT EXISTS gate_id UUID REFERENCES public.invitation_gates(id) ON DELETE SET NULL;
