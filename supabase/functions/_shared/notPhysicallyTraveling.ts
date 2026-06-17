import { haversineKm } from "./haversine.ts";

type Sample = { lat: number; lng: number; recorded_at: string };

/** §19.5 — transfer risk flag 4 from location_samples trail. */
export async function computeNotPhysicallyTraveling(
  supabase: { from: (table: string) => ReturnType<import("https://esm.sh/@supabase/supabase-js@2").SupabaseClient["from"]> },
  tripId: string,
  fromConductorId: string,
  requestedAt: Date
): Promise<boolean> {
  const windowStart = new Date(requestedAt.getTime() - 30 * 60 * 1000);

  const { data: samples, error } = await supabase
    .from("location_samples")
    .select("lat, lng, recorded_at")
    .eq("trip_id", tripId)
    .eq("conductor_id", fromConductorId)
    .gte("recorded_at", windowStart.toISOString())
    .lte("recorded_at", requestedAt.toISOString())
    .order("recorded_at", { ascending: true });

  if (error) {
    console.error("computeNotPhysicallyTraveling:", error);
    return true;
  }

  const rows = (samples ?? []) as Sample[];
  if (rows.length === 0) return true;

  const anchor = rows[0];
  const maxMoveKm = rows.reduce((max, s) => {
    const d = haversineKm(anchor.lat, anchor.lng, s.lat, s.lng);
    return Math.max(max, d);
  }, 0);

  return maxMoveKm < 0.5;
}
