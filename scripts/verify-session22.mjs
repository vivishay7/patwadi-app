/**
 * Session 22 verification — LMP assignment, step ordering, photo validation, location, 4-hop chain.
 * Prereq: run supabase/schema/phase22_test_cleanup_add323df.sql before this script.
 * node scripts/verify-session22.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const SUPABASE_URL =
  env.EXPO_PUBLIC_SUPABASE_URL || "https://wvxyaqqlqwbbpkgvrali.supabase.co";
const ANON =
  env.EXPO_PUBLIC_SUPABASE_ANON ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2eHlhcXFscXdiYnBrZ3ZyYWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTc3NjIsImV4cCI6MjA5Njc3Mzc2Mn0.KEdghBOSjKB0vdjk95uQperx-adw0qOGAWxJ74lPos4";
const PASSWORD = "Patwadi123!";

const ORDER_ID = "add323df-b2a6-4a4a-ba32-61e99ebfd83b";
const TESTLMP = "a30847c9-f032-4168-b4b9-a8bfbff03bb2";
const TESTLINEHAUL = "43840a88-0597-42e1-83e8-c86c5c1999b3";

const results = {};

function client() {
  return createClient(SUPABASE_URL, ANON);
}

async function signIn(email) {
  const sb = client();
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  const token = data.session.access_token;
  const authed = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  authed.userToken = token;
  return authed;
}

async function invokeAck(sb, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/acknowledge-handoff`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sb.userToken}`,
      apikey: ANON,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function invokeIssue(sb, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/issue-handoff-code`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sb.userToken}`,
      apikey: ANON,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function deriveState(events) {
  const has = (f, t) => events.some((e) => e.from_role === f && e.to_role === t);
  if (has("lmp", "customer")) return "delivered";
  if (has("linehaul", "lmp")) return "out_for_delivery";
  if (has("lmp", "linehaul")) return "in_transit";
  if (has("customer", "lmp")) return "pickup_confirmed";
  return "created";
}

async function uploadProof(sb, step, name = `test_${Date.now()}.jpg`) {
  const path = `${ORDER_ID}/${step}/${name}`;
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const { error } = await sb.storage.from("custody-proofs").upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
  return path;
}

async function assignOperators(admin, linehaulId = TESTLINEHAUL) {
  const { data, error } = await admin.rpc("assign_lmp_to_order", {
    p_order_id: ORDER_ID,
    p_lmp_pickup_id: TESTLMP,
    p_lmp_delivery_id: TESTLMP,
    p_linehaul_id: linehaulId,
  });
  if (error) throw error;
  return data;
}

async function getHandoffCode(receiverSb, step) {
  const { data } = await receiverSb
    .from("handoff_codes")
    .select("expected_code")
    .eq("parcel_id", ORDER_ID)
    .eq("step", step)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.expected_code;
}

async function runHop({ senderEmail, receiverEmail, step, lat, lng }) {
  const sender = await signIn(senderEmail);
  const receiver = await signIn(receiverEmail);
  const issue = await invokeIssue(sender, { parcelId: ORDER_ID, step });
  if (issue.status !== 200) throw new Error(`issue ${step}: ${JSON.stringify(issue.json)}`);
  const code = await getHandoffCode(receiver, step);
  if (!code) throw new Error(`no code for ${step}`);
  const photoPath = await uploadProof(sender, step);
  const ack = await invokeAck(sender, {
    parcelId: ORDER_ID,
    step,
    code,
    photoPath,
    mimeType: "image/jpeg",
    lat,
    lng,
    locationAccuracyM: 12,
  });
  if (ack.status !== 200) throw new Error(`ack ${step} ${ack.status}: ${JSON.stringify(ack.json)}`);
  return ack.json.event;
}

async function main() {
  console.log("Session 22 verification\n");

  // ITEM 1
  try {
    const admin = await signIn("admin@patwadi.com");
    const data = await assignOperators(admin);
    const { data: order } = await admin
      .from("orders")
      .select("lmp_pickup_id,lmp_delivery_id")
      .eq("id", ORDER_ID)
      .single();
    const ok = data?.ok && order.lmp_pickup_id === TESTLMP && order.lmp_delivery_id === TESTLMP;
    results.item1 = ok ? "PASS" : "FAIL";
    console.log(`ITEM 1 assign_lmp_to_order: ${results.item1}`, order);
  } catch (e) {
    results.item1 = "FAIL";
    console.log(`ITEM 1 assign_lmp_to_order: FAIL`, e.message);
  }

  // ITEM 2 — skip-step should 409 (requires clean parcel — run cleanup SQL first)
  try {
    await assignOperators(await signIn("admin@patwadi.com"));
    const lmp = await signIn("testlmp@patwadi.com");
    const ack = await invokeAck(lmp, {
      parcelId: ORDER_ID,
      step: "lmp_to_linehaul",
      code: "1234",
      photoPath: `${ORDER_ID}/lmp_to_linehaul/fake.jpg`,
    });
    results.item2 = ack.status === 409 ? "PASS" : "FAIL";
    console.log(`ITEM 2 prior step 409: ${results.item2}`, ack.status, ack.json);
  } catch (e) {
    results.item2 = "FAIL";
    console.log(`ITEM 2 prior step 409: FAIL`, e.message);
  }

  // ITEM 3 — photo path + storage existence
  try {
    const customer = await signIn("testcustomer@patwadi.com");
    const badFormat = await invokeAck(customer, {
      parcelId: ORDER_ID,
      step: "customer_to_lmp",
      code: "1234",
      photoPath: "not-a-valid-path",
    });
    const missing = await invokeAck(customer, {
      parcelId: ORDER_ID,
      step: "customer_to_lmp",
      code: "1234",
      photoPath: `${ORDER_ID}/customer_to_lmp/missing.jpg`,
    });
    const ok = badFormat.status === 400 && missing.status === 400;
    results.item3 = ok ? "PASS" : "FAIL";
    console.log(`ITEM 3 photo validation: ${results.item3}`, {
      badFormat: badFormat.status,
      missing: missing.status,
    });
  } catch (e) {
    results.item3 = "FAIL";
    console.log(`ITEM 3 photo validation: FAIL`, e.message);
  }

  // ITEM 4 — location columns
  try {
    const admin = await signIn("admin@patwadi.com");
    const { data: cols, error } = await admin
      .from("custody_events")
      .select("lat,lng,location_accuracy_m")
      .limit(1);
    if (error) throw error;
    results.item4 = "PASS";
    console.log(`ITEM 4 location columns: PASS`, cols);
  } catch (e) {
    results.item4 = "FAIL";
    console.log(`ITEM 4 location columns: FAIL`, e.message);
  }

  // ITEM 5 — full 4-hop chain (requires clean parcel — run cleanup SQL first)
  try {
    await assignOperators(await signIn("admin@patwadi.com"));

    await runHop({
      senderEmail: "testcustomer@patwadi.com",
      receiverEmail: "testlmp@patwadi.com",
      step: "customer_to_lmp",
      lat: 28.6139,
      lng: 77.209,
    });
    await runHop({
      senderEmail: "testlmp@patwadi.com",
      receiverEmail: "testlinehaul@patwadi.com",
      step: "lmp_to_linehaul",
    });
    await runHop({
      senderEmail: "testlinehaul@patwadi.com",
      receiverEmail: "testlmp@patwadi.com",
      step: "linehaul_to_lmp",
    });
    await runHop({
      senderEmail: "testlmp@patwadi.com",
      receiverEmail: "testcustomer@patwadi.com",
      step: "lmp_to_customer",
    });

    const admin2 = await signIn("admin@patwadi.com");
    const { data: events } = await admin2
      .from("custody_events")
      .select("*")
      .eq("parcel_id", ORDER_ID)
      .order("created_at", { ascending: true });
    const state = deriveState(events || []);
    const withLoc = (events || []).some((e) => e.lat != null && e.lng != null);
    const ok = (events || []).length === 4 && state === "delivered" && withLoc;
    results.item5 = ok ? "PASS" : "FAIL";
    console.log(`ITEM 5 full chain: ${results.item5}`, { count: events?.length, state, withLoc });
  } catch (e) {
    results.item5 = "FAIL";
    console.log(`ITEM 5 full chain: FAIL`, e.message);
  }

  console.log("\nSummary:", results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
