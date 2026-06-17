-- v6 §18 — corridors as database table (replaces CORRIDOR_DEFINITIONS in app code)

CREATE TABLE IF NOT EXISTS public.corridors (
  key TEXT PRIMARY KEY,
  origin_city TEXT NOT NULL,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  destination_city TEXT NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,
  expected_duration_hours NUMERIC NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corridors_active ON public.corridors (active);

ALTER TABLE public.corridors ENABLE ROW LEVEL SECURITY;

-- Anon + authenticated: read active corridors only
CREATE POLICY "corridors_select_active"
  ON public.corridors FOR SELECT
  TO anon, authenticated
  USING (active = TRUE);

-- Admins: read all corridors (including inactive)
CREATE POLICY "corridors_admin_select_all"
  ON public.corridors FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admin_profiles WHERE active = TRUE)
  );

-- Admins: insert new corridors
CREATE POLICY "corridors_admin_insert"
  ON public.corridors FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_profiles WHERE active = TRUE)
  );

-- Admins: update (toggle active, etc.)
CREATE POLICY "corridors_admin_update"
  ON public.corridors FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admin_profiles WHERE active = TRUE)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_profiles WHERE active = TRUE)
  );

-- §18.4 seed — six launch corridors (underscore keys)
INSERT INTO public.corridors (
  key, origin_city, origin_lat, origin_lng,
  destination_city, destination_lat, destination_lng,
  expected_duration_hours
) VALUES
  ('delhi_chandigarh', 'Delhi', 28.6139, 77.209, 'Chandigarh', 30.7333, 76.7794, 5),
  ('delhi_manali', 'Delhi', 28.6139, 77.209, 'Manali', 32.2432, 77.1892, 12),
  ('mandi_chandigarh', 'Mandi', 31.708, 76.9318, 'Chandigarh', 30.7333, 76.7794, 4),
  ('shimla_chandigarh', 'Shimla', 31.1048, 77.1734, 'Chandigarh', 30.7333, 76.7794, 4),
  ('shimla_delhi', 'Shimla', 31.1048, 77.1734, 'Delhi', 28.6139, 77.209, 9),
  ('mumbai_pune', 'Mumbai', 19.076, 72.8777, 'Pune', 18.5204, 73.8567, 3)
ON CONFLICT (key) DO NOTHING;
