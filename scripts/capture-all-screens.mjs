import { mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { adb, uiDump, tap, sleep } from "./ui-helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "smoke-screenshots", "logout-audit");
mkdirSync(OUT, { recursive: true });

let idx = 0;

function shot(label) {
  idx += 1;
  const name = `${String(idx).padStart(2, "0")}-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
  adb(`shell screencap -p /sdcard/cap.png`);
  adb(`pull /sdcard/cap.png "${OUT}/${name}"`);
  const items = uiDump();
  const summary = items
    .filter((i) => i.text && i.text.length < 120)
    .slice(0, 25)
    .map((i) => i.text);
  writeFileSync(
    resolve(OUT, `${name.replace(".png", ".txt")}`),
    summary.join("\n"),
    "utf8"
  );
  console.log(`\n[${name}]`);
  for (const t of summary) console.log(" ", t);
  return items;
}

async function tryTap(items, pattern) {
  if (tap(items, pattern)) {
    await sleep(2500);
    return true;
  }
  return false;
}

adb("shell input keyevent KEYCODE_WAKEUP");
await sleep(500);

let items = shot("initial");

// Bottom tabs: Home, Send, Packages, Settings (icon-only — tap by x coords from dump)
const tabHits = items.filter(
  (i) => i.cy > 1450 && i.cy < 1550 && i.cls.includes("TextView")
);
const tabXs = [...new Set(tabHits.map((i) => i.cx))].sort((a, b) => a - b);
console.log("Tab x positions:", tabXs);

const tabNames = ["home-tab", "send-tab", "packages-tab", "settings-tab"];
for (let i = 0; i < tabXs.length && i < 4; i++) {
  adb(`shell input tap ${tabXs[i]} 1498`);
  await sleep(2500);
  items = shot(tabNames[i] || `tab-${i}`);
}

// Re-open settings and try logout-adjacent areas if visible
items = uiDump();
if (await tryTap(items, "Settings")) {
  items = shot("settings-screen");
}
if (await tryTap(items, "My Packages")) {
  items = shot("my-packages");
}
if (await tryTap(items, "Send Parcel")) {
  items = shot("send-parcel-entry");
  adb("shell input keyevent 4");
  await sleep(1000);
}
if (await tryTap(items, "Track Package")) {
  items = shot("track-package");
  adb("shell input keyevent 4");
  await sleep(1000);
}
if (await tryTap(items, "Log in")) {
  items = shot("login-prompt");
}

console.log(`\nSaved to ${OUT}`);
