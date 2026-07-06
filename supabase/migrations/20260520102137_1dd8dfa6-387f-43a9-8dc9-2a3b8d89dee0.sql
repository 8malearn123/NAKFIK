ALTER TABLE public.private_invitations
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS max_attendees integer;

CREATE OR REPLACE FUNCTION public.validate_invitation_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.scope NOT IN ('public','private') THEN
    RAISE EXCEPTION 'scope must be public or private';
  END IF;
  IF NEW.max_attendees IS NOT NULL AND NEW.max_attendees < 0 THEN
    RAISE EXCEPTION 'max_attendees must be >= 0';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_invitation_scope ON public.private_invitations;
CREATE TRIGGER trg_validate_invitation_scope
BEFORE INSERT OR UPDATE ON public.private_invitations
FOR EACH ROW EXECUTE FUNCTION public.validate_invitation_scope();