/**
 * Session 11 smoke continuation — UI publish, poll samples, offline, cancel.
 * node scripts/continue-smoke-s11.mjs
 */
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
    })
);

const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON;
const PACKAGE = "com.anonymous.patwadi";
const CONDUCTOR_ID = "43840a88-0597-42e1-83e8-c86c5c1999b3";

function adb(cmd) {
  try {
    return execSync(`adb ${cmd}`, { encoding: "utf8", timeout: 120000 }).trim();
  } catch (e) {
    return e.stdout?.toString?.() || e.message || "";
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function uiDump() {
  adb("shell uiautomator dump /sdcard/ui.xml");
  adb(`pull /sdcard/ui.xml "${resolve(ROOT, "ui-dump.xml")}"`);
  const x = readFileSync(resolve(ROOT, "ui-dump.xml"), "utf8");
  const nodes = x.match(/<node[^>]+>/g) || [];
  const items = [];
  for (const n of nodes) {
    const text = n.match(/text="([^"]*)"/)?.[1] ?? "";
    const cls = n.match(/class="([^"]*)"/)?.[1] ?? "";
    const bounds = n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (!bounds) continue;
    const cx = Math.floor((+bounds[1] + +bounds[3]) / 2);
    const cy = Math.floor((+bounds[2] + +bounds[4]) / 2);
    items.push({ text, cls, cx, cy });
  }
  return items;
}

function tapText(items, pattern, { partial = false } = {}) {
  const re = partial ? new RegExp(pattern, "i") : new RegExp(`^${pattern}$`, "i");
  const hit = items.find((i) => re.test(i.text));
  if (!hit) return false;
  adb(`shell input tap ${hit.cx} ${hit.cy}`);
  return true;
}

function hasTrackingNotification() {
  const out = adb("shell dumpsys notification");
  return /trip tracking active/i.test(out) && /numPostedByApp=0/.test(out) === false;
}

async function signIn(email, password) {
  const c = createClient(URL, ANON);
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client: c, userId: data.user.id };
}

async function createDraftTrip(client, userId) {
  await client.from("linehaul_trips").delete().eq("bus_number", "S11-SMOKE");
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

  const jpeg = Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==",
    "base64"
  );
  const photoPath = `trip-bus/${trip.id}/smoke.jpg`;
  const { error: upErr } = await client.storage
    .from("custody-proofs")
    .upload(photoPath, jpeg, { contentType: "image/jpeg", upsert: true });
  if (upErr) throw upErr;
  await client
    .from("linehaul_trips")
    .update({ bus_proof_photo_path: photoPath })
    .eq("id", trip.id);
  return trip.id;
}

async function loginOnEmulator() {
  adb("reverse tcp:8082 tcp:8082");
  adb(`shell am force-stop ${PACKAGE}`);
  adb(
    'shell am start -a android.intent.action.VIEW -d "exp+patwadi://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8082"'
  );
  await sleep(18000);

  let items = uiDump();
  if (tapText(items, "Log in", { partial: true })) {
    await sleep(4000);
  }

  items = uiDump();
  // Dev helper: 4 taps on "Sign In" title
  const signInTitle = items.find((i) => /sign in/i.test(i.text));
  if (signInTitle) {
    for (let i = 0; i < 4; i++) {
      adb(`shell input tap ${signInTitle.cx} ${signInTitle.cy}`);
      await sleep(300);
    }
  }

  items = uiDump();
  tapText(items, "Sign In", { partial: true }) ||
    adb("shell input tap 540 1655");
  await sleep(12000);
}

async function publishTripViaUi(tripId) {
  let items = uiDump();
  if (!tapText(items, "My Trips", { partial: true })) {
    adb("shell input tap 540 456");
  }
  await sleep(5000);

  items = uiDump();
  const smoke = items.find((i) => /S11-SMOKE/i.test(i.text));
  if (smoke) {
    adb(`shell input tap ${smoke.cx} ${smoke.cy}`);
  } else {
    adb("shell input tap 540 700");
  }
  await sleep(5000);

  items = uiDump();
  if (!tapText(items, "Publish", { partial: true })) {
    throw new Error("Publish button not found in UI dump");
  }
  await sleep(8000);

  items = uiDump();
  tapText(items, "OK", { partial: true });
  await sleep(3000);
}

async function main() {
  const linehaul = await signIn("testlinehaul@patwadi.com", "Patwadi123!");
  const admin = await signIn("admin@patwadi.com", "Patwadi123!");
  const tripId = await createDraftTrip(linehaul.client, linehaul.userId);
  console.log("Draft trip:", tripId);

  adb("shell settings put secure location_providers_allowed +gps");
  adb("shell emu geo fix 77.209 28.6139");

  await loginOnEmulator();
  await publishTripViaUi(tripId);

  const notif = hasTrackingNotification();
  console.log("Notification after publish:", notif ? "VISIBLE" : "not detected");

  console.log("Waiting 125s for periodic samples (geo fix every 20s)...");
  for (let i = 0; i < 7; i++) {
    await sleep(20000);
    adb("shell emu geo fix 77.209 28.614");
  }
  await sleep(5000);

  const { data: samples } = await admin.client
    .from("location_samples")
    .select("lat, lng, recorded_at")
    .eq("trip_id", tripId)
    .eq("conductor_id", CONDUCTOR_ID)
    .order("recorded_at");
  console.log("Sample count:", samples?.length ?? 0);
  for (const s of samples ?? []) {
    console.log(`  ${s.recorded_at} lat=${s.lat} lng=${s.lng}`);
  }

  const beforeOffline = samples?.length ?? 0;
  console.log("Airplane mode 90s...");
  adb("shell cmd connectivity airplane-mode enable");
  for (let i = 0; i < 4; i++) {
    await sleep(20000);
    adb("shell emu geo fix 77.215 28.620");
  }
  await sleep(10000);
  adb("shell cmd connectivity airplane-mode disable");
  adb("shell monkey -p com.anonymous.patwadi 1");
  await sleep(20000);

  const { data: afterOffline } = await admin.client
    .from("location_samples")
    .select("id, lat, lng, recorded_at")
    .eq("trip_id", tripId)
    .eq("conductor_id", CONDUCTOR_ID)
    .order("recorded_at");
  console.log("Samples after offline:", afterOffline?.length ?? 0);

  const { error: cancelErr } = await admin.client.functions.invoke("admin-trip-override", {
    body: { action: "cancel_trip", tripId, reason: "session11 smoke cleanup" },
  });
  console.log("Cancel:", cancelErr ? cancelErr.message : "ok");

  adb("shell monkey -p com.anonymous.patwadi 1");
  await sleep(10000);
  const notifAfter = hasTrackingNotification();
  console.log("Notification after cancel:", notifAfter ? "still visible" : "gone");

  const summary = {
    tripId,
    notificationAfterPublish: notif,
    sampleCount: samples?.length ?? 0,
    samplesAfterOffline: afterOffline?.length ?? 0,
    offlineFlushDelta: (afterOffline?.length ?? 0) - beforeOffline,
    notificationAfterCancel: notifAfter,
  };
  console.log("\nSUMMARY", JSON.stringify(summary, null, 2));
  writeFileSync(resolve(ROOT, "smoke-s11-summary.json"), JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
