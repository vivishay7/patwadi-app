-- ============================================
-- PATWADI Phase 27 — operator_order_view hardening
-- Run AFTER phase26_tracking_code.sql
-- ============================================
-- Operators must use operator_order_view's column allowlist. Do not grant a
-- direct orders SELECT policy for lmp/linehaul assignments, because that would
-- expose customer/payment columns intentionally excluded by v6 §14.

DROP POLICY IF EXISTS "Operators can read assigned orders" ON orders;

ALTER VIEW public.operator_order_view SET (security_invoker = false);
