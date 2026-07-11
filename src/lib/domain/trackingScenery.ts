import React from "react";
import { SimplifiedParcelState } from "../db/types";
import { resolveCorridorCityFromHints } from "./corridors";
import {
  delhiSkyline,
  jaipurSkyline,
  jodhpurSkyline,
  udaipurSkyline,
  amritsarSkyline,
  chandigarhSkyline,
  mumbaiSkyline,
  puneSkyline,
  hyderabadSkyline,
  bengaluruSkyline,
  chennaiSkyline,
  maduraiSkyline,
  visakhapatnamSkyline,
  kochiSkyline,
  mysuruSkyline,
  kolkataSkyline,
  varanasiSkyline,
  lucknowSkyline,
  bhubaneswarSkyline,
  patnaSkyline,
  guwahatiSkyline,
  panajiSkyline,
  nagpurSkyline,
  punjabSkyline,
  haryanaSkyline,
  himachalPradeshSkyline,
  jammuAndKashmirSkyline,
  rajasthanSkyline,
  gujaratSkyline,
  maharashtraSkyline,
  tamilNaduSkyline,
  westBengalSkyline,
  karnatakaSkyline,
  keralaSkyline,
  telanganaAndAndhraPradeshSkyline,
  uttarPradeshSkyline,
  biharSkyline,
  odishaSkyline,
  assamSkyline,
} from "./trackingSkylineRenderers";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface SkyGradientStop {
  offset: string;
  color: string;
}

export interface TimeConfig {
  label: string;
  chipColor: string;
  statusText: string;
  skyStops: SkyGradientStop[];
  tint: string;
  starOpacity: number;
}

export type SkylineRenderer = (W: number, H: number) => React.ReactElement;

export interface SceneDefinition {
  dot: string;
  motif: string;
  renderSkyline: SkylineRenderer;
}

export interface LocationEntry {
  city: string;
  aliasOf?: string;
  state?: string;
  city2?: string;
}

export interface ResolvedScene {
  kind: "city" | "state";
  name: string;
  scene: SceneDefinition;
}

export const TIMES: Record<TimeOfDay, TimeConfig> = {
  morning: {
    label: "Morning",
    chipColor: "#E9A23B",
    statusText: "Out for delivery",
    skyStops: [
      { offset: "0%", color: "#FCE2B0" },
      { offset: "55%", color: "#FBCB8A" },
      { offset: "100%", color: "#F2A968" },
    ],
    tint: "rgba(255,205,140,.10)",
    starOpacity: 0,
  },
  afternoon: {
    label: "Afternoon",
    chipColor: "#3E7EC9",
    statusText: "On corridor",
    skyStops: [
      { offset: "0%", color: "#A9D6EE" },
      { offset: "60%", color: "#CDE6F2" },
      { offset: "100%", color: "#E8E1CB" },
    ],
    tint: "rgba(255,255,255,.05)",
    starOpacity: 0,
  },
  evening: {
    label: "Evening",
    chipColor: "#C7491F",
    statusText: "Reached city",
    skyStops: [
      { offset: "0%", color: "#4A3450" },
      { offset: "40%", color: "#A8503F" },
      { offset: "75%", color: "#E08B4E" },
      { offset: "100%", color: "#F3B36A" },
    ],
    tint: "rgba(220,100,60,.16)",
    starOpacity: 0.3,
  },
  night: {
    label: "Night",
    chipColor: "#7C6FB5",
    statusText: "Resting · safe",
    skyStops: [
      { offset: "0%", color: "#1A1430" },
      { offset: "100%", color: "#2E2347" },
    ],
    tint: "rgba(15,12,40,.42)",
    starOpacity: 1,
  },
};

