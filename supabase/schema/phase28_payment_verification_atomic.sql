-- ============================================
-- PATWADI Phase 28 — Atomic verified-payment order creation
-- Run AFTER phase27_operator_order_view_security_invoker.sql
-- ============================================

-- One Razorpay order must map to one Patwadi parcel. Keep dev skip compatible:
-- skip-dev-payment already generates a unique synthetic razorpay_order_id.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id_unique
  ON orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION create_order_from_verified_payment(
  p_session_id UUID,
  p_user_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_terms_accepted_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session payment_sessions%ROWTYPE;
  v_existing_order_id UUID;
  v_order_id UUID;
BEGIN
  SELECT *
  INTO v_session
  FROM payment_sessions
  WHERE id = p_session_id
    AND razorpay_order_id = p_razorpay_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_SESSION_NOT_FOUND';
  END IF;

  IF v_session.user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'PAYMENT_SESSION_FORBIDDEN';
  END IF;

  SELECT id
  INTO v_existing_order_id
  FROM orders
  WHERE razorpay_order_id = p_razorpay_order_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_order_id IS NOT NULL THEN
    UPDATE payment_sessions
    SET used_at = COALESCE(used_at, p_terms_accepted_at)
    WHERE id = v_session.id;

    RETURN v_existing_order_id;
  END IF;

  IF v_session.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'PAYMENT_SESSION_ALREADY_USED';
  END IF;

  INSERT INTO orders (
    customer_id,
    pickup_location,
    dropoff_location,
    weight_kg,
    dimensions,
    contents,
    price_estimate,
    corridor_key,
    payment_status,
    razorpay_order_id,
    razorpay_payment_id,
    terms_accepted_at,
    status
  )
  VALUES (
    p_user_id,
    v_session.pickup_location,
    v_session.dropoff_location,
    v_session.weight_kg,
    v_session.dimensions,
    v_session.contents,
    v_session.price_estimate,
    v_session.corridor_key,
    'confirmed',
    p_razorpay_order_id,
    p_razorpay_payment_id,
    p_terms_accepted_at,
    'pending'
  )
  RETURNING id INTO v_order_id;

  UPDATE payment_sessions
  SET used_at = p_terms_accepted_at
  WHERE id = v_session.id;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION create_order_from_verified_payment(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_order_from_verified_payment(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
