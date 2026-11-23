-- ============================================
-- PATWADI Phase 28 - Payment verification idempotency
-- Run AFTER phase27_operator_order_view_security_invoker.sql
-- ============================================
-- Complete verified Razorpay payments inside the database so the payment
-- session row is locked while the confirmed parcel is created.

CREATE OR REPLACE FUNCTION complete_verified_payment_session(
  p_session_id UUID,
  p_user_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session payment_sessions%ROWTYPE;
  v_order_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF p_razorpay_payment_id IS NULL OR btrim(p_razorpay_payment_id) = '' THEN
    RAISE EXCEPTION 'PAYMENT_ID_REQUIRED';
  END IF;

  SELECT * INTO v_session
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

  SELECT id INTO v_order_id
  FROM orders
  WHERE razorpay_order_id = p_razorpay_order_id
    AND razorpay_payment_id = p_razorpay_payment_id
  LIMIT 1;

  IF v_order_id IS NOT NULL THEN
    UPDATE payment_sessions
    SET used_at = COALESCE(used_at, v_now)
    WHERE id = v_session.id;

    RETURN jsonb_build_object('ok', true, 'parcelId', v_order_id, 'idempotent', true);
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
    status,
    terms_accepted_at
  ) VALUES (
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
    'pending',
    v_now
  )
  RETURNING id INTO v_order_id;

  UPDATE payment_sessions
  SET used_at = v_now
  WHERE id = v_session.id;

  RETURN jsonb_build_object('ok', true, 'parcelId', v_order_id, 'idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION complete_verified_payment_session(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_verified_payment_session(UUID, UUID, TEXT, TEXT) TO service_role;
