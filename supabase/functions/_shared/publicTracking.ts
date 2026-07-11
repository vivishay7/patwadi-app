/** Tier-1 public tracking derivation — mirrors app domain logic without React deps. */

export type SimplifiedParcelState =
  | "created"
  | "pickup_confirmed"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "blocked_exception";

export interface CustodyEventRow {
  from_role: string;
  to_role: string;
  proof_type?: string | null;
  proof_value?: string | null;
  created_at: string;
}

export const CUSTOMER_STATUS_LABELS: Record<SimplifiedParcelState, string> = {
  created: "Booked",
  pickup_confirmed: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  blocked_exception: "Delivery exception — our team is resolving it",
};

export const TRACKER_STAGE_ORDER: SimplifiedParcelState[] = [
  "created",
  "pickup_confirmed",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

const TRACKING_CODE_RE = /^P\d{9}[A-Z]{2}$/;

const CITY_SLUG_TO_NAME: Record<string, string> = {
  delhi: "Delhi",
  chandigarh: "Chandigarh",
  mohali: "Mohali",
  mumbai: "Mumbai",
  pune: "Pune",
  manali: "Manali",
  mandi: "Mandi",
  shimla: "Shimla",
  jaipur: "Jaipur",
  hyderabad: "Hyderabad",
  bengaluru: "Bengaluru",
  gurugram: "Gurugram",
  gurgaon: "Gurugram",
};

const KNOWN_CITIES = [
  "Delhi",
  "Jaipur",
  "Jodhpur",
  "Udaipur",
  "Amritsar",
  "Chandigarh",
  "Mohali",
  "Mumbai",
  "Pune",
  "Hyderabad",
  "Bengaluru",
  "Chennai",
  "Madurai",
  "Visakhapatnam",
  "Kochi",
  "Mysuru",
  "Kolkata",
  "Varanasi",
  "Lucknow",
  "Bhubaneswar",
  "Patna",
  "Guwahati",
  "Panaji",
  "Nagpur",
  "Manali",
  "Mandi",
  "Shimla",
  "Ludhiana",
  "Gurugram",
  "Srinagar",
];

const CITY_MOTIFS: Record<string, string> = {
  Delhi: "India Gate arch · red sandstone domes",
  Jaipur: "Pink City sandstone · scalloped jharokha arches",
  Jodhpur: "Mehrangarh Fort over the Blue City",
  Udaipur: "Lake Palace · white marble ghats",
  Amritsar: "Golden Temple dome · marble parikrama",
  Chandigarh: "Capitol Complex · Le Corbusier geometry",
  Mohali: "Capitol Complex · Le Corbusier geometry",
  Mumbai: "Gateway of India · Art Deco skyline",
  Pune: "Shaniwar Wada · Peshwa-era bastions",
  Hyderabad: "Charminar · pearl-city minarets",
  Bengaluru: "Vidhana Soudha · garden-city skyline",
  Chennai: "Kapaleeshwarar gopuram · Marina coast",
  Madurai: "Meenakshi gopuram · temple-town towers",
  Visakhapatnam: "RK Beach · Eastern Ghats coast",
  Kochi: "Chinese fishing nets · backwater palms",
  Mysuru: "Ambavilas Palace · Chamundi ridgeline",
  Kolkata: "Victoria Memorial · Hooghly ghats",
  Varanasi: "Ghats · riverside temple spires",
  Lucknow: "Bara Imambara · Nawabi arches",
  Bhubaneswar: "Lingaraj shikhara · temple city",
  Patna: "Golghar granary · Ganga plain",
  Guwahati: "Kamakhya hills · Brahmaputra plain",
  Panaji: "Latin Quarter · Mandovi estuary",
  Nagpur: "Zero Mile · orange-city boulevards",
  Manali: "Pahadi kath-kuni · deodar ridgeline",
  Mandi: "Pahadi kath-kuni · deodar ridgeline",
  Shimla: "Pahadi kath-kuni · deodar ridgeline",
};

const STATE_MOTIFS: Record<string, string> = {
  Punjab: "Sikh-gold chhatri · mustard-field gold",
  Haryana: "Brick havelis · agrarian flatlands",
  "Himachal Pradesh": "Pahadi kath-kuni · deodar ridgeline",
  "Jammu and Kashmir": "Chinar trees · pitched tin roofs, valley willows",
  Rajasthan: "Desert haveli · sandstone chhatri",
  Gujarat: "Sandstone jali lattice · stepwell geometry",
  Maharashtra: "Wada timber courtyards",
  "Tamil Nadu": "Stepped gopuram · temple-town stripes",
  "West Bengal": "Heritage blue facades · terracotta temple roof",
  Karnataka: "Laterite temple towns · areca groves",
  Kerala: "Red-tiled roofs · backwater palms",
  "Telangana & Andhra Pradesh": "Deccan plateau · sandstone forts",
  "Uttar Pradesh": "Riverside temple spires",
  Bihar: "River-plain granaries",
  Odisha: "Kalinga curved shikhara",
  Assam: "Tea-garden hills · Brahmaputra plain",
};

const LOCATION_STATES: Record<string, string> = {
  Manali: "Himachal Pradesh",
  Mandi: "Himachal Pradesh",
  Shimla: "Himachal Pradesh",
  Ludhiana: "Punjab",
  Gurugram: "Haryana",
  Srinagar: "Jammu and Kashmir",
};

const CORRIDOR_CITY_ALIASES: Record<string, string> = {
  "new delhi": "delhi",
  "north delhi": "delhi",
  "south delhi": "delhi",
  "east delhi": "delhi",
  "west delhi": "delhi",
  "central delhi": "delhi",
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

export function normalizeTrackingCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidTrackingCode(code: string): boolean {
  return TRACKING_CODE_RE.test(code);
}

function titleCaseSlug(slug: string): string {
  return slug
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function inferCorridorCityFromText(text: string): string {
  const normalized = text.toLowerCase();
  for (const [alias, canonical] of Object.entries(CORRIDOR_CITY_ALIASES)) {
    if (normalized.includes(alias)) return canonical;
  }
  for (const keyword of ["chandigarh", "delhi", "mumbai", "pune", "shimla", "manali", "mandi"]) {
    if (normalized.includes(keyword)) return keyword;
  }
  return "";
}

function extractCityFromAddress(address: string): string {
  const inferred = inferCorridorCityFromText(address);
  if (inferred) {
    return CITY_SLUG_TO_NAME[inferred] ?? titleCaseSlug(inferred);
  }

  const lower = address.toLowerCase();
  for (const city of KNOWN_CITIES) {
    if (lower.includes(city.toLowerCase())) return city;
  }

  const firstSegment = address.split(",")[0]?.trim();
  if (!firstSegment) return "Delhi";
  return titleCaseSlug(firstSegment);
}

function parseCorridorOrigin(corridorKey?: string | null): string {
  if (!corridorKey) return "";
  const parts = corridorKey.split(/[-_]/).filter(Boolean);
  if (!parts.length) return "";
  const slug = parts[0].toLowerCase();
  return CITY_SLUG_TO_NAME[slug] ?? titleCaseSlug(slug);
}

export function parseCorridorCities(corridorKey?: string | null): {
  origin_city: string | null;
  destination_city: string | null;
} {
  if (!corridorKey) return { origin_city: null, destination_city: null };
  const parts = corridorKey.split(/[-_]/).filter(Boolean);
  if (parts.length < 2) return { origin_city: null, destination_city: null };
  const originSlug = parts[0].toLowerCase();
  const destSlug = parts[1].toLowerCase();
  return {
    origin_city: CITY_SLUG_TO_NAME[originSlug] ?? titleCaseSlug(originSlug),
    destination_city: CITY_SLUG_TO_NAME[destSlug] ?? titleCaseSlug(destSlug),
  };
}

function hasEvent(events: CustodyEventRow[], from: string, to: string): CustodyEventRow | undefined {
  return events.find((e) => e.from_role === from && e.to_role === to);
}

export function deriveParcelState(params: {
  events: CustodyEventRow[];
  blockedException?: boolean;
}): SimplifiedParcelState {
  const { events, blockedException } = params;
  if (blockedException) return "blocked_exception";
  if (!events.length) return "created";

  const has = (fromRole: string, toRole: string) =>
    events.some((e) => e.from_role === fromRole && e.to_role === toRole);

  if (has("lmp", "customer") || has("linehaul", "customer")) return "delivered";
  if (has("linehaul", "lmp")) return "out_for_delivery";
  if (has("lmp", "linehaul")) return "in_transit";
  if (has("customer", "lmp")) return "pickup_confirmed";
  return "created";
}

function buildStageDates(
  events: CustodyEventRow[],
  orderCreatedAt?: string
): Partial<Record<SimplifiedParcelState, string>> {
  const dates: Partial<Record<SimplifiedParcelState, string>> = {};
  if (orderCreatedAt) dates.created = orderCreatedAt;

  const pickup = hasEvent(events, "customer", "lmp");
  if (pickup) dates.pickup_confirmed = pickup.created_at;
  const transit = hasEvent(events, "lmp", "linehaul");
  if (transit) dates.in_transit = transit.created_at;
  const outForDelivery = hasEvent(events, "linehaul", "lmp");
  if (outForDelivery) dates.out_for_delivery = outForDelivery.created_at;
  const delivered =
    hasEvent(events, "lmp", "customer") ?? hasEvent(events, "linehaul", "customer");
  if (delivered) dates.delivered = delivered.created_at;
  return dates;
}

export function trackerStageIndex(state: SimplifiedParcelState): number {
  if (state === "blocked_exception") return -1;
  return TRACKER_STAGE_ORDER.indexOf(state);
}

export function deriveCustomerParcelStatus(params: {
  events: CustodyEventRow[];
  blockedException?: boolean;
  orderCreatedAt?: string;
}): {
  state: SimplifiedParcelState;
  label: string;
  lastUpdatedAt: string | null;
  stageDates: Partial<Record<SimplifiedParcelState, string>>;
} {
  const state = deriveParcelState({
    events: params.events,
    blockedException: params.blockedException,
  });
  const stageDates = buildStageDates(params.events, params.orderCreatedAt);
  const lastEvent = params.events.length ? params.events[params.events.length - 1] : null;

  return {
    state,
    label: CUSTOMER_STATUS_LABELS[state],
    lastUpdatedAt: lastEvent?.created_at ?? params.orderCreatedAt ?? null,
    stageDates,
  };
}

export function deriveTrackingCityName(params: {
  parcelState: SimplifiedParcelState;
  pickupLocation: string;
  dropoffLocation: string;
  corridorKey?: string | null;
}): string {
  const pickup = extractCityFromAddress(params.pickupLocation);
  const dropoff = extractCityFromAddress(params.dropoffLocation);

  switch (params.parcelState) {
    case "created":
    case "pickup_confirmed":
      return pickup || dropoff || "Delhi";
    case "in_transit":
      return pickup || parseCorridorOrigin(params.corridorKey) || dropoff || "Delhi";
    case "out_for_delivery":
    case "delivered":
    case "blocked_exception":
      return dropoff || pickup || "Delhi";
    default:
      return pickup || dropoff || "Delhi";
  }
}

export function getDeliveryProofPath(events: CustodyEventRow[]): string | null {
  const delivered =
    hasEvent(events, "lmp", "customer") ?? hasEvent(events, "linehaul", "customer");
  if (!delivered || delivered.proof_type !== "photo") return null;
  return delivered.proof_value || null;
}

export function resolveSceneMotif(cityName: string): {
  display_city: string;
  motif: string;
} {
  const norm = cityName.trim().toLowerCase();
  let displayCity = cityName.trim() || "Delhi";

  for (const city of KNOWN_CITIES) {
    if (city.toLowerCase() === norm || norm.includes(city.toLowerCase())) {
      displayCity = city;
      break;
    }
  }

  if (CITY_MOTIFS[displayCity]) {
    return { display_city: displayCity, motif: CITY_MOTIFS[displayCity] };
  }

  const state = LOCATION_STATES[displayCity];
  if (state && STATE_MOTIFS[state]) {
    return { display_city: displayCity, motif: STATE_MOTIFS[state] };
  }

  return { display_city: displayCity, motif: CITY_MOTIFS.Delhi };
}
