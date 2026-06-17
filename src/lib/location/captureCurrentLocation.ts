import * as Location from "expo-location";

export type CapturedLocation = {
  lat: number;
  lng: number;
  accuracyMeters?: number;
};

export type CaptureLocationResult =
  | { ok: true; location: CapturedLocation }
  | { ok: false; reason: "permission_denied" | "services_disabled" | "read_failed" };

/**
 * v6 §8 — one-shot foreground GPS read tied to a user action (button press).
 * Does not use background location.
 */
export async function captureCurrentLocation(): Promise<CaptureLocationResult> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    return { ok: false, reason: "services_disabled" };
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    return { ok: false, reason: "permission_denied" };
  }

  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      ok: true,
      location: {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyMeters: pos.coords.accuracy ?? undefined,
      },
    };
  } catch {
    return { ok: false, reason: "read_failed" };
  }
}
