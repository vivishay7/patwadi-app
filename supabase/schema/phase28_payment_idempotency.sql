-- ============================================
-- PATWADI Phase 28 — Razorpay payment idempotency
-- Run AFTER phase27_operator_order_view_security_invoker.sql
-- ============================================

-- A verified Razorpay order/payment must produce at most one parcel. The
-- verify-razorpay-payment Edge Function treats unique violations as idempotent
-- retries and returns the already-created parcel.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id_unique
  ON orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id_unique
  ON orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;
