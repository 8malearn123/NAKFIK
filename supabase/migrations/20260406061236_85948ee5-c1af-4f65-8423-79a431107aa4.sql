
-- Add booking mode columns to venues
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS booking_mode text DEFAULT 'advance',
  ADD COLUMN IF NOT EXISTS booking_window_days int DEFAULT 30,
  ADD COLUMN IF NOT EXISTS min_advance_minutes int DEFAULT 30,
  ADD COLUMN IF NOT EXISTS last_slot_before_close_minutes int DEFAULT 60;

-- Add realtime_updates to venue_slot_config
ALTER TABLE venue_slot_config
  ADD COLUMN IF NOT EXISTS realtime_updates boolean DEFAULT true;

-- Create validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION validate_booking_mode()
RETURNS trigger AS $$
BEGIN
  IF NEW.booking_mode NOT IN ('advance', 'same_day') THEN
    RAISE EXCEPTION 'booking_mode must be advance or same_day';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_booking_mode
  BEFORE INSERT OR UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION validate_booking_mode();
