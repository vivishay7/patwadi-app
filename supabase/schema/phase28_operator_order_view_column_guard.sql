-- ============================================
-- PATWADI Phase 28 — restore operator order column guard
-- Run AFTER phase27_operator_order_view_security_invoker.sql
-- ============================================
-- Operators must not receive direct SELECT access to orders: RLS is row-level
-- only, so a matching policy would expose sensitive columns that v6 §14 keeps
-- out of operator_order_view. Keep the row filter and column allowlist on the
-- definer-rights view instead.

DROP POLICY IF EXISTS "Operators can read assigned orders" ON orders;

CREATE OR REPLACE VIEW public.operator_order_view
WITH (security_barrier, security_invoker = false) AS
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
FROM public.orders
WHERE auth.uid() IN (lmp_pickup_id, linehaul_id, lmp_delivery_id);

REVOKE ALL ON public.operator_order_view FROM PUBLIC;
REVOKE ALL ON public.operator_order_view FROM anon;
GRANT SELECT ON public.operator_order_view TO authenticated;
