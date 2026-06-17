-- ============================================
-- PATWADI Session 4 — Trip limits + conductor availability (v6 §4, §6.1)
-- Run AFTER phase2_trips.sql and phase3_trip_timers.sql
-- ============================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_available ON profiles(is_available);

-- v6 §6.1 — approved linehaul operator currently available
CREATE OR REPLACE FUNCTION is_conductor_approved_and_available(p_conductor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_conductor_id
      AND role = 'linehaul'
      AND approval_status = 'approved'
      AND is_available = TRUE
  );
$$;

-- v6 §4 — calendar-day trip count (conductor local TZ, default Asia/Kolkata)
CREATE OR REPLACE FUNCTION conductor_trips_on_date(
  p_conductor_id UUID,
  p_scheduled_departure_at TIMESTAMPTZ,
  p_timezone TEXT DEFAULT 'Asia/Kolkata'
)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM linehaul_trips
  WHERE created_by_conductor_id = p_conductor_id
    AND status <> 'cancelled'
    AND (scheduled_departure_at AT TIME ZONE p_timezone)::date =
        (p_scheduled_departure_at AT TIME ZONE p_timezone)::date;
$$;

-- v6 §4 — auto-mark second same-day trip as extra
CREATE OR REPLACE FUNCTION set_linehaul_trip_extra_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF conductor_trips_on_date(
    NEW.created_by_conductor_id,
    NEW.scheduled_departure_at
  ) > 0 THEN
    NEW.is_extra_trip := TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_linehaul_trip_extra ON linehaul_trips;
CREATE TRIGGER trg_linehaul_trip_extra
  BEFORE INSERT ON linehaul_trips
  FOR EACH ROW EXECUTE FUNCTION set_linehaul_trip_extra_flag();

-- v6 §4 — extra trip cannot reach open without admin approval
CREATE OR REPLACE FUNCTION can_open_linehaul_trip(p_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN status <> 'draft' THEN FALSE
    WHEN COALESCE(bus_proof_photo_path, '') = '' THEN FALSE
    WHEN is_extra_trip AND extra_trip_approved_by IS NULL THEN FALSE
    ELSE TRUE
  END
  FROM linehaul_trips
  WHERE id = p_trip_id;
$$;
