-- ============================================
-- PATWADI operator_order_view (v6 §14)
-- Tier 2 read path on orders: an operator sees rows where their profile id
-- matches lmp_pickup_id, linehaul_id, or lmp_delivery_id.
-- security_invoker: underlying orders RLS applies to the querying user.
-- Row scoping: orders policy + view WHERE (same predicate); security_barrier
-- prevents leaky-function pushdown. Column allowlist stays on this view (§14).
-- Run AFTER mvp_custody.sql and phase2_trips.sql
-- ============================================

CREATE POLICY "Operators can read assigned orders"
  ON orders FOR SELECT
  USING (auth.uid() IN (lmp_pickup_id, linehaul_id, lmp_delivery_id));

CREATE OR REPLACE VIEW operator_order_view
WITH (security_barrier, security_invoker = true) AS
SELECT
  id,
  corridor_key,
  pickup_location,
  dropoff_location,
  weight_kg,
  dimensions,
  contents,
  payment_status,
  blocked_exception,
  trip_id,
  recovery_of_trip_id,
  recovered_by_trip_id,
  created_at
FROM orders
WHERE auth.uid() IN (lmp_pickup_id, linehaul_id, lmp_delivery_id);
-- Excluded by design (v6 §14): customer_id, price_estimate,
-- razorpay_order_id, razorpay_payment_id, status (legacy).

REVOKE ALL ON operator_order_view FROM PUBLIC;
REVOKE ALL ON operator_order_view FROM anon;
GRANT SELECT ON operator_order_view TO authenticated;
