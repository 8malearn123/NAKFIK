-- إهداء تذكرة لشخص ليس لديه حساب في نكفيك
-- بعد الدفع تُحفظ الهدية هنا «معلّقة» برابط استلام سري يُرسل لجوال المستلم.
-- عند فتح الرابط وتسجيل الدخول/إنشاء حساب يستلمها فتُصدر التذكرة باسمه.
-- الإنشاء يتم حصراً من دالة الخادم (verify-payment) بمفتاح service_role.

CREATE TABLE IF NOT EXISTS public.ticket_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  provider_payment_id TEXT UNIQUE NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  message TEXT,
  claim_token TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'cancelled')),
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers view own gifts"
  ON public.ticket_gifts FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Super admins view all gifts"
  ON public.ticket_gifts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_ticket_gifts_buyer ON public.ticket_gifts(buyer_id);

-- عرض الهدية في صفحة الاستلام — صاحب الرابط فقط، بدون كشف جوال المستلم
CREATE OR REPLACE FUNCTION public.get_ticket_gift(_token TEXT)
RETURNS TABLE (
  status TEXT,
  recipient_name TEXT,
  buyer_name TEXT,
  message TEXT,
  event_id UUID,
  event_title_ar TEXT,
  event_title_en TEXT,
  event_start TIMESTAMPTZ,
  venue_name TEXT,
  ticket_name_ar TEXT,
  ticket_name_en TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.status,
         g.recipient_name,
         split_part(coalesce(nullif(btrim(p.full_name), ''), ''), ' ', 1),
         g.message,
         e.id, e.title_ar, e.title_en, e.start_date, e.venue_name,
         t.name_ar, t.name_en
    FROM public.ticket_gifts g
    JOIN public.events e ON e.id = g.event_id
    LEFT JOIN public.tickets t ON t.id = g.ticket_id
    LEFT JOIN public.profiles p ON p.id = g.buyer_id
   WHERE length(coalesce(_token, '')) >= 16
     AND g.claim_token = _token;
$$;

REVOKE ALL ON FUNCTION public.get_ticket_gift(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ticket_gift(TEXT) TO anon, authenticated;

-- استلام الهدية: تُصدر التذكرة باسم المستخدم الحالي مرة واحدة فقط
CREATE OR REPLACE FUNCTION public.claim_ticket_gift(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _gift public.ticket_gifts%ROWTYPE;
  _reg_id UUID;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT * INTO _gift FROM public.ticket_gifts
   WHERE claim_token = _token
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;
  IF _gift.status = 'claimed' THEN
    RETURN jsonb_build_object('error', CASE WHEN _gift.claimed_by = _uid THEN 'already_yours' ELSE 'already_claimed' END);
  END IF;
  IF _gift.status <> 'pending' THEN
    RETURN jsonb_build_object('error', 'cancelled');
  END IF;
  IF _gift.buyer_id = _uid THEN
    RETURN jsonb_build_object('error', 'own_gift');
  END IF;
  IF EXISTS (SELECT 1 FROM public.registrations
              WHERE event_id = _gift.event_id AND attendee_id = _uid) THEN
    RETURN jsonb_build_object('error', 'already_registered');
  END IF;

  INSERT INTO public.registrations (event_id, attendee_id, ticket_id, status, payment_status, amount_paid)
  VALUES (_gift.event_id, _uid, _gift.ticket_id, 'confirmed', 'paid', _gift.amount_paid)
  RETURNING id INTO _reg_id;

  UPDATE public.ticket_gifts
     SET status = 'claimed', claimed_by = _uid, claimed_at = now(), registration_id = _reg_id
   WHERE id = _gift.id;

  UPDATE public.payments
     SET registration_id = _reg_id, updated_at = now()
   WHERE provider_payment_id = _gift.provider_payment_id;

  INSERT INTO public.in_app_notifications (user_id, title, body, link)
  VALUES (_gift.buyer_id, 'تم استلام هديتك 🎁',
          _gift.recipient_name || ' استلم التذكرة التي أهديتها له.', '/my-tickets');

  RETURN jsonb_build_object('status', 'claimed', 'event_id', _gift.event_id);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ticket_gift(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_ticket_gift(TEXT) TO authenticated;
