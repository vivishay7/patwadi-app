-- ============================================
-- PATWADI Phase 26 — Public parcel tracking code
-- Format: P + 16 random uppercase hexadecimal chars
-- Example: P8F3A91C02D7B4E6F
-- Run AFTER phase25_operator_agreement.sql
-- ============================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tracking_code
  ON orders (tracking_code)
  WHERE tracking_code IS NOT NULL;

CREATE OR REPLACE FUNCTION generate_tracking_code(
  p_created_at TIMESTAMPTZ,
  p_corridor_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_code TEXT;
BEGIN
  LOOP
    v_code := 'P' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 16));
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM orders
      WHERE tracking_code = v_code
    );
  END LOOP;

  RETURN v_code;
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
