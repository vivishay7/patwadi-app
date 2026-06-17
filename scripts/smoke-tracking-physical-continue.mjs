/** Continue Part B on existing open trip: SMOKE_TRIP_ID required */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON;
const DEVICE = process.env.ANDROID_SERIAL || "AIGQDASODIUSL7AQ";
const PACKAGE = "com.anonymous.patwadi";
const tripId = process.env.SMOKE_TRIP_ID;
if (!tripId) throw new Error("Set SMOKE_TRIP_ID");

function adb(cmd) {
  return execSync(`adb -s ${DEVICE} ${cmd}`, { encoding: "utf8", timeout: 120000 }).trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hasTrackingNotification() {
  const out = adb("shell dumpsys notification");
  return /trip tracking active/i.test(out);
}

function setAirplaneMode(on) {
  adb(`shell cmd connectivity airplane-mode ${on ? "enable" : "disable"}`);
}

async function main() {
  const admin = createClient(URL, ANON);
  await admin.auth.signInWithPassword({
    email: "admin@patwadi.com",
    password: "Patwadi123!",
  });
  const lh = createClient(URL, ANON);
  const { data: auth } = await lh.auth.signInWithPassword({
    email: "testlinehaul@patwadi.com",
    password: "Patwadi123!",
  });
  const userId = auth.user.id;

  adb(`shell monkey -p ${PACKAGE} -c android.intent.category.LAUNCHER 1`);
  await sleep(5000);
  let notif = hasTrackingNotification();
  console.log("Notification:", notif ? "VISIBLE" : "not detected");

  const waitStart = Date.now();
  let samples = [];
  while (Date.now() - waitStart < 130000) {
    const { data } = await admin
      .from("location_samples")
      .select("lat, lng, recorded_at")
      .eq("trip_id", tripId)
      .eq("conductor_id", userId)
      .order("recorded_at");
    samples = data ?? [];
    console.log("Sample poll:", samples.length);
    if (samples.length >= 2) break;
    await sleep(30000);
    adb(`shell monkey -p ${PACKAGE} 1`);
  }

  for (const s of samples) console.log(`  ${s.recorded_at} lat=${s.lat} lng=${s.lng}`);

  const beforeOffline = samples.length;
  console.log("Airplane 90s...");
  setAirplaneMode(true);
  await sleep(90000);
  setAirplaneMode(false);
  adb(`shell monkey -p ${PACKAGE} 1`);
  await sleep(20000);

  const { data: afterOffline } = await admin
    .from("location_samples")
    .select("lat, lng, recorded_at")
    .eq("trip_id", tripId)
    .eq("conductor_id", userId)
    .order("recorded_at");
  console.log("After offline:", afterOffline?.length ?? 0);

  const { error: cancelErr } = await admin.functions.invoke("admin-trip-override", {
    body: { action: "cancel_trip", tripId, reason: "Part B physical smoke cleanup" },
  });
  console.log("Cancel:", cancelErr?.message || "ok");
  await sleep(10000);
  notif = hasTrackingNotification();
  console.log("Notification after cancel:", notif ? "still visible" : "gone");

  const { error: delErr } = await admin.from("linehaul_trips").delete().eq("id", tripId);
  console.log("Delete trip:", delErr?.message || "ok");

  const summary = {
    tripId,
    notificationVisible: hasTrackingNotification(),
    sampleCount: samples.length,
    samplesAfterOffline: afterOffline?.length ?? 0,
    offlineFlushDelta: (afterOffline?.length ?? 0) - beforeOffline,
    notificationAfterCancel: notif,
  };
  console.log("SUMMARY", JSON.stringify(summary, null, 2));
  writeFileSync(resolve(ROOT, "smoke-partb-physical-summary.json"), JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
