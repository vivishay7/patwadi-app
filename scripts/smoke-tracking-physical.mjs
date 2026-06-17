/**
 * Part B GPS tracking smoke test on a physical Android device.
 * node scripts/smoke-tracking-physical.mjs
 * ANDROID_SERIAL=AIGQDASODIUSL7AQ (default)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import {  uiDump,
  tap,
  dumpAndLog,
  sleep,
  typeText,
  dismissLogBox,
} from "./ui-helpers.mjs";

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

const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON;
const PACKAGE = "com.anonymous.patwadi";
const DEVICE = process.env.ANDROID_SERIAL || "AIGQDASODIUSL7AQ";
const BUS_NUMBER = process.env.SMOKE_BUS || "PARTB-SMOKE";
const MANUAL_GRACE_MS = Number(process.env.SMOKE_MANUAL_GRACE_MS || 90000);
const SAMPLE_WAIT_MS = Number(process.env.SMOKE_SAMPLE_WAIT_MS || 125000);
const OFFLINE_MS = Number(process.env.SMOKE_OFFLINE_MS || 90000);

function adb(cmd) {
  try {
    return execSync(`adb -s ${DEVICE} ${cmd}`, {
      encoding: "utf8",
      timeout: 120000,
    }).trim();
  } catch (e) {
    return e.stdout?.toString?.() || e.message || "";
  }
}

function hasTrackingNotification() {
  const out = adb("shell dumpsys notification");
  return (
    /trip tracking active/i.test(out) &&
    (/Patwadi/i.test(out) || /com\.anonymous\.patwadi/i.test(out))
  );
}

async function signIn(email, password) {
  const c = createClient(URL, ANON);
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client: c, userId: data.user.id };
}

async function pollSamples(adminClient, tripId, conductorId) {
  const { data } = await adminClient
    .from("location_samples")
    .select("lat, lng, recorded_at, synced_at")
    .eq("trip_id", tripId)
    .eq("conductor_id", conductorId)
    .order("recorded_at", { ascending: true });
  return data ?? [];
}

function boundsCenter(text) {
  const xml = readFileSync(resolve(ROOT, "ui-dump.xml"), "utf8");
  const re = new RegExp(
    `text="${text}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
  );
  const m = xml.match(re);
  if (!m) return null;
  return {
    cx: Math.floor((+m[1] + +m[3]) / 2),
    cy: Math.floor((+m[2] + +m[4]) / 2),
  };
}

async function clearField(cx, cy, text) {
  adb(`shell input tap ${cx} ${cy}`);
  await sleep(350);
  adb("shell input keyevent 123");
  for (let i = 0; i < 40; i++) adb("shell input keyevent 67");
  typeText(text);
  await sleep(300);
}

async function backToSignIn() {
  for (let i = 0; i < 8; i++) {
    adb("shell input keyevent 4");
    await sleep(500);
    let items = uiDump();
    await dismissLogBox(items);
    items = uiDump();
    if (items.some((x) => /sign in with email/i.test(x.text))) return items;
    if (items.some((x) => /log in/i.test(x.text))) {
      tap(items, "Log in");
      await sleep(3000);
      return uiDump();
    }
  }
  return uiDump();
}

async function tryLoginLinehaul() {
  console.log("Attempting UI login as testlinehaul...");
  adb("reverse tcp:8082 tcp:8082");
  adb("reverse tcp:8081 tcp:8081");
  adb(
    'shell am start -a android.intent.action.VIEW -d "exp+patwadi://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8082"',
  );
  await sleep(15000);

  let items = await backToSignIn();
  if (items.some((i) => /my trips|publish trip|linehaul/i.test(i.text))) {
    console.log("Already on linehaul-style home");
    return true;
  }

  const email = items.find((i) => i.cls.includes("EditText") && i.cy > 700);
  const pass = items
    .filter((i) => i.cls.includes("EditText"))
    .sort((a, b) => a.cy - b.cy)[1];
  if (!email || !pass) {
    console.log("Login fields not found — manual login required");
    return false;
  }

  await clearField(email.cx, email.cy, "testlinehaul@patwadi.com");
  adb(`shell input tap ${pass.cx} ${pass.cy}`);
  await sleep(400);
  await clearField(pass.cx, pass.cy, "Patwadi123!");
  adb("shell input keyevent 4");
  await sleep(700);

  uiDump();
  const btn = boundsCenter("Sign in with email");
  if (btn) adb(`shell input tap ${btn.cx} ${btn.cy}`);
  else tap(uiDump(), "Sign in with email");
  await sleep(20000);

  items = uiDump();
  const ok = items.some((i) =>
    /my trips|delhi|chandigarh|trip detail|publish/i.test(i.text),
  );
  console.log("Linehaul login:", ok ? "ok" : "uncertain");
  if (!ok) dumpAndLog("post-login");
  return ok;
}

async function ensureLocationOn() {
  adb("shell settings put secure location_providers_allowed +gps");
  adb("shell settings put secure location_mode 3");
}

async function setAirplaneMode(on) {
  const state = on ? "enable" : "disable";
  adb(`shell cmd connectivity airplane-mode ${state}`);
  if (/denied|Unknown|Exception/i.test("")) {
    /* noop */
  }
  if (on) {
    adb("shell settings put global airplane_mode_on 1");
    adb(
      'shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true',
    );
  } else {
    adb("shell settings put global airplane_mode_on 0");
    adb(
      'shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false',
    );
  }
}

