-- ============================================
-- PATWADI Phase 28 — payment/tracking security backstops
-- Run AFTER phase27_operator_order_view_security_invoker.sql
-- ============================================

-- One Razorpay order represents exactly one Patwadi parcel. This protects
-- verify-razorpay-payment retries and races from creating duplicate orders.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id_unique
  ON orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

-- tracking_code_daily_seq is an internal counter used by triggers/functions.
-- API clients must not be able to read or mutate it.
ALTER TABLE tracking_code_daily_seq ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE tracking_code_daily_seq FROM PUBLIC, anon, authenticated;

-- Operators must read through operator_order_view's column allowlist; direct
-- orders SELECT would expose customer/payment columns excluded by v6 §14.
DROP POLICY IF EXISTS "Operators can read assigned orders" ON orders;
ALTER VIEW public.operator_order_view SET (security_invoker = false);
