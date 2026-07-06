-- 1) Drop overly permissive public policies
DROP POLICY IF EXISTS "Public view guest by token" ON public.private_invitation_guests;
DROP POLICY IF EXISTS "Public confirm rsvp" ON public.private_invitation_guests;
DROP POLICY IF EXISTS "Public view active invitations" ON public.private_invitations;

-- 2) Secure RPC: fetch one guest + its invitation by token only
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _guest public.private_invitation_guests%ROWTYPE;
  _inv   public.private_invitations%ROWTYPE;
BEGIN
  IF _token IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _guest
  FROM public.private_invitation_guests
  WHERE token = _token
  LIMIT 1;

  IF _guest.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _inv
  FROM public.private_invitations
  WHERE id = _guest.invitation_id
  LIMIT 1;

  -- Don't expose closed/deleted invitations
  IF _inv.id IS NULL OR _inv.status = 'closed' THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'guest', jsonb_build_object(
      'id', _guest.id,
      'invitation_id', _guest.invitation_id,
      'guest_name', _guest.guest_name,
      'rsvp_status', _guest.rsvp_status,
      'companions_count', _guest.companions_count,
      'confirmed_at', _guest.confirmed_at,
      'checked_in_at', _guest.checked_in_at,
      'token', _guest.token
    ),
    'invitation', jsonb_build_object(
      'id', _inv.id,
      'title', _inv.title,
      'host_name', _inv.host_name,
      'event_date', _inv.event_date,
      'venue_name', _inv.venue_name,
      'venue_address', _inv.venue_address,
      'venue_map_url', _inv.venue_map_url,
      'dress_code', _inv.dress_code,
      'contact_phone', _inv.contact_phone,
      'contact_whatsapp', _inv.contact_whatsapp,
      'contact_email', _inv.contact_email,
      'gift_notes', _inv.gift_notes,
      'gift_iban', _inv.gift_iban,
      'gift_bank_name', _inv.gift_bank_name,
      'gift_account_holder', _inv.gift_account_holder,
      'allow_companions', _inv.allow_companions,
      'max_companions', _inv.max_companions,
      'theme_color', _inv.theme_color,
      'accent_color', _inv.accent_color,
      'font_family', _inv.font_family,
      'cover_image_url', _inv.cover_image_url,
      'background_image_url', _inv.background_image_url,
      'custom_message', _inv.custom_message,
      'category', _inv.category,
      'formality', _inv.formality,
      'status', _inv.status
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(uuid) TO anon, authenticated;

-- 3) Secure RPC: confirm or decline RSVP using token only
CREATE OR REPLACE FUNCTION public.confirm_invitation_rsvp(
  _token uuid,
  _status text,
  _companions integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _guest public.private_invitation_guests%ROWTYPE;
  _inv   public.private_invitations%ROWTYPE;
  _final_comp integer;
BEGIN
  IF _token IS NULL THEN
    RAISE EXCEPTION 'INVALID_TOKEN';
  END IF;

  IF _status NOT IN ('confirmed', 'declined') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT * INTO _guest
  FROM public.private_invitation_guests
  WHERE token = _token
  LIMIT 1;

  IF _guest.id IS NULL THEN
    RAISE EXCEPTION 'GUEST_NOT_FOUND';
  END IF;

  SELECT * INTO _inv
  FROM public.private_invitations
  WHERE id = _guest.invitation_id
  LIMIT 1;

  IF _inv.id IS NULL OR _inv.status = 'closed' THEN
    RAISE EXCEPTION 'INVITATION_CLOSED';
  END IF;

  -- Cap companions to invitation max, only if confirming
  IF _status = 'confirmed' AND _inv.allow_companions THEN
    _final_comp := GREATEST(0, LEAST(COALESCE(_companions, 0), COALESCE(_inv.max_companions, 0)));
  ELSE
    _final_comp := 0;
  END IF;

  UPDATE public.private_invitation_guests
  SET rsvp_status = _status,
      companions_count = _final_comp,
      confirmed_at = now(),
      updated_at = now()
  WHERE id = _guest.id;

  RETURN jsonb_build_object(
    'ok', true,
    'rsvp_status', _status,
    'companions_count', _final_comp
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_invitation_rsvp(uuid, text, integer) TO anon, authenticated;