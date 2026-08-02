-- الفعاليات متعددة الأيام:
-- أيام مستقلة داخل الفعالية الواحدة، لكل يوم فريقه وبواباته وتجهيزاته،
-- وتُوسم كل عملية مسح باليوم لتقارير حضور يومية.

CREATE TABLE IF NOT EXISTS public.event_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  day_date DATE NOT NULL,
  title TEXT,
  notes TEXT, -- التجهيزات اليومية (قاعات، تموين، ملاحظات التشغيل...)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, day_number)
);

ALTER TABLE public.event_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own event days"
  ON public.event_days FOR ALL TO authenticated
  USING (event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.organizations o ON o.id = e.organization_id
    WHERE o.owner_id = auth.uid()
  ))
  WITH CHECK (event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.organizations o ON o.id = e.organization_id
    WHERE o.owner_id = auth.uid()
  ));

CREATE POLICY "Team members view event days"
  ON public.event_days FOR SELECT TO authenticated
  USING (event_id IN (
    SELECT e.id FROM public.events e
    WHERE e.organization_id IN (SELECT organization_id FROM public.team_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "Super admins manage all event days"
  ON public.event_days FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- فريق كل يوم (بوابات / منظمون / مشرفون) — دون إعادة إنشاء الفعالية
CREATE TABLE IF NOT EXISTS public.event_day_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_day_id UUID NOT NULL REFERENCES public.event_days(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'gate_staff'
    CHECK (role IN ('gate_staff', 'organizer', 'supervisor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_day_id, user_id)
);

ALTER TABLE public.event_day_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own day staff"
  ON public.event_day_staff FOR ALL TO authenticated
  USING (event_day_id IN (
    SELECT d.id FROM public.event_days d
    JOIN public.events e ON e.id = d.event_id
    JOIN public.organizations o ON o.id = e.organization_id
    WHERE o.owner_id = auth.uid()
  ))
  WITH CHECK (event_day_id IN (
    SELECT d.id FROM public.event_days d
    JOIN public.events e ON e.id = d.event_id
    JOIN public.organizations o ON o.id = e.organization_id
    WHERE o.owner_id = auth.uid()
  ));

CREATE POLICY "Staff view own day assignments"
  ON public.event_day_staff FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins manage all day staff"
  ON public.event_day_staff FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ربط البوابات وعمليات المسح باليوم
ALTER TABLE public.checkpoints
  ADD COLUMN IF NOT EXISTS event_day_id UUID REFERENCES public.event_days(id) ON DELETE SET NULL;

ALTER TABLE public.scan_events
  ADD COLUMN IF NOT EXISTS event_day_id UUID REFERENCES public.event_days(id) ON DELETE SET NULL;
