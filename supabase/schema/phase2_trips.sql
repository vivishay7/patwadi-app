-- ============================================
-- PATWADI Phase 2 Schema (v6 §2.2-2.6, §13.2-13.3)
-- Linehaul trips, conductors, transfers, audit logs, recoveries.
-- Run AFTER profiles.sql and mvp_custody.sql
-- ============================================

-- ============================================
-- 0) Shared admin check (matches mvp_custody.sql inline pattern)
-- ============================================
CREATE OR REPLACE FUNCTION is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE user_id = auth.uid() AND active = true
  );
$$;

-- ============================================
-- 1) linehaul_trips (v6 §2.3)
-- ============================================
CREATE TABLE IF NOT EXISTS linehaul_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- corridor_id references CorridorDefinition.key (defined in app code, not a table)
  corridor_id TEXT NOT NULL,
  route_label TEXT NOT NULL,
  bus_number TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  scheduled_departure_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expected_arrival_at TIMESTAMP WITH TIME ZONE NOT NULL,
  capacity_count INTEGER,
  capacity_weight DECIMAL(10, 2),
  -- mandatory before draft -> open; empty string not allowed once open (enforced app/edge-side)
  bus_proof_photo_path TEXT,
  status TEXT NOT NULL
    CHECK (status IN ('draft', 'open', 'closed', 'completed', 'cancelled'))
    DEFAULT 'draft',
  accepts_new_parcels BOOLEAN NOT NULL DEFAULT FALSE,
  details_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_conductor_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_to_new_parcels_at TIMESTAMP WITH TIME ZONE,
  details_locked_at TIMESTAMP WITH TIME ZONE,
  is_extra_trip BOOLEAN NOT NULL DEFAULT FALSE,
  extra_trip_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_linehaul_trips_corridor_id ON linehaul_trips(corridor_id);
CREATE INDEX IF NOT EXISTS idx_linehaul_trips_status ON linehaul_trips(status);
CREATE INDEX IF NOT EXISTS idx_linehaul_trips_created_by ON linehaul_trips(created_by_conductor_id);
CREATE INDEX IF NOT EXISTS idx_linehaul_trips_departure ON linehaul_trips(scheduled_departure_at);

CREATE TRIGGER update_linehaul_trips_updated_at
  BEFORE UPDATE ON linehaul_trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE linehaul_trips ENABLE ROW LEVEL SECURITY;
-- (linehaul_trips policies are created after linehaul_trip_conductors exists,
--  because the read policy references it)

-- ============================================
-- 2) linehaul_trip_conductors (v6 §2.4)
-- ============================================
CREATE TABLE IF NOT EXISTS linehaul_trip_conductors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES linehaul_trips(id) ON DELETE CASCADE NOT NULL,
  conductor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('primary', 'co_conductor')),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active_from TIMESTAMP WITH TIME ZONE,
  active_until TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  location_at_add_lat DOUBLE PRECISION,
  location_at_add_lng DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_trip_conductors_trip_id ON linehaul_trip_conductors(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_conductors_conductor_id ON linehaul_trip_conductors(conductor_id);

ALTER TABLE linehaul_trip_conductors ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER membership helper: policies on linehaul_trips and
-- linehaul_trip_conductors must not query each other directly (RLS policies
-- would recurse: trips -> conductors -> trips -> ... = error 42P17).
CREATE OR REPLACE FUNCTION is_trip_member(p_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM linehaul_trip_conductors
    WHERE trip_id = p_trip_id AND conductor_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM linehaul_trips
    WHERE id = p_trip_id AND created_by_conductor_id = auth.uid()
  );
$$;

-- Tier 2: a conductor sees their own rows, and all conductor rows on trips
-- they belong to (a primary must see their co-conductors and vice versa).
-- Uses is_trip_member (SECURITY DEFINER, defined below) to avoid policy
-- recursion between this table and linehaul_trips.
CREATE POLICY "Conductors can read conductor rows on own trips"
  ON linehaul_trip_conductors FOR SELECT
  USING (
    auth.uid() = conductor_id
    OR is_trip_member(trip_id)
  );

-- Inserts/updates via service-role edge functions (co-conductor add, transfer)

CREATE POLICY "Admins can read all trip conductors"
  ON linehaul_trip_conductors FOR SELECT
  USING (is_active_admin());

-- ---- linehaul_trips policies (deferred from section 1) ----

-- Tier 2: conductors see trips they belong to (creator or conductor row)
CREATE POLICY "Conductors can read own trips"
  ON linehaul_trips FOR SELECT
  USING (
    auth.uid() = created_by_conductor_id
    OR is_trip_member(id)
  );

-- Approved linehaul operators can create their own trips
CREATE POLICY "Approved linehaul can create own trips"
  ON linehaul_trips FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_conductor_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'linehaul' AND approval_status = 'approved'
    )
  );

