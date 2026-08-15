-- تحديثات الدعوات الخاصة + فريق الفعالية:
-- 1) مرفقات الدعوة (attachments jsonb)
-- 2) خيارات الهدايا وطرق الدفع (gift_options jsonb: types + payment_methods)
-- 3) تذكير المستفيد قبل الموعد بساعة إلى 12 ساعة (reminder_hours_before)
-- 4) جدول فريق الفعالية بأدوار محددة الصلاحيات (event_staff)
-- 5) تحديث دالة الرابط العام لإرجاع الحقول الجديدة

ALTER TABLE public.private_invitations
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS gift_options jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reminder_hours_before integer
    CHECK (reminder_hours_before IS NULL OR (reminder_hours_before BETWEEN 1 AND 12));

-- ضمان وجود الأعمدة التي تعتمد عليها الدالة أدناه حتى لو لم تُنفذ الملفات السابقة
ALTER TABLE public.private_invitations
  ADD COLUMN IF NOT EXISTS design_extras jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS rescheduled_from timestamptz,
  ADD COLUMN IF NOT EXISTS reschedule_note text;

-- فريق الفعالية: الراعي الأساسي يضيف موظفيه ويحدد دور كل واحد
CREATE TABLE IF NOT EXISTS public.event_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'checkin', 'attendance', 'reports')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Event owner manages staff" ON public.event_staff;
CREATE POLICY "Event owner manages staff" ON public.event_staff
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizations o ON o.id = e.organization_id
      WHERE e.id = event_staff.event_id AND o.owner_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'super_admin')
  );

DROP POLICY IF EXISTS "Staff view own membership" ON public.event_staff;
CREATE POLICY "Staff view own membership" ON public.event_staff
  FOR SELECT USING (user_id = auth.uid());

-- البحث عن مستخدم بالبريد لإضافته للفريق (متاح للمسجلين فقط)
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;

-- تحديث دالة جلب الدعوة بالرمز
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
  IF _token IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO _guest FROM public.private_invitation_guests WHERE token = _token LIMIT 1;
  IF _guest.id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO _inv FROM public.private_invitations WHERE id = _guest.invitation_id LIMIT 1;
  IF _inv.id IS NULL OR _inv.status = 'closed' THEN RETURN NULL; END IF;

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
      'status', _inv.status,
      'layout_style', _inv.layout_style,
      'ornament_style', _inv.ornament_style,
      'body_font', _inv.body_font,
      'text_color', _inv.text_color,
      'template_key', _inv.template_key,
      'custom_template_url', _inv.custom_template_url,
      'use_custom_template', _inv.use_custom_template,
      'name_overlay', _inv.name_overlay,
      'design_extras', COALESCE(_inv.design_extras, '{}'::jsonb),
      'cancel_reason', _inv.cancel_reason,
      'rescheduled_from', _inv.rescheduled_from,
      'reschedule_note', _inv.reschedule_note,
      'attachments', COALESCE(_inv.attachments, '[]'::jsonb),
      'gift_options', COALESCE(_inv.gift_options, '{}'::jsonb),
      'reminder_hours_before', _inv.reminder_hours_before
    )
  );
END;
$$;
