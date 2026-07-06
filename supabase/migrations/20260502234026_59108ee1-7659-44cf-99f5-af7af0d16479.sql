CREATE TABLE IF NOT EXISTS public.admin_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  email text,
  phone text,
  permissions text[] NOT NULL DEFAULT '{}',
  invite_status text NOT NULL DEFAULT 'pending',
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage admin_team_members"
  ON public.admin_team_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Members view own row"
  ON public.admin_team_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_admin_team_updated_at
  BEFORE UPDATE ON public.admin_team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();