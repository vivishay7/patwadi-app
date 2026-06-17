-- ============================================
-- PATWADI Session 5 — Admin override helpers (v6 §7, §13)
-- Run AFTER phase2_trips.sql
-- ============================================

-- v6 §7 — post-custody if lmp_to_linehaul exists while parcel is on this trip
CREATE OR REPLACE FUNCTION parcel_has_lmp_to_linehaul_on_trip(
  p_parcel_id UUID,
  p_trip_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM orders o
    JOIN custody_events ce ON ce.parcel_id = o.id
    WHERE o.id = p_parcel_id
      AND o.trip_id = p_trip_id
      AND ce.from_role = 'lmp'
      AND ce.to_role = 'linehaul'
  );
$$;

-- v6 §13.5 — resolve recovery when custody lands on recovered_by_trip_id
CREATE OR REPLACE FUNCTION try_resolve_parcel_recovery_after_custody(
  p_parcel_id UUID,
  p_resolved_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recovery_id UUID;
  v_trip_id UUID;
  v_recovered_by_trip_id UUID;
BEGIN
  SELECT trip_id, recovered_by_trip_id
  INTO v_trip_id, v_recovered_by_trip_id
  FROM orders
  WHERE id = p_parcel_id;

  IF v_recovered_by_trip_id IS NULL OR v_trip_id IS DISTINCT FROM v_recovered_by_trip_id THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_recovery_id
  FROM parcel_recoveries
  WHERE parcel_id = p_parcel_id
    AND status IN ('open', 'in_progress')
  ORDER BY opened_at DESC
  LIMIT 1;

  IF v_recovery_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE parcel_recoveries
  SET status = 'resolved',
      resolved_at = NOW(),
      resolved_by = p_resolved_by
  WHERE id = v_recovery_id;

  UPDATE orders
  SET blocked_exception = FALSE
  WHERE id = p_parcel_id;

  RETURN v_recovery_id;
END;
$$;
