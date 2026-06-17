-- v6 — linehaul parcel pool: list + attach (RLS-safe for operators)

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
      WHERE t.created_by_conductor_id = auth.uid()
        AND t.status = 'open'
        AND t.accepts_new_parcels = true
        AND t.corridor_id = o.corridor_key
        AND (NOT t.is_extra_trip OR t.extra_trip_approved_by IS NOT NULL)
    )
  ORDER BY o.created_at DESC;
$$;

REVOKE ALL ON FUNCTION list_available_parcels_for_linehaul() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_available_parcels_for_linehaul() TO authenticated;

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
  SELECT * INTO v_trip
  FROM linehaul_trips
  WHERE id = p_trip_id
    AND created_by_conductor_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found or not owned by you';
  END IF;

  IF v_trip.status <> 'open' OR NOT v_trip.accepts_new_parcels THEN
    RAISE EXCEPTION 'Trip is not accepting parcels';
  END IF;

  IF v_trip.is_extra_trip AND v_trip.extra_trip_approved_by IS NULL THEN
    RAISE EXCEPTION 'Extra trip requires admin approval before attaching parcels';
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

REVOKE ALL ON FUNCTION attach_parcel_to_linehaul_trip(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION attach_parcel_to_linehaul_trip(UUID, UUID) TO authenticated;

-- Cancelled trips should not keep accepting-parcels flags (backfill)
UPDATE linehaul_trips
SET accepts_new_parcels = false
WHERE status IN ('cancelled', 'completed');
