/**
 * Session 10 — verify corridors table RLS + test corridor cycle.
 * Run: node scripts/verify-corridors-rls.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON;
const TEST_KEY = "chandigarh_kullu";

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

  // 1. Anon: SELECT active corridors only
  const anon = createClient(URL, ANON);
  const { data: anonRows, error: anonErr } = await anon
    .from("corridors")
    .select("key, active")
    .order("key");
  check("anon SELECT", !anonErr, anonErr?.message);
  const anonAllActive = (anonRows ?? []).every((r) => r.active);
  check("anon sees only active", anonAllActive, `${anonRows?.length ?? 0} rows`);
  const seedCount = (anonRows ?? []).length;

  // 2. Admin: INSERT test corridor
  const admin = await signIn("admin@patwadi.com", "Patwadi123!");
  await admin.from("corridors").delete().eq("key", TEST_KEY);

  const { error: insertErr } = await admin.from("corridors").insert({
    key: TEST_KEY,
    origin_city: "Chandigarh",
    origin_lat: 30.7333,
    origin_lng: 76.7794,
    destination_city: "Kullu",
    destination_lat: 31.9578,
    destination_lng: 77.1095,
    expected_duration_hours: 6,
    active: true,
  });
  check("admin INSERT", !insertErr, insertErr?.message);

  const { data: adminAll } = await admin.from("corridors").select("key, active");
  const hasTest = (adminAll ?? []).some((r) => r.key === TEST_KEY);
  check("admin sees test corridor", hasTest);

  // 3. Operator: SELECT active (includes new test corridor)
  const operator = await signIn("testlinehaul@patwadi.com", "Patwadi123!");
  const { data: opActive } = await operator
    .from("corridors")
    .select("key")
    .eq("active", true);
  const opSeesTest = (opActive ?? []).some((r) => r.key === TEST_KEY);
  check("operator SELECT active includes test", opSeesTest, `${opActive?.length} active`);

  // 4. Anon/operator picker: active count increased
  const { data: anonAfter } = await anon.from("corridors").select("key").eq("active", true);
  check(
    "anon active count includes test",
    (anonAfter ?? []).some((r) => r.key === TEST_KEY),
    `${anonAfter?.length} active (was ${seedCount})`
  );

  // 5. Deactivate — disappears from active lists
  const { error: deactivateErr } = await admin
    .from("corridors")
    .update({ active: false })
    .eq("key", TEST_KEY);
  check("admin deactivate test corridor", !deactivateErr, deactivateErr?.message);

  const { data: anonInactive } = await anon.from("corridors").select("key").eq("key", TEST_KEY);
  check("anon no longer sees inactive test", (anonInactive ?? []).length === 0);

  const { data: opAfter } = await operator.from("corridors").select("key").eq("key", TEST_KEY);
  check("operator no longer sees inactive test", (opAfter ?? []).length === 0);

  const { data: adminStill } = await admin.from("corridors").select("key, active").eq("key", TEST_KEY);
  check(
    "admin still sees inactive test",
    (adminStill ?? []).length === 1 && adminStill[0].active === false
  );

  // Cleanup: remove test row so DB stays clean
  await admin.from("corridors").delete().eq("key", TEST_KEY);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
