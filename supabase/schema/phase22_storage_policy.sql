-- ============================================
-- PATWADI Session 22 — Tighten custody proof upload policy
-- Run AFTER phase22_custody_location.sql
-- Path: {parcel_id}/{step}/{filename}
-- Only the sender for that handoff step may upload.
-- Uses SECURITY DEFINER helper so orders RLS does not block the check.
-- ============================================

CREATE OR REPLACE FUNCTION can_upload_custody_proof(p_object_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id::text = split_part(p_object_path, '/', 1)
      AND (
        (split_part(p_object_path, '/', 2) = 'customer_to_lmp' AND auth.uid() = o.customer_id)
        OR (split_part(p_object_path, '/', 2) = 'lmp_to_linehaul' AND auth.uid() = o.lmp_pickup_id)
        OR (split_part(p_object_path, '/', 2) = 'linehaul_to_lmp' AND auth.uid() = o.linehaul_id)
        OR (split_part(p_object_path, '/', 2) = 'lmp_to_customer' AND auth.uid() = o.lmp_delivery_id)
      )
  );
$$;

REVOKE ALL ON FUNCTION can_upload_custody_proof(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION can_upload_custody_proof(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Parcel participants upload custody proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload custody proofs" ON storage.objects;
DROP POLICY IF EXISTS "Handoff sender upload custody proofs" ON storage.objects;

CREATE POLICY "Handoff sender upload custody proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'custody-proofs'
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND split_part(name, '/', 2) IN (
    'customer_to_lmp', 'lmp_to_linehaul', 'linehaul_to_lmp', 'lmp_to_customer'
  )
  AND split_part(name, '/', 3) <> ''
  AND name NOT LIKE '%/..%'
  AND can_upload_custody_proof(name)
);
