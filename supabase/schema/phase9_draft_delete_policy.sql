-- Allow primary conductors to delete their own draft trips (no parcels attached enforced in app).
CREATE POLICY "Conductors can delete own draft trips"
  ON linehaul_trips FOR DELETE
  USING (
    auth.uid() = created_by_conductor_id
    AND status = 'draft'
  );
