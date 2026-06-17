-- custody-proofs bucket RLS (v6 §9 POD + handoff photos)
-- Path convention: {parcel_id}/{step}/{filename}

DROP POLICY IF EXISTS "Customers read own parcel custody proofs" ON storage.objects;
CREATE POLICY "Customers read own parcel custody proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'custody-proofs'
  AND EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = auth.uid()
      AND o.id::text = split_part(name, '/', 1)
  )
);

DROP POLICY IF EXISTS "Operators read own parcel custody proofs" ON storage.objects;
CREATE POLICY "Operators read own parcel custody proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'custody-proofs'
  AND EXISTS (
    SELECT 1 FROM orders o
    WHERE auth.uid() IN (o.lmp_pickup_id, o.linehaul_id, o.lmp_delivery_id)
      AND o.id::text = split_part(name, '/', 1)
  )
);

DROP POLICY IF EXISTS "Authenticated upload custody proofs" ON storage.objects;
CREATE POLICY "Authenticated upload custody proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'custody-proofs');
