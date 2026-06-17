export const ALLOWED_ORIGIN =
  Deno.env.get("CORS_ALLOWED_ORIGIN") ||
  "https://wvxyaqqlqwbbpkgvrali.supabase.co";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return null;
}

export function corsJson(
  data: unknown,
  init?: ResponseInit & { status?: number }
): Response {
  const status = init?.status ?? 200;
  const extra = init?.headers
    ? Object.fromEntries(new Headers(init.headers).entries())
    : {};
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extra,
    },
  });
}
