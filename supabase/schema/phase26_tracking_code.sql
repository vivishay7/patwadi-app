-- ============================================
-- PATWADI Phase 26 — Public parcel tracking code
-- Format: P + YY + DD + MM + NNN + OO
-- Example: P262006001DC = 2026-06-20, parcel #001, Delhi→Chandigarh (D+C)
-- Run AFTER phase25_operator_agreement.sql
-- ============================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tracking_code
  ON orders (tracking_code)
  WHERE tracking_code IS NOT NULL;

-- Daily sequence for the NNN segment (Asia/Kolkata calendar day)
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

CREATE OR REPLACE FUNCTION generate_tracking_code(
  p_created_at TIMESTAMPTZ,
  p_corridor_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_local_ts TIMESTAMPTZ;
  v_date DATE;
  v_seq INTEGER;
BEGIN
  v_local_ts := COALESCE(p_created_at, NOW()) AT TIME ZONE 'Asia/Kolkata';
  v_date := v_local_ts::DATE;
  v_seq := next_tracking_code_seq(v_date);

  RETURN
    'P'
    || to_char(v_local_ts, 'YY')
    || to_char(v_local_ts, 'DD')
    || to_char(v_local_ts, 'MM')
    || lpad(v_seq::TEXT, 3, '0')
    || corridor_city_initials(p_corridor_key);
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
