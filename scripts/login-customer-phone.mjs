import { adb, uiDump, tap, dumpAndLog, sleep, typeText } from "./ui-helpers.mjs";

async function clearTapType(cx, cy, text) {
  adb(`shell input tap ${cx} ${cy}`);
  await sleep(400);
  adb("shell input keyevent 123");
  for (let i = 0; i < 40; i++) adb("shell input keyevent 67");
  typeText(text);
  await sleep(300);
}

export async function loginCustomerPhone() {
  let items = uiDump();
  if (items.some((i) => /send parcel/i.test(i.text))) return dumpAndLog("customer home");

  if (items.some((i) => /log in/i.test(i.text))) {
    tap(items, "Log in");
    await sleep(4000);
    items = uiDump();
  }

  const email = items.find((i) => i.cls.includes("EditText") && i.cy > 850 && i.cy < 950);
  const pass = items.find((i) => i.cls.includes("EditText") && i.cy > 980 && i.cy < 1050);
  if (email) await clearTapType(email.cx, email.cy, "testcustomer@patwadi.com");
  if (pass) {
    adb(`shell input tap ${pass.cx} ${pass.cy}`);
    await sleep(400);
    await clearTapType(pass.cx, pass.cy, "Patwadi123!");
  }
  adb("shell input keyevent 4");
  await sleep(600);
  adb("shell input swipe 540 900 540 400 350");
  await sleep(500);
  items = uiDump();
  const btn = items.find((i) => /^sign in with email$/i.test(i.text));
  if (btn) adb(`shell input tap ${btn.cx} ${btn.cy + 30}`);
  else adb("shell input tap 359 1155");
  await sleep(22000);
  items = uiDump();
  if (!items.some((i) => /send parcel/i.test(i.text))) {
    dumpAndLog("login failed");
    throw new Error("Login did not reach customer home");
  }
  return dumpAndLog("customer home");
}

if (process.argv[1]?.endsWith("login-customer-phone.mjs")) {
  loginCustomerPhone().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
