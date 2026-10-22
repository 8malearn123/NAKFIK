-- إهداء تذكرة لشخص آخر عند الشراء
-- البحث عن حساب المستلم بالبريد أو رقم الجوال قبل الدفع. لا تكشف الدالة
-- أي بيانات حساسة: فقط معرّف الحساب والاسم الأول، وهل لديه تسجيل مسبق
-- في نفس الفعالية (حتى لا يدفع المشتري لتذكرة لا يمكن إصدارها).

CREATE OR REPLACE FUNCTION public.find_gift_recipient(_identifier TEXT, _event_id UUID)
RETURNS TABLE (recipient_id UUID, first_name TEXT, already_registered BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id TEXT := btrim(coalesce(_identifier, ''));
  _digits TEXT := regexp_replace(_id, '\D', '', 'g');
BEGIN
  IF auth.uid() IS NULL OR length(_id) < 5 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id,
         split_part(coalesce(nullif(btrim(p.full_name), ''), '—'), ' ', 1),
         EXISTS (
           SELECT 1 FROM public.registrations r
            WHERE r.event_id = _event_id AND r.attendee_id = p.id
         )
    FROM public.profiles p
   WHERE p.id <> auth.uid()
     AND (
       (position('@' IN _id) > 0 AND lower(p.email) = lower(_id))
       OR (
         position('@' IN _id) = 0
         AND length(_digits) >= 9
         -- مطابقة آخر 9 أرقام لتوحيد 05xxxxxxxx و 9665xxxxxxxx
         AND right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 9) = right(_digits, 9)
       )
     )
   LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_gift_recipient(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_gift_recipient(TEXT, UUID) TO authenticated;
