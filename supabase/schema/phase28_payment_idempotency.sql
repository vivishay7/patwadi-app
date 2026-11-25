-- ============================================
-- PATWADI Phase 28 - Payment verification idempotency
-- Run AFTER phase27_operator_order_view_security_invoker.sql
-- ============================================
-- A Razorpay order backs exactly one Patwadi parcel. This database guard
-- prevents concurrent verify-razorpay-payment retries from creating duplicates.

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id_unique
  ON orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;
