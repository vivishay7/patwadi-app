import { adb, uiDump, tap, sleep, fillField, dismissLogBox } from "./ui-helpers.mjs";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DUMP = resolve(ROOT, "ui-dump.xml");

function boundsCenter(text) {
  const xml = readFileSync(DUMP, "utf8");
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

async function main() {
  adb("reverse tcp:8082 tcp:8082");
  adb(
    'shell am start -a android.intent.action.VIEW -d "exp+patwadi://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8082"',
  );
  await sleep(18000);
  let items = uiDump();
  await dismissLogBox(items);
  if (tap(items, "Log in")) await sleep(4000);
  items = uiDump();
  const signInTitle = items.find((i) => /sign in/i.test(i.text));
  if (signInTitle) {
    for (let k = 0; k < 4; k++) {
      adb(`shell input tap ${signInTitle.cx} ${signInTitle.cy}`);
      await sleep(250);
    }
  }
  items = uiDump();
  tap(items, "Sign In") || adb("shell input tap 540 1655");
  await sleep(8000);
  items = uiDump();
  const edits = items
    .filter((i) => i.cls.includes("EditText"))
    .sort((a, b) => a.cy - b.cy);
  if (edits.length >= 2) {
    await fillField(edits[0].cx, edits[0].cy, "testlinehaul@patwadi.com");
    await fillField(edits[1].cx, edits[1].cy, "Patwadi123!");
    adb("shell input keyevent 4");
    await sleep(500);
    uiDump();
    const btn = boundsCenter("Sign in with email");
    if (btn) adb(`shell input tap ${btn.cx} ${btn.cy}`);
    await sleep(25000);
  }
  items = uiDump();
  console.log(
    items
      .filter((i) => i.text)
      .map((i) => i.text)
      .join(" | "),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
