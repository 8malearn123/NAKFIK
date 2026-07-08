-- قائمة انتظار الفعاليات المكتملة
-- عند تحرر مقعد (حذف حجز أو إلغاؤه) يُخطر أول منتظر تلقائياً عبر إشعار داخل المنصة.

CREATE TABLE public.event_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting | notified
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users join waitlist themselves"
  ON public.event_waitlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users see own waitlist entries"
  ON public.event_waitlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users leave waitlist themselves"
  ON public.event_waitlist FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- المنطق المشترك: إنقاص العدادات وإخطار أول منتظر
CREATE OR REPLACE FUNCTION public.free_event_seat(freed_event_id UUID, freed_ticket_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_waiter RECORD;
  evt_title TEXT;
BEGIN
  UPDATE public.events
  SET current_attendees_count = GREATEST(0, current_attendees_count - 1)
  WHERE id = freed_event_id;

  IF freed_ticket_id IS NOT NULL THEN
    UPDATE public.tickets
    SET quantity_sold = GREATEST(0, quantity_sold - 1)
    WHERE id = freed_ticket_id;
  END IF;

  SELECT * INTO next_waiter
  FROM public.event_waitlist
  WHERE event_id = freed_event_id AND status = 'waiting'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    SELECT title_ar INTO evt_title FROM public.events WHERE id = freed_event_id;

    INSERT INTO public.in_app_notifications (user_id, title, body, link)
    VALUES (
      next_waiter.user_id,
      'توفر مقعد في الفعالية! 🎉',
      'توفر مقعد في فعالية "' || COALESCE(evt_title, '') || '" — سارع بالحجز قبل نفاد المقاعد مرة أخرى.',
      '/events/' || freed_event_id
    );

    UPDATE public.event_waitlist
    SET status = 'notified', notified_at = now()
    WHERE id = next_waiter.id;
  END IF;
END;
$$;

-- مسار حذف الحجز نهائياً
CREATE OR REPLACE FUNCTION public.handle_registration_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.free_event_seat(OLD.event_id, OLD.ticket_id);
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_registration_deleted
  AFTER DELETE ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_registration_deleted();

-- مسار تحويل الحجز إلى ملغى
CREATE OR REPLACE FUNCTION public.handle_registration_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.free_event_seat(OLD.event_id, OLD.ticket_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_registration_cancelled
  AFTER UPDATE ON public.registrations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled')
  EXECUTE FUNCTION public.handle_registration_cancelled();
