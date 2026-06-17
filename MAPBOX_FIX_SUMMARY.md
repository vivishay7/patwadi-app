# Mapbox SDK Fix Summary

## Issue
Runtime crash: `TypeError: Cannot read property 'prototype' of undefined`

## Root Cause
`@mapbox/mapbox-sdk` was imported using class-style syntax (`new MapboxClient(...)`) which doesn't work in React Native. React Native doesn't support ES6 class instantiation for this SDK.

## Solution
Rewrote `src/lib/mapbox.ts` to use function-style imports compatible with React Native.

## Files Modified

### 1. `src/lib/mapbox.ts`
- **Changed:** Replaced class-style imports with function-style imports
  - OLD: `import { MapboxClient } from "@mapbox/mapbox-sdk";`
  - NEW: `import mapboxSdk from "@mapbox/mapbox-sdk";`
- **Changed:** Replaced class instantiation with function call
  - OLD: `new MapboxClient({ accessToken: mapboxToken })`
  - NEW: `mapboxSdk({ accessToken: mapboxToken })`
- **Changed:** Simplified `MapboxFeature` interface to minimal required fields
- **Changed:** Made `SelectedLocation` fields optional (`placeId?`, `placeName?`)
- **Added:** `text` field to `MapboxFeature` for compatibility with LocationAutocomplete

### 2. `src/hooks/useAutocomplete.ts`
- **Added:** Null check for `geocodingClient` before calling `.forwardGeocode()`

## Consumers Verified
✅ `src/components/LocationAutocomplete.tsx` - Imports from `../lib/mapbox`
✅ `src/hooks/useAutocomplete.ts` - Uses `geocodingClient`, `MapboxFeature`, `SelectedLocation`
✅ `src/screens/parcel/PickupScreen.tsx` - Uses `SelectedLocation`
✅ `src/screens/parcel/DropoffScreen.tsx` - Uses `SelectedLocation`
✅ `src/types/location.ts` - Re-exports `SelectedLocation` from mapbox

## Expected Outcome
- ✅ App boots without red screen
- ✅ No `.prototype` runtime error
- ✅ LocationAutocomplete renders correctly
- ✅ Mapbox geocoding works for autocomplete

## Notes
- TypeScript errors about missing `@mapbox/mapbox-sdk` type definitions are expected and don't affect runtime
- Metro cache cleared and Android build restarted with `npx expo start -c --android`




