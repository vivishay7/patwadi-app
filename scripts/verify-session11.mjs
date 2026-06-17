/**
 * Session 11 — verify location_samples sync + flag 4 inputs.
 * Run: node scripts/verify-session11.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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
const TEST_TRIP_PREFIX = "session11-verify-";

function log(label, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}${detail ? `: ${detail}` : ""}`);
}

async function signIn(email, password) {
  const client = createClient(URL, ANON);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email} sign-in: ${error.message}`);
  return client;
}

async function main() {
  let passed = 0;
  let failed = 0;
  const check = (label, ok, detail) => {
    log(label, ok, detail);
    if (ok) passed++;
    else failed++;
  };

  const linehaul = await signIn("testlinehaul@patwadi.com", "Patwadi123!");
  const admin = await signIn("admin@patwadi.com", "Patwadi123!");

  const recordedAt = new Date().toISOString();
  const samples = [
    {
      tripId: null,
      orderId: null,
      role: "linehaul",
      lat: 28.614,
      lng: 77.209,
      accuracyM: 12,
      recordedAt,
    },
    {
      tripId: null,
      orderId: null,
      role: "linehaul",
      lat: 28.615,
      lng: 77.21,
      accuracyM: 10,
      recordedAt: new Date(Date.now() + 1000).toISOString(),
    },
  ];

  const { data: syncData, error: syncErr } = await linehaul.functions.invoke(
    "sync-location-samples",
    { body: { samples } }
  );
  check("sync-location-samples invoke", !syncErr && syncData?.ok, syncErr?.message || `written=${syncData?.written}`);

  const { data: ownRows } = await linehaul
    .from("location_samples")
    .select("id, lat, role")
    .eq("role", "linehaul")
    .order("synced_at", { ascending: false })
    .limit(5);
  check("operator SELECT own samples", (ownRows ?? []).length >= 2, `${ownRows?.length ?? 0} rows`);

  const { data: adminRows } = await admin
    .from("location_samples")
    .select("id")
    .order("synced_at", { ascending: false })
    .limit(1);
  check("admin SELECT location_samples", (adminRows ?? []).length >= 1);

  const { data: cols } = await admin
    .from("linehaul_trips")
    .select("is_overdue, closed_at")
    .limit(1);
  check("linehaul_trips has is_overdue/closed_at", !cols?.error && Array.isArray(cols), cols?.error?.message);

  const { data: timerResult, error: timerErr } = await admin.rpc(
    "apply_linehaul_trip_timer_transitions"
  );
  check("cron function callable", !timerErr, timerErr?.message || `returned ${timerResult}`);

  // Cleanup samples from this test (by recent sync, linehaul user)
  const { data: sessionUser } = await linehaul.auth.getUser();
  if (sessionUser?.user?.id) {
    await admin
      .from("location_samples")
      .delete()
      .eq("conductor_id", sessionUser.user.id)
      .gte("synced_at", new Date(Date.now() - 60_000).toISOString());
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
