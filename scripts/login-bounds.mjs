import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { adb, uiDump, tap, dumpAndLog, sleep, typeText } from "./ui-helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DUMP = resolve(__dirname, "..", "ui-dump.xml");

function boundsCenter(text) {
  const xml = readFileSync(DUMP, "utf8");
  const re = new RegExp(`text="${text}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
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
  for (let i = 0; i < 6; i++) {
    adb("shell input keyevent 4");
    await sleep(500);
    const items = uiDump();
    if (items.some((x) => /sign in with email/i.test(x.text))) return items;
    if (items.some((x) => /log in/i.test(x.text))) {
      tap(items, "Log in");
      await sleep(3000);
      return uiDump();
    }
  }
  throw new Error("Could not reach Sign In screen");
}

async function main() {
  adb("shell input keyevent KEYCODE_WAKEUP");
  let items = await backToSignIn();
  if (items.some((i) => /send parcel/i.test(i.text))) {
    dumpAndLog("already home");
    return;
  }

  const email = items.find((i) => i.cls.includes("EditText") && i.cy > 850 && i.cy < 950);
  const pass = items.find((i) => i.cls.includes("EditText") && i.cy > 980 && i.cy < 1050);
  if (!email || !pass) throw new Error("Login fields missing");

  await clearField(email.cx, email.cy, "testcustomer@patwadi.com");
  adb(`shell input tap ${pass.cx} ${pass.cy}`);
  await sleep(400);
  await clearField(pass.cx, pass.cy, "Patwadi123!");
  adb("shell input keyevent 4");
  await sleep(700);

  uiDump();
  const btn = boundsCenter("Sign in with email");
  if (!btn) throw new Error("Sign in button bounds not found");
  adb(`shell input tap ${btn.cx} ${btn.cy}`);
  await sleep(25000);

  items = uiDump();
  if (!items.some((i) => /send parcel/i.test(i.text))) {
    dumpAndLog("failed");
    throw new Error("Manual bounds tap did not log in");
  }
  dumpAndLog("success");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
