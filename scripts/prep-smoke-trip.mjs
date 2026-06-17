/** Publish smoke trip with bus proof for emulator tracking test */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON;

function adb(cmd) {
  try {
    return execSync(`adb ${cmd}`, { encoding: "utf8", timeout: 30000 }).trim();
  } catch (e) {
    return e.stdout?.toString?.() || "";
  }
}

async function main() {
  const { client, userId } = await (async () => {
    const c = createClient(URL, ANON);
    const { data, error } = await c.auth.signInWithPassword({
      email: "testlinehaul@patwadi.com",
      password: "Patwadi123!",
    });
    if (error) throw error;
    return { client: c, userId: data.user.id };
  })();

  const admin = createClient(URL, ANON);
  await admin.auth.signInWithPassword({ email: "admin@patwadi.com", password: "Patwadi123!" });

  // Remove prior smoke drafts
  await client.from("linehaul_trips").delete().eq("bus_number", "S11-SMOKE");

  const departure = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const arrival = new Date(departure.getTime() + 5 * 60 * 60 * 1000);

  const { data: trip, error: insErr } = await client
    .from("linehaul_trips")
    .insert({
      corridor_id: "delhi_chandigarh",
      route_label: "Delhi → Chandigarh",
      bus_number: "S11-SMOKE",
      driver_name: "Smoke Test",
      driver_phone: "9999999999",
      scheduled_departure_at: departure.toISOString(),
      expected_arrival_at: arrival.toISOString(),
      status: "draft",
      created_by_conductor_id: userId,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;

  const tripId = trip.id;
  const jpeg = Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==",
    "base64"
  );
  const photoPath = `trip-bus/${tripId}/smoke.jpg`;
  const { error: upErr } = await client.storage
    .from("custody-proofs")
    .upload(photoPath, jpeg, { contentType: "image/jpeg" });
  if (upErr) throw upErr;

  await client
    .from("linehaul_trips")
    .update({ bus_proof_photo_path: photoPath })
    .eq("id", tripId);

  console.log("TRIP_ID", tripId);
  console.log("Now publish via emulator Trip Detail → Publish, or run UI tap.");

  // Trigger app refresh after user publishes in UI
  adb("shell input keyevent 3");
  await sleep(2000);
  adb("shell monkey -p com.anonymous.patwadi -c android.intent.category.LAUNCHER 1");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
