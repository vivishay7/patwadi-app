-- ============================================
-- PATWADI Session 18 — Security / fraud hardening
-- Run AFTER phase17_operator_onboarding.sql
-- ============================================

-- 1) Orders: only service role (edge functions) may INSERT
DROP POLICY IF EXISTS "Customers can insert orders" ON orders;

-- 2) Profiles: users cannot self-escalate role / approval / operator_status
CREATE OR REPLACE FUNCTION prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Cannot change role';
    END IF;
    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
      RAISE EXCEPTION 'Cannot change approval_status';
    END IF;
    IF NEW.operator_status IS DISTINCT FROM OLD.operator_status THEN
      RAISE EXCEPTION 'Cannot change operator_status';
    END IF;
    IF NEW.is_available IS DISTINCT FROM OLD.is_available THEN
      RAISE EXCEPTION 'Cannot change is_available';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_profile_privilege_escalation();

-- 3) Custody handoff: atomic code consumption + event insert (prevents double-spend race)
CREATE OR REPLACE FUNCTION acknowledge_handoff_atomic(
  p_code_id UUID,
  p_parcel_id UUID,
  p_step TEXT,
  p_code TEXT,
  p_from_user_id UUID,
  p_photo_path TEXT,
  p_mime_type TEXT DEFAULT 'image/jpeg'
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
    mime_type
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
    COALESCE(p_mime_type, 'image/jpeg')
  )
  RETURNING * INTO v_event;

  RETURN jsonb_build_object('event', to_jsonb(v_event));
END;
$$;

REVOKE ALL ON FUNCTION acknowledge_handoff_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION acknowledge_handoff_atomic TO service_role;

-- 4) Storage: tighten custody proof uploads to parcel participants + path convention
DROP POLICY IF EXISTS "Authenticated upload custody proofs" ON storage.objects;
CREATE POLICY "Parcel participants upload custody proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'custody-proofs'
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND split_part(name, '/', 2) IN (
    'customer_to_lmp', 'lmp_to_linehaul', 'linehaul_to_lmp', 'lmp_to_customer'
  )
  AND EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id::text = split_part(name, '/', 1)
      AND auth.uid() IN (o.customer_id, o.lmp_pickup_id, o.linehaul_id, o.lmp_delivery_id)
  )
);
