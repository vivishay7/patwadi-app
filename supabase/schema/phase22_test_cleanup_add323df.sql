-- ============================================
-- PATWADI Session 22 — Reset add323df test parcel for 4-hop chain re-run
-- Run manually before ITEM 5 verification (optional).
-- ============================================

-- Order: add323df-b2a6-4a4a-ba32-61e99ebfd83b
-- testlmp: a30847c9-f032-4168-b4b9-a8bfbff03bb2
-- testlinehaul: 43840a88-0597-42e1-83e8-c86c5c1999b3

DELETE FROM handoff_codes
WHERE parcel_id = 'add323df-b2a6-4a4a-ba32-61e99ebfd83b';

DELETE FROM custody_events
WHERE parcel_id = 'add323df-b2a6-4a4a-ba32-61e99ebfd83b';

UPDATE orders
SET
  lmp_pickup_id = NULL,
  lmp_delivery_id = NULL,
  linehaul_id = NULL,
  blocked_exception = FALSE,
  updated_at = NOW()
WHERE id = 'add323df-b2a6-4a4a-ba32-61e99ebfd83b';

-- Remove uploaded proof objects for this parcel (optional; list via storage UI if needed)
-- DELETE FROM storage.objects WHERE bucket_id = 'custody-proofs' AND name LIKE 'add323df-b2a6-4a4a-ba32-61e99ebfd83b/%';
