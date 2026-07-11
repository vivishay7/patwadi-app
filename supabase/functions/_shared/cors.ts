const DEFAULT_ALLOWED_ORIGINS = [
  "https://patwadi.com",
  "https://www.patwadi.com",
  "https://wvxyaqqlqwbbpkgvrali.supabase.co",
];

function getAllowedOrigins(): string[] {
  const fromEnv = Deno.env.get("CORS_ALLOWED_ORIGIN");
  if (!fromEnv) return DEFAULT_ALLOWED_ORIGINS;
  return fromEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function resolveCorsOrigin(req?: Request): string {
  const allowed = getAllowedOrigins();
  const origin = req?.headers.get("Origin");
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0];
}

export function buildCorsHeaders(req?: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(req),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

/** @deprecated use buildCorsHeaders(req) for dynamic origin */
export const corsHeaders: Record<string, string> = buildCorsHeaders();

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
  }
  return null;
}

export function corsJson(
  data: unknown,
  init?: ResponseInit & { status?: number; req?: Request }
): Response {
  const status = init?.status ?? 200;
  const extra = init?.headers
    ? Object.fromEntries(new Headers(init.headers).entries())
    : {};
  const { req, ...responseInit } = init ?? {};
  return new Response(JSON.stringify(data), {
    ...responseInit,
    status,
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type": "application/json",
      ...extra,
    },
  });
}
