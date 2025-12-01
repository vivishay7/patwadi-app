-- ============================================
-- PATWADI DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PROFILES TABLE
-- Stores user profile data linked to auth.users
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  role TEXT CHECK (role IN ('customer', 'driver')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 2. DRIVER KYC TABLE
-- Stores driver verification documents
-- ============================================
CREATE TABLE IF NOT EXISTS driver_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  aadhaar_number TEXT,
  license_number TEXT,
  photo_url TEXT,
  status TEXT CHECK (status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE driver_kyc ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own KYC
CREATE POLICY "Users can read own kyc"
  ON driver_kyc FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own KYC
CREATE POLICY "Users can insert own kyc"
  ON driver_kyc FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own KYC
CREATE POLICY "Users can update own kyc"
  ON driver_kyc FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. DRIVER BUS DETAILS TABLE
-- Stores driver's bus/route information
-- ============================================
CREATE TABLE IF NOT EXISTS driver_bus_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  operator_name TEXT,
  routes TEXT[],
  vehicle_number TEXT,
  capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE driver_bus_details ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own bus details
CREATE POLICY "Users can read own bus details"
  ON driver_bus_details FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own bus details
CREATE POLICY "Users can insert own bus details"
  ON driver_bus_details FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bus details
CREATE POLICY "Users can update own bus details"
  ON driver_bus_details FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. ORDERS TABLE (for future use)
-- Stores parcel orders
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  weight_kg DECIMAL(10, 2),
  dimensions JSONB,
  contents TEXT,
  price_estimate DECIMAL(10, 2),
  final_price DECIMAL(10, 2),
  status TEXT CHECK (status IN ('pending', 'accepted', 'in_transit', 'delivered', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can read their own orders
CREATE POLICY "Customers can read own orders"
  ON orders FOR SELECT
  USING (auth.uid() = customer_id);

-- Policy: Drivers can read orders assigned to them
CREATE POLICY "Drivers can read assigned orders"
  ON orders FOR SELECT
  USING (auth.uid() = driver_id);

-- Policy: Customers can insert orders
CREATE POLICY "Customers can insert orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- ============================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_driver_kyc_user_id ON driver_kyc(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_kyc_status ON driver_kyc(status);
CREATE INDEX IF NOT EXISTS idx_driver_bus_details_user_id ON driver_bus_details(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ============================================
-- 6. UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_kyc_updated_at
  BEFORE UPDATE ON driver_kyc
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_bus_details_updated_at
  BEFORE UPDATE ON driver_bus_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

