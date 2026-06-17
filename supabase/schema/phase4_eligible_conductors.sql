-- v6 §5 / §6.1 — eligible linehaul conductor lookup for co-conductor / transfer pickers
-- Run AFTER phase4_trip_logic.sql (uses same approval + availability criteria)

CREATE OR REPLACE FUNCTION list_eligible_linehaul_conductors()
RETURNS TABLE (id UUID, phone TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.phone
  FROM profiles p
  WHERE p.role = 'linehaul'
    AND p.approval_status = 'approved'
    AND p.is_available = TRUE
    AND p.id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles caller
      WHERE caller.id = auth.uid()
        AND caller.role = 'linehaul'
        AND caller.approval_status = 'approved'
    )
  ORDER BY p.phone NULLS LAST, p.id;
$$;

REVOKE ALL ON FUNCTION list_eligible_linehaul_conductors() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_eligible_linehaul_conductors() TO authenticated;
