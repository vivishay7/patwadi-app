-- ============================================
-- PATWADI Phase 28 — Razorpay verification idempotency
-- Run AFTER phase27_operator_order_view_security_invoker.sql
-- ============================================
-- A successful Razorpay order/payment must create at most one Patwadi order.
-- Edge Function retries or duplicate mobile submissions can race before
-- payment_sessions.used_at is set, so enforce the invariant in Postgres too.

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id_unique
  ON orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id_unique
  ON orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL
    AND razorpay_payment_id <> 'dev_skip';
