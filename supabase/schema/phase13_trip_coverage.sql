-- Phase 13 — trip coverage (full/partial), parcel transfer RPC, incomplete-trip admin flag

ALTER TABLE linehaul_trips
  ADD COLUMN IF NOT EXISTS trip_coverage_type TEXT NOT NULL DEFAULT 'full'
    CHECK (trip_coverage_type IN ('full', 'partial')),
  ADD COLUMN IF NOT EXISTS planned_co_conductor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_flag_reason TEXT,
  ADD COLUMN IF NOT EXISTS admin_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS operator_declared_co_conductor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS incomplete_trip_resolved_at TIMESTAMPTZ;

COMMENT ON COLUMN linehaul_trips.trip_coverage_type IS
  'full = creator conducts entire trip; partial = planned handoff to co-conductor.';
COMMENT ON COLUMN linehaul_trips.planned_co_conductor_id IS
  'Co-conductor selected at trip creation when trip_coverage_type = partial.';
COMMENT ON COLUMN linehaul_trips.admin_flag_reason IS
  'Machine-readable reason when admin_review_required is set (e.g. full_trip_past_arrival).';

-- Planned co-conductor row at trip creation (before details_locked)
CREATE OR REPLACE FUNCTION seed_planned_co_conductor(p_trip_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip linehaul_trips%ROWTYPE;
BEGIN
  SELECT * INTO v_trip FROM linehaul_trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_trip.created_by_conductor_id THEN
    RAISE EXCEPTION 'Only the trip creator can seed planned co-conductor';
  END IF;

  IF v_trip.trip_coverage_type <> 'partial' OR v_trip.planned_co_conductor_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT is_conductor_approved_and_available(v_trip.planned_co_conductor_id) THEN
    RAISE EXCEPTION 'Planned co-conductor is not approved or available';
  END IF;

  IF EXISTS (
    SELECT 1 FROM linehaul_trip_conductors
    WHERE trip_id = p_trip_id
      AND conductor_id = v_trip.planned_co_conductor_id
      AND active_until IS NULL
  ) THEN
    RETURN;
  END IF;

  INSERT INTO linehaul_trip_conductors (
    trip_id,
    conductor_id,
    role,
    added_by,
    reason
  ) VALUES (
    p_trip_id,
    v_trip.planned_co_conductor_id,
    'co_conductor',
    auth.uid(),
    'planned at trip creation'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION seed_planned_co_conductor(UUID) TO authenticated;

-- Transfer parcel custody (linehaul_id) without transferring the whole trip
CREATE OR REPLACE FUNCTION transfer_linehaul_parcel(
  p_order_id UUID,
  p_to_conductor_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT is_conductor_approved_and_available(p_to_conductor_id) THEN
    RAISE EXCEPTION 'Target conductor is not approved or available';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcel not found';
  END IF;

  IF v_order.linehaul_id IS DISTINCT FROM auth.uid() THEN
    IF v_order.trip_id IS NULL OR NOT is_active_trip_conductor(v_order.trip_id, auth.uid()) THEN
      RAISE EXCEPTION 'You are not the current linehaul holder for this parcel';
    END IF;
  END IF;

  IF p_to_conductor_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot transfer parcel to yourself';
  END IF;

  IF v_order.trip_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM linehaul_trip_transfer_requests tr
    WHERE tr.trip_id = v_order.trip_id AND tr.status = 'pending_acceptance'
  ) THEN
    RAISE EXCEPTION 'Trip has a pending transfer — resolve before moving parcels';
  END IF;

  UPDATE orders
  SET linehaul_id = p_to_conductor_id, updated_at = NOW()
  WHERE id = p_order_id;

  IF v_order.trip_id IS NOT NULL THEN
    INSERT INTO trip_audit_logs (trip_id, actor_id, action, after_value, near_departure)
    VALUES (
      v_order.trip_id,
      auth.uid(),
      'parcel_transferred',
      jsonb_build_object(
        'order_id', p_order_id,
        'from_conductor_id', auth.uid(),
        'to_conductor_id', p_to_conductor_id
      ),
      FALSE
    );
  END IF;

  RETURN p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_linehaul_parcel(UUID, UUID) TO authenticated;

-- Operator declares a co-conductor after incomplete full trip (clears action required)
CREATE OR REPLACE FUNCTION declare_incomplete_trip_co_conductor(
  p_trip_id UUID,
  p_co_conductor_id UUID
)
RETURNS linehaul_trips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip linehaul_trips%ROWTYPE;
BEGIN
  IF NOT is_active_trip_conductor(p_trip_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only the active conductor can update this trip';
  END IF;

  IF NOT is_conductor_approved_and_available(p_co_conductor_id) THEN
    RAISE EXCEPTION 'Co-conductor is not approved or available';
  END IF;

  SELECT * INTO v_trip FROM linehaul_trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  UPDATE linehaul_trips
  SET
    operator_declared_co_conductor_id = p_co_conductor_id,
    incomplete_trip_resolved_at = NOW(),
    admin_review_required = TRUE,
    admin_flag_reason = COALESCE(admin_flag_reason, 'operator_declared_co_conductor'),
    updated_at = NOW()
  WHERE id = p_trip_id
  RETURNING * INTO v_trip;

  IF NOT EXISTS (
    SELECT 1 FROM linehaul_trip_conductors
    WHERE trip_id = p_trip_id
      AND conductor_id = p_co_conductor_id
      AND active_until IS NULL
  ) THEN
    INSERT INTO linehaul_trip_conductors (
      trip_id, conductor_id, role, added_by, reason, active_from
    ) VALUES (
      p_trip_id,
      p_co_conductor_id,
      'co_conductor',
      auth.uid(),
      'declared after incomplete trip',
      NOW()
    );
  END IF;

  INSERT INTO trip_audit_logs (trip_id, actor_id, action, after_value, near_departure)
  VALUES (
    p_trip_id,
    auth.uid(),
    'incomplete_trip_co_conductor_declared',
    jsonb_build_object('co_conductor_id', p_co_conductor_id),
    FALSE
  );

  RETURN v_trip;
END;
$$;

GRANT EXECUTE ON FUNCTION declare_incomplete_trip_co_conductor(UUID, UUID) TO authenticated;

-- Operator confirms solo trip ended without co-conductor (admin still reviews)
CREATE OR REPLACE FUNCTION resolve_incomplete_trip_solo(
  p_trip_id UUID
)
RETURNS linehaul_trips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip linehaul_trips%ROWTYPE;
BEGIN
  IF NOT is_active_trip_conductor(p_trip_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only the active conductor can update this trip';
  END IF;

  SELECT * INTO v_trip FROM linehaul_trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  UPDATE linehaul_trips
  SET
    incomplete_trip_resolved_at = NOW(),
    admin_review_required = TRUE,
    admin_flag_reason = COALESCE(admin_flag_reason, 'full_trip_past_arrival'),
    updated_at = NOW()
  WHERE id = p_trip_id
  RETURNING * INTO v_trip;

  INSERT INTO trip_audit_logs (trip_id, actor_id, action, after_value, near_departure)
  VALUES (
    p_trip_id,
    auth.uid(),
    'incomplete_trip_solo_confirmed',
    jsonb_build_object('confirmed_solo', TRUE),
    FALSE
  );

  RETURN v_trip;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_incomplete_trip_solo(UUID) TO authenticated;

-- Extend timer cron: flag full trips past expected arrival with no co-conductor
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
  v_incomplete INTEGER;
BEGIN
  UPDATE linehaul_trips
  SET
    accepts_new_parcels = FALSE,
    closed_to_new_parcels_at = COALESCE(closed_to_new_parcels_at, NOW()),
    updated_at = NOW()
  WHERE status = 'open'
    AND accepts_new_parcels = TRUE
    AND NOW() >= scheduled_departure_at - INTERVAL '60 minutes';
  GET DIAGNOSTICS v_parcels = ROW_COUNT;

  UPDATE linehaul_trips
  SET
    details_locked = TRUE,
    details_locked_at = COALESCE(details_locked_at, NOW()),
    updated_at = NOW()
  WHERE status = 'open'
    AND details_locked = FALSE
    AND NOW() >= scheduled_departure_at - INTERVAL '10 minutes';
  GET DIAGNOSTICS v_locked = ROW_COUNT;

  UPDATE linehaul_trips
  SET closed_at = COALESCE(closed_at, updated_at)
  WHERE status = 'closed' AND closed_at IS NULL;

  UPDATE linehaul_trips t
  SET is_overdue = TRUE, updated_at = NOW()
  FROM corridors c
  WHERE t.status = 'closed'
    AND t.is_overdue = FALSE
    AND t.corridor_id = c.key
    AND t.closed_at IS NOT NULL
    AND NOW() > t.closed_at + (c.expected_duration_hours * INTERVAL '1 hour') * 1.2;
  GET DIAGNOSTICS v_overdue = ROW_COUNT;

  UPDATE parcel_recoveries
  SET
    escalation_level = escalation_level + 1,
    last_escalated_at = NOW()
  WHERE status IN ('open', 'in_progress')
    AND NOW() > opened_at + (escalation_level + 1) * INTERVAL '2 hours';
  GET DIAGNOSTICS v_escalated = ROW_COUNT;

  UPDATE location_samples ls
  SET tracking_window_closed = TRUE
  WHERE tracking_window_closed = FALSE
    AND ls.trip_id IS NOT NULL
    AND ls.trip_id IN (
      SELECT id FROM linehaul_trips WHERE status IN ('completed', 'cancelled')
    );
  GET DIAGNOSTICS v_tracking_closed = ROW_COUNT;

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

  -- Full trip past expected arrival, no co-conductor on record → admin flag + operator action
  UPDATE linehaul_trips t
  SET
    admin_review_required = TRUE,
    admin_flag_reason = 'full_trip_past_arrival_no_co_conductor',
    updated_at = NOW()
  WHERE t.trip_coverage_type = 'full'
    AND t.planned_co_conductor_id IS NULL
    AND t.operator_declared_co_conductor_id IS NULL
    AND t.incomplete_trip_resolved_at IS NULL
    AND t.status IN ('open', 'closed')
    AND NOW() > t.expected_arrival_at
    AND NOT EXISTS (
      SELECT 1 FROM linehaul_trip_conductors c
      WHERE c.trip_id = t.id
        AND c.role = 'co_conductor'
        AND c.active_until IS NULL
    )
    AND (t.admin_flag_reason IS NULL OR t.admin_flag_reason = '');
  GET DIAGNOSTICS v_incomplete = ROW_COUNT;

  v_count := v_parcels + v_locked + v_overdue + v_escalated + v_tracking_closed + v_tracking_lmp + v_incomplete;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION apply_linehaul_trip_timer_transitions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_linehaul_trip_timer_transitions() TO service_role;
GRANT EXECUTE ON FUNCTION apply_linehaul_trip_timer_transitions() TO authenticated;
