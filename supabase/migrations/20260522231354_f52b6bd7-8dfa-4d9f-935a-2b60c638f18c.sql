
-- Guest contact lists (reusable databases)
CREATE TABLE public.guest_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.guest_list_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.guest_lists(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_phone text,
  guest_email text,
  tags text[] DEFAULT '{}'::text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_guest_list_contacts_list ON public.guest_list_contacts(list_id);
CREATE INDEX idx_guest_lists_org ON public.guest_lists(organization_id);

ALTER TABLE public.guest_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_list_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners manage own lists" ON public.guest_lists
FOR ALL TO authenticated
USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()))
WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Super admins manage all guest_lists" ON public.guest_lists
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org owners manage own list contacts" ON public.guest_list_contacts
FOR ALL TO authenticated
USING (list_id IN (
  SELECT gl.id FROM public.guest_lists gl
  JOIN public.organizations o ON o.id = gl.organization_id
  WHERE o.owner_id = auth.uid()
))
WITH CHECK (list_id IN (
  SELECT gl.id FROM public.guest_lists gl
  JOIN public.organizations o ON o.id = gl.organization_id
  WHERE o.owner_id = auth.uid()
));

CREATE POLICY "Super admins manage all guest_list_contacts" ON public.guest_list_contacts
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_guest_lists_updated_at
BEFORE UPDATE ON public.guest_lists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Import a list's contacts into a private invitation as guests
CREATE OR REPLACE FUNCTION public.import_list_to_invitation(_list_id uuid, _invitation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _list_org uuid;
  _inserted integer := 0;
BEGIN
  SELECT organization_id INTO _org_id FROM private_invitations WHERE id = _invitation_id;
  SELECT organization_id INTO _list_org FROM guest_lists WHERE id = _list_id;

  IF _org_id IS NULL OR _list_org IS NULL OR _org_id <> _list_org THEN
    RAISE EXCEPTION 'Invitation and list must belong to same organization';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM organizations WHERE id = _org_id AND owner_id = auth.uid()
  ) AND NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH inserted AS (
    INSERT INTO private_invitation_guests (invitation_id, guest_name, guest_phone, guest_email)
    SELECT _invitation_id, c.guest_name, c.guest_phone, c.guest_email
    FROM guest_list_contacts c
    WHERE c.list_id = _list_id
      AND NOT EXISTS (
        SELECT 1 FROM private_invitation_guests g
        WHERE g.invitation_id = _invitation_id
          AND ((g.guest_phone IS NOT NULL AND g.guest_phone = c.guest_phone)
               OR (g.guest_email IS NOT NULL AND g.guest_email = c.guest_email)
               OR (g.guest_name = c.guest_name AND c.guest_phone IS NULL AND c.guest_email IS NULL))
      )
    RETURNING 1
  )
  SELECT count(*) INTO _inserted FROM inserted;

  RETURN _inserted;
END;
$$;
