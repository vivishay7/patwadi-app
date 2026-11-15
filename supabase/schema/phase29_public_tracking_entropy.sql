-- ============================================
-- PATWADI Phase 29 — High-entropy public tracking codes
-- Run AFTER phase26_tracking_code.sql
-- ============================================

-- Public tracking is unauthenticated, so the lookup key must not encode date,
-- sequence, or corridor information. Format: P + 12 uppercase hex chars.
CREATE OR REPLACE FUNCTION generate_tracking_code(
  p_created_at TIMESTAMPTZ,
  p_corridor_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
BEGIN
  LOOP
    v_code := 'P' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 12));

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM orders
      WHERE tracking_code = v_code
    );
  END LOOP;

  RETURN v_code;
END;
$$;

-- Rotate legacy predictable codes (P + YYDDMM + daily sequence + corridor initials).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, created_at, corridor_key
    FROM orders
    WHERE tracking_code ~ '^P[0-9]{9}[A-Z]{2}$'
    ORDER BY created_at ASC
  LOOP
    UPDATE orders
    SET tracking_code = generate_tracking_code(r.created_at, r.corridor_key)
    WHERE id = r.id;
  END LOOP;
END;
$$;
