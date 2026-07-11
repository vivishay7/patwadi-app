-- ============================================
-- PATWADI Phase 27 — operator_order_view security_invoker
-- Run AFTER phase26_tracking_code.sql
-- ============================================
-- Supabase security lint: default views are SECURITY DEFINER (owner bypasses
-- underlying RLS). security_invoker runs the view as the querying user so
-- orders RLS applies. Tier-2 operators previously relied on the definer view
-- alone; add a matching SELECT policy so assigned lmp/linehaul operators still
-- see rows. Column projection stays on operator_order_view (§14).

DROP POLICY IF EXISTS "Operators can read assigned orders" ON orders;

CREATE POLICY "Operators can read assigned orders"
  ON orders FOR SELECT
  USING (auth.uid() IN (lmp_pickup_id, linehaul_id, lmp_delivery_id));

ALTER VIEW public.operator_order_view SET (security_invoker = true);
