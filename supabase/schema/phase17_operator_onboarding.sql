-- ============================================
-- PATWADI Session 17 — Operator onboarding (v6 §20)
-- Run AFTER phase16_profile_delete_policy.sql
-- ============================================

-- §20.1 — operator_status on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS operator_status TEXT NOT NULL DEFAULT 'inactive'
  CHECK (operator_status IN ('active', 'suspended', 'inactive'));

UPDATE profiles
SET operator_status = 'active'
WHERE role IN ('lmp', 'linehaul')
  AND approval_status = 'approved';

-- §20.2 — operator_kyc_packets
CREATE TABLE IF NOT EXISTS operator_kyc_packets (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  aadhaar_storage_path TEXT NOT NULL,
  pan_storage_path TEXT,
  selfie_storage_path TEXT NOT NULL,
  payment_method_type TEXT NOT NULL CHECK (payment_method_type IN ('upi', 'bank_transfer')),
  upi_id TEXT,
  bank_account_number TEXT,
  bank_ifsc_code TEXT,
  bank_account_name TEXT,
  bank_account_type TEXT CHECK (bank_account_type IS NULL OR bank_account_type IN ('savings', 'current')),
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT operator_kyc_upi_fields CHECK (
    payment_method_type <> 'upi' OR (upi_id IS NOT NULL AND upi_id <> '')
  ),
  CONSTRAINT operator_kyc_bank_fields CHECK (
    payment_method_type <> 'bank_transfer'
    OR (
      bank_account_number IS NOT NULL AND bank_account_number <> ''
      AND bank_ifsc_code IS NOT NULL AND bank_ifsc_code <> ''
      AND bank_account_name IS NOT NULL AND bank_account_name <> ''
      AND bank_account_type IS NOT NULL
    )
  )
);

ALTER TABLE operator_kyc_packets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators read own kyc packet"
  ON operator_kyc_packets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage kyc packets"
  ON operator_kyc_packets FOR ALL
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

-- §20.2 — operator_corridors
CREATE TABLE IF NOT EXISTS operator_corridors (
  operator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  corridor_key TEXT NOT NULL REFERENCES corridors(key) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (operator_id, corridor_key)
);

CREATE INDEX IF NOT EXISTS idx_operator_corridors_operator ON operator_corridors(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_corridors_corridor ON operator_corridors(corridor_key);

ALTER TABLE operator_corridors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators read own corridors"
  ON operator_corridors FOR SELECT
  USING (auth.uid() = operator_id);

CREATE POLICY "Admins manage operator corridors"
  ON operator_corridors FOR ALL
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

-- §20.1 — eligibility requires operator_status = active
CREATE OR REPLACE FUNCTION is_conductor_approved_and_available(p_conductor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_conductor_id
      AND role = 'linehaul'
      AND approval_status = 'approved'
      AND operator_status = 'active'
      AND is_available = TRUE
  );
$$;

-- §20.4 — trip insert rejects unassigned corridors
CREATE OR REPLACE FUNCTION enforce_operator_corridor_on_trip()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM operator_corridors oc
    WHERE oc.operator_id = NEW.created_by_conductor_id
      AND oc.corridor_key = NEW.corridor_id
  ) THEN
    RAISE EXCEPTION 'Corridor not assigned to operator';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_operator_corridor ON linehaul_trips;
CREATE TRIGGER trg_enforce_operator_corridor
  BEFORE INSERT ON linehaul_trips
  FOR EACH ROW EXECUTE FUNCTION enforce_operator_corridor_on_trip();

-- Tighten trip creation: approved + active operator
DROP POLICY IF EXISTS "Approved linehaul can create own trips" ON linehaul_trips;
CREATE POLICY "Approved linehaul can create own trips"
  ON linehaul_trips FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_conductor_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'linehaul'
        AND approval_status = 'approved'
        AND operator_status = 'active'
    )
  );

-- §20.1 — block in-app operator self-signup at RLS
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'customer');

-- Seed: testlinehaul@patwadi.com -> delhi_chandigarh
INSERT INTO operator_corridors (operator_id, corridor_key, assigned_at)
SELECT p.id, 'delhi_chandigarh', NOW()
FROM profiles p
INNER JOIN auth.users u ON u.id = p.id
WHERE u.email = 'testlinehaul@patwadi.com'
  AND p.role = 'linehaul'
ON CONFLICT (operator_id, corridor_key) DO NOTHING;

INSERT INTO operator_corridors (operator_id, corridor_key, assigned_at)
SELECT p.id, 'delhi_chandigarh', NOW()
FROM profiles p
INNER JOIN auth.users u ON u.id = p.id
WHERE u.email = 'testlinehaul2@patwadi.com'
  AND p.role = 'linehaul'
ON CONFLICT (operator_id, corridor_key) DO NOTHING;
