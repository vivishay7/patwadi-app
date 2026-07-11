-- ============================================
-- PATWADI Session 22 — Location on custody events + hardened handoff RPC
-- Run AFTER phase22_assign_lmp.sql
-- ============================================

ALTER TABLE custody_events
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_accuracy_m DOUBLE PRECISION;

-- Drop old signature so we can add location params.
DROP FUNCTION IF EXISTS acknowledge_handoff_atomic(UUID, UUID, TEXT, TEXT, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION acknowledge_handoff_atomic(
  p_code_id UUID,
  p_parcel_id UUID,
  p_step TEXT,
  p_code TEXT,
  p_from_user_id UUID,
  p_photo_path TEXT,
  p_mime_type TEXT DEFAULT 'image/jpeg',
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_location_accuracy_m DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code handoff_codes%ROWTYPE;
  v_parcel orders%ROWTYPE;
  v_prior_step TEXT;
  v_event custody_events%ROWTYPE;
  v_from_role TEXT;
BEGIN
  SELECT * INTO v_code
  FROM handoff_codes
  WHERE id = p_code_id
    AND parcel_id = p_parcel_id
    AND step = p_step
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'HANDOFF_CODE_NOT_FOUND';
  END IF;

  IF v_code.blocked THEN
    RAISE EXCEPTION 'HANDOFF_BLOCKED';
  END IF;

  IF v_code.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'HANDOFF_CODE_ALREADY_USED';
  END IF;

  IF v_code.expires_at < NOW() THEN
    RAISE EXCEPTION 'HANDOFF_CODE_EXPIRED';
  END IF;

  IF v_code.expected_code <> p_code THEN
    RAISE EXCEPTION 'HANDOFF_CODE_INVALID';
  END IF;

  SELECT * INTO v_parcel FROM orders WHERE id = p_parcel_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PARCEL_NOT_FOUND';
  END IF;

  IF v_parcel.blocked_exception THEN
    RAISE EXCEPTION 'PARCEL_BLOCKED';
  END IF;

  IF v_parcel.payment_status <> 'confirmed' THEN
    RAISE EXCEPTION 'PAYMENT_NOT_CONFIRMED';
  END IF;

  v_prior_step := CASE p_step
    WHEN 'customer_to_lmp' THEN NULL
    WHEN 'lmp_to_linehaul' THEN 'customer_to_lmp'
    WHEN 'linehaul_to_lmp' THEN 'lmp_to_linehaul'
    WHEN 'lmp_to_customer' THEN 'linehaul_to_lmp'
    ELSE NULL
  END;

  IF v_prior_step IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM custody_events ce
    WHERE ce.parcel_id = p_parcel_id
      AND ce.from_role = CASE v_prior_step
        WHEN 'customer_to_lmp' THEN 'customer'
        WHEN 'lmp_to_linehaul' THEN 'lmp'
        WHEN 'linehaul_to_lmp' THEN 'linehaul'
      END
      AND ce.to_role = CASE v_prior_step
        WHEN 'customer_to_lmp' THEN 'lmp'
        WHEN 'lmp_to_linehaul' THEN 'linehaul'
        WHEN 'linehaul_to_lmp' THEN 'lmp'
      END
  ) THEN
    RAISE EXCEPTION 'PRIOR_CUSTODY_STEP_MISSING';
  END IF;

  v_from_role := CASE p_step
    WHEN 'customer_to_lmp' THEN 'customer'
    WHEN 'lmp_to_linehaul' THEN 'lmp'
    WHEN 'linehaul_to_lmp' THEN 'linehaul'
    WHEN 'lmp_to_customer' THEN 'lmp'
    ELSE NULL
  END;

  UPDATE handoff_codes
  SET used_at = NOW()
  WHERE id = p_code_id AND used_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'HANDOFF_CODE_ALREADY_USED';
  END IF;

  INSERT INTO custody_events (
    parcel_id,
    from_user_id,
    to_user_id,
    from_role,
    to_role,
    proof_type,
    proof_value,
    uploaded_by,
    uploaded_at,
    mime_type,
    lat,
    lng,
    location_accuracy_m
  ) VALUES (
    p_parcel_id,
    p_from_user_id,
    v_code.to_user_id,
    v_from_role,
    v_code.to_role,
    'photo',
    p_photo_path,
    p_from_user_id,
    NOW(),
    COALESCE(p_mime_type, 'image/jpeg'),
    p_lat,
    p_lng,
    p_location_accuracy_m
  )
  RETURNING * INTO v_event;

  RETURN jsonb_build_object('event', to_jsonb(v_event));
END;
$$;

REVOKE ALL ON FUNCTION acknowledge_handoff_atomic(UUID, UUID, TEXT, TEXT, UUID, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION acknowledge_handoff_atomic(UUID, UUID, TEXT, TEXT, UUID, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO service_role;
