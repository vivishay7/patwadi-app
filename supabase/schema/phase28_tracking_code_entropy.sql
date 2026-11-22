-- ============================================
-- PATWADI Phase 28 — Harden public tracking code entropy
-- Run AFTER phase27_operator_order_view_security_invoker.sql
-- ============================================
-- The public tracking endpoint is unauthenticated, so new tracking codes must
-- be opaque lookup secrets rather than date/corridor/sequence values. Existing
-- legacy codes remain valid because this only changes future generation.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  -- Parameters are kept for compatibility with the existing trigger signature.
  FOR v_attempt IN 1..8 LOOP
    v_code := 'P' || random_tracking_token(12);
    IF NOT EXISTS (SELECT 1 FROM orders WHERE tracking_code = v_code) THEN
      RETURN v_code;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'TRACKING_CODE_GENERATION_COLLISION';
END;
$$;

REVOKE ALL ON FUNCTION random_tracking_token(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION random_tracking_token(INTEGER) TO service_role;
REVOKE ALL ON FUNCTION generate_tracking_code(TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_tracking_code(TIMESTAMPTZ, TEXT) TO service_role;
