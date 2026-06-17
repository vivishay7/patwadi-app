/**
 * Session 11 smoke — create/publish trip, poll samples, cancel cleanup.
 * Run while emulator has testlinehaul session (or logs in during wait).
 * node scripts/smoke-tracking-emulator.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON;
const PACKAGE = "com.anonymous.patwadi";

function adb(cmd) {
  try {
    return execSync(`adb ${cmd}`, { encoding: "utf8", timeout: 30000 }).trim();
  } catch (e) {
    return e.stdout?.toString?.() || e.message || "";
  }
}

function hasTrackingNotification() {
  const out = adb('shell dumpsys notification');
  return /Patwadi.*trip tracking active/i.test(out) || /trip tracking active/i.test(out);
}

async function signIn(email, password) {
  const c = createClient(URL, ANON);
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client: c, userId: data.user.id };
}

async function main() {
  const linehaul = await signIn("testlinehaul@patwadi.com", "Patwadi123!");
  const admin = await signIn("admin@patwadi.com", "Patwadi123!");
  const { client, userId } = linehaul;

  const departure = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const arrival = new Date(departure.getTime() + 5 * 60 * 60 * 1000);

  const { data: trip, error: insErr } = await client
    .from("linehaul_trips")
    .insert({
      corridor_id: "delhi_chandigarh",
      route_label: "Delhi → Chandigarh",
      bus_number: "S11-SMOKE",
      driver_name: "Smoke Test",
      driver_phone: "9999999999",
      scheduled_departure_at: departure.toISOString(),
      expected_arrival_at: arrival.toISOString(),
      status: "draft",
      created_by_conductor_id: userId,
    })
    .select("id")
    .single();

  if (insErr) throw insErr;
  const tripId = trip.id;
  console.log("Created draft trip:", tripId);

  const jpeg = Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==",
    "base64"
  );
  const photoPath = `trip-bus/${tripId}/smoke.jpg`;
  const { error: upErr } = await client.storage
    .from("custody-proofs")
    .upload(photoPath, jpeg, { contentType: "image/jpeg", upsert: true });
  if (upErr) throw upErr;

  const { error: pubErr } = await client
    .from("linehaul_trips")
    .update({
      bus_proof_photo_path: photoPath,
      status: "open",
      accepts_new_parcels: true,
      details_locked: false,
    })
    .eq("id", tripId);
  if (pubErr) throw pubErr;
  console.log("Published trip to open");

  console.log("Foregrounding app (testlinehaul must be logged in on emulator)...");
  adb(`shell monkey -p ${PACKAGE} -c android.intent.category.LAUNCHER 1`);

  await sleep(5000);
  const notifAfterLaunch = hasTrackingNotification();
  console.log("Notification after app launch:", notifAfterLaunch ? "VISIBLE" : "not detected");

  console.log("Waiting 125s for 2x 60s location samples...");
  await sleep(125000);

  const adminClient = admin.client;
  const { data: samples } = await adminClient
    .from("location_samples")
    .select("lat, lng, recorded_at, synced_at")
    .eq("trip_id", tripId)
    .eq("conductor_id", userId)
    .order("recorded_at", { ascending: true });

  console.log("Sample count:", samples?.length ?? 0);
  for (const s of samples ?? []) {
    console.log(`  ${s.recorded_at} lat=${s.lat} lng=${s.lng}`);
  }

  const beforeOffline = samples?.length ?? 0;
  console.log("Enabling airplane mode 90s...");
  adb("shell cmd connectivity airplane-mode enable");
  await sleep(90000);
  adb("shell cmd connectivity airplane-mode disable");
  await sleep(15000);

  const { data: afterOffline } = await adminClient
    .from("location_samples")
    .select("id")
    .eq("trip_id", tripId)
    .eq("conductor_id", userId);
  console.log("Samples after offline window:", afterOffline?.length ?? 0);

  const { error: cancelErr } = await adminClient.functions.invoke("admin-trip-override", {
    body: { action: "cancel_trip", tripId, reason: "session11 smoke cleanup" },
  });
  console.log("Cancel trip:", cancelErr ? cancelErr.message : "ok");

  await sleep(10000);
  const notifAfterCancel = hasTrackingNotification();
  console.log("Notification after cancel:", notifAfterCancel ? "still visible" : "gone");

  const recordedAfter = new Date(Date.now() - 30000).toISOString();
  const { data: lateSamples } = await adminClient
    .from("location_samples")
    .select("id")
    .eq("trip_id", tripId)
    .gte("recorded_at", recordedAfter);
  console.log("Samples in last 30s after cancel:", lateSamples?.length ?? 0);

  await adminClient.from("linehaul_trips").delete().eq("id", tripId);

  console.log("\nSUMMARY", JSON.stringify({
    tripId,
    notificationOnLaunch: notifAfterLaunch,
    sampleCount: samples?.length ?? 0,
    samplesAfterOffline: afterOffline?.length ?? 0,
    offlineFlushDelta: (afterOffline?.length ?? 0) - beforeOffline,
    notificationAfterCancel: notifAfterCancel,
    lateSamplesAfterCancel: lateSamples?.length ?? 0,
  }, null, 2));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