-- Conductors can update their own trips (details_locked gating is app/edge-side;
-- post-lock edits go through admin override via service role)
CREATE POLICY "Conductors can update own trips"
  ON linehaul_trips FOR UPDATE
  USING (auth.uid() = created_by_conductor_id);

-- Tier 3: admin reads everything (writes via service-role edge functions)
CREATE POLICY "Admins can read all trips"
  ON linehaul_trips FOR SELECT
  USING (is_active_admin());

-- ============================================
-- 3) linehaul_trip_transfer_requests (v6 §2.5)
-- ============================================
CREATE TABLE IF NOT EXISTS linehaul_trip_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES linehaul_trips(id) ON DELETE CASCADE NOT NULL,
  from_conductor_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  to_conductor_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  from_location_lat DOUBLE PRECISION,
  from_location_lng DOUBLE PRECISION,
  to_location_lat DOUBLE PRECISION,
  to_location_lng DOUBLE PRECISION,
  risk_reasons TEXT[] NOT NULL DEFAULT '{}',
  admin_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL
    CHECK (status IN ('rejected', 'auto_accepted', 'auto_accepted_with_flag')),
  -- null = unknown until Phase 4 ships; never false by default
  not_physically_traveling BOOLEAN
);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_trip_id ON linehaul_trip_transfer_requests(trip_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_from ON linehaul_trip_transfer_requests(from_conductor_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_review ON linehaul_trip_transfer_requests(admin_review_required);

ALTER TABLE linehaul_trip_transfer_requests ENABLE ROW LEVEL SECURITY;

-- Tier 2: participants see their own transfer requests
CREATE POLICY "Participants can read own transfer requests"
  ON linehaul_trip_transfer_requests FOR SELECT
  USING (auth.uid() = from_conductor_id OR auth.uid() = to_conductor_id);

-- Inserts via service-role edge function only (risk flags computed server-side;
-- client inserts could forge risk_reasons/admin_review_required)

CREATE POLICY "Admins can read all transfer requests"
  ON linehaul_trip_transfer_requests FOR SELECT
  USING (is_active_admin());

-- ============================================
-- 4) trip_audit_logs (v6 §2.6) — admin surface only
-- ============================================
CREATE TABLE IF NOT EXISTS trip_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES linehaul_trips(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  action TEXT NOT NULL,
  before_value JSONB,
  after_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- internal flag only: action occurred within 60min of scheduled_departure_at
  near_departure BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_trip_audit_logs_trip_id ON trip_audit_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_audit_logs_actor_id ON trip_audit_logs(actor_id);

ALTER TABLE trip_audit_logs ENABLE ROW LEVEL SECURITY;

-- Writes via service-role edge functions; near_departure is internal-only,
-- so operators get no read access. Tier 3 only.
CREATE POLICY "Admins can read all trip audit logs"
  ON trip_audit_logs FOR SELECT
  USING (is_active_admin());

-- ============================================
-- 5) parcel_recoveries (v6 §13.2) — admin workflow
-- ============================================
CREATE TABLE IF NOT EXISTS parcel_recoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  recovery_of_trip_id UUID REFERENCES linehaul_trips(id) ON DELETE SET NULL NOT NULL,
  recovered_by_trip_id UUID REFERENCES linehaul_trips(id) ON DELETE SET NULL,
  status TEXT NOT NULL
    CHECK (status IN ('open', 'in_progress', 'resolved', 'unrecoverable'))
    DEFAULT 'open',
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  reason TEXT NOT NULL,
  escalation_level INTEGER NOT NULL DEFAULT 0,
  last_escalated_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_parcel_recoveries_parcel_id ON parcel_recoveries(parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_recoveries_status ON parcel_recoveries(status);

ALTER TABLE parcel_recoveries ENABLE ROW LEVEL SECURITY;

-- Tier 1 (customers): no access — they only see blocked_exception on the order.
-- Tier 2 (operators): no access — recovery is an admin workflow.
CREATE POLICY "Admins can read all parcel recoveries"
  ON parcel_recoveries FOR SELECT
  USING (is_active_admin());

-- Writes via service-role edge functions / admin tooling.

-- ============================================
-- 6) Orders linkage (v6 §2.1 trip_id, §13.3 recovery mirror fields)
-- ============================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES linehaul_trips(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recovery_of_trip_id UUID REFERENCES linehaul_trips(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recovered_by_trip_id UUID REFERENCES linehaul_trips(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_trip_id ON orders(trip_id);
CREATE INDEX IF NOT EXISTS idx_orders_recovery_of_trip_id ON orders(recovery_of_trip_id);
