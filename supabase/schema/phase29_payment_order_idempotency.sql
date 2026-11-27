-- ============================================
-- PATWADI Phase 29 — Payment verification idempotency guard
-- Run AFTER phase28_unpredictable_tracking_code.sql
-- ============================================
-- verify-razorpay-payment can be invoked more than once for the same Razorpay
-- order (for example, retries or double taps). Enforce one parcel per Razorpay
-- order at the database layer so concurrent verification calls cannot create
-- duplicate paid parcels before payment_sessions.used_at is updated.

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id_unique
  ON orders(razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;
