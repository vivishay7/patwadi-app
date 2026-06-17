-- ============================================
-- PATWADI MVP (Custody-first) Schema Additions
-- Run this SQL in Supabase SQL Editor AFTER profiles.sql
-- ============================================

-- ============================================
-- 1) Update profiles: roles + approval gating
-- ============================================
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('customer', 'lmp', 'linehaul'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT
  CHECK (approval_status IN ('pending', 'approved'))
  DEFAULT 'pending';

-- Customers are always approved
UPDATE profiles
SET approval_status = 'approved'
WHERE role = 'customer' AND (approval_status IS NULL OR approval_status <> 'approved');

CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON profiles(approval_status);

-- ============================================
-- 2) Orders: corridor + payment + operator assignment
-- ============================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS corridor_key TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT
    CHECK (payment_status IN ('pending', 'confirmed', 'failed'))
    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS lmp_pickup_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linehaul_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lmp_delivery_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS blocked_exception BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_corridor_key ON orders(corridor_key);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_lmp_pickup_id ON orders(lmp_pickup_id);
CREATE INDEX IF NOT EXISTS idx_orders_linehaul_id ON orders(linehaul_id);
CREATE INDEX IF NOT EXISTS idx_orders_lmp_delivery_id ON orders(lmp_delivery_id);
CREATE INDEX IF NOT EXISTS idx_orders_blocked_exception ON orders(blocked_exception);

-- ============================================
-- 2b) Payment sessions (order created only after verification)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  corridor_key TEXT NOT NULL,
  amount_in_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_order_id TEXT UNIQUE,
  -- Booking payload (minimal MVP). Do not store images here.
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  weight_kg DECIMAL(10, 2),
  dimensions JSONB,
  contents TEXT,
  price_estimate DECIMAL(10, 2),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payment sessions"
  ON payment_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts/updates are performed via Edge Function using service role.

CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_id ON payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_created_at ON payment_sessions(created_at);

-- ============================================
-- 3) Custody events
-- ============================================
CREATE TABLE IF NOT EXISTS custody_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  from_role TEXT NOT NULL CHECK (from_role IN ('customer', 'lmp', 'linehaul')),
  to_role TEXT NOT NULL CHECK (to_role IN ('customer', 'lmp', 'linehaul')),
  proof_type TEXT NOT NULL CHECK (proof_type IN ('code', 'photo')),
  -- For MVP: always store photo storage key/path here (code is validated via handoff_codes)
  proof_value TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE custody_events ENABLE ROW LEVEL SECURITY;

-- Allow participants (from/to) and customer (parcel owner) to read custody events
CREATE POLICY "Read custody events (participant or customer)"
  ON custody_events FOR SELECT
  USING (
    auth.uid() = from_user_id
    OR auth.uid() = to_user_id
    OR auth.uid() IN (SELECT customer_id FROM orders WHERE orders.id = custody_events.parcel_id)
  );

-- Inserts are performed via Edge Function using service role (no client inserts).

CREATE INDEX IF NOT EXISTS idx_custody_events_parcel_id ON custody_events(parcel_id);
CREATE INDEX IF NOT EXISTS idx_custody_events_created_at ON custody_events(created_at);

-- ============================================
-- 4) Handoff codes (system controlled, per parcel + step)
-- ============================================
CREATE TABLE IF NOT EXISTS handoff_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  step TEXT NOT NULL CHECK (step IN (
    'customer_to_lmp',
    'lmp_to_linehaul',
    'linehaul_to_lmp',
    'lmp_to_customer'
  )),
  to_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  to_role TEXT NOT NULL CHECK (to_role IN ('customer', 'lmp', 'linehaul')),
  expected_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at TIMESTAMP WITH TIME ZONE,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE handoff_codes ENABLE ROW LEVEL SECURITY;

-- Receiver can read their current codes (they show it at handoff)
CREATE POLICY "Receiver can read handoff code"
  ON handoff_codes FOR SELECT
  USING (auth.uid() = to_user_id);

-- Inserts/updates are performed via Edge Function using service role.

CREATE INDEX IF NOT EXISTS idx_handoff_codes_parcel_step ON handoff_codes(parcel_id, step);
CREATE INDEX IF NOT EXISTS idx_handoff_codes_to_user_id ON handoff_codes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_handoff_codes_expires_at ON handoff_codes(expires_at);

-- ============================================
-- 5) Admin profiles (in-app admin authz)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read own admin profile"
  ON admin_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_admin_profiles_active ON admin_profiles(active);

-- ============================================
-- 6) Admin audit logs
-- ============================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  action TEXT NOT NULL,
  parcel_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read own audit logs"
  ON admin_audit_logs FOR SELECT
  USING (auth.uid() = admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_parcel_id ON admin_audit_logs(parcel_id);

-- ============================================
-- 7) Admin read policies for ops visibility
-- ============================================
CREATE POLICY "Admins can read all orders"
  ON orders FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM admin_profiles WHERE active = true)
  );

CREATE POLICY "Admins can read all custody events"
  ON custody_events FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM admin_profiles WHERE active = true)
  );

CREATE POLICY "Admins can read all handoff codes"
  ON handoff_codes FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM admin_profiles WHERE active = true)
  );

CREATE POLICY "Admins can read all payment sessions"
  ON payment_sessions FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM admin_profiles WHERE active = true)
  );