export const CITY_SCENES: Record<string, SceneDefinition> = {
  Delhi: {
    dot: "#A8442E",
    motif: "India Gate arch · red sandstone domes",
    renderSkyline: delhiSkyline,
  },
  Jaipur: {
    dot: "#D9748C",
    motif: "Pink City sandstone · scalloped jharokha arches",
    renderSkyline: jaipurSkyline,
  },
  Jodhpur: {
    dot: "#5C7FA8",
    motif: "Mehrangarh Fort over the Blue City",
    renderSkyline: jodhpurSkyline,
  },
  Udaipur: {
    dot: "#E8E0D0",
    motif: "Lake Palace · white marble on water",
    renderSkyline: udaipurSkyline,
  },
  Amritsar: {
    dot: "#D9A53E",
    motif: "Golden Temple · dome reflected in the Sarovar",
    renderSkyline: amritsarSkyline,
  },
  Chandigarh: {
    dot: "#5C8F5C",
    motif: "City Beautiful — concrete set in deliberate green",
    renderSkyline: chandigarhSkyline,
  },
  Mumbai: {
    dot: "#D9A53E",
    motif: "Marine Drive lit at dusk — the city that never sleeps",
    renderSkyline: mumbaiSkyline,
  },
  Pune: {
    dot: "#8B5A3C",
    motif: "Shaniwar Wada gate · Peshwa teak wadas",
    renderSkyline: puneSkyline,
  },
  Hyderabad: {
    dot: "#8B9C8F",
    motif: "Charminar — four minarets, one grand arch",
    renderSkyline: hyderabadSkyline,
  },
  Bengaluru: {
    dot: "#7A3B36",
    motif: "Vidhana Soudha dome · garden-city avenues",
    renderSkyline: bengaluruSkyline,
  },
  Chennai: {
    dot: "#C2603F",
    motif: "Marina lighthouse · Mylapore gopuram",
    renderSkyline: chennaiSkyline,
  },
  Madurai: {
    dot: "#D9456E",
    motif: "Meenakshi Temple — one soaring, densely carved tower",
    renderSkyline: maduraiSkyline,
  },
  Visakhapatnam: {
    dot: "#3E7E8F",
    motif: "Ropeway hills · the beached submarine museum",
    renderSkyline: visakhapatnamSkyline,
  },
  Kochi: {
    dot: "#5C8F5C",
    motif: "Chinese fishing nets · backwater palms",
    renderSkyline: kochiSkyline,
  },
  Mysuru: {
    dot: "#D9A53E",
    motif: "Mysore Palace · illuminated domes",
    renderSkyline: mysuruSkyline,
  },
  Kolkata: {
    dot: "#5C8FB8",
    motif: "Howrah Bridge truss · blue heritage facades",
    renderSkyline: kolkataSkyline,
  },
  Varanasi: {
    dot: "#D9A53E",
    motif: "Ghats · stepped temple spires on the river",
    renderSkyline: varanasiSkyline,
  },
  Lucknow: {
    dot: "#D9A53E",
    motif: "Bara Imambara dome · Rumi Darwaza gate",
    renderSkyline: lucknowSkyline,
  },
  Bhubaneswar: {
    dot: "#9C7456",
    motif: "Kalinga shikhara — the curved beehive tower",
    renderSkyline: bhubaneswarSkyline,
  },
  Patna: {
    dot: "#B8714A",
    motif: "Golghar — the granary with the spiral stair",
    renderSkyline: patnaSkyline,
  },
  Guwahati: {
    dot: "#5C8F5C",
    motif: "Kamakhya hill · Brahmaputra tea country",
    renderSkyline: guwahatiSkyline,
  },
  Panaji: {
    dot: "#D9A53E",
    motif: "Goan baroque · laterite church facade",
    renderSkyline: panajiSkyline,
  },
  Nagpur: {
    dot: "#E8E0D0",
    motif: "Deekshabhoomi — the great white stupa",
    renderSkyline: nagpurSkyline,
  },
};

export const STATE_SCENES: Record<string, SceneDefinition> = {
  Punjab: {
    dot: "#D4A437",
    motif: "Sikh-gold chhatri · mustard-field gold",
    renderSkyline: punjabSkyline,
  },
  Haryana: {
    dot: "#B58A5C",
    motif: "Brick havelis · agrarian flatlands",
    renderSkyline: haryanaSkyline,
  },
  "Himachal Pradesh": {
    dot: "#7C8B96",
    motif: "Pahadi kath-kuni · deodar ridgeline",
    renderSkyline: himachalPradeshSkyline,
  },
  "Jammu and Kashmir": {
    dot: "#6FA88A",
    motif: "Chinar trees · pitched tin roofs, valley willows",
    renderSkyline: jammuAndKashmirSkyline,
  },
  Rajasthan: {
    dot: "#C98B5E",
    motif: "Desert haveli · sandstone chhatri",
    renderSkyline: rajasthanSkyline,
  },
  Gujarat: {
    dot: "#B8935E",
    motif: "Sandstone jali lattice · stepwell geometry",
    renderSkyline: gujaratSkyline,
  },
  Maharashtra: {
    dot: "#8B5A3C",
    motif: "Wada timber courtyards",
    renderSkyline: maharashtraSkyline,
  },
  "Tamil Nadu": {
    dot: "#C2603F",
    motif: "Stepped gopuram · temple-town stripes",
    renderSkyline: tamilNaduSkyline,
  },
  "West Bengal": {
    dot: "#5C8FB8",
    motif: "Heritage blue facades · terracotta temple roof",
    renderSkyline: westBengalSkyline,
  },
  Karnataka: {
    dot: "#9C7B4A",
    motif: "Laterite temple towns · areca groves",
    renderSkyline: karnatakaSkyline,
  },
  Kerala: {
    dot: "#5C8F5C",
    motif: "Red-tiled roofs · backwater palms",
    renderSkyline: keralaSkyline,
  },
  "Telangana & Andhra Pradesh": {
    dot: "#C2603F",
    motif: "Deccan plateau · sandstone forts",
    renderSkyline: telanganaAndAndhraPradeshSkyline,
  },
  "Uttar Pradesh": {
    dot: "#D9A53E",
    motif: "Riverside temple spires",
    renderSkyline: uttarPradeshSkyline,
  },
  Bihar: {
    dot: "#C2603F",
    motif: "River-plain granaries",
    renderSkyline: biharSkyline,
  },
  Odisha: {
    dot: "#C2603F",
    motif: "Kalinga curved shikhara",
    renderSkyline: odishaSkyline,
  },
  Assam: {
    dot: "#5C8F5C",
    motif: "Tea-garden hills · Brahmaputra plain",
    renderSkyline: assamSkyline,
  },
};

