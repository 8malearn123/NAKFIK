-- نظام تذكيرات فعلي للدعوات الخاصة:
-- عند ضبط "تذكير المستفيد قبل الموعد" تُجدول صفوف تذكير حقيقية لكل مدعو
-- (scheduled)، ويعالجها مشغّل pg_cron كل 5 دقائق عند حلول وقتها:
--   * مدعو له حساب مسجل بنفس البريد/الجوال → إشعار داخل المنصة → sent
--   * مدعو بلا حساب → failed مع سبب واضح (يتطلب ربط تكامل بريد/واتساب)
-- الحالات: scheduled / sent / failed / cancelled

-- ضمان وجود عمود التذكير حتى لو لم يُنفذ الملف السابق
ALTER TABLE public.private_invitations
  ADD COLUMN IF NOT EXISTS reminder_hours_before integer
    CHECK (reminder_hours_before IS NULL OR (reminder_hours_before BETWEEN 1 AND 12));

CREATE TABLE IF NOT EXISTS public.invitation_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES public.private_invitations(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.private_invitation_guests(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitation_reminders_due
  ON public.invitation_reminders (status, scheduled_at);

ALTER TABLE public.invitation_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org owner views invitation reminders" ON public.invitation_reminders;
CREATE POLICY "Org owner views invitation reminders" ON public.invitation_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.private_invitations i
      JOIN public.organizations o ON o.id = i.organization_id
      WHERE i.id = invitation_reminders.invitation_id AND o.owner_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'super_admin')
  );

-- (إعادة) جدولة تذكيرات دعوة: تحذف المجدول المستقبلي وتنشئ صفاً لكل مدعو
CREATE OR REPLACE FUNCTION public.schedule_invitation_reminders(p_invitation_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inv record;
  v_at timestamptz;
  v_count integer := 0;
BEGIN
  SELECT id, event_date, reminder_hours_before, status INTO v_inv
  FROM private_invitations WHERE id = p_invitation_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- امسح المجدول غير المرسل لهذه الدعوة (سيُعاد إنشاؤه إن لزم)
  DELETE FROM invitation_reminders
   WHERE invitation_id = p_invitation_id AND status = 'scheduled';

  IF v_inv.reminder_hours_before IS NULL
     OR v_inv.status IN ('cancelled', 'closed')
  THEN RETURN 0; END IF;

  v_at := v_inv.event_date - make_interval(hours => v_inv.reminder_hours_before);
  IF v_at <= now() THEN RETURN 0; END IF;

  INSERT INTO invitation_reminders (invitation_id, guest_id, scheduled_at)
  SELECT p_invitation_id, g.id, v_at
  FROM private_invitation_guests g
  WHERE g.invitation_id = p_invitation_id AND g.rsvp_status <> 'declined';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.schedule_invitation_reminders(uuid) TO authenticated;

-- الجدولة تلقائياً عند حفظ الدعوة أو تغيير موعدها/تذكيرها/حالتها
CREATE OR REPLACE FUNCTION public.tg_schedule_invitation_reminders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM schedule_invitation_reminders(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_invitation_reminders ON public.private_invitations;
CREATE TRIGGER trg_invitation_reminders
  AFTER INSERT OR UPDATE OF reminder_hours_before, event_date, status
  ON public.private_invitations
  FOR EACH ROW EXECUTE FUNCTION public.tg_schedule_invitation_reminders();

-- مدعو جديد يُضاف بعد الجدولة → يحصل على تذكيره تلقائياً
CREATE OR REPLACE FUNCTION public.tg_guest_reminder()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv record; v_at timestamptz;
BEGIN
  SELECT event_date, reminder_hours_before, status INTO v_inv
  FROM private_invitations WHERE id = NEW.invitation_id;
  IF FOUND AND v_inv.reminder_hours_before IS NOT NULL
     AND v_inv.status NOT IN ('cancelled', 'closed') THEN
    v_at := v_inv.event_date - make_interval(hours => v_inv.reminder_hours_before);
    IF v_at > now() THEN
      INSERT INTO invitation_reminders (invitation_id, guest_id, scheduled_at)
      VALUES (NEW.invitation_id, NEW.id, v_at);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guest_reminder ON public.private_invitation_guests;
CREATE TRIGGER trg_guest_reminder
  AFTER INSERT ON public.private_invitation_guests
  FOR EACH ROW EXECUTE FUNCTION public.tg_guest_reminder();

-- المعالج: يرسل التذكيرات التي حان وقتها ويحدّث الحالة بصدق
CREATE OR REPLACE FUNCTION public.process_due_invitation_reminders()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  v_uid uuid;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT ir.id, g.guest_name, g.guest_phone, g.guest_email, g.token,
           i.title, i.event_date, i.status AS inv_status
    FROM invitation_reminders ir
    JOIN private_invitation_guests g ON g.id = ir.guest_id
    JOIN private_invitations i ON i.id = ir.invitation_id
    WHERE ir.status = 'scheduled' AND ir.scheduled_at <= now()
    ORDER BY ir.scheduled_at
    LIMIT 200
  LOOP
    IF r.inv_status IN ('cancelled', 'closed') THEN
      UPDATE invitation_reminders SET status = 'cancelled' WHERE id = r.id;
      CONTINUE;
    END IF;

    -- قناة متاحة فعلياً اليوم: إشعار داخل المنصة لمدعو له حساب بنفس البريد/الجوال
    SELECT p.id INTO v_uid FROM profiles p
    WHERE (r.guest_email IS NOT NULL AND lower(p.email) = lower(r.guest_email))
       OR (r.guest_phone IS NOT NULL
           AND length(regexp_replace(r.guest_phone, '\D', '', 'g')) >= 9
           AND regexp_replace(coalesce(p.phone, ''), '\D', '', 'g')
               = regexp_replace(r.guest_phone, '\D', '', 'g'))
    LIMIT 1;

    IF v_uid IS NOT NULL THEN
      INSERT INTO in_app_notifications (user_id, title, body, link)
      VALUES (
        v_uid,
        'تذكير بموعد: ' || r.title,
        'مرحباً ' || r.guest_name || '، نذكرك بمناسبة "' || r.title || '" بتاريخ '
          || to_char(r.event_date AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD') || ' الساعة '
          || to_char(r.event_date AT TIME ZONE 'Asia/Riyadh', 'HH24:MI')
          || ' — نتشرف بحضورك، ولا تنسَ إبراز رمز دعوتك عند الدخول.',
        '/invite/' || r.token
      );
      UPDATE invitation_reminders
         SET status = 'sent', channel = 'in_app', sent_at = now()
       WHERE id = r.id;
    ELSE
      UPDATE invitation_reminders
         SET status = 'failed',
             error_message = 'no_channel: guest has no registered account - external email/WhatsApp integration not configured'
       WHERE id = r.id;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_due_invitation_reminders() TO authenticated;

-- جدولة المشغل كل 5 دقائق عبر pg_cron (إن كانت الإضافة مفعلة في المشروع)
DO $$ BEGIN PERFORM cron.unschedule('nakfik-invitation-reminders'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.schedule('nakfik-invitation-reminders', '*/5 * * * *',
    'SELECT public.process_due_invitation_reminders()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable - enable the pg_cron extension then rerun this block: %', SQLERRM;
END $$;

-- جدولة أولية للدعوات المضبوط تذكيرها مسبقاً
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.private_invitations WHERE reminder_hours_before IS NOT NULL LOOP
    PERFORM public.schedule_invitation_reminders(r.id);
  END LOOP;
END $$;
