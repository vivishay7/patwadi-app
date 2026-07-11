# Patwadi — Play Store screenshot brief

**Target:** 5–6 phone screenshots (1080×1920 or 9:16 PNG from physical device / emulator)  
**Session:** 24  
**Tone on device:** Active demo parcel on Delhi–Chandigarh (or first live corridor); no placeholder "Lorem" data.

Capture with `scripts/capture-all-screens.mjs` or manual emulator screencap. Crop status bar consistently; use light mode.

---

## 1. Home — corridor entry point

**Screen:** `CustomerHome` (logged-in customer)  
**Show:** Send Parcel / My Packages / Track Package actions; if possible, §9 active-shipment tracker card with corridor name and current stage label (e.g. "In transit on corridor").  
**Caption idea:** "Book and track intercity parcels on verified corridors."

---

## 2. Send parcel — corridor + estimate

**Screen:** `SendParcelScreen` → `PriceEstimateScreen` (or `PackageInfoScreen` with corridor selected)  
**Show:** Origin/destination corridor picker, parcel details, corridor-based price before payment.  
**Caption idea:** "See corridor pricing before you pay."

---

## 3. Tracking — custody stages

**Screen:** `TrackingDetailsScreen` for an in-transit order  
**Show:** Simplified parcel stages (picked up → in transit on corridor → destination city → delivery) with dates; customer-facing labels from §9, not internal operator jargon.  
**Caption idea:** "Every hop verified — status from real handoffs."

---

## 4. My Packages — order list

**Screen:** `MyPackagesScreen`  
**Show:** At least two orders in different stages (e.g. one delivered, one in transit) with corridor labels.  
**Caption idea:** "All your corridor bookings in one place."

---

## 5. Pickup confirm — customer handoff

**Screen:** `ConfirmHandoffScreen` (`customer_to_lmp` step) or tracking CTA leading to it  
**Show:** Handoff code entry / confirm pickup flow; reinforces code + photo custody at the door.  
**Caption idea:** "Confirm pickup together in the app."

---

## 6. Booking confirmed (optional sixth)

**Screen:** `ConfirmOrderScreen` post-payment success state, or `PackageDetailsScreen` with booking summary  
**Show:** Confirmed booking, corridor, parcel ID/reference, link to track.  
**Caption idea:** "Booked on the corridor — track from here."

---

## Production checklist

- [ ] Same test account across shots; redact personal phone/address if using real data  
- [ ] No dev-only UI (`__DEV__` skip payment, debug banners)  
- [ ] Feature graphic: `assets/feature-graphic.png` (1024×500) uploaded separately  
- [ ] Listing copy: `docs/play-store-listing.md`
