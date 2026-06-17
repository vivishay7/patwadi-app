/**
 * E2E payment smoke — UI booking through Razorpay test mode.
 * Prereq: Metro on 8082 with EXPO_PUBLIC_RAZORPAY_KEY_ID, emulator running.
 * node scripts/smoke-payment-e2e.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  adb,
  uiDump,
  tap,
  dumpAndLog,
  sleep,
  typeText,
  findEditAfterLabel,
  clearTapType,
  fillField,
  dismissLogBox,
  findLocationResult,
} from "./ui-helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CUSTOMER_ID = "ec7124ee-2966-4736-b6df-1b6a36e4f661";

const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

async function launchApp() {
  adb("shell input keyevent KEYCODE_WAKEUP");
  adb("reverse tcp:8082 tcp:8082");
  adb("shell am force-stop com.anonymous.patwadi");
  adb(
    'shell am start -a android.intent.action.VIEW -d "exp+patwadi://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8082"'
  );
  await sleep(58);
  let items = uiDump();
  if (tap(items, "Continue")) {
    await sleep(8000);
    items = uiDump();
  }
  if (items.some((i) => /reload/i.test(i.text) && items.some((j) => /go home/i.test(j.text)))) {
    tap(items, "Reload") || adb("shell input tap 180 477");
    await sleep(25000);
    items = uiDump();
    adb("shell input keyevent 4");
    await sleep(3000);
  }
}

async function ensureCustomerHome() {
  let items = uiDump();
  if (items.some((i) => /send parcel/i.test(i.text))) return items;
  if (items.some((i) => /package details|pickup location|dropoff|confirm.*order|price estimate/i.test(i.text))) {
    return items;
  }
  if (items.some((i) => /log in/i.test(i.text))) {
    await loginCustomer();
    return uiDump();
  }
  if (items.some((i) => /sign in/i.test(i.text))) {
    await loginCustomerFromSignIn();
    return uiDump();
  }
  items = await waitForText("log in|sign in|send parcel", "app ready", 90000);
  if (items.some((i) => /send parcel/i.test(i.text))) return items;
  if (items.some((i) => /log in/i.test(i.text))) {
    await loginCustomer();
    return uiDump();
  }
  await loginCustomerFromSignIn();
  return uiDump();
}

async function loginCustomerFromSignIn() {
  let items = uiDump();
  const emailField =
    items.find((i) => i.cls.includes("EditText") && i.cy > 850 && i.cy < 950) ||
    items.find((i) => i.cls.includes("EditText") && i.cy > 1200 && i.cy < 1400);
  const passField =
    items.find((i) => i.cls.includes("EditText") && i.cy > 980 && i.cy < 1050) ||
    items.find((i) => i.cls.includes("EditText") && i.cy > 1400 && i.cy < 1600);
  if (emailField) {
    await clearTapType(emailField.cx, emailField.cy, "testcustomer@patwadi.com");
    await sleep(500);
  }
  if (passField) {
    adb(`shell input tap ${passField.cx} ${passField.cy}`);
    await sleep(400);
    await clearTapType(passField.cx, passField.cy, "Patwadi123!");
  }
  adb("shell input tap 360 805");
  await sleep(500);
  items = uiDump();
  const btn = items.find((i) => /^sign in with email$/i.test(i.text));
  if (btn) adb(`shell input tap ${btn.cx} ${btn.cy + 25}`);
  else adb("shell input tap 359 1155");
  await sleep(22000);
  items = uiDump();
  if (items.some((i) => /invalid login/i.test(i.text))) {
    throw new Error("Login failed on device");
  }
  await waitForText("Send Parcel", "customer home", 90000);
}

async function waitForText(pattern, label, timeoutMs = 60000) {
  const re = new RegExp(pattern, "i");
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const items = uiDump();
    if (items.some((i) => re.test(i.text))) return items;
    await sleep(3000);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function loginCustomer() {
  let items = uiDump();
  if (!items.some((i) => /log in/i.test(i.text))) {
    items = await waitForText("log in", "welcome screen");
  }
  tap(items, "Log in") || adb("shell input tap 539 1841");
  await sleep(4000);
  await loginCustomerFromSignIn();
}

async function fillPackageInfo() {
  await dismissLogBox();
  let items = uiDump();
  if (!items.some((i) => /package details/i.test(i.text))) {
    tap(items, "Send Parcel") || tap(items, "Send a Parcel") || adb("shell input tap 393 313");
    await sleep(5000);
    items = uiDump();
  }
  tap(items, "Other") || tap(items, "Document") || adb("shell input tap 561 671");
  await sleep(500);
  items = uiDump();

  const contentsField = findEditAfterLabel(items, /contents/i);
  const valueField = findEditAfterLabel(items, /estimated package value/i);
  if (!contentsField || !valueField) {
    dumpAndLog("package fields missing");
    throw new Error("Package form fields not found");
  }
  await clearTapType(contentsField.cx, contentsField.cy, "Books");
  await fillField(valueField.cx, valueField.cy, "1000");
  items = uiDump();
  const valueCheck = findEditAfterLabel(items, /estimated package value/i);
  if (!valueCheck || !/1000/.test(valueCheck.text)) {
    console.log("Value field retry, got:", valueCheck?.text);
    await fillField(valueField.cx, valueField.cy, "1000");
    await sleep(500);
  }

  // Dimensions may already be on screen; scroll only if L/W/H inputs not visible
  items = uiDump();
  let dimFields = items
    .filter((i) => i.cls.includes("EditText") && (i.text === "L" || i.text === "W" || i.text === "H"))
    .sort((a, b) => a.cx - b.cx);
  if (dimFields.length < 3) {
    adb("shell input swipe 540 1500 540 500 500");
    await sleep(800);
    items = uiDump();
    dimFields = items
      .filter((i) => i.cls.includes("EditText") && i.cy > 1380 && i.cy < 1480)
      .sort((a, b) => a.cx - b.cx);
  }
  if (dimFields.length < 3) {
    dumpAndLog("dimension fields missing");
    throw new Error("Dimension fields not found after scroll");
  }
  await fillField(dimFields[0].cx, dimFields[0].cy, "30");
  await fillField(dimFields[1].cx, dimFields[1].cy, "20");
  await fillField(dimFields[2].cx, dimFields[2].cy, "10");

  items = uiDump();
  let weightField = findEditAfterLabel(items, /weight \(kg\)/i);
  if (!weightField) {
    adb("shell input swipe 540 1500 540 600 350");
    await sleep(600);
    items = uiDump();
    weightField = findEditAfterLabel(items, /weight \(kg\)/i);
  }
  if (weightField) await fillField(weightField.cx, weightField.cy, "2");

  adb("shell input keyevent 4");
  await sleep(400);
  adb("shell input swipe 540 1500 540 700 300");
  await sleep(500);
  items = uiDump();
  const nextBtn = items.find((i) => /next.*pickup location/i.test(i.text));
  if (!nextBtn) throw new Error("Package Next button not found");
  adb(`shell input tap ${nextBtn.cx} ${nextBtn.cy}`);
  await sleep(8000);
  items = uiDump();
  if (!items.some((i) => /pickup location|step 2 of 5/i.test(i.text))) {
    dumpAndLog("stuck after package next");
    throw new Error("Did not reach pickup screen");
  }
}

async function fillPickup() {
  await dismissLogBox();
  dumpAndLog("pickup screen");
  let items = uiDump();
  const search =
    findEditAfterLabel(items, /pickup address/i) ||
    items.find((i) => i.cls.includes("EditText") && /search for pickup/i.test(i.text));
  if (!search) throw new Error("Pickup search field not found");

  await clearTapType(search.cx, search.cy, "Delhi");
  await sleep(8000);
  items = uiDump();
  const delhi = findLocationResult(items, "Delhi");
  if (!delhi) {
    dumpAndLog("delhi results missing");
    throw new Error("Delhi location result not found");
  }
  adb(`shell input tap ${delhi.cx} ${delhi.cy}`);
  await sleep(3000);

  items = uiDump();
  const phoneField =
    findEditAfterLabel(items, /contact number/i) ||
    items.find((i) => i.cls.includes("EditText") && i.cy > 700 && i.cy < 1100);
  if (phoneField) await clearTapType(phoneField.cx, phoneField.cy, "9876543210");

  adb("shell input swipe 540 1600 540 500 400");
  await sleep(500);
  items = uiDump();
  const next =
    items.find((i) => /next.*dropoff/i.test(i.text)) ||
    items.find((i) => /dropoff details/i.test(i.text));
  if (!next) throw new Error("Pickup Next button not found");
  adb(`shell input tap ${next.cx} ${next.cy}`);
  await sleep(6000);
}

async function fillDropoff() {
  await dismissLogBox();
  dumpAndLog("dropoff screen");
  let items = uiDump();
  const search =
    findEditAfterLabel(items, /dropoff address|delivery address/i) ||
    items.find((i) => i.cls.includes("EditText") && i.cy < 600);
  if (!search) throw new Error("Dropoff search field not found");

  adb(`shell input tap ${search.cx} ${search.cy}`);
  await sleep(400);
  adb("shell input keyevent 123");
  for (let i = 0; i < 20; i++) adb("shell input keyevent 67");
  typeText("Chandigarh");
  await sleep(8000);
  items = uiDump();
  const chd = findLocationResult(items, "Chandigarh");
  if (!chd) {
    dumpAndLog("chandigarh results missing");
    throw new Error("Chandigarh location result not found");
  }
  adb(`shell input tap ${chd.cx} ${chd.cy}`);
  await sleep(3000);

  adb("shell input swipe 540 1600 540 500 400");
  await sleep(500);
  items = uiDump();
  const next =
    items.find((i) => /next.*parcel|next.*price|continue/i.test(i.text)) ||
    items.find((i) => /parcel details|price estimate/i.test(i.text));
  if (!next) throw new Error("Dropoff Next button not found");
  adb(`shell input tap ${next.cx} ${next.cy}`);
  await sleep(6000);
}

async function toConfirmAndPay() {
  let items = dumpAndLog("price estimate");
  tap(items, "Continue to confirmation") || tap(items, "confirmation") || adb("shell input tap 540 2100");
  await sleep(5000);
  items = dumpAndLog("confirm order");
  tap(items, "Confirm & Create Order") || tap(items, "Confirm") || adb("shell input tap 540 2100");
  await sleep(15000);
}

async function payRazorpay() {
  dumpAndLog("razorpay sheet");
  let items = uiDump();
  // Try UPI first (simpler on emulator)
  if (tap(items, "UPI")) {
    await sleep(3000);
    items = uiDump();
    const upiField = items.find((i) => i.cls.includes("EditText"));
    if (upiField) {
      await clearTapType(upiField.cx, upiField.cy, "success@razorpay");
    } else {
      typeText("success@razorpay");
    }
    await sleep(2000);
    items = uiDump();
    tap(items, "Pay") || tap(items, "Continue") || adb("shell input tap 540 1800");
    await sleep(20000);
    return;
  }
  // Card fallback
  tap(items, "Card") || tap(items, "card");
  await sleep(3000);
  items = uiDump();
  const edits = items.filter((i) => i.cls.includes("EditText"));
  if (edits[0]) await clearTapType(edits[0].cx, edits[0].cy, "4111111111111111");
  if (edits[1]) await clearTapType(edits[1].cx, edits[1].cy, "1226");
  if (edits[2]) await clearTapType(edits[2].cx, edits[2].cy, "123");
  await sleep(2000);
  items = uiDump();
  tap(items, "Pay") || adb("shell input tap 540 2000");
  await sleep(20000);
}

async function queryNewOrder(beforeIds) {
  const sb = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON);
  await sb.auth.signInWithPassword({ email: "admin@patwadi.com", password: "Patwadi123!" });
  const { data } = await sb
    .from("orders")
    .select("id,payment_status,corridor_key,created_at,pickup_location,dropoff_location")
    .eq("customer_id", CUSTOMER_ID)
    .order("created_at", { ascending: false })
    .limit(5);
  const fresh = (data ?? []).filter((o) => !beforeIds.has(o.id));
  return { all: data, fresh };
}

async function checkMyPackages() {
  adb("shell monkey -p com.anonymous.patwadi 1");
  await sleep(5000);
  let items = uiDump();
  tap(items, "My Packages") || tap(items, "Packages") || adb("shell input tap 404 2305");
  await sleep(5000);
  return dumpAndLog("my packages");
}

async function main() {
  const sb = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON);
  await sb.auth.signInWithPassword({ email: "admin@patwadi.com", password: "Patwadi123!" });
  const { data: before } = await sb
    .from("orders")
    .select("id")
    .eq("customer_id", CUSTOMER_ID);
  const beforeIds = new Set((before ?? []).map((o) => o.id));
  console.log("Orders before:", [...beforeIds]);

  if (!process.env.SKIP_LAUNCH) {
    await launchApp();
  }
  await ensureCustomerHome();
  await fillPackageInfo();
  await fillPickup();
  await fillDropoff();
  await toConfirmAndPay();
  await payRazorpay();

  dumpAndLog("after payment");
  const { all, fresh } = await queryNewOrder(beforeIds);
  const packagesUi = await checkMyPackages();

  const booked = packagesUi.find((i) => /booked/i.test(i.text));
  console.log("\n=== RESULT ===");
  console.log("New orders:", JSON.stringify(fresh, null, 2));
  console.log("All recent:", JSON.stringify(all, null, 2));
  console.log("My Packages Booked label:", booked ?? "not found in UI dump");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
