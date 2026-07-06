
CREATE OR REPLACE FUNCTION validate_booking_mode()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_mode NOT IN ('advance', 'same_day') THEN
    RAISE EXCEPTION 'booking_mode must be advance or same_day';
  END IF;
  RETURN NEW;
END;
$$;