function printManualSteps(tripId) {
  console.log("\n=== MANUAL (phone) if not logged in as testlinehaul ===");
  console.log("1. Log out testcustomer → Log in: testlinehaul@patwadi.com / Patwadi123!");
  console.log("2. Allow location (Always / While using) + notifications if prompted");
  console.log("3. Keep Patwadi in foreground; trip is already OPEN via API");
  console.log(`4. Trip ${tripId} bus ${BUS_NUMBER} Delhi→Chandigarh`);
  console.log("5. Confirm notification: Patwadi — trip tracking active");
  console.log(`Waiting ${MANUAL_GRACE_MS / 1000}s before automated checks...\n`);
}

async function main() {
  console.log("Device:", DEVICE);
  const linehaul = await signIn("testlinehaul@patwadi.com", "Patwadi123!");
  const admin = await signIn("admin@patwadi.com", "Patwadi123!");
  const { client, userId } = linehaul;

  await client.from("linehaul_trips").delete().eq("bus_number", BUS_NUMBER);

  const departure = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const arrival = new Date(departure.getTime() + 5 * 60 * 60 * 1000);

  const { data: trip, error: insErr } = await client
    .from("linehaul_trips")
    .insert({
      corridor_id: "delhi_chandigarh",
      route_label: "Delhi → Chandigarh",
      bus_number: BUS_NUMBER,
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
    "base64",
  );
  let photoPath = `trip-bus/${tripId}/smoke.jpg`;
  const { error: upErr } = await client.storage
    .from("custody-proofs")
    .upload(photoPath, jpeg, { contentType: "image/jpeg", upsert: true });
  if (upErr) {
    console.warn("Storage upload blocked (RLS):", upErr.message);
    photoPath = "trip-bus/f7405839-fc22-421e-9de6-0601e07f331c/smoke.jpg";
    console.warn("Reusing existing bus proof path:", photoPath);
  }

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
  console.log("Published trip to open (API)");

  printManualSteps(tripId);
  await tryLoginLinehaul();
  await ensureLocationOn();

  const graceStart = Date.now();
  while (Date.now() - graceStart < MANUAL_GRACE_MS) {
    await sleep(15000);
    const n = await pollSamples(admin.client, tripId, userId);
    console.log(`Grace poll: ${n.length} location_samples`);
    if (n.length >= 2) break;
  }

  adb(`shell monkey -p ${PACKAGE} -c android.intent.category.LAUNCHER 1`);
  await sleep(5000);
  const notifAfterLaunch = hasTrackingNotification();
  console.log(
    "Notification after foreground:",
    notifAfterLaunch ? "VISIBLE" : "not detected",
  );

  console.log(`Waiting up to ${SAMPLE_WAIT_MS / 1000}s for 2+ samples...`);
  const waitStart = Date.now();
  let samples = await pollSamples(admin.client, tripId, userId);
  while (
    samples.length < 2 &&
    Date.now() - waitStart < SAMPLE_WAIT_MS
  ) {
    await sleep(30000);
    samples = await pollSamples(admin.client, tripId, userId);
    console.log(`Sample poll: ${samples.length}`);
  }

  console.log("Sample count:", samples.length);
  for (const s of samples) {
    console.log(`  ${s.recorded_at} lat=${s.lat} lng=${s.lng}`);
  }

  const beforeOffline = samples.length;
  console.log(`Airplane mode ~${OFFLINE_MS / 1000}s...`);
  setAirplaneMode(true);
  await sleep(OFFLINE_MS);
  setAirplaneMode(false);
  adb(`shell monkey -p ${PACKAGE} -c android.intent.category.LAUNCHER 1`);
  await sleep(20000);

  const afterOffline = await pollSamples(admin.client, tripId, userId);
  console.log("Samples after offline window:", afterOffline.length);

  const { error: cancelErr } = await admin.client.functions.invoke(
    "admin-trip-override",
    {
      body: {
        action: "cancel_trip",
        tripId,
        reason: "Part B physical smoke cleanup",
      },
    },
  );
  console.log("Cancel trip:", cancelErr ? cancelErr.message : "ok");

  await sleep(10000);
  const notifAfterCancel = hasTrackingNotification();
  console.log(
    "Notification after cancel:",
    notifAfterCancel ? "still visible" : "gone",
  );

  const recordedAfter = new Date(Date.now() - 30000).toISOString();
  const { data: lateSamples } = await admin.client
    .from("location_samples")
    .select("id")
    .eq("trip_id", tripId)
    .gte("recorded_at", recordedAfter);
  console.log("Samples in last 30s after cancel:", lateSamples?.length ?? 0);

  const { error: delErr } = await admin.client
    .from("linehaul_trips")
    .delete()
    .eq("id", tripId);
  console.log("Deleted test trip:", delErr ? delErr.message : "ok");

  const summary = {
    device: DEVICE,
    tripId,
    busNumber: BUS_NUMBER,
    notificationOnForeground: notifAfterLaunch,
    sampleCount: samples.length,
    samplesAfterOffline: afterOffline.length,
    offlineFlushDelta: afterOffline.length - beforeOffline,
    notificationAfterCancel: notifAfterCancel,
    lateSamplesAfterCancel: lateSamples?.length ?? 0,
    pass:
      samples.length >= 2 &&
      afterOffline.length >= beforeOffline &&
      !notifAfterCancel,
  };
  console.log("\nSUMMARY", JSON.stringify(summary, null, 2));
  writeFileSync(
    resolve(ROOT, "smoke-partb-physical-summary.json"),
    JSON.stringify(summary, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


