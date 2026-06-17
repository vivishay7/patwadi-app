-- Create custody-proofs bucket if missing (bus proof + handoff photos).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'custody-proofs',
  'custody-proofs',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Linehaul operators can read bus proof photos for trips they own.
DROP POLICY IF EXISTS "Linehaul read own bus proof photos" ON storage.objects;
CREATE POLICY "Linehaul read own bus proof photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'custody-proofs'
  AND name LIKE 'trip-bus/%'
  AND EXISTS (
    SELECT 1 FROM linehaul_trips t
    WHERE t.created_by_conductor_id = auth.uid()
      AND name LIKE 'trip-bus/' || t.id::text || '/%'
  )
);
