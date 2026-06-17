import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DUMP = resolve(ROOT, "ui-dump.xml");

const DEVICE = process.env.ANDROID_SERIAL || "AIGQDASODIUSL7AQ";

export function adb(cmd) {
  return execSync(`adb -s ${DEVICE} ${cmd}`, { encoding: "utf8", timeout: 60000 }).trim();
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function uiDump() {
  adb("shell uiautomator dump /sdcard/ui.xml");
  adb(`pull /sdcard/ui.xml "${DUMP}"`);
  const x = readFileSync(DUMP, "utf8");
  const nodes = x.match(/<node[^>]+>/g) || [];
  const items = [];
  for (const n of nodes) {
    const text = n.match(/text="([^"]*)"/)?.[1] ?? "";
    const cls = n.match(/class="([^"]*)"/)?.[1] ?? "";
    const bounds = n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (!bounds) continue;
    items.push({
      text,
      cls,
      cx: Math.floor((+bounds[1] + +bounds[3]) / 2),
      cy: Math.floor((+bounds[2] + +bounds[4]) / 2),
    });
  }
  return items;
}

export function tap(items, pattern, { partial = true } = {}) {
  const re = partial ? new RegExp(pattern, "i") : new RegExp(`^${pattern}$`, "i");
  const hit = items.find((i) => re.test(i.text));
  if (!hit) return false;
  adb(`shell input tap ${hit.cx} ${hit.cy}`);
  return true;
}

export function dumpAndLog(label) {
  const items = uiDump();
  console.log(`\n--- ${label} ---`);
  for (const i of items.filter((x) => x.text)) {
    console.log(JSON.stringify(i));
  }
  return items;
}

export function typeText(text) {
  const safe = text.replace(/ /g, "%s");
  adb(`shell input text "${safe.replace(/"/g, '\\"')}"`);
}

/** First EditText below a label TextView matching `labelRe`. */
export function findEditAfterLabel(items, labelRe) {
  const label = items.find((i) => labelRe.test(i.text));
  if (!label) return null;
  return items
    .filter((i) => i.cls.includes("EditText") && i.cy > label.cy)
    .sort((a, b) => a.cy - b.cy)[0];
}

export async function clearTapType(cx, cy, text) {
  adb(`shell input tap ${cx} ${cy}`);
  await sleep(400);
  adb("shell input keyevent 123");
  for (let i = 0; i < 12; i++) adb("shell input keyevent 67");
  typeText(text);
  await sleep(350);
}

/** Tap an empty/placeholder field and type without heavy backspace (avoids Gboard settings on OPPO). */
export async function fillField(cx, cy, text) {
  adb(`shell input tap ${cx} ${cy}`);
  await sleep(400);
  typeText(text);
  await sleep(350);
}

export async function dismissLogBox(items = uiDump()) {
  if (tap(items, "Dismiss")) {
    await sleep(600);
    return true;
  }
  const banner = items.find((i) => i.text === "!");
  if (banner) {
    adb(`shell input tap ${banner.cx} ${banner.cy}`);
    await sleep(800);
    const expanded = uiDump();
    if (tap(expanded, "Dismiss")) {
      await sleep(600);
      return true;
    }
    adb("shell input keyevent 4");
    await sleep(400);
    return true;
  }
  return false;
}

/** Pick a Mapbox-style result row; prefer city name match in primary line. */
export function findLocationResult(items, cityName) {
  const cityRe = new RegExp(cityName, "i");
  const badRe = /himachal|mandi|west bengal|punjab.*india.*176/i;
  const candidates = items.filter(
    (i) =>
      !i.cls.includes("EditText") &&
      cityRe.test(i.text) &&
      i.cy > 400 &&
      i.cy < 1200 &&
      i.text.length < 80
  );
  const good = candidates.find((i) => new RegExp(`^${cityName}$`, "i").test(i.text.trim()));
  if (good) return good;
  return candidates.find((i) => !badRe.test(i.text)) || candidates[0] || null;
}
