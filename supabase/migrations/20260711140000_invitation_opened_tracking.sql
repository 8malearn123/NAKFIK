-- تتبع فتح الدعوة: ختم وقت أول فتح لصفحة الدعوة من قبل المدعو

ALTER TABLE public.private_invitation_guests
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

-- دالة آمنة تُستدعى من صفحة الدعوة العامة لتسجيل أول فتح فقط
CREATE OR REPLACE FUNCTION public.mark_invitation_opened(_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _token IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.private_invitation_guests
  SET opened_at = now(), updated_at = now()
  WHERE token = _token AND opened_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_invitation_opened(uuid) TO anon, authenticated;
