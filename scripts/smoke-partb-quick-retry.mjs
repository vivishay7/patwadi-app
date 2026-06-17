import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const DEVICE = "AIGQDASODIUSL7AQ";
function adb(c) {
  return execSync(`adb -s ${DEVICE} ${c}`, { encoding: "utf8" });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const lh = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON);
const admin = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON);
const { data: a } = await lh.auth.signInWithPassword({
  email: "testlinehaul@patwadi.com",
  password: "Patwadi123!",
});
await admin.auth.signInWithPassword({ email: "admin@patwadi.com", password: "Patwadi123!" });
const userId = a.user.id;
await lh.from("linehaul_trips").delete().eq("bus_number", "PARTB-SMOKE");
const dep = new Date(Date.now() + 2 * 3600 * 1000);
const arr = new Date(dep.getTime() + 5 * 3600 * 1000);
const { data: trip, error: ins } = await lh
  .from("linehaul_trips")
  .insert({
    corridor_id: "delhi_chandigarh",
    route_label: "Delhi -> Chandigarh",
    bus_number: "PARTB-SMOKE",
    driver_name: "Smoke",
    driver_phone: "9999999999",
    scheduled_departure_at: dep.toISOString(),
    expected_arrival_at: arr.toISOString(),
    status: "draft",
    created_by_conductor_id: userId,
  })
  .select("id")
  .single();
if (ins) throw ins;
const photoPath = "trip-bus/f7405839-fc22-421e-9de6-0601e07f331c/smoke.jpg";
await lh
  .from("linehaul_trips")
  .update({
    bus_proof_photo_path: photoPath,
    status: "open",
    accepts_new_parcels: true,
    details_locked: false,
  })
  .eq("id", trip.id);
console.log("TRIP", trip.id);
adb("shell input keyevent 3");
await sleep(2500);
adb("shell monkey -p com.anonymous.patwadi -c android.intent.category.LAUNCHER 1");
await sleep(10000);
let notif = /trip tracking active/i.test(adb("shell dumpsys notification"));
console.log("notif", notif);
let samples = [];
for (let i = 0; i < 5; i++) {
  await sleep(30000);
  const { data: s } = await admin
    .from("location_samples")
    .select("recorded_at, lat, lng")
    .eq("trip_id", trip.id);
  samples = s ?? [];
  console.log("samples", samples.length);
  if (samples.length >= 2) break;
}
notif = /trip tracking active/i.test(adb("shell dumpsys notification"));
const out = { tripId: trip.id, sampleCount: samples.length, samples, notification: notif };
console.log(JSON.stringify(out, null, 2));
writeFileSync(resolve(ROOT, "smoke-partb-retry.json"), JSON.stringify(out, null, 2));
