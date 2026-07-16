-- إضافة خيار "ربما" لتأكيد حضور الدعوات الخاصة
-- تحديث دالة الرد لتقبل الحالات الثلاث: confirmed / maybe / declined

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

  IF _status NOT IN ('confirmed', 'declined', 'maybe') THEN
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

  -- المرافقون فقط عند تأكيد الحضور، وبحد الدعوة الأقصى
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
