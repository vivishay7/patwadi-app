/** Origin coords per corridor — loaded from corridors table (service role). */
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type OriginEntry = { city: string; lat: number; lng: number };

let originsCache: Record<string, OriginEntry> | null = null;

async function loadOrigins(
  supabase: SupabaseClient
): Promise<Record<string, OriginEntry>> {
  if (originsCache) return originsCache;

  const { data, error } = await supabase
    .from("corridors")
    .select("key, origin_city, origin_lat, origin_lng");

  if (error) {
    console.error("loadOrigins:", error);
    throw new Error(error.message);
  }

  originsCache = {};
  for (const row of data ?? []) {
    originsCache[row.key] = {
      city: row.origin_city,
      lat: row.origin_lat,
      lng: row.origin_lng,
    };
  }
  return originsCache;
}

export async function getCorridorOrigin(
  supabase: SupabaseClient,
  corridorId: string
): Promise<OriginEntry | null> {
  const origins = await loadOrigins(supabase);
  return origins[corridorId] ?? null;
}
