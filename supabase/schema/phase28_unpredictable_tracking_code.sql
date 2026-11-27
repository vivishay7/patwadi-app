-- ============================================
-- PATWADI Phase 28 — Rotate public tracking codes to non-enumerable tokens
-- Run AFTER phase27_operator_order_view_security_invoker.sql
-- ============================================
-- Phase 26 originally generated tracking codes from date + daily sequence +
-- corridor initials, which made public no-JWT tracking lookups enumerable.
-- Keep the existing function signature used by the trigger, but ignore the
-- inputs and issue high-entropy public codes instead.

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

-- Invalidate predictable legacy codes already assigned to paid parcels.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, created_at, corridor_key
    FROM orders
    WHERE payment_status = 'confirmed'
      AND tracking_code ~ '^P[0-9]{9}[A-Z]{2}$'
    ORDER BY created_at ASC
  LOOP
    UPDATE orders
    SET tracking_code = generate_tracking_code(r.created_at, r.corridor_key)
    WHERE id = r.id;
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS next_tracking_code_seq(DATE);
DROP FUNCTION IF EXISTS corridor_city_initials(TEXT);
DROP TABLE IF EXISTS tracking_code_daily_seq;
