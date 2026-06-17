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

const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON;
const tripId = process.argv[2];

async function main() {
  const client = createClient(URL, ANON);
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: "testlinehaul@patwadi.com",
    password: "Patwadi123!",
  });
  if (authErr) throw authErr;
  console.log("signed in", auth.user.id);

  const { data: trips } = await client
    .from("linehaul_trips")
    .select("id, status, created_by_conductor_id, route_label")
    .eq("status", "draft");
  console.log("drafts visible:", trips);

  const target = tripId || trips?.[0]?.id;
  if (!target) {
    console.log("no draft to delete");
    return;
  }

  const { data: parcels } = await client
    .from("orders")
    .select("id")
    .eq("trip_id", target);
  console.log("parcels on trip:", parcels);

  const { data, error } = await client
    .from("linehaul_trips")
    .delete()
    .eq("id", target)
    .select();
  console.log("delete result:", { data, error });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
