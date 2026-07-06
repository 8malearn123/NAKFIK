-- Event invitation settings
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS invite_channels text[] NOT NULL DEFAULT ARRAY['whatsapp']::text[],
  ADD COLUMN IF NOT EXISTS invite_send_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS invite_message_template text;

-- Validation trigger for invite_send_mode
CREATE OR REPLACE FUNCTION public.validate_invite_send_mode()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_send_mode NOT IN ('auto', 'manual') THEN
    RAISE EXCEPTION 'invite_send_mode must be auto or manual';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_invite_send_mode ON public.events;
CREATE TRIGGER trg_validate_invite_send_mode
  BEFORE INSERT OR UPDATE OF invite_send_mode ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.validate_invite_send_mode();

-- Event guest extras
ALTER TABLE public.event_guests
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS invite_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS invite_sent_channels text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS invite_send_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS invite_send_error text;