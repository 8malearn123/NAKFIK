CREATE OR REPLACE FUNCTION public.populate_subscription_from_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan public.subscription_plans%ROWTYPE;
BEGIN
  SELECT * INTO _plan FROM public.subscription_plans WHERE id = NEW.plan_id;
  IF _plan.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.events_quota IS NULL OR NEW.events_quota = 0 THEN
    NEW.events_quota := COALESCE(_plan.max_events, 0);
  END IF;

  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := COALESCE(NEW.current_period_start, now()) + (COALESCE(_plan.validity_months, 1) || ' months')::interval;
  END IF;

  IF NEW.current_period_end IS NULL THEN
    NEW.current_period_end := NEW.expires_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_populate_subscription_from_plan ON public.account_subscriptions;
CREATE TRIGGER trg_populate_subscription_from_plan
  BEFORE INSERT ON public.account_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_subscription_from_plan();