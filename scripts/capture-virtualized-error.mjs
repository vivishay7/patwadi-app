import { mkdirSync } from "fs";
import { adb, uiDump, tap, sleep, typeText } from "./ui-helpers.mjs";

mkdirSync("smoke-screenshots", { recursive: true });

async function clearField(cx, cy, t) {
  adb(`shell input tap ${cx} ${cy}`);
  await sleep(300);
  adb("shell input keyevent 123");
  for (let i = 0; i < 35; i++) adb("shell input keyevent 67");
  typeText(t);
  await sleep(300);
}

function shot(name) {
  adb(`shell screencap -p /sdcard/${name}`);
  adb(`pull /sdcard/${name} smoke-screenshots/${name}`);
  console.log("saved smoke-screenshots/" + name);
}

let items = uiDump();

// If on home, start booking flow
if (items.some((i) => /send parcel/i.test(i.text))) {
  tap(items, "Send Parcel");
  await sleep(5000);
  items = uiDump();
  tap(items, "Other");
  await sleep(400);
  const contents = items.find((i) => i.cls.includes("EditText") && i.cy > 900 && i.cy < 1000);
  const value = items.find((i) => i.cls.includes("EditText") && i.cy > 1150 && i.cy < 1220);
  if (contents) await clearField(contents.cx, contents.cy, "Books");
  if (value) await clearField(value.cx, value.cy, "1000");
  adb("shell input swipe 540 1500 540 500 500");
  await sleep(700);
  items = uiDump();
  const dims = items
    .filter((i) => i.cls.includes("EditText") && i.cy > 1280 && i.cy < 1360)
    .sort((a, b) => a.cx - b.cx);
  const weight = items.find((i) => i.cls.includes("EditText") && i.cy > 1380 && i.cy < 1450);
  if (dims[0]) await clearField(dims[0].cx, dims[0].cy, "30");
  if (dims[1]) await clearField(dims[1].cx, dims[1].cy, "20");
  if (dims[2]) await clearField(dims[2].cx, dims[2].cy, "10");
  if (weight) await clearField(weight.cx, weight.cy, "2");
  adb("shell input keyevent 4");
  await sleep(500);
  items = uiDump();
  tap(items, "Next") || tap(items, "Pickup Location");
  await sleep(8000);
  items = uiDump();
}

shot("13-pickup-screen.png");

const search =
  items.find((i) => /search for pickup/i.test(i.text)) ||
  items.find((i) => i.cls.includes("EditText") && i.cy < 500);
if (search) {
  adb(`shell input tap ${search.cx} ${search.cy}`);
  await sleep(500);
  adb("shell input keyevent 123");
  for (let i = 0; i < 15; i++) adb("shell input keyevent 67");
  typeText("Delhi");
  await sleep(10000);
}

shot("14-pickup-delhi-search-results.png");
items = uiDump();

const hasBanner = items.some((i) => i.text === "!");
const hasError = items.some((i) => /VirtualizedLists/i.test(i.text));
console.log("Red banner (!):", hasBanner);
console.log("VirtualizedLists text:", hasError);

if (hasBanner) {
  const banner = items.find((i) => i.text === "!");
  adb(`shell input tap ${banner.cx} ${banner.cy}`);
  await sleep(2000);
  shot("15-logbox-red-banner-bottom.png");
  items = uiDump();
}

if (items.some((i) => /Console Error/i.test(i.text))) {
  shot("16-virtualized-list-console-error-fullscreen.png");
  for (const i of items.filter((x) => /Virtualized|Console Error|Call Stack/i.test(x.text))) {
    console.log("LOG:", i.text.slice(0, 200));
  }
} else if (hasError) {
  shot("16-virtualized-list-inline-error.png");
}
