import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { adb, uiDump, tap, sleep, fillField, dismissLogBox } from "./ui-helpers.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const c = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON);
const { data: auth } = await c.auth.signInWithPassword({
  email: "testlinehaul@patwadi.com",
  password: "Patwadi123!",
});
const uid = auth.user.id;
const dep = new Date();
dep.setHours(dep.getHours() + 5);
const arr = new Date(dep.getTime() + 5 * 3600000);
const { data: draft } = await c
  .from("linehaul_trips")
  .insert({
    corridor_id: "delhi_chandigarh",
    route_label: "SMOKE-DELETE-ME",
    bus_number: "CH01AB9999",
    driver_name: "Del",
    driver_phone: "9999999999",
    scheduled_departure_at: dep.toISOString(),
    expected_arrival_at: arr.toISOString(),
    status: "draft",
    created_by_conductor_id: uid,
  })
  .select("id")
  .single();

adb("reverse tcp:8081 tcp:8081");
adb(
  'shell am start -a android.intent.action.VIEW -d "exp+patwadi://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"'
);
await sleep(12000);
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

adb("shell input tap 270 2280");
await sleep(4000);
let items = uiDump();
tap(items, "Create new trip") || tap(items, "Publish Trip");
await sleep(3000);
items = uiDump();
const onCreate = /Choose bus photo from gallery|Take bus proof photo/i.test(
  items.map((i) => i.text).join(" ")
);
console.log("onCreateTripScreen", onCreate);
console.log(
  "screenTexts",
  items
    .filter((i) => i.text)
    .map((i) => i.text)
    .slice(0, 20)
    .join(" | ")
);

adb("shell input keyevent 4");
await sleep(1500);
adb("shell input tap 270 2280");
await sleep(3000);
items = uiDump();
tap(items, "SMOKE-DELETE-ME");
await sleep(2000);
items = uiDump();
if (tap(items, "Delete draft")) {
  await sleep(1500);
  items = uiDump();
  tap(items, "Delete");
  await sleep(3000);
}
const { data: check } = await c
  .from("linehaul_trips")
  .select("id")
  .eq("id", draft.id)
  .maybeSingle();
console.log("deleteOk", !check);
if (check) await c.from("linehaul_trips").delete().eq("id", draft.id);
