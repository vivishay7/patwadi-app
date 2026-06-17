-- ============================================
-- PATWADI Phase 3 — Trip timer transitions (v6 §3)
-- Materializes accepts_new_parcels (T-60min) and details_locked (T-10min)
-- for open trips. Run AFTER phase2_trips.sql
-- ============================================

-- Idempotent: only flips flags that are due and not yet materialized.
-- Sets closed_to_new_parcels_at / details_locked_at once (first transition).
CREATE OR REPLACE FUNCTION apply_linehaul_trip_timer_transitions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_parcels INTEGER;
  v_locked INTEGER;
BEGIN
  UPDATE linehaul_trips
  SET
    accepts_new_parcels = FALSE,
    closed_to_new_parcels_at = COALESCE(closed_to_new_parcels_at, NOW()),
    updated_at = NOW()
  WHERE status = 'open'
    AND accepts_new_parcels = TRUE
    AND NOW() >= scheduled_departure_at - INTERVAL '60 minutes';
  GET DIAGNOSTICS v_parcels = ROW_COUNT;

  UPDATE linehaul_trips
  SET
    details_locked = TRUE,
    details_locked_at = COALESCE(details_locked_at, NOW()),
    updated_at = NOW()
  WHERE status = 'open'
    AND details_locked = FALSE
    AND NOW() >= scheduled_departure_at - INTERVAL '10 minutes';
  GET DIAGNOSTICS v_locked = ROW_COUNT;

  v_count := v_parcels + v_locked;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION apply_linehaul_trip_timer_transitions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_linehaul_trip_timer_transitions() TO service_role;
GRANT EXECUTE ON FUNCTION apply_linehaul_trip_timer_transitions() TO authenticated;

-- pg_cron: run every minute. Same infrastructure Phase 4 reuses for corridor
-- overdue flagging and recovery escalation timers (v6 §11 / §13.5).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'apply-linehaul-trip-timers';

SELECT cron.schedule(
  'apply-linehaul-trip-timers',
  '* * * * *',
  $$SELECT public.apply_linehaul_trip_timer_transitions()$$
);
