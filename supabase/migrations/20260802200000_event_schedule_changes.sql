-- نظام إلغاء / إعادة جدولة الفعاليات:
-- سجل كامل بالتعديلات + دوال SECURITY DEFINER تنفّذ العملية وتُشعر جميع المسجلين تلقائياً.

CREATE TABLE IF NOT EXISTS public.event_schedule_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('cancelled', 'rescheduled')),
  reason text,
  old_start_date timestamptz,
  new_start_date timestamptz,
  notified_count integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_schedule_changes ENABLE ROW LEVEL SECURITY;

-- القراءة: منظم الفعالية أو الإدارة — والكتابة عبر الدوال أدناه فقط (لا توجد سياسة INSERT)
DROP POLICY IF EXISTS "Organizer and admin view schedule log" ON public.event_schedule_changes;
CREATE POLICY "Organizer and admin view schedule log" ON public.event_schedule_changes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizations o ON o.id = e.organization_id
      WHERE e.id = event_schedule_changes.event_id AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role = 'super_admin'
    )
  );

-- إلغاء الفعالية: تحديث الحالة + رسالة اعتذار رسمية لكل المسجلين + تسجيل بالسجل
CREATE OR REPLACE FUNCTION public.cancel_event(p_event_id uuid, p_reason text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_event record;
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_count integer := 0;
BEGIN
  SELECT e.id, e.title_ar, e.start_date, e.status, o.owner_id
    INTO v_event
    FROM events e JOIN organizations o ON o.id = e.organization_id
   WHERE e.id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'EVENT_NOT_FOUND'; END IF;

  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid AND role = 'super_admin') INTO v_is_admin;
  IF v_uid IS NULL OR (v_event.owner_id <> v_uid AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF v_event.status = 'cancelled' THEN RAISE EXCEPTION 'ALREADY_CANCELLED'; END IF;

  UPDATE events SET status = 'cancelled', updated_at = now() WHERE id = p_event_id;

  INSERT INTO in_app_notifications (user_id, title, body, link)
  SELECT DISTINCT r.attendee_id,
    'اعتذار — تم إلغاء فعالية: ' || v_event.title_ar,
    'نأسف لإبلاغكم بإلغاء فعالية "' || v_event.title_ar || '" التي كانت مقررة بتاريخ '
      || to_char(v_event.start_date AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD')
      || CASE WHEN p_reason IS NOT NULL AND length(trim(p_reason)) > 0
              THEN '. سبب الإلغاء: ' || trim(p_reason) ELSE '' END
      || '. نعتذر بصدق عن أي إزعاج، ونتطلع لاستضافتكم في فعالياتنا القادمة.',
    '/my-tickets'
  FROM registrations r
  WHERE r.event_id = p_event_id AND r.status <> 'cancelled';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO event_schedule_changes (event_id, action, reason, old_start_date, notified_count, created_by)
  VALUES (p_event_id, 'cancelled', NULLIF(trim(coalesce(p_reason, '')), ''), v_event.start_date, v_count, v_uid);

  RETURN v_count;
END;
$$;

-- إعادة الجدولة: موعد جديد + إزاحة تاريخ النهاية بنفس الفارق + إشعار بالموعد الجديد + تسجيل بالسجل
CREATE OR REPLACE FUNCTION public.reschedule_event(p_event_id uuid, p_new_start timestamptz, p_reason text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_event record;
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_count integer := 0;
BEGIN
  SELECT e.id, e.title_ar, e.start_date, e.end_date, e.status, o.owner_id
    INTO v_event
    FROM events e JOIN organizations o ON o.id = e.organization_id
   WHERE e.id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'EVENT_NOT_FOUND'; END IF;

  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid AND role = 'super_admin') INTO v_is_admin;
  IF v_uid IS NULL OR (v_event.owner_id <> v_uid AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF p_new_start IS NULL THEN RAISE EXCEPTION 'NEW_DATE_REQUIRED'; END IF;

  UPDATE events
     SET start_date = p_new_start,
         end_date = CASE WHEN end_date IS NOT NULL THEN end_date + (p_new_start - v_event.start_date) ELSE end_date END,
         -- فعالية ملغاة يُعاد جدولتها ترجع منشورة
         status = CASE WHEN status = 'cancelled' THEN 'published'::event_status ELSE status END,
         updated_at = now()
   WHERE id = p_event_id;

  INSERT INTO in_app_notifications (user_id, title, body, link)
  SELECT DISTINCT r.attendee_id,
    'تغيير موعد فعالية: ' || v_event.title_ar,
    'نحيطكم علماً بأن فعالية "' || v_event.title_ar || '" تم تأجيلها. الموعد الجديد: '
      || to_char(p_new_start AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD') || ' الساعة '
      || to_char(p_new_start AT TIME ZONE 'Asia/Riyadh', 'HH24:MI')
      || CASE WHEN p_reason IS NOT NULL AND length(trim(p_reason)) > 0
              THEN '. السبب: ' || trim(p_reason) ELSE '' END
      || '. تذكرتكم الحالية تبقى صالحة وتم تحديث موعدها تلقائياً.',
    '/my-tickets'
  FROM registrations r
  WHERE r.event_id = p_event_id AND r.status <> 'cancelled';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO event_schedule_changes (event_id, action, reason, old_start_date, new_start_date, notified_count, created_by)
  VALUES (p_event_id, 'rescheduled', NULLIF(trim(coalesce(p_reason, '')), ''), v_event.start_date, p_new_start, v_count, v_uid);

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_event(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_event(uuid, timestamptz, text) TO authenticated;
