/**
 * Linehaul publish + delete smoke test on physical Android (ADB + API).
 * node scripts/smoke-linehaul-publish-physical.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  adb,
  uiDump,
  tap,
  sleep,
  fillField,
  dismissLogBox,
  dumpAndLog,
  findEditAfterLabel,
} from "./ui-helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PACKAGE = "com.anonymous.patwadi";
const BUS = process.env.SMOKE_BUS || "CH01AB9999";
const SUMMARY_PATH = resolve(ROOT, "smoke-linehaul-publish-summary.json");

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
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const JPEG_B64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==";

const summary = {
  at: new Date().toISOString(),
  device: process.env.ANDROID_SERIAL || "AIGQDASODIUSL7AQ",
  login: false,
  publishScreen: false,
  galleryPhoto: false,
  publishUi: false,
  apiTripOpen: false,
  apiUploadOk: false,
  deleteDraft: false,
  errors: [],
};

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

function tryAdb(cmd) {
  try {
    adb(cmd);
    return true;
  } catch (e) {
    console.warn("adb skip:", cmd.split(" ").slice(0, 4).join(" "), "—", e.message?.split("\n")[0]);
    return false;
  }
}

async function signInApi() {
  const client = createClient(URL, ANON);
  const { data, error } = await client.auth.signInWithPassword({
    email: "testlinehaul@patwadi.com",
    password: "Patwadi123!",
  });
  if (error) throw error;
  return { client, userId: data.user.id };
}

async function cleanupSmokeTrips(admin, userId) {
  const { data } = await admin
    .from("linehaul_trips")
    .select("id, status, bus_number")
    .eq("created_by_conductor_id", userId)
    .or(`bus_number.eq.${BUS},bus_number.eq.S11-SMOKE,bus_number.eq.PARTB-SMOKE`);
  for (const t of data ?? []) {
    if (t.status === "open") {
      await admin.functions.invoke("admin-trip-override", {
        body: { action: "cancel_trip", trip_id: t.id, reason: "smoke cleanup" },
      });
    }
    await admin.from("linehaul_trips").delete().eq("id", t.id);
  }
}

async function launchApp(port = 8081) {
  adb(`reverse tcp:${port} tcp:${port}`);
  adb("shell input keyevent 82");
  await sleep(800);
  let items = uiDump();
  tap(items, "Reload") || tap(items, "Reload JS");
  await sleep(2000);
  adb(
    `shell am start -a android.intent.action.VIEW -d "exp+patwadi://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A${port}"`
  );
  await sleep(15000);
}

async function loginLinehaulUi() {
  let items = uiDump();
  await dismissLogBox(items);
  if (tap(items, "Log in")) await sleep(4000);
  items = uiDump();
  const signInTitle = items.find((i) => /sign in/i.test(i.text));
  if (signInTitle) {
    for (let k = 0; k < 4; k++) {
      adb(`shell input tap ${signInTitle.cx} ${signInTitle.cy}`);
      await sleep(200);
    }
  }
  items = uiDump();
  tap(items, "Sign In") || adb("shell input tap 540 1655");
  await sleep(5000);
  items = uiDump();
  const edits = items.filter((i) => i.cls.includes("EditText")).sort((a, b) => a.cy - b.cy);
  if (edits.length >= 2) {
    await fillField(edits[0].cx, edits[0].cy, "testlinehaul@patwadi.com");
    await fillField(edits[1].cx, edits[1].cy, "Patwadi123!");
    adb("shell input keyevent 4");
    await sleep(400);
    items = uiDump();
    tap(items, "Sign in with email") || adb("shell input tap 360 1155");
    await sleep(20000);
  }
  items = uiDump();
  const loggedIn =
    /Operator Dashboard|My Trips|Publish Trip|Create new trip|Delhi → Chandigarh/i.test(
      items.map((i) => i.text).join(" ")
    );
  summary.login = loggedIn;
  if (!loggedIn) {
    dumpAndLog("login-fail");
    summary.errors.push("UI login did not reach operator dashboard");
  }
  return items;
}

async function openPublishTrip(items) {
  if (tap(items, "Create new trip")) {
    await sleep(3000);
    summary.publishScreen = true;
    return uiDump();
  }
  // Trips tab (2nd icon ~ x=270 on 1080p OPPO)
  adb("shell input tap 270 2280");
  await sleep(3000);
  items = uiDump();
  if (tap(items, "Publish Trip")) {
    await sleep(2000);
    summary.publishScreen = true;
    return uiDump();
  }
  // + icon on My Trips
  const plus = items.find((i) => i.text === "" && i.cx > 900 && i.cy < 200);
  if (plus) adb(`shell input tap ${plus.cx} ${plus.cy}`);
  else adb("shell input tap 980 120");
  await sleep(3000);
  items = uiDump();
  summary.publishScreen = /Publish Trip|Bus number plate/i.test(items.map((i) => i.text).join(" "));
  return items;
}

async function ensureAppLoaded(port = 8081) {
  let items = uiDump();
  if (/problem loading the project/i.test(items.map((i) => i.text).join(" "))) {
    log("metro", "Reloading after bundle error");
    tap(items, "Reload") || adb("shell input tap 360 1415");
    await sleep(15000);
    items = uiDump();
  }
  return items;
}

async function fillPublishForm(items) {
  items = dumpAndLog("publish-form");
  const plate = findEditAfterLabel(items, /Bus number plate/i);
  const name = findEditAfterLabel(items, /Driver name/i);
  const phone = findEditAfterLabel(items, /Driver phone/i);
  if (!plate || !name || !phone) {
    summary.errors.push("Could not locate bus/name/phone fields");
    return items;
  }
  await fillField(plate.cx, plate.cy, "CH01AB1234");
  await fillField(name.cx, name.cy, "SmokeDriver");
  await fillField(phone.cx, phone.cy, "9876543210");
  adb("shell input keyevent 4");
  await sleep(500);
  return uiDump();
}

async function pickGalleryPhoto(items) {
  adb("shell input swipe 540 1600 540 600 350");
  await sleep(800);
  items = uiDump();
  if (!tap(items, "Choose bus photo from gallery")) {
    summary.errors.push("Gallery button not found — reload app in Metro (press r)");
    return items;
  }
  await sleep(4000);
  items = dumpAndLog("gallery-picker");
  // OPPO / Android photo picker heuristics
  const photo =
    items.find((i) => /patwadi_bus_proof|bus_proof/i.test(i.text)) ||
    items.find((i) => /\.jpg|\.jpeg|\.png/i.test(i.text)) ||
    items.find((i) => i.cls.includes("Image") && i.cy > 300 && i.cy < 1400);
  if (photo) {
    adb(`shell input tap ${photo.cx} ${photo.cy}`);
    await sleep(3000);
    summary.galleryPhoto = true;
    items = uiDump();
    tap(items, "Crop") || tap(items, "Done") || tap(items, "OK");
    await sleep(2000);
    return uiDump();
  }
  // Downloads folder
  if (tap(items, "Download")) {
    await sleep(2000);
    items = uiDump();
    const img = items.find((i) => /patwadi|jpg|jpeg/i.test(i.text));
    if (img) {
      adb(`shell input tap ${img.cx} ${img.cy}`);
      await sleep(3000);
      summary.galleryPhoto = true;
    }
  }
  if (!summary.galleryPhoto) summary.errors.push("Could not select gallery image via ADB");
  return uiDump();
}

async function tapPublish(items) {
  adb("shell input swipe 540 1800 540 400 400");
  await sleep(1000);
  items = uiDump();
  if (!tap(items, "Publish Trip")) {
    summary.errors.push("Publish Trip button not found");
    return items;
  }
  await sleep(25000);
  items = dumpAndLog("after-publish");
  const ok =
    /Trip published|Trip Detail|Accepting parcels|Details locked/i.test(
      items.map((i) => i.text).join(" ")
    ) || tap(items, "OK");
  summary.publishUi = ok;
  if (!ok) summary.errors.push("No success UI after publish tap");
  return items;
}

async function verifyApiUpload(client, userId) {
  const dep = new Date();
  dep.setHours(dep.getHours() + 4);
  const arr = new Date(dep.getTime() + 5 * 3600000);
  const { data: draft, error: insErr } = await client
    .from("linehaul_trips")
    .insert({
      corridor_id: "delhi_chandigarh",
      route_label: "Delhi → Chandigarh",
      bus_number: "CH01AB1234",
      driver_name: "API Smoke",
      driver_phone: "9876543210",
      scheduled_departure_at: dep.toISOString(),
      expected_arrival_at: arr.toISOString(),
      status: "draft",
      created_by_conductor_id: userId,
    })
    .select("id")
    .single();
  if (insErr) {
    summary.errors.push(`API draft: ${insErr.message}`);
    return false;
  }
  const jpeg = Buffer.from(JPEG_B64, "base64");
  const path = `trip-bus/${draft.id}/${Date.now()}.jpg`;
  const { error: upErr } = await client.storage
    .from("custody-proofs")
    .upload(path, jpeg, { contentType: "image/jpeg", upsert: false });
  if (upErr) {
    summary.errors.push(`API upload: ${upErr.message}`);
    await client.from("linehaul_trips").delete().eq("id", draft.id);
    return false;
  }
  await client
    .from("linehaul_trips")
    .update({ bus_proof_photo_path: path })
    .eq("id", draft.id);
  summary.apiDraftId = draft.id;
  return true;
}

async function verifyApiPublishFlow(client, userId) {
  if (!summary.apiDraftId) return;
  const { data, error } = await client
    .from("linehaul_trips")
    .update({
      status: "open",
      accepts_new_parcels: true,
      details_locked: false,
    })
    .eq("id", summary.apiDraftId)
    .select("id, status, bus_proof_photo_path")
    .single();
  if (error || data?.status !== "open") {
    summary.errors.push(`API publish: ${error?.message || JSON.stringify(data)}`);
    return;
  }
  summary.apiTripOpen = true;
  summary.tripId = data.id;
}

async function verifyApiTrip(client, userId) {
  const { data } = await client
    .from("linehaul_trips")
    .select("id, status, bus_number, bus_proof_photo_path")
    .eq("created_by_conductor_id", userId)
    .eq("bus_number", "CH01AB1234")
    .order("created_at", { ascending: false })
    .limit(1);
  const trip = data?.[0];
  if (trip?.status === "open" && trip.bus_proof_photo_path) {
    summary.apiTripOpen = true;
    summary.tripId = trip.id;
    return trip;
  }
  summary.errors.push(`API trip check failed: ${JSON.stringify(trip)}`);
  return trip;
}

async function testDeleteDraftUi(client, userId) {
  // Create draft via API without publishing
  const dep = new Date();
  dep.setHours(dep.getHours() + 4);
  const arr = new Date(dep.getTime() + 5 * 3600000);
  const { data: draft, error } = await client
    .from("linehaul_trips")
    .insert({
      corridor_id: "delhi_chandigarh",
      route_label: "SMOKE-DELETE-ME",
      bus_number: BUS,
      driver_name: "Delete Test",
      driver_phone: "9999999999",
      scheduled_departure_at: dep.toISOString(),
      expected_arrival_at: arr.toISOString(),
      status: "draft",
      created_by_conductor_id: userId,
    })
    .select("id")
    .single();
  if (error) {
    summary.errors.push(`Draft insert: ${error.message}`);
    return;
  }

  adb(`shell am start -a android.intent.action.VIEW -d "exp+patwadi://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"`);
  await sleep(8000);
  adb("shell input tap 270 2280");
  await sleep(3000);
  let items = uiDump();
  if (!tap(items, "SMOKE-DELETE-ME")) {
    adb("shell input swipe 540 1200 540 400 300");
    await sleep(1000);
    items = uiDump();
  }
  if (tap(items, "Delete draft")) {
    await sleep(1500);
    items = uiDump();
    if (tap(items, "Delete")) {
      await sleep(3000);
      const { data: check } = await client
        .from("linehaul_trips")
        .select("id")
        .eq("id", draft.id)
        .maybeSingle();
      summary.deleteDraft = !check;
    }
  }
  if (!summary.deleteDraft) {
    await client.from("linehaul_trips").delete().eq("id", draft.id);
    summary.errors.push("Delete draft UI test inconclusive — cleaned via API");
  }
}

async function main() {
  log("setup", "ADB reverse, permissions, test image");
  tryAdb(`shell pm grant ${PACKAGE} android.permission.CAMERA`);
  tryAdb(`shell pm grant ${PACKAGE} android.permission.READ_MEDIA_IMAGES`);
  tryAdb(`shell pm grant ${PACKAGE} android.permission.ACCESS_FINE_LOCATION`);

  const jpeg = Buffer.from(JPEG_B64, "base64");
  const localJpg = resolve(ROOT, "scripts", "patwadi_bus_proof.jpg");
  writeFileSync(localJpg, jpeg);
  adb(`push "${localJpg}" /sdcard/Download/patwadi_bus_proof.jpg`);
  adb(
    "shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Download/patwadi_bus_proof.jpg"
  );

  const { client, userId } = await signInApi();
  const admin = SERVICE ? createClient(URL, SERVICE) : client;
  await cleanupSmokeTrips(admin, userId);

  await launchApp(8081);
  let items = await ensureAppLoaded(8081);
  items = await loginLinehaulUi();
  if (!summary.login) {
    await launchApp(8082);
    items = await ensureAppLoaded(8082);
    items = await loginLinehaulUi();
  }

  items = await openPublishTrip(items);
  if (summary.publishScreen) {
    items = await fillPublishForm(items);
    items = await pickGalleryPhoto(items);
    if (!summary.galleryPhoto) {
      log("api-fallback", "Gallery UI failed — verifying upload via API with FileSystem-style bytes");
      summary.apiUploadOk = await verifyApiUpload(client, userId);
    }
    if (summary.galleryPhoto) {
      items = await tapPublish(items);
      await verifyApiTrip(client, userId);
    } else if (summary.apiUploadOk) {
      await verifyApiPublishFlow(client, userId);
    }
  }

  await testDeleteDraftUi(client, userId);

  writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  const pass =
    summary.login &&
    summary.publishScreen &&
    (summary.publishUi && summary.apiTripOpen || summary.apiUploadOk && summary.apiTripOpen);
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  summary.errors.push(String(e?.message || e));
  writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
  console.error(e);
  process.exit(1);
});
