// Supabase Edge Function: admin-resolve-blocked
// Admin actions: unblock parcel and/or regenerate active handoff code. Writes audit logs.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJson, handleCorsPreflight } from "../_shared/cors.ts";

function getRequired(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function random4(): string {
  const n = Math.floor(Math.random() * 10000);
  return String(n).padStart(4, "0");
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseUrl = getRequired("SUPABASE_URL");
    const serviceRoleKey = getRequired("SUPABASE_SERVICE_ROLE_KEY");
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
    if (userError || !user) return corsJson({ error: "Unauthorized" }, { status: 401 });

    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("user_id, active")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();
    if (!adminProfile) return corsJson({ error: "Forbidden: admin only" }, { status: 403 });

    const body = await req.json();
    const parcelId: string = body.parcelId;
    const unblock: boolean = !!body.unblock;
    const reason: string = body.reason || null;
    if (!parcelId) return corsJson({ error: "Missing parcelId" }, { status: 400 });

    if (unblock) {
      await supabase.from("orders").update({ blocked_exception: false }).eq("id", parcelId);
      await supabase
        .from("handoff_codes")
        .update({ blocked: false, attempts: 0 })
        .eq("parcel_id", parcelId)
        .eq("blocked", true);
    } else {
      // Regenerate latest unresolved code for parcel (same step/receiver).
      const { data: latest } = await supabase
        .from("handoff_codes")
        .select("*")
        .eq("parcel_id", parcelId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latest) return corsJson({ error: "No handoff code exists for parcel" }, { status: 404 });

      await supabase
        .from("handoff_codes")
        .update({ blocked: true, used_at: new Date().toISOString() })
        .eq("id", latest.id);

      const ttlMin = Number(Deno.env.get("HANDOFF_CODE_TTL_MIN") || "10");
      const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000).toISOString();
      const maxAttempts = Number(Deno.env.get("HANDOFF_CODE_MAX_ATTEMPTS") || "5");

      await supabase.from("handoff_codes").insert({
        parcel_id: parcelId,
        step: latest.step,
        to_user_id: latest.to_user_id,
        to_role: latest.to_role,
        expected_code: random4(),
        expires_at: expiresAt,
        max_attempts: maxAttempts,
        attempts: 0,
        blocked: false,
      });

      await supabase.from("orders").update({ blocked_exception: false }).eq("id", parcelId);
    }

    await supabase.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      action: unblock ? "unblock_parcel" : "regenerate_handoff_code",
      parcel_id: parcelId,
      details: { reason },
    });

    return corsJson({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return corsJson({ error: msg }, { status: 500 });
  }
});

