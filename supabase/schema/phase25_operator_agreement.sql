-- ============================================
-- PATWADI Session 25 — Operator agreement gate
-- Run AFTER phase24_packaging_condition.sql
-- ============================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS operator_agreement_accepted_at TIMESTAMPTZ DEFAULT NULL;

-- Block direct client updates; acceptance only via RPC (server timestamp).
CREATE OR REPLACE FUNCTION prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Cannot change role';
    END IF;
    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
      RAISE EXCEPTION 'Cannot change approval_status';
    END IF;
    IF NEW.operator_status IS DISTINCT FROM OLD.operator_status THEN
      RAISE EXCEPTION 'Cannot change operator_status';
    END IF;
    IF NEW.is_available IS DISTINCT FROM OLD.is_available THEN
      RAISE EXCEPTION 'Cannot change is_available';
    END IF;
    IF NEW.operator_agreement_accepted_at IS DISTINCT FROM OLD.operator_agreement_accepted_at THEN
      RAISE EXCEPTION 'Cannot change operator_agreement_accepted_at directly';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION accept_operator_agreement()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accepted_at TIMESTAMPTZ;
BEGIN
  UPDATE profiles
  SET
    operator_agreement_accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = auth.uid()
    AND role IN ('lmp', 'linehaul')
    AND approval_status = 'approved'
    AND operator_status = 'active'
    AND operator_agreement_accepted_at IS NULL
  RETURNING operator_agreement_accepted_at INTO v_accepted_at;

  IF v_accepted_at IS NOT NULL THEN
    RETURN v_accepted_at;
  END IF;

  SELECT operator_agreement_accepted_at INTO v_accepted_at
  FROM profiles
  WHERE id = auth.uid();

  IF v_accepted_at IS NOT NULL THEN
    RETURN v_accepted_at;
  END IF;

  RAISE EXCEPTION 'Not eligible to accept operator agreement';
END;
$$;

REVOKE ALL ON FUNCTION accept_operator_agreement() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_operator_agreement() TO authenticated;

-- Safety net: parcel attach requires accepted agreement
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
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('lmp', 'linehaul')
      AND operator_agreement_accepted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Agreement not accepted.';
  END IF;

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

REVOKE ALL ON FUNCTION attach_parcel_to_linehaul_trip(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION attach_parcel_to_linehaul_trip(UUID, UUID) TO authenticated;
