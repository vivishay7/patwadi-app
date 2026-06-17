-- Phase 14: Customer saved addresses (address book)

CREATE TABLE IF NOT EXISTS saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  place_id TEXT,
  place_name TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  phone_number TEXT,
  whatsapp_notifications BOOLEAN DEFAULT true,
  street TEXT,
  apartment_building TEXT,
  landmark TEXT,
  delivery_instructions TEXT,
  should_call_for_instructions BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT saved_addresses_label_len CHECK (char_length(trim(label)) BETWEEN 1 AND 40),
  CONSTRAINT saved_addresses_user_label_unique UNIQUE (user_id, label)
);

CREATE INDEX IF NOT EXISTS saved_addresses_user_id_idx ON saved_addresses (user_id);

ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own saved addresses" ON saved_addresses;
CREATE POLICY "Users read own saved addresses"
  ON saved_addresses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own saved addresses" ON saved_addresses;
CREATE POLICY "Users insert own saved addresses"
  ON saved_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own saved addresses" ON saved_addresses;
CREATE POLICY "Users update own saved addresses"
  ON saved_addresses FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own saved addresses" ON saved_addresses;
CREATE POLICY "Users delete own saved addresses"
  ON saved_addresses FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION set_saved_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS saved_addresses_updated_at ON saved_addresses;
CREATE TRIGGER saved_addresses_updated_at
  BEFORE UPDATE ON saved_addresses
  FOR EACH ROW
  EXECUTE FUNCTION set_saved_addresses_updated_at();
