-- Phase 12 — transfer acceptance window, parcel ownership on transfer, active-conductor RPCs

-- Expand transfer request statuses
ALTER TABLE linehaul_trip_transfer_requests
  DROP CONSTRAINT IF EXISTS linehaul_trip_transfer_requests_status_check;

ALTER TABLE linehaul_trip_transfer_requests
  ADD COLUMN IF NOT EXISTS accept_by TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trip_progress_pct_at_accept NUMERIC,
  ADD COLUMN IF NOT EXISTS payee_conductor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE linehaul_trip_transfer_requests
  ADD CONSTRAINT linehaul_trip_transfer_requests_status_check
  CHECK (
    status IN (
      'rejected',
      'rejected_timeout',
      'pending_acceptance',
      'accepted',
      'accepted_with_flag',
      'auto_accepted',
      'auto_accepted_with_flag'
    )
  );

COMMENT ON COLUMN linehaul_trip_transfer_requests.accept_by IS
  'Receiver must accept before this time (departure for pre-start; +10min for mid-trip).';
COMMENT ON COLUMN linehaul_trip_transfer_requests.payee_conductor_id IS
  'Conductor entitled to linehaul pay for this trip after transfer (see trip_progress_pct_at_accept).';

-- Backfill parcel linehaul_id to current active primary for attached orders
UPDATE orders o
SET linehaul_id = c.conductor_id, updated_at = NOW()
FROM linehaul_trip_conductors c
WHERE o.trip_id = c.trip_id
  AND c.role = 'primary'
  AND c.active_until IS NULL
  AND o.linehaul_id IS DISTINCT FROM c.conductor_id;

-- Available jobs: active primary conductor on open trip (not creator-only)
CREATE OR REPLACE FUNCTION list_available_parcels_for_linehaul()
RETURNS TABLE (
  id UUID,
  pickup_location TEXT,
  dropoff_location TEXT,
  weight_kg DECIMAL,
  corridor_key TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.pickup_location,
    o.dropoff_location,
    o.weight_kg,
    o.corridor_key,
    o.created_at
  FROM orders o
  WHERE o.payment_status = 'confirmed'
    AND o.trip_id IS NULL
    AND COALESCE(o.blocked_exception, false) = false
    AND o.corridor_key IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM linehaul_trips t
      WHERE t.status = 'open'
        AND t.accepts_new_parcels = true
        AND t.corridor_id = o.corridor_key
        AND (NOT t.is_extra_trip OR t.extra_trip_approved_by IS NOT NULL)
        AND is_active_trip_conductor(t.id, auth.uid())
        AND NOT EXISTS (
          SELECT 1 FROM linehaul_trip_transfer_requests tr
          WHERE tr.trip_id = t.id
            AND tr.status = 'pending_acceptance'
        )
    )
  ORDER BY o.created_at DESC;
$$;

-- Attach: active conductor on trip (supports post-transfer primary)
CREATE OR REPLACE FUNCTION attach_parcel_to_linehaul_trip(
  p_order_id UUID,
  p_trip_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip linehaul_trips%ROWTYPE;
  v_order orders%ROWTYPE;
BEGIN
  IF NOT is_active_trip_conductor(p_trip_id, auth.uid()) THEN
    RAISE EXCEPTION 'Trip not found or you are not the active conductor';
  END IF;

  SELECT * INTO v_trip FROM linehaul_trips WHERE id = p_trip_id;

  IF v_trip.status <> 'open' OR NOT v_trip.accepts_new_parcels THEN
    RAISE EXCEPTION 'Trip is not accepting parcels';
  END IF;

  IF v_trip.is_extra_trip AND v_trip.extra_trip_approved_by IS NULL THEN
    RAISE EXCEPTION 'Extra trip requires admin approval before attaching parcels';
  END IF;

  IF EXISTS (
    SELECT 1 FROM linehaul_trip_transfer_requests tr
    WHERE tr.trip_id = p_trip_id AND tr.status = 'pending_acceptance'
  ) THEN
    RAISE EXCEPTION 'Trip has a pending transfer — accept or cancel before attaching parcels';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcel not found';
  END IF;

  IF v_order.payment_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Parcel payment is not confirmed';
  END IF;

  IF v_order.trip_id IS NOT NULL THEN
    RAISE EXCEPTION 'Parcel is already attached to a trip';
  END IF;

  IF v_order.corridor_key IS DISTINCT FROM v_trip.corridor_id THEN
    RAISE EXCEPTION 'Parcel corridor does not match trip corridor';
  END IF;

  UPDATE orders
  SET
    trip_id = p_trip_id,
    linehaul_id = auth.uid(),
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN p_order_id;
END;
$$;

-- Elapsed trip progress 0–100 for pay attribution
CREATE OR REPLACE FUNCTION linehaul_trip_progress_pct(
  p_departure TIMESTAMPTZ,
  p_arrival TIMESTAMPTZ,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_now <= p_departure THEN 0
    WHEN p_now >= p_arrival THEN 100
    ELSE ROUND(
      (
        EXTRACT(EPOCH FROM (p_now - p_departure))
        / NULLIF(EXTRACT(EPOCH FROM (p_arrival - p_departure)), 0)
      ) * 100,
      2
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION linehaul_trip_progress_pct(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
