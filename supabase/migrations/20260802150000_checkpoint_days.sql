-- إصلاح منطق بوابات الأيام: علاقة متعدد-لمتعدد.
-- البوابة الواحدة يمكن أن تخدم عدة أيام، وكل يوم يختار بواباته باستقلال
-- دون أن تختفي البوابة لمجرد استخدامها في يوم آخر.
-- البوابة بلا أي ربط = عامة تعمل في كل الأيام.

CREATE TABLE IF NOT EXISTS public.checkpoint_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id UUID NOT NULL REFERENCES public.checkpoints(id) ON DELETE CASCADE,
  event_day_id UUID NOT NULL REFERENCES public.event_days(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (checkpoint_id, event_day_id)
);

ALTER TABLE public.checkpoint_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own checkpoint days"
  ON public.checkpoint_days FOR ALL TO authenticated
  USING (checkpoint_id IN (
    SELECT c.id FROM public.checkpoints c
    JOIN public.events e ON e.id = c.event_id
    JOIN public.organizations o ON o.id = e.organization_id
    WHERE o.owner_id = auth.uid()
  ))
  WITH CHECK (checkpoint_id IN (
    SELECT c.id FROM public.checkpoints c
    JOIN public.events e ON e.id = c.event_id
    JOIN public.organizations o ON o.id = e.organization_id
    WHERE o.owner_id = auth.uid()
  ));

CREATE POLICY "Team members view checkpoint days"
  ON public.checkpoint_days FOR SELECT TO authenticated
  USING (checkpoint_id IN (
    SELECT c.id FROM public.checkpoints c
    JOIN public.events e ON e.id = c.event_id
    WHERE e.organization_id IN (SELECT organization_id FROM public.team_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "Assigned staff view own checkpoint days"
  ON public.checkpoint_days FOR SELECT TO authenticated
  USING (checkpoint_id IN (SELECT id FROM public.checkpoints WHERE assigned_user_id = auth.uid()));

CREATE POLICY "Super admins manage all checkpoint days"
  ON public.checkpoint_days FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ترحيل الربط الأحادي القديم إن وجد
INSERT INTO public.checkpoint_days (checkpoint_id, event_day_id)
SELECT id, event_day_id FROM public.checkpoints
WHERE event_day_id IS NOT NULL
ON CONFLICT (checkpoint_id, event_day_id) DO NOTHING;
