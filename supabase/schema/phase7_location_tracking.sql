-- v6 §19 — Phase 4 trip-window location tracking

-- Trip columns for overdue flagging (§19.4a)
ALTER TABLE public.linehaul_trips
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill closed_at for trips already closed
UPDATE public.linehaul_trips
SET closed_at = COALESCE(closed_at, updated_at)
WHERE status = 'closed' AND closed_at IS NULL;

-- §19.3 location_samples
CREATE TABLE IF NOT EXISTS public.location_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.linehaul_trips(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  conductor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('linehaul', 'lmp')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy_m DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tracking_window_closed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_location_samples_trip_unique
  ON public.location_samples (trip_id, conductor_id, recorded_at)
  WHERE trip_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_location_samples_order_unique
  ON public.location_samples (order_id, conductor_id, recorded_at)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_location_samples_trip
  ON public.location_samples (trip_id, conductor_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_samples_order
  ON public.location_samples (order_id, conductor_id);
CREATE INDEX IF NOT EXISTS idx_location_samples_conductor
  ON public.location_samples (conductor_id, recorded_at DESC);

ALTER TABLE public.location_samples ENABLE ROW LEVEL SECURITY;

-- Operators insert own samples
CREATE POLICY "location_samples_insert_own"
  ON public.location_samples FOR INSERT
  TO authenticated
  WITH CHECK (conductor_id = auth.uid());

-- Operators read own samples
CREATE POLICY "location_samples_select_own"
  ON public.location_samples FOR SELECT
  TO authenticated
  USING (conductor_id = auth.uid());

-- Admin read all
CREATE POLICY "location_samples_admin_select"
  ON public.location_samples FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admin_profiles WHERE active = TRUE)
  );

-- Extend timer cron with §19.4 checks (replaces Session 3 function body)
CREATE OR REPLACE FUNCTION apply_linehaul_trip_timer_transitions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_parcels INTEGER;
  v_locked INTEGER;
  v_overdue INTEGER;
  v_escalated INTEGER;
  v_tracking_closed INTEGER;
  v_tracking_lmp INTEGER;
BEGIN
  -- §3 T-60min: close to new parcels
  UPDATE linehaul_trips
  SET
    accepts_new_parcels = FALSE,
    closed_to_new_parcels_at = COALESCE(closed_to_new_parcels_at, NOW()),
    updated_at = NOW()
  WHERE status = 'open'
    AND accepts_new_parcels = TRUE
    AND NOW() >= scheduled_departure_at - INTERVAL '60 minutes';
  GET DIAGNOSTICS v_parcels = ROW_COUNT;

  -- §3 T-10min: lock details
  UPDATE linehaul_trips
  SET
    details_locked = TRUE,
    details_locked_at = COALESCE(details_locked_at, NOW()),
    updated_at = NOW()
  WHERE status = 'open'
    AND details_locked = FALSE
    AND NOW() >= scheduled_departure_at - INTERVAL '10 minutes';
  GET DIAGNOSTICS v_locked = ROW_COUNT;

  -- Ensure closed_at is set when trip is closed
  UPDATE linehaul_trips
  SET closed_at = COALESCE(closed_at, updated_at)
  WHERE status = 'closed' AND closed_at IS NULL;

  -- §19.4a overdue flagging
  UPDATE linehaul_trips t
  SET is_overdue = TRUE, updated_at = NOW()
  FROM corridors c
  WHERE t.status = 'closed'
    AND t.is_overdue = FALSE
    AND t.corridor_id = c.key
    AND t.closed_at IS NOT NULL
    AND NOW() > t.closed_at + (c.expected_duration_hours * INTERVAL '1 hour') * 1.2;
  GET DIAGNOSTICS v_overdue = ROW_COUNT;

  -- §19.4b recovery escalation
  UPDATE parcel_recoveries
  SET
    escalation_level = escalation_level + 1,
    last_escalated_at = NOW()
  WHERE status IN ('open', 'in_progress')
    AND NOW() > opened_at + (escalation_level + 1) * INTERVAL '2 hours';
  GET DIAGNOSTICS v_escalated = ROW_COUNT;

  -- §19.4c tracking window cleanup — linehaul trips ended
  UPDATE location_samples ls
  SET tracking_window_closed = TRUE
  WHERE tracking_window_closed = FALSE
    AND ls.trip_id IS NOT NULL
    AND ls.trip_id IN (
      SELECT id FROM linehaul_trips WHERE status IN ('completed', 'cancelled')
    );
  GET DIAGNOSTICS v_tracking_closed = ROW_COUNT;

  -- §19.4c LMP assignments no longer active
  UPDATE location_samples ls
  SET tracking_window_closed = TRUE
  WHERE tracking_window_closed = FALSE
    AND ls.order_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = ls.order_id
        AND (o.lmp_pickup_id = ls.conductor_id OR o.lmp_delivery_id = ls.conductor_id)
    );
  GET DIAGNOSTICS v_tracking_lmp = ROW_COUNT;

  v_count := v_parcels + v_locked + v_overdue + v_escalated + v_tracking_closed + v_tracking_lmp;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION apply_linehaul_trip_timer_transitions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_linehaul_trip_timer_transitions() TO service_role;
GRANT EXECUTE ON FUNCTION apply_linehaul_trip_timer_transitions() TO authenticated;
