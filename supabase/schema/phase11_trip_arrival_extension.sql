-- Phase 11 — trip arrival extension (linehaul conductor self-service, once per trip)

ALTER TABLE public.linehaul_trips
  ADD COLUMN IF NOT EXISTS arrival_extension_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arrival_extension_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_flag_arrival_extension BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.linehaul_trips.arrival_extension_minutes IS
  'Total minutes added via conductor self-service extension (typically 30).';
COMMENT ON COLUMN public.linehaul_trips.arrival_extension_used_at IS
  'When the one-time conductor arrival extension was applied.';
COMMENT ON COLUMN public.linehaul_trips.admin_flag_arrival_extension IS
  'Admin review flag when conductor extended arrival while far from destination.';

-- Active trip member (primary with active_until null, or trip creator before transfer rows)
CREATE OR REPLACE FUNCTION is_active_trip_conductor(p_trip_id UUID, p_conductor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM linehaul_trip_conductors
    WHERE trip_id = p_trip_id
      AND conductor_id = p_conductor_id
      AND active_until IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM linehaul_trips t
    WHERE t.id = p_trip_id
      AND t.created_by_conductor_id = p_conductor_id
      AND NOT EXISTS (
        SELECT 1 FROM linehaul_trip_conductors c
        WHERE c.trip_id = p_trip_id
          AND c.role = 'primary'
          AND c.active_until IS NULL
          AND c.conductor_id <> p_conductor_id
      )
  );
$$;

GRANT EXECUTE ON FUNCTION is_active_trip_conductor(UUID, UUID) TO authenticated;

-- One-time +30 min extension; flags admin and writes audit log
CREATE OR REPLACE FUNCTION extend_linehaul_trip_arrival(p_trip_id UUID)
RETURNS public.linehaul_trips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip public.linehaul_trips;
  v_old_arrival TIMESTAMPTZ;
  v_near_departure BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT is_active_trip_conductor(p_trip_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only the active conductor can extend this trip';
  END IF;

  SELECT * INTO v_trip FROM linehaul_trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  IF v_trip.status <> 'closed' THEN
    RAISE EXCEPTION 'Arrival extension only applies to en-route (closed) trips';
  END IF;

  IF v_trip.arrival_extension_used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Arrival extension already used for this trip';
  END IF;

  v_old_arrival := v_trip.expected_arrival_at;

  UPDATE linehaul_trips
  SET
    expected_arrival_at = expected_arrival_at + INTERVAL '30 minutes',
    arrival_extension_minutes = 30,
    arrival_extension_used_at = NOW(),
    admin_flag_arrival_extension = TRUE
  WHERE id = p_trip_id
  RETURNING * INTO v_trip;

  v_near_departure := NOW() >= (v_trip.scheduled_departure_at - INTERVAL '60 minutes');

  INSERT INTO trip_audit_logs (
    trip_id,
    actor_id,
    action,
    before_value,
    after_value,
    near_departure
  ) VALUES (
    p_trip_id,
    auth.uid(),
    'arrival_extension_requested',
    jsonb_build_object('expected_arrival_at', v_old_arrival::text),
    jsonb_build_object(
      'expected_arrival_at', v_trip.expected_arrival_at::text,
      'extension_minutes', 30,
      'admin_flag_arrival_extension', TRUE
    ),
    v_near_departure
  );

  RETURN v_trip;
END;
$$;

GRANT EXECUTE ON FUNCTION extend_linehaul_trip_arrival(UUID) TO authenticated;
