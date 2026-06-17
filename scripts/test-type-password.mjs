import { adb, uiDump, typeText, sleep } from "./ui-helpers.mjs";

adb("shell input keyevent KEYCODE_WAKEUP");
const items = uiDump();
const pass = items.find((i) => i.cls.includes("EditText") && i.cy > 980 && i.cy < 1050);
if (pass) {
  adb(`shell input tap ${pass.cx} ${pass.cy}`);
  await sleep(300);
  adb("shell input keyevent 123");
  for (let i = 0; i < 50; i++) adb("shell input keyevent 67");
  typeText("Patwadi123!");
  await sleep(500);
}
const after = uiDump();
const field = after.find((i) => i.cls.includes("EditText") && i.cy > 980 && i.cy < 1050);
console.log("password field:", field?.text, "length:", field?.text?.length);
