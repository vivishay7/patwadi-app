import { supabase } from "../supabase";

/** v6 §2.2 / §18 — corridor endpoints for transfer geography and trip creation. */
export interface CorridorEndpoint {
  city: string;
  lat: number;
  lng: number;
}

export interface CorridorDefinition {
  key: string;
  origin: CorridorEndpoint;
  destination: CorridorEndpoint;
  expected_duration_hours: number;
  active: boolean;
}

export interface CorridorRow {
  key: string;
  origin_city: string;
  origin_lat: number;
  origin_lng: number;
  destination_city: string;
  destination_lat: number;
  destination_lng: number;
  expected_duration_hours: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

function rowToDefinition(row: CorridorRow): CorridorDefinition {
  return {
    key: row.key,
    origin: {
      city: row.origin_city,
      lat: row.origin_lat,
      lng: row.origin_lng,
    },
    destination: {
      city: row.destination_city,
      lat: row.destination_lat,
      lng: row.destination_lng,
    },
    expected_duration_hours: Number(row.expected_duration_hours),
    active: row.active,
  };
}

/** Build corridor key: origin_city + destination_city, lowercase underscore-separated. */
export function buildCorridorKey(originCity: string, destinationCity: string): string {
  const slug = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  return `${slug(originCity)}_${slug(destinationCity)}`;
}

export async function fetchCorridors(options?: {
  activeOnly?: boolean;
}): Promise<CorridorDefinition[]> {
  let q = supabase.from("corridors").select("*").order("origin_city", { ascending: true });
  if (options?.activeOnly) {
    q = q.eq("active", true);
  }
  const { data, error } = await q;
  if (error) throw error;
  return ((data || []) as CorridorRow[]).map(rowToDefinition);
}

export async function fetchCorridorByKey(key: string): Promise<CorridorDefinition | null> {
  const { data, error } = await supabase
    .from("corridors")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToDefinition(data as CorridorRow);
}

/** §20.4 — corridors assigned to an operator (active corridors only). */
export async function fetchApprovedCorridorsForOperator(
  operatorId: string
): Promise<CorridorDefinition[]> {
  const { data, error } = await supabase
    .from("operator_corridors")
    .select("corridor_key, corridors(*)")
    .eq("operator_id", operatorId);
  if (error) throw error;

  const rows: CorridorDefinition[] = [];
  for (const item of data || []) {
    const raw = item as { corridors: CorridorRow | null };
    const corridor = raw.corridors;
    if (corridor?.active) {
      rows.push(rowToDefinition(corridor));
    }
  }
  return rows.sort((a, b) => a.origin.city.localeCompare(b.origin.city));
}

const normalizeCity = (city?: string) => (city || "").trim().toLowerCase();

const KNOWN_CORRIDOR_ENDPOINTS = new Set([
  "delhi",
  "chandigarh",
  "mumbai",
  "pune",
  "mandi",
  "shimla",
  "manali",
]);

/** Map Mapbox locality names to corridor endpoint cities. */
const CORRIDOR_CITY_ALIASES: Record<string, string> = {
  "delhi cantonment": "delhi",
  "new delhi": "delhi",
  "north delhi": "delhi",
  "south delhi": "delhi",
  "east delhi": "delhi",
  "west delhi": "delhi",
  "central delhi": "delhi",
  "chandigarh ut": "chandigarh",
  "union territory of chandigarh": "chandigarh",
  "chandīgarh": "chandigarh",
  mohali: "chandigarh",
  "sas nagar": "chandigarh",
  panchkula: "chandigarh",
  "greater noida": "delhi",
  noida: "delhi",
  gurugram: "delhi",
  gurgaon: "delhi",
  faridabad: "delhi",
  ghaziabad: "delhi",
};

/** Substrings in address/place text that imply a corridor endpoint city. */
const CORRIDOR_CITY_TEXT_KEYWORDS: [string, string][] = [
  ["new delhi", "delhi"],
  ["delhi cantonment", "delhi"],
  ["chandigarh", "chandigarh"],
  ["panjab university", "chandigarh"],
  ["punjab university", "chandigarh"],
  ["delhi", "delhi"],
  ["mumbai", "mumbai"],
  ["pune", "pune"],
  ["shimla", "shimla"],
  ["manali", "manali"],
  ["mandi", "mandi"],
];

const CORRIDOR_ENDPOINT_COORDS: Record<
  string,
  { lat: number; lng: number; radiusKm: number }
> = {
  delhi: { lat: 28.6139, lng: 77.209, radiusKm: 55 },
  chandigarh: { lat: 30.7333, lng: 76.7794, radiusKm: 40 },
  mumbai: { lat: 19.076, lng: 72.8777, radiusKm: 40 },
  pune: { lat: 18.5204, lng: 73.8567, radiusKm: 35 },
  mandi: { lat: 31.708, lng: 76.9318, radiusKm: 25 },
  shimla: { lat: 31.1048, lng: 77.1734, radiusKm: 25 },
  manali: { lat: 32.2432, lng: 77.1892, radiusKm: 25 },
};

export interface CorridorLocationHints {
  city?: string;
  state?: string;
  address?: string;
  placeName?: string;
  lat?: number;
  lng?: number;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isKnownEndpoint(city: string): boolean {
  return KNOWN_CORRIDOR_ENDPOINTS.has(resolveCorridorCity(city));
}

function inferCorridorCityFromText(text: string): string {
  const normalized = text.toLowerCase();
  for (const [alias, canonical] of Object.entries(CORRIDOR_CITY_ALIASES)) {
    if (normalized.includes(alias)) return canonical;
  }
  for (const [keyword, canonical] of CORRIDOR_CITY_TEXT_KEYWORDS) {
    if (normalized.includes(keyword)) return canonical;
  }
  return "";
}

function resolveCorridorCityByCoords(lat?: number, lng?: number): string {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return "";

  let best: { city: string; dist: number } | null = null;
  for (const [city, { lat: epLat, lng: epLng, radiusKm }] of Object.entries(
    CORRIDOR_ENDPOINT_COORDS
  )) {
    const dist = haversineKm(lat, lng, epLat, epLng);
    if (dist <= radiusKm && (!best || dist < best.dist)) {
      best = { city, dist };
    }
  }
  return best?.city ?? "";
}

export function resolveCorridorCity(city?: string): string {
  const normalized = normalizeCity(city);
  if (!normalized) return "";
  if (CORRIDOR_CITY_ALIASES[normalized]) return CORRIDOR_CITY_ALIASES[normalized];
  return normalized;
}

/** Resolve corridor endpoint from Mapbox fields, address text, or coordinates. */
export function resolveCorridorCityFromHints(hints: CorridorLocationHints): string {
  const direct = resolveCorridorCity(hints.city);
  if (direct && isKnownEndpoint(direct)) return direct;

  const fromState = resolveCorridorCity(hints.state);
  if (fromState && isKnownEndpoint(fromState)) return fromState;

  const textBlob = [hints.address, hints.placeName, hints.city, hints.state]
    .filter(Boolean)
    .join(" ");
  const inferred = inferCorridorCityFromText(textBlob);
  if (inferred) return inferred;

  const fromCoords = resolveCorridorCityByCoords(hints.lat, hints.lng);
  if (fromCoords) return fromCoords;

  return direct || fromState || "";
}

async function matchCorridorKey(a: string, b: string): Promise<string | null> {
  if (!a || !b) return null;

  const corridors = await fetchCorridors({ activeOnly: true });
  const found = corridors.find(
    (c) =>
      (resolveCorridorCity(c.origin.city) === a &&
        resolveCorridorCity(c.destination.city) === b) ||
      (resolveCorridorCity(c.origin.city) === b &&
        resolveCorridorCity(c.destination.city) === a)
  );
  return found?.key ?? null;
}

/** Match pickup/dropoff locations to an active corridor (bidirectional). */
export async function getCorridorKeyFromLocations(
  pickup?: CorridorLocationHints,
  dropoff?: CorridorLocationHints
): Promise<string | null> {
  const a = resolveCorridorCityFromHints(pickup || {});
  const b = resolveCorridorCityFromHints(dropoff || {});
  return matchCorridorKey(a, b);
}

/** Match pickup/dropoff cities to an active corridor (bidirectional). */
export async function getCorridorKeyFromCities(
  pickupCity?: string,
  dropoffCity?: string
): Promise<string | null> {
  return getCorridorKeyFromLocations(
    { city: pickupCity },
    { city: dropoffCity }
  );
}
