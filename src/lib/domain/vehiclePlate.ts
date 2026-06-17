export type VehiclePlateFormat = "legacy" | "bharat";

export type VehiclePlateValidation =
  | { ok: true; format: VehiclePlateFormat; normalized: string; display: string }
  | { ok: false; reason: string };

/** Strip spaces/hyphens and uppercase for validation. */
export function normalizeVehiclePlate(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

/** Limit keyboard input: letters, digits, single space, max visible length. */
export function formatVehiclePlateInput(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 13);
  return cleaned;
}

/**
 * Indian vehicle plates:
 * - Legacy state series: e.g. CH01AB1234, DL1CA1234 (XX + district + series + 4 digits)
 * - Bharat (BH) series: e.g. 22BH1234, 22BH1234AA, DL1BH1234
 */
export function validateIndianVehiclePlate(raw: string): VehiclePlateValidation {
  const normalized = normalizeVehiclePlate(raw);
  if (!normalized) {
    return { ok: false, reason: "Enter the bus number plate." };
  }

  if (normalized.includes("BH")) {
    const bharat = /^(\d{2}|[A-Z]{2}\d{0,2})BH\d{4}([A-Z]{1,2})?$/;
    if (!bharat.test(normalized)) {
      return {
        ok: false,
        reason: "Bharat (BH) plate: use XXBH1234 or XXBH1234AA (e.g. 22BH1234).",
      };
    }
    return {
      ok: true,
      format: "bharat",
      normalized,
      display: formatBharatDisplay(normalized),
    };
  }

  const legacy = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/;
  if (!legacy.test(normalized)) {
    return {
      ok: false,
      reason: "State plate: use XX##XX#### (e.g. CH01AB1234 or DL1CA1234).",
    };
  }
  return {
    ok: true,
    format: "legacy",
    normalized,
    display: formatLegacyDisplay(normalized),
  };
}

function formatLegacyDisplay(normalized: string): string {
  const m = normalized.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/);
  if (!m) return normalized;
  return `${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}

function formatBharatDisplay(normalized: string): string {
  const m = normalized.match(/^((?:\d{2}|[A-Z]{2}\d{0,2})BH\d{4})([A-Z]{1,2})?$/);
  if (!m) return normalized;
  const core = m[1];
  const suffix = m[2] ?? "";
  const bhIdx = core.indexOf("BH");
  const prefix = core.slice(0, bhIdx);
  const digits = core.slice(bhIdx + 2);
  return suffix
    ? `${prefix} BH ${digits} ${suffix}`
    : `${prefix} BH ${digits}`;
}
