
-- Enum for notification types
CREATE TYPE public.notification_type AS ENUM ('event_reminder', 'registration_confirmation', 'custom_message');

-- Enum for notification channel
CREATE TYPE public.notification_channel AS ENUM ('whatsapp', 'in_app', 'email');

-- Enum for notification status
CREATE TYPE public.notification_status AS ENUM ('pending', 'sent', 'failed');

-- WhatsApp settings per organizer (Karzoun credentials)
CREATE TABLE public.whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  karzoun_token TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Notification templates
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'custom_message',
  content TEXT,
  params JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications log
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  type notification_type NOT NULL DEFAULT 'custom_message',
  channel notification_channel NOT NULL DEFAULT 'whatsapp',
  status notification_status NOT NULL DEFAULT 'pending',
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  message TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- In-app notifications
CREATE TABLE public.in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- WhatsApp settings: owner only
CREATE POLICY "Users manage own whatsapp settings"
  ON public.whatsapp_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Templates: owner only
CREATE POLICY "Users manage own templates"
  ON public.notification_templates FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notifications: owner only
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- In-app notifications: owner only
CREATE POLICY "Users manage own in-app notifications"
  ON public.in_app_notifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
