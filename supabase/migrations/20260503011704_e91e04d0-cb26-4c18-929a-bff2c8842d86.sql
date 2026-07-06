
CREATE OR REPLACE FUNCTION public.populate_guest_companions_allowed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _allow boolean;
  _max integer;
BEGIN
  IF NEW.parent_guest_id IS NOT NULL THEN
    -- companion guest: 0 sub-companions
    NEW.companions_allowed := 0;
    RETURN NEW;
  END IF;

  IF NEW.ticket_id IS NOT NULL THEN
    SELECT allow_companions, max_companions
    INTO _allow, _max
    FROM public.tickets
    WHERE id = NEW.ticket_id;
    IF _allow THEN
      NEW.companions_allowed := COALESCE(_max, 0);
    ELSE
      NEW.companions_allowed := 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_populate_guest_companions ON public.event_guests;
CREATE TRIGGER trg_populate_guest_companions
BEFORE INSERT ON public.event_guests
FOR EACH ROW EXECUTE FUNCTION public.populate_guest_companions_allowed();

-- Increment parent's companions_used when companion is inserted
CREATE OR REPLACE FUNCTION public.bump_parent_companions_used()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_guest_id IS NOT NULL THEN
    UPDATE public.event_guests
    SET companions_used = companions_used + 1
    WHERE id = NEW.parent_guest_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_parent_companions ON public.event_guests;
CREATE TRIGGER trg_bump_parent_companions
AFTER INSERT ON public.event_guests
FOR EACH ROW EXECUTE FUNCTION public.bump_parent_companions_used();
