-- ============================================
-- PATWADI Phase 28 — Atomic payment finalization
-- Run AFTER phase27_operator_order_view_security_invoker.sql
-- ============================================
-- A verified Razorpay order must create at most one confirmed parcel. The Edge
-- Function verifies signatures/amounts, then calls this RPC to lock the
-- payment session, insert the parcel, and mark the session used in one
-- transaction.

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id_unique
  ON orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION finalize_verified_payment_session(
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
  IF p_user_id IS NULL OR p_razorpay_order_id IS NULL OR p_razorpay_payment_id IS NULL THEN
    RAISE EXCEPTION 'MISSING_PAYMENT_FINALIZATION_FIELDS';
  END IF;

  SELECT *
  INTO v_session
  FROM payment_sessions
  WHERE razorpay_order_id = p_razorpay_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_SESSION_NOT_FOUND';
  END IF;

  IF v_session.user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'PAYMENT_SESSION_FORBIDDEN';
  END IF;

  IF v_session.used_at IS NOT NULL THEN
    SELECT id
    INTO v_order_id
    FROM orders
    WHERE razorpay_order_id = p_razorpay_order_id
      AND razorpay_payment_id = p_razorpay_payment_id
    LIMIT 1;

    IF v_order_id IS NULL THEN
      RAISE EXCEPTION 'PAYMENT_SESSION_ALREADY_USED';
    END IF;

    RETURN jsonb_build_object('ok', true, 'parcelId', v_order_id);
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
  ) VALUES (
    v_session.user_id,
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
    v_now,
    'pending'
  )
  ON CONFLICT (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_order_id;

  IF v_order_id IS NULL THEN
    SELECT id
    INTO v_order_id
    FROM orders
    WHERE razorpay_order_id = p_razorpay_order_id
      AND razorpay_payment_id = p_razorpay_payment_id
    LIMIT 1;

    IF v_order_id IS NULL THEN
      RAISE EXCEPTION 'PAYMENT_ORDER_CONFLICT';
    END IF;
  END IF;

  UPDATE payment_sessions
  SET used_at = v_now
  WHERE id = v_session.id;

  RETURN jsonb_build_object('ok', true, 'parcelId', v_order_id);
END;
$$;

REVOKE ALL ON FUNCTION finalize_verified_payment_session(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finalize_verified_payment_session(UUID, TEXT, TEXT) TO service_role;