export const LOCATIONS: LocationEntry[] = [
  { city: "Delhi" },
  { city: "Jaipur" },
  { city: "Jodhpur" },
  { city: "Udaipur" },
  { city: "Amritsar" },
  { city: "Chandigarh" },
  { city: "Mohali", aliasOf: "Chandigarh" },
  { city: "Mumbai" },
  { city: "Pune" },
  { city: "Hyderabad" },
  { city: "Bengaluru" },
  { city: "Chennai" },
  { city: "Madurai" },
  { city: "Visakhapatnam" },
  { city: "Kochi" },
  { city: "Mysuru" },
  { city: "Kolkata" },
  { city: "Varanasi" },
  { city: "Lucknow" },
  { city: "Bhubaneswar" },
  { city: "Patna" },
  { city: "Guwahati" },
  { city: "Panaji" },
  { city: "Nagpur" },
  { city: "Manali", state: "Himachal Pradesh" },
  { city: "Mandi", state: "Himachal Pradesh" },
  { city: "Shimla", state: "Himachal Pradesh" },
  { city: "Ludhiana", state: "Punjab" },
  { city: "Gurugram", state: "Haryana" },
  { city: "Srinagar", state: "Jammu and Kashmir" },
  { city: "Jodhpur Rural", city2: "Bikaner", state: "Rajasthan" },
  { city: "Surat", state: "Gujarat" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Kanpur", state: "Uttar Pradesh" },
  { city: "Gaya", state: "Bihar" },
  { city: "Cuttack", state: "Odisha" },
  { city: "Dibrugarh", state: "Assam" },
];

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

const NIGHT_STARS: { x: number; y: number; r: number; opacity: number }[] = [
  { x: 0.08, y: 0.06, r: 0.9, opacity: 0.55 },
  { x: 0.18, y: 0.14, r: 0.6, opacity: 0.35 },
  { x: 0.31, y: 0.08, r: 1.1, opacity: 0.7 },
  { x: 0.44, y: 0.18, r: 0.7, opacity: 0.4 },
  { x: 0.57, y: 0.05, r: 0.8, opacity: 0.5 },
  { x: 0.66, y: 0.12, r: 1.0, opacity: 0.65 },
  { x: 0.74, y: 0.22, r: 0.5, opacity: 0.3 },
  { x: 0.83, y: 0.09, r: 0.9, opacity: 0.55 },
  { x: 0.92, y: 0.16, r: 0.7, opacity: 0.45 },
  { x: 0.12, y: 0.28, r: 0.6, opacity: 0.35 },
  { x: 0.26, y: 0.24, r: 0.8, opacity: 0.5 },
  { x: 0.39, y: 0.32, r: 0.5, opacity: 0.25 },
  { x: 0.51, y: 0.26, r: 0.9, opacity: 0.6 },
  { x: 0.63, y: 0.34, r: 0.7, opacity: 0.4 },
];

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 16) return "afternoon";
  if (hour >= 17 && hour <= 20) return "evening";
  return "night";
}

