-- ============================================
-- PATWADI Phase 26 — Public parcel tracking code
-- Format: P + 12 uppercase base32 characters (opaque, non-enumerable)
-- Example: P8M4K2J7Q9TXR
-- Run AFTER phase25_operator_agreement.sql
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tracking_code
  ON orders (tracking_code)
  WHERE tracking_code IS NOT NULL;

-- Legacy deterministic codes used this sequence table. Keep it so rerunning this
-- migration is non-destructive for environments that already created it, but new
-- codes are generated from cryptographic randomness below.
CREATE TABLE IF NOT EXISTS tracking_code_daily_seq (
  seq_date DATE PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);

-- First letter of origin + first letter of destination from corridor_key slug
CREATE OR REPLACE FUNCTION corridor_city_initials(p_corridor_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized TEXT;
  origin_slug TEXT;
  dest_slug TEXT;
BEGIN
  IF p_corridor_key IS NULL OR btrim(p_corridor_key) = '' THEN
    RETURN 'XX';
  END IF;

  normalized := lower(regexp_replace(btrim(p_corridor_key), '-', '_', 'g'));
  origin_slug := split_part(normalized, '_', 1);
  dest_slug := split_part(normalized, '_', 2);

  IF dest_slug = '' OR dest_slug IS NULL THEN
    dest_slug := origin_slug;
  END IF;

  RETURN upper(left(origin_slug, 1)) || upper(left(dest_slug, 1));
END;
$$;

CREATE OR REPLACE FUNCTION next_tracking_code_seq(p_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  INSERT INTO tracking_code_daily_seq (seq_date, last_seq)
  VALUES (p_date, 1)
  ON CONFLICT (seq_date) DO UPDATE
  SET last_seq = tracking_code_daily_seq.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN v_seq;
END;
$$;

CREATE OR REPLACE FUNCTION random_tracking_token(p_length INTEGER DEFAULT 12)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet CONSTANT TEXT := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  token TEXT := '';
  byte_value INTEGER;
BEGIN
  IF p_length < 1 THEN
    RAISE EXCEPTION 'TRACKING_TOKEN_LENGTH_INVALID';
  END IF;

  WHILE length(token) < p_length LOOP
    byte_value := get_byte(gen_random_bytes(1), 0);
    token := token || substr(alphabet, (byte_value % length(alphabet)) + 1, 1);
  END LOOP;

  RETURN token;
END;
$$;

CREATE OR REPLACE FUNCTION generate_tracking_code(
  p_created_at TIMESTAMPTZ,
  p_corridor_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_attempt INTEGER;
BEGIN
  -- p_created_at and p_corridor_key are kept for trigger/backfill compatibility.
  -- Do not encode date, sequence, or corridor in public codes: the tracking
  -- endpoint is unauthenticated, so lookup keys must be unguessable.
  FOR v_attempt IN 1..8 LOOP
    v_code := 'P' || random_tracking_token(12);
    IF NOT EXISTS (SELECT 1 FROM orders WHERE tracking_code = v_code) THEN
      RETURN v_code;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'TRACKING_CODE_GENERATION_COLLISION';
END;
$$;

CREATE OR REPLACE FUNCTION set_order_tracking_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payment_status = 'confirmed' AND NEW.tracking_code IS NULL THEN
    NEW.tracking_code := generate_tracking_code(
      COALESCE(NEW.created_at, NOW()),
      NEW.corridor_key
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_tracking_code ON orders;
CREATE TRIGGER trg_set_order_tracking_code
  BEFORE INSERT OR UPDATE OF payment_status, corridor_key ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_tracking_code();

-- Backfill confirmed orders (ordered by created_at so daily seq reflects history)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, created_at, corridor_key
    FROM orders
    WHERE payment_status = 'confirmed'
      AND tracking_code IS NULL
    ORDER BY created_at ASC
  LOOP
    UPDATE orders
    SET tracking_code = generate_tracking_code(r.created_at, r.corridor_key)
    WHERE id = r.id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION next_tracking_code_seq FROM PUBLIC;
GRANT EXECUTE ON FUNCTION next_tracking_code_seq TO service_role;
REVOKE ALL ON FUNCTION random_tracking_token(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION random_tracking_token(INTEGER) TO service_role;
REVOKE ALL ON FUNCTION generate_tracking_code(TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_tracking_code(TIMESTAMPTZ, TEXT) TO service_role;
