import {
  assertCorridorMatchesLocations,
  deriveBookingPrice,
  haversineKm,
} from "./pricing.ts";

const delhiChandigarh = {
  key: "delhi_chandigarh",
  origin_city: "Delhi",
  origin_lat: 28.6139,
  origin_lng: 77.209,
  destination_city: "Chandigarh",
  destination_lat: 30.7333,
  destination_lng: 76.7794,
  active: true,
};

function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertThrows(fn: () => void, message: string) {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(message);
}

Deno.test("deriveBookingPrice computes amount from corridor data and package metadata", () => {
  const basePrice = Math.round(
    40 +
      haversineKm(
        delhiChandigarh.origin_lat,
        delhiChandigarh.origin_lng,
        delhiChandigarh.destination_lat,
        delhiChandigarh.destination_lng
      ) *
        6
  );

  const pricing = deriveBookingPrice(delhiChandigarh, {
    corridorKey: "delhi_chandigarh",
    pickup_location: "Connaught Place, New Delhi, India",
    dropoff_location: "Sector 17, Chandigarh, India",
    needs_packaging: true,
    packaging_type: "box-small",
    priority: "48hrs",
  });

  assertEquals(pricing.basePrice, basePrice);
  assertEquals(pricing.packagingCharge, 20);
  assertEquals(pricing.discount, 5);
  assertEquals(pricing.priceEstimate, basePrice + 15);
  assertEquals(pricing.amountInPaise, (basePrice + 15) * 100);
});

Deno.test("deriveBookingPrice accepts reverse corridor direction", () => {
  const pricing = deriveBookingPrice(delhiChandigarh, {
    corridorKey: "delhi_chandigarh",
    pickup_location: "Sector 17, Chandigarh, India",
    dropoff_location: "Connaught Place, New Delhi, India",
  });

  assertEquals(pricing.priceEstimate, pricing.basePrice);
});

Deno.test("assertCorridorMatchesLocations rejects mismatched booking locations", () => {
  assertThrows(
    () =>
      assertCorridorMatchesLocations(delhiChandigarh, {
        corridorKey: "delhi_chandigarh",
        pickup_location: "Bandra West, Mumbai, India",
        dropoff_location: "Koregaon Park, Pune, India",
      }),
    "Expected mismatched corridor locations to be rejected"
  );
});

Deno.test("deriveBookingPrice rejects invalid packaging when packaging is requested", () => {
  assertThrows(
    () =>
      deriveBookingPrice(delhiChandigarh, {
        corridorKey: "delhi_chandigarh",
        pickup_location: "Delhi, India",
        dropoff_location: "Chandigarh, India",
        needs_packaging: true,
        packaging_type: "envelope",
      }),
    "Expected invalid packaging type to be rejected"
  );
});
