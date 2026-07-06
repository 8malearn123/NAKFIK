-- 1. Add consumption tracking columns to account_subscriptions
ALTER TABLE public.account_subscriptions
  ADD COLUMN IF NOT EXISTS events_quota integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS events_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 2. Function: get the user's currently active subscription
CREATE OR REPLACE FUNCTION public.get_active_subscription(_user_id uuid)
RETURNS public.account_subscriptions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.account_subscriptions
  WHERE account_id = _user_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
    AND (events_quota = 0 OR events_used < events_quota)
  ORDER BY created_at DESC
  LIMIT 1
$$;

-- 3. Function: consume one event credit, raise if no quota
CREATE OR REPLACE FUNCTION public.consume_event_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _sub public.account_subscriptions%ROWTYPE;
BEGIN
  -- find org owner
  SELECT owner_id INTO _owner FROM public.organizations WHERE id = NEW.organization_id;
  IF _owner IS NULL THEN
    RETURN NEW;
  END IF;

  -- find active subscription with remaining quota
  SELECT * INTO _sub
  FROM public.account_subscriptions
  WHERE account_id = _owner
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1;

  IF _sub.id IS NULL THEN
    RAISE EXCEPTION 'NO_ACTIVE_SUBSCRIPTION' USING HINT = 'لا يوجد اشتراك نشط. يرجى الاشتراك في باقة.';
  END IF;

  IF _sub.expires_at IS NOT NULL AND _sub.expires_at <= now() THEN
    UPDATE public.account_subscriptions SET status = 'expired' WHERE id = _sub.id;
    RAISE EXCEPTION 'SUBSCRIPTION_EXPIRED' USING HINT = 'انتهت صلاحية باقتك. يرجى التجديد.';
  END IF;

  IF _sub.events_quota > 0 AND _sub.events_used >= _sub.events_quota THEN
    RAISE EXCEPTION 'QUOTA_EXCEEDED' USING HINT = 'لقد استنفدت رصيدك من الفعاليات. يرجى الترقية.';
  END IF;

  UPDATE public.account_subscriptions
  SET events_used = events_used + 1,
      updated_at = now()
  WHERE id = _sub.id;

  RETURN NEW;
END;
$$;

-- 4. Trigger on events INSERT
DROP TRIGGER IF EXISTS trg_consume_event_credit ON public.events;
CREATE TRIGGER trg_consume_event_credit
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.consume_event_credit();

-- 5. Function to expire old subscriptions (can be called manually or via cron)
CREATE OR REPLACE FUNCTION public.expire_old_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  UPDATE public.account_subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at <= now();
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;