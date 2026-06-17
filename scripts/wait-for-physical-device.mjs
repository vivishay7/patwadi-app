/**
 * Poll until a non-emulator device appears in `adb devices`, then print serial.
 * node scripts/wait-for-physical-device.mjs
 */
import { execSync } from "child_process";

function listPhysical() {
  const out = execSync("adb devices", { encoding: "utf8" });
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.endsWith("device") && !l.startsWith("List") && !l.includes("emulator"))
    .map((l) => l.split(/\s+/)[0]);
}

const timeoutMs = 300_000;
const start = Date.now();
while (Date.now() - start < timeoutMs) {
  const devices = listPhysical();
  if (devices.length) {
    console.log("PHYSICAL_SERIAL", devices[0]);
    process.exit(0);
  }
  const unauthorized = execSync("adb devices", { encoding: "utf8" });
  if (/unauthorized/i.test(unauthorized)) {
    console.error("Device visible but UNAUTHORIZED — unlock phone and tap Allow on USB debugging prompt.");
  }
  process.stdout.write(".");
  await new Promise((r) => setTimeout(r, 3000));
}
console.error("\nTimed out — no physical device in adb devices");
process.exit(1);
