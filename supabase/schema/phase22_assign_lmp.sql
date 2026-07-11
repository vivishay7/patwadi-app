-- ============================================
-- PATWADI Session 22 — Admin LMP assignment (Option A)
-- Run AFTER phase21_dispute_status.sql
-- ============================================

-- Admins need to list approved LMP operators for the assignment form.
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (is_active_admin());

-- Option A: admin-only RPC to set pickup + delivery LMP (and optional linehaul) on an order.
CREATE OR REPLACE FUNCTION assign_lmp_to_order(
  p_order_id UUID,
  p_lmp_pickup_id UUID,
  p_lmp_delivery_id UUID,
  p_linehaul_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  IF NOT is_active_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_lmp_pickup_id
      AND role = 'lmp'
      AND approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'INVALID_LMP_PICKUP';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_lmp_delivery_id
      AND role = 'lmp'
      AND approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'INVALID_LMP_DELIVERY';
  END IF;

  IF p_linehaul_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_linehaul_id
      AND role = 'linehaul'
      AND approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'INVALID_LINEHAUL';
  END IF;

  UPDATE orders
  SET
    lmp_pickup_id = p_lmp_pickup_id,
    lmp_delivery_id = p_lmp_delivery_id,
    linehaul_id = COALESCE(p_linehaul_id, linehaul_id),
    updated_at = NOW()
  WHERE id = p_order_id;

  INSERT INTO admin_audit_logs (admin_user_id, action, parcel_id, details)
  VALUES (
    auth.uid(),
    'assign_lmp',
    p_order_id,
    jsonb_build_object(
      'lmp_pickup_id', p_lmp_pickup_id,
      'lmp_delivery_id', p_lmp_delivery_id,
      'linehaul_id', p_linehaul_id
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'lmp_pickup_id', p_lmp_pickup_id,
    'lmp_delivery_id', p_lmp_delivery_id,
    'linehaul_id', p_linehaul_id
  );
END;
$$;

REVOKE ALL ON FUNCTION assign_lmp_to_order(UUID, UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION assign_lmp_to_order(UUID, UUID, UUID, UUID) TO authenticated;
