no-- Phase 12b — trip RLS: only active conductors (not transferred-away creators)

CREATE OR REPLACE FUNCTION is_trip_member(p_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_active_trip_conductor(p_trip_id, auth.uid());
$$;
