/**
 * Compare what testlinehaul vs testlinehaul2 see (trips + operator parcels).
 * node scripts/diag-conductor-scope.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anon = env.EXPO_PUBLIC_SUPABASE_ANON;

async function asUser(email, password) {
  const sb = createClient(url, anon);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  const uid = data.user.id;

  const tripsCreated = await sb
    .from("linehaul_trips")
    .select("id, route_label, status, created_by_conductor_id")
    .eq("created_by_conductor_id", uid);

  const conductors = await sb
    .from("linehaul_trip_conductors")
    .select("trip_id, role, active_until")
    .eq("conductor_id", uid);

  const parcels = await sb.from("operator_order_view").select("id, trip_id, corridor_key");

  const pendingIn = await sb
    .from("linehaul_trip_transfer_requests")
    .select("id, trip_id, status, accept_by")
    .eq("to_conductor_id", uid)
    .eq("status", "pending_acceptance");

  const ordersLinehaul = await sb
    .from("orders")
    .select("id, linehaul_id, trip_id")
    .eq("linehaul_id", uid);

  return {
    email,
    uid,
    tripsCreated: tripsCreated.data?.length ?? 0,
    tripIdsCreated: (tripsCreated.data ?? []).map((t) => `${t.id.slice(0, 8)}:${t.status}`),
    conductorRows: conductors.data ?? [],
    operatorParcels: parcels.data?.length ?? 0,
    parcelIds: (parcels.data ?? []).map((p) => p.id.slice(0, 8)),
    pendingIncoming: pendingIn.data ?? [],
    ordersWithLinehaulId: ordersLinehaul.data ?? [],
  };
}

for (const email of ["testlinehaul@patwadi.com", "testlinehaul2@patwadi.com"]) {
  try {
    const r = await asUser(email, "Patwadi123!");
    console.log(JSON.stringify(r, null, 2));
  } catch (e) {
    console.log(email, "ERROR", e.message);
  }
  console.log("---");
}
