-- ============================================================
-- 1) checkpoints
-- ============================================================
CREATE TABLE IF NOT EXISTS public.checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  checkpoint_type text NOT NULL DEFAULT 'entry',
  capacity integer DEFAULT 0,
  color text NOT NULL DEFAULT '492C5A',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_checkpoint_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.checkpoint_type NOT IN ('entry','exit','session','section') THEN
    RAISE EXCEPTION 'checkpoint_type must be one of entry/exit/session/section';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_checkpoint_type ON public.checkpoints;
CREATE TRIGGER trg_validate_checkpoint_type
  BEFORE INSERT OR UPDATE OF checkpoint_type ON public.checkpoints
  FOR EACH ROW EXECUTE FUNCTION public.validate_checkpoint_type();

CREATE INDEX IF NOT EXISTS idx_checkpoints_event ON public.checkpoints(event_id);

ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own checkpoints" ON public.checkpoints FOR ALL TO authenticated
  USING (event_id IN (SELECT e.id FROM public.events e JOIN public.organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()))
  WITH CHECK (event_id IN (SELECT e.id FROM public.events e JOIN public.organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()));

CREATE POLICY "Team members view checkpoints" ON public.checkpoints FOR SELECT TO authenticated
  USING (event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.team_members tm ON tm.organization_id = e.organization_id
    WHERE tm.user_id = auth.uid()
  ));

CREATE POLICY "Super admins manage all checkpoints" ON public.checkpoints FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_checkpoints_updated_at BEFORE UPDATE ON public.checkpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2) scan_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.registrations(id) ON DELETE SET NULL,
  attendee_id uuid,
  checkpoint_id uuid REFERENCES public.checkpoints(id) ON DELETE SET NULL,
  scanned_by uuid,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  scan_type text NOT NULL DEFAULT 'entry'
);

CREATE OR REPLACE FUNCTION public.validate_scan_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.scan_type NOT IN ('entry','exit','session','section') THEN
    RAISE EXCEPTION 'scan_type must be one of entry/exit/session/section';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_scan_type ON public.scan_events;
CREATE TRIGGER trg_validate_scan_type
  BEFORE INSERT OR UPDATE OF scan_type ON public.scan_events
  FOR EACH ROW EXECUTE FUNCTION public.validate_scan_type();

CREATE INDEX IF NOT EXISTS idx_scan_events_event_time ON public.scan_events(event_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_events_checkpoint_time ON public.scan_events(checkpoint_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_events_registration ON public.scan_events(registration_id);

ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own scans" ON public.scan_events FOR ALL TO authenticated
  USING (event_id IN (SELECT e.id FROM public.events e JOIN public.organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()))
  WITH CHECK (event_id IN (SELECT e.id FROM public.events e JOIN public.organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()));

CREATE POLICY "Team members log scans" ON public.scan_events FOR INSERT TO authenticated
  WITH CHECK (event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.team_members tm ON tm.organization_id = e.organization_id
    WHERE tm.user_id = auth.uid()
  ));

CREATE POLICY "Team members view scans" ON public.scan_events FOR SELECT TO authenticated
  USING (event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.team_members tm ON tm.organization_id = e.organization_id
    WHERE tm.user_id = auth.uid()
  ));

CREATE POLICY "Super admins manage all scans" ON public.scan_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_events;
ALTER TABLE public.scan_events REPLICA IDENTITY FULL;

-- ============================================================
-- 3) checkpoint_hourly_stats
-- ============================================================
CREATE TABLE IF NOT EXISTS public.checkpoint_hourly_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  checkpoint_id uuid NOT NULL REFERENCES public.checkpoints(id) ON DELETE CASCADE,
  hour_bucket timestamptz NOT NULL,
  scan_count integer NOT NULL DEFAULT 0,
  unique_attendees integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(checkpoint_id, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_hourly_stats_event ON public.checkpoint_hourly_stats(event_id, hour_bucket DESC);

ALTER TABLE public.checkpoint_hourly_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers view own hourly stats" ON public.checkpoint_hourly_stats FOR SELECT TO authenticated
  USING (event_id IN (SELECT e.id FROM public.events e JOIN public.organizations o ON e.organization_id = o.id WHERE o.owner_id = auth.uid()));

CREATE POLICY "Team members view hourly stats" ON public.checkpoint_hourly_stats FOR SELECT TO authenticated
  USING (event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.team_members tm ON tm.organization_id = e.organization_id
    WHERE tm.user_id = auth.uid()
  ));

CREATE POLICY "Super admins manage all hourly stats" ON public.checkpoint_hourly_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));