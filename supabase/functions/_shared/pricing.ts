type CorridorRow = {
  key: string;
  origin_city: string;
  origin_lat: number;
  origin_lng: number;
  destination_city: string;
  destination_lat: number;
  destination_lng: number;
  active: boolean;
};

export type BookingPricingInput = {
  corridorKey: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_city?: string;
  pickup_state?: string;
  pickup_place_name?: string;
  dropoff_city?: string;
  dropoff_state?: string;
  dropoff_place_name?: string;
  needs_packaging?: boolean;
  packaging_type?: string | null;
  priority?: string | null;
};

export type BookingPricingResult = {
  priceEstimate: number;
  amountInPaise: number;
  basePrice: number;
  packagingCharge: number;
  discount: number;
};

const KNOWN_CORRIDOR_ENDPOINTS = new Set([
  "delhi",
  "chandigarh",
  "mumbai",
  "pune",
  "mandi",
  "shimla",
  "manali",
]);

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
  "greater noida": "delhi",
  noida: "delhi",
  gurugram: "delhi",
  gurgaon: "delhi",
  faridabad: "delhi",
  ghaziabad: "delhi",
};

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

const PACKAGING_CHARGES: Record<string, number> = {
  mailer: 15,
  "box-small": 20,
  "box-medium": 25,
  "box-large": 35,
};

function normalizeCity(city?: string): string {
  return (city || "").trim().toLowerCase();
}

function resolveCorridorCity(city?: string): string {
  const normalized = normalizeCity(city);
  if (!normalized) return "";
  return CORRIDOR_CITY_ALIASES[normalized] || normalized;
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

function resolveCorridorCityFromHints(hints: {
  city?: string;
  state?: string;
  address?: string;
  placeName?: string;
}): string {
  const direct = resolveCorridorCity(hints.city);
  if (direct && isKnownEndpoint(direct)) return direct;

  const fromState = resolveCorridorCity(hints.state);
  if (fromState && isKnownEndpoint(fromState)) return fromState;

  const textBlob = [hints.address, hints.placeName, hints.city, hints.state]
    .filter(Boolean)
    .join(" ");
  const inferred = inferCorridorCityFromText(textBlob);
  if (inferred) return inferred;

  return direct || fromState || "";
}

export function haversineKm(
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

export function assertCorridorMatchesLocations(
  corridor: CorridorRow,
  input: BookingPricingInput
): void {
  const pickupCity = resolveCorridorCityFromHints({
    city: input.pickup_city,
    state: input.pickup_state,
    address: input.pickup_location,
    placeName: input.pickup_place_name,
  });
  const dropoffCity = resolveCorridorCityFromHints({
    city: input.dropoff_city,
    state: input.dropoff_state,
    address: input.dropoff_location,
    placeName: input.dropoff_place_name,
  });

  const originCity = resolveCorridorCity(corridor.origin_city);
  const destinationCity = resolveCorridorCity(corridor.destination_city);
  const matchesForward = pickupCity === originCity && dropoffCity === destinationCity;
  const matchesReverse = pickupCity === destinationCity && dropoffCity === originCity;

  if (!pickupCity || !dropoffCity || (!matchesForward && !matchesReverse)) {
    throw new Error("Booking locations do not match the selected corridor");
  }
}

export function deriveBookingPrice(
  corridor: CorridorRow,
  input: BookingPricingInput
): BookingPricingResult {
  assertCorridorMatchesLocations(corridor, input);

  const basePrice = Math.round(
    40 +
      haversineKm(
        corridor.origin_lat,
        corridor.origin_lng,
        corridor.destination_lat,
        corridor.destination_lng
      ) *
        6
  );
  const packagingType = input.packaging_type || "";
  const packagingCharge = input.needs_packaging ? PACKAGING_CHARGES[packagingType] : 0;
  if (input.needs_packaging && packagingCharge == null) {
    throw new Error("Missing or invalid packaging type");
  }

  const discount = input.priority === "48hrs" ? 5 : 0;
  const priceEstimate = Math.max(0, basePrice + packagingCharge - discount);
  const amountInPaise = Math.round(priceEstimate * 100);

  return {
    priceEstimate,
    amountInPaise,
    basePrice,
    packagingCharge,
    discount,
  };
}

export async function deriveBookingPriceFromDb(
  supabase: any,
  input: BookingPricingInput
): Promise<BookingPricingResult> {
  const { data: corridor, error } = await supabase
    .from("corridors")
    .select("key, origin_city, origin_lat, origin_lng, destination_city, destination_lat, destination_lng, active")
    .eq("key", input.corridorKey)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load corridor");
  }
  if (!corridor) {
    throw new Error("Unsupported or inactive corridor");
  }

  return deriveBookingPrice(corridor, input);
}
