// v6 §19 — bulk upsert location samples from client offline queue
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJson, handleCorsPreflight } from "../_shared/cors.ts";

type IncomingSample = {
  tripId?: string | null;
  orderId?: string | null;
  role: "linehaul" | "lmp";
  lat: number;
  lng: number;
  accuracyM?: number | null;
  recordedAt: string;
};

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const authed = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const {
      data: { user },
      error: userError,
    } = await authed.auth.getUser();
    if (userError || !user) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const samples: IncomingSample[] = Array.isArray(body.samples) ? body.samples : [];
    if (!samples.length) {
      return corsJson({ error: "samples array required" }, { status: 400 });
    }

    let written = 0;
    const now = new Date().toISOString();

    for (const s of samples) {
      if (s.role !== "linehaul" && s.role !== "lmp") continue;
      if (typeof s.lat !== "number" || typeof s.lng !== "number" || !s.recordedAt) continue;

      const row = {
        trip_id: s.tripId ?? null,
        order_id: s.orderId ?? null,
        conductor_id: user.id,
        role: s.role,
        lat: s.lat,
        lng: s.lng,
        accuracy_m: s.accuracyM ?? null,
        recorded_at: s.recordedAt,
        synced_at: now,
      };

      const { error } = await supabase.from("location_samples").insert(row);
      if (!error) {
        written += 1;
        continue;
      }
      if (error.code === "23505") {
        continue;
      }
      console.error("sync-location-samples insert:", error);
    }

    return corsJson({ ok: true, written, received: samples.length });
  } catch (e) {
    return corsJson({ error: String(e) }, { status: 500 });
  }
});