export function resolveScene(loc: LocationEntry): ResolvedScene {
  if (loc.aliasOf && CITY_SCENES[loc.aliasOf]) {
    return { kind: "city", name: loc.aliasOf, scene: CITY_SCENES[loc.aliasOf] };
  }
  if (CITY_SCENES[loc.city]) {
    return { kind: "city", name: loc.city, scene: CITY_SCENES[loc.city] };
  }
  if (loc.state && STATE_SCENES[loc.state]) {
    return { kind: "state", name: loc.state, scene: STATE_SCENES[loc.state] };
  }
  return { kind: "city", name: "Delhi", scene: CITY_SCENES.Delhi };
}

function titleCaseSlug(slug: string): string {
  return slug
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeCitySlug(value?: string): string {
  return (value || "").trim().toLowerCase();
}

export function findLocationEntry(cityName: string): LocationEntry | undefined {
  const norm = normalizeCitySlug(cityName);
  if (!norm) return undefined;

  const direct = LOCATIONS.find((loc) => loc.city.toLowerCase() === norm);
  if (direct) return direct;

  const alias = LOCATIONS.find((loc) => loc.aliasOf?.toLowerCase() === norm);
  if (alias) return alias;

  const mapped = CITY_SLUG_TO_NAME[norm];
  if (mapped) {
    return LOCATIONS.find((loc) => loc.city === mapped);
  }

  const partial = LOCATIONS.find(
    (loc) =>
      norm.includes(loc.city.toLowerCase()) || loc.city.toLowerCase().includes(norm)
  );
  if (partial) return partial;

  return undefined;
}

function extractCityFromAddress(address: string): string {
  const hints = { address, placeName: address };
  const corridorCity = resolveCorridorCityFromHints(hints);
  if (corridorCity) {
    return CITY_SLUG_TO_NAME[corridorCity] ?? titleCaseSlug(corridorCity);
  }

  const lower = address.toLowerCase();
  for (const loc of LOCATIONS) {
    if (lower.includes(loc.city.toLowerCase())) return loc.city;
  }

  return titleCaseSlug(address.split(",")[0]?.trim() || "Delhi");
}

function parseCorridorOrigin(corridorKey?: string | null): string {
  if (!corridorKey) return "";
  const parts = corridorKey.split(/[-_]/).filter(Boolean);
  if (!parts.length) return "";
  const slug = parts[0].toLowerCase();
  return CITY_SLUG_TO_NAME[slug] ?? titleCaseSlug(slug);
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
      return dropoff || pickup || "Delhi";
    case "blocked_exception":
      return dropoff || pickup || "Delhi";
    default:
      return pickup || dropoff || "Delhi";
  }
}

export function resolveSceneForCity(cityName: string): {
  displayCity: string;
  location: LocationEntry;
  resolved: ResolvedScene;
} {
  const location = findLocationEntry(cityName) ?? { city: cityName };
  const resolved = resolveScene(location);

  return {
    displayCity: location.city,
    location,
    resolved,
  };
}

export function getTrackingCopy(
  timeOfDay: TimeOfDay,
  cityName: string
): { headline: string; sub: string } {
  const headlines: Record<TimeOfDay, string> = {
    morning: `Your parcel is out for morning delivery in ${cityName}.`,
    afternoon: `Your parcel is moving through ${cityName}.`,
    evening: `Your parcel reached ${cityName} this evening.`,
    night: `Your parcel is resting safely in ${cityName} tonight.`,
  };
  const subs: Record<TimeOfDay, string> = {
    morning: "A delivery partner has it now — it'll reach your door within today's window.",
    afternoon: "On the corridor now, tracking right on schedule.",
    evening: "It's checked in for the night corridor handoff — moving again within hours.",
    night: "It moves again tomorrow morning — no action needed from you.",
  };
  return { headline: headlines[timeOfDay], sub: subs[timeOfDay] };
}

export function getNightStars(): typeof NIGHT_STARS {
  return NIGHT_STARS;
}

export interface CelestialSpec {
  type: "sun-morning" | "sun-afternoon" | "sun-evening" | "moon";
  cx: number;
  cy: number;
}

export function getCelestialSpec(timeOfDay: TimeOfDay, W: number, H: number): CelestialSpec {
  switch (timeOfDay) {
    case "morning":
      return { type: "sun-morning", cx: W * 0.24, cy: H * 0.22 };
    case "afternoon":
      return { type: "sun-afternoon", cx: W * 0.8, cy: H * 0.13 };
    case "evening":
      return { type: "sun-evening", cx: W * 0.5, cy: H * 0.38 };
    default:
      return { type: "moon", cx: W * 0.76, cy: H * 0.16 };
  }
}
