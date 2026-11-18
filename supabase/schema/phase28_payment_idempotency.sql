-- ============================================
-- PATWADI Phase 28 — Payment verification idempotency
-- Run AFTER phase27_operator_order_view_security_invoker.sql
-- ============================================
-- A Razorpay order represents exactly one successful Patwadi parcel. Enforce
-- that at the database layer so concurrent verify-razorpay-payment requests
-- cannot create duplicate confirmed parcels before payment_sessions.used_at is set.

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id_unique
  ON orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;
