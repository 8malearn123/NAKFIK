-- السماح للحاضر بإلغاء تذكرته (حذف تسجيله) بنفسه
-- الشرط: لم يُسجَّل حضوره بعد (لا إلغاء بعد الدخول للفعالية).
-- حذف التسجيل يفعّل تلقائياً محفز تحرير المقعد: إنقاص عداد الحضور
-- وعداد التذاكر المباعة وإخطار أول شخص في قائمة الانتظار.

DROP POLICY IF EXISTS "Attendees cancel own registrations" ON public.registrations;
CREATE POLICY "Attendees cancel own registrations"
  ON public.registrations FOR DELETE TO authenticated
  USING (attendee_id = auth.uid() AND checked_in_at IS NULL);
