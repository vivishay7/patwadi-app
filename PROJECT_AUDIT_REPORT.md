# Patwadi App - Full Project Audit Report

**Date:** 2024  
**Project:** React Native + Expo (Prebuilt/Custom Dev Client)  
**App Name:** Patwadi - Overnight Intercity Parcels

---

## 🔍 High-Level Project Summary

Patwadi is a bus-first parcel delivery app for intercity shipping in India. The app supports two user roles: **Customers** (who send parcels) and **Drivers** (who transport parcels on bus routes). The codebase uses React Native with Expo SDK 54, React Navigation v7, Supabase for backend, and Mapbox for location services.

**Current State:**
- ✅ Core navigation structure is well-defined
- ✅ Authentication flow (OTP-based) is implemented
- ✅ Role-based UI switching works
- ✅ Location autocomplete with Mapbox is functional
- ⚠️ **Critical:** Duplicate Supabase client instances causing potential conflicts
- ⚠️ **Critical:** CameraMeasure screen registered in both RootNavigator and HomeStack
- ⚠️ Several screens use dummy/mock data instead of real Supabase queries
- ⚠️ Navigation param types have inconsistencies
- ⚠️ Some flows don't properly propagate data between screens

**Architecture:**
- Context-based state management (Auth, Profile, Role, DriverStatus)
- Service layer for API calls (orderService, locationService, dimensionService)
- Custom hooks for data fetching (useOrders, useDriverOrders, useKyc, etc.)
- Type-safe navigation with TypeScript

---

## 📋 Findings by Category

### A. Missing or Partially Implemented Features

#### 1. **Notifications System** ❌ NOT IMPLEMENTED
- **File:** `src/screens/NotificationsScreen.tsx`
- **Issue:** Uses hardcoded dummy data, no Supabase integration
- **Impact:** Users cannot see real order updates, driver assignments, or delivery status
- **Fix Required:** 
  - Create `notifications` table in Supabase
  - Implement realtime subscriptions for order status changes
  - Wire up notification creation triggers (on order created, assigned, picked up, delivered)
  - Add notification read/unread status

#### 2. **Live Tracking Screen** ⚠️ PARTIALLY IMPLEMENTED
- **File:** `src/screens/packages/LiveTrackingScreen.tsx`
- **Issue:** Likely missing real-time location updates from driver
- **Impact:** Customers cannot track their parcels in real-time
- **Fix Required:**
  - Implement Supabase Realtime subscription to `profiles.last_location` for assigned driver
  - Add map view with driver location marker
  - Show route visualization (pickup → dropoff)
  - Add ETA calculation

#### 3. **Saved Locations Feature** ⚠️ PARTIALLY IMPLEMENTED
- **File:** `src/screens/more/SavedLocationsScreen.tsx`
- **Issue:** No Supabase table for saved locations
- **Impact:** Users cannot save frequently used addresses
- **Fix Required:**
  - Create `saved_locations` table (user_id, address, lat, lng, label, is_pickup, is_dropoff)
  - Implement CRUD operations
  - Wire up to LocationAutocomplete component

#### 4. **Auto Message Feature** ⚠️ PARTIALLY IMPLEMENTED
- **File:** `src/screens/more/AutoMessageScreen.tsx`
- **Issue:** No backend integration
- **Impact:** Users cannot set up automated messages for drivers
- **Fix Required:**
  - Add `auto_messages` table or field in profiles
  - Integrate with WhatsApp API (see `src/lib/whatsapp.ts`)
  - Add message templates

#### 5. **Facility Selection Screen** ⚠️ PARTIALLY IMPLEMENTED
- **File:** `src/screens/home/FacilitySelectionScreen.tsx`
- **Issue:** No Supabase table for facilities/depots
- **Impact:** Users cannot select bus depots for pickup/dropoff
- **Fix Required:**
  - Create `facilities` table (name, address, lat, lng, operator, routes)
  - Wire up to order creation flow
  - Add facility selection to Pickup/Dropoff screens

#### 6. **Price Estimation** ⚠️ MOCK IMPLEMENTATION
- **File:** `src/services/orderService.ts` (calculatePriceEstimate function)
- **Issue:** Uses simple distance formula, not real pricing logic
- **Impact:** Price estimates may be inaccurate
- **Fix Required:**
  - Implement proper haversine distance calculation
  - Add pricing rules (base price, per km, weight tiers, route-based pricing)
  - Consider bus route availability in pricing

#### 7. **Driver Stats** ⚠️ PARTIALLY MOCK
- **File:** `src/services/locationService.ts` (getDriverStats)
- **Issue:** Rating is hardcoded to 4.8
- **Impact:** Driver ratings not calculated from actual reviews
- **Fix Required:**
  - Create `driver_ratings` or `reviews` table
  - Calculate average rating from reviews
  - Add review submission flow

#### 8. **Nearby Orders Search** ⚠️ NOT IMPLEMENTED
- **File:** `src/services/orderService.ts` (findNearbyOrders)
- **Issue:** Returns all pending orders, no actual radius filtering
- **Impact:** Drivers see orders from anywhere, not just nearby
- **Fix Required:**
  - Create Supabase RPC function `find_orders_nearby(lat, lng, radius_km)`
  - Use PostGIS for spatial queries
  - Filter by driver's current location and route

#### 9. **Order Status Updates via Realtime** ⚠️ NOT WIRED
- **File:** `src/hooks/useRealtimeOrder.ts` exists but may not be used
- **Issue:** Screens don't subscribe to real-time order updates
- **Impact:** Users must manually refresh to see status changes
- **Fix Required:**
  - Wire up `useRealtimeOrder` hook in PackageDetailsScreen, MyPackagesScreen
  - Add realtime subscriptions in DriverParcelDetailsScreen

#### 10. **Profile Setup Screen** ⚠️ UNCLEAR USAGE
- **File:** `src/screens/profile/ProfileSetupScreen.tsx`
- **Issue:** Not clear when this screen is shown vs RoleSelect
- **Impact:** Potential confusion in onboarding flow
- **Fix Required:**
  - Clarify: ProfileSetup for additional info after role selection?
  - Or merge with RoleSelect?
  - Update navigation flow documentation

---

### B. Architectural Inconsistencies

#### 1. **DUPLICATE SUPABASE CLIENTS** 🔴 CRITICAL
- **Files:** 
  - `src/lib/supabase.ts` (old, untyped)
  - `src/lib/supabaseClient.ts` (new, typed)
- **Issue:** Two different Supabase client instances
- **Impact:** 
  - `dimensionAI.ts` imports from old `supabase.ts`
  - Potential session/auth conflicts
  - Type safety issues
- **Fix Required:**
  - Delete `src/lib/supabase.ts`
  - Update `src/lib/dimensionAI.ts` to import from `supabaseClient.ts`
  - Verify all imports use `supabaseClient.ts`

#### 2. **DUPLICATE CAMERA SCREEN REGISTRATION** 🔴 CRITICAL
- **Files:**
  - `src/navigation/RootNavigator.tsx` (line 89)
  - `src/navigation/HomeStack.tsx` (line 103)
- **Issue:** `CameraMeasure` screen registered in both navigators
- **Impact:** Navigation conflicts, unclear which navigator handles it
- **Fix Required:**
  - Remove from RootNavigator (keep in HomeStack only)
  - OR remove from HomeStack and keep as modal in RootNavigator
  - Update all navigation calls to use correct navigator

#### 3. **INCONSISTENT NAVIGATION PARAM TYPES**
- **Issue:** Some screens expect `LocationData`, others expect different shapes
- **Examples:**
  - `HomeStackParamList.ParcelDetails` accepts `pickup?: LocationData; dropoff?: LocationData`
  - But `PickupScreen` passes `pickup: LocationData | undefined`
  - `ConfirmOrderScreen` expects all params, but some may be undefined
- **Fix Required:**
  - Standardize `LocationData` type across all screens
  - Make optional params explicit in type definitions
  - Add runtime validation for required params

#### 4. **REDUNDANT CONTEXT WRAPPERS**
- **File:** `src/context/RoleContext.tsx`
- **Issue:** Wraps `ProfileContext` but adds little value
- **Impact:** Extra layer of indirection
- **Fix Required:**
  - Consider removing `RoleContext` and using `ProfileContext` directly
  - OR merge RoleContext logic into ProfileContext
  - Update all `useRole()` calls to `useProfile()`

#### 5. **DUPLICATE ParcelData TYPE**
- **Files:**
  - `src/navigation/HomeStack.tsx` (line 16)
  - `src/navigation/PackagesStack.tsx` (line 16)
- **Issue:** Same interface defined in two places
- **Impact:** Type drift, maintenance burden
- **Fix Required:**
  - Move to `src/lib/db/types.ts` or `src/types/`
  - Import from single source

#### 6. **MIXED API PATTERNS**
- **Files:**
  - `src/lib/api/auth.ts` - Uses `ApiResponse<T>` pattern
  - `src/services/orderService.ts` - Uses `ServiceResponse<T>` pattern
  - `src/services/locationService.ts` - Uses `ServiceResponse<T>` pattern
- **Issue:** Two different response type patterns
- **Impact:** Inconsistent error handling
- **Fix Required:**
  - Standardize on one pattern (recommend `ServiceResponse<T>`)
  - Update all API files to use same pattern

#### 7. **HOOK LOCATION INCONSISTENCY**
- **Files:**
  - `src/hooks/useAutocomplete.ts` - Location search logic
  - `src/hooks/useDriverLocation.ts` - Driver location tracking
  - `src/services/locationService.ts` - Location API calls
- **Issue:** Location-related code split between hooks and services
- **Impact:** Unclear separation of concerns
- **Fix Required:**
  - Keep API calls in services
  - Keep React hooks in hooks (they call services)
  - Document pattern clearly

---

### C. Native Module Issues

#### 1. **EXPO IMAGE PICKER USAGE** ✅ CORRECT
- **File:** `src/screens/camera/CameraMeasureScreen.tsx`
- **Status:** Uses `expo-image-picker` correctly (not deprecated `ExponentImagePicker`)
- **No action needed**

#### 2. **REACT NATIVE VISION CAMERA** ⚠️ CHECK COMPATIBILITY
- **Package:** `react-native-vision-camera@^4.7.3`
- **Issue:** May require native code configuration
- **Status:** Not used in codebase yet (only `expo-camera` is used)
- **Action:** Remove if not needed, or configure for future use

#### 3. **REACT NATIVE GOOGLE PLACES AUTOCOMPLETE** ⚠️ POTENTIAL CONFLICT
- **Package:** `react-native-google-places-autocomplete@^2.6.1`
- **Issue:** Not used (app uses Mapbox instead)
- **Status:** Dead dependency
- **Action:** Remove from package.json

#### 4. **REACT NATIVE MAPS** ⚠️ NOT USED
- **Package:** `react-native-maps@^1.26.19`
- **Issue:** Not imported anywhere
- **Status:** Dead dependency (LiveTrackingScreen may need it)
- **Action:** 
  - Remove if LiveTrackingScreen doesn't need maps
  - OR implement map view in LiveTrackingScreen

---

### D. Navigation Flow Issues

#### 1. **CAMERA FLOW DATA PROPAGATION** ⚠️ INCOMPLETE
- **Flow:** `ParcelDetailsScreen` → `CameraMeasure` → `CameraMeasureResult` → back to `ParcelDetailsScreen`
- **Issue:** 
  - `CameraMeasureResultScreen` navigates to `ParcelDetailsScreen` but may not pass AI dimensions correctly
  - `ParcelDetailsScreen` expects `aiDimensions` in route params, but camera flow may not set it
- **Fix Required:**
  - Ensure `CameraMeasureResultScreen` passes `aiDimensions` when navigating back
  - Add fallback if dimensions not available

#### 2. **ORDER CREATION FLOW DATA LOSS** ⚠️ POTENTIAL
- **Flow:** `Pickup` → `Dropoff` → `ParcelDetails` → `PriceEstimate` → `ConfirmOrder`
- **Issue:** 
  - Each screen passes data forward, but if user goes back, data may be lost
  - No state management for order creation flow
- **Fix Required:**
  - Consider using React Context or state management for order creation
  - OR use navigation state persistence
  - Add validation at each step

#### 3. **DRIVER ONBOARDING FLOW** ✅ CORRECT
- **Flow:** `RoleSelect` → `DriverKyc` → `DriverBusDetails` → `DriverTerms` → `Main`
- **Status:** Well-defined, appears complete

#### 4. **GUEST MODE NAVIGATION** ⚠️ UNCLEAR
- **File:** `src/screens/SplashScreen.tsx` (line 102)
- **Issue:** "Continue as guest" navigates to `Main`, but guest users may not have profile
- **Impact:** Potential crashes or missing data
- **Fix Required:**
  - Ensure guest mode works without profile
  - OR require login before accessing Main
  - Add guest role handling in RoleContext

#### 5. **PACKAGES TAB INITIAL SCREEN** ⚠️ INCONSISTENT
- **File:** `src/navigation/PackagesStack.tsx`
- **Issue:** `MyPackagesScreen` is initial screen, but it shows different content for drivers vs customers
- **Status:** Works, but naming is confusing (drivers see "My Packages" but it's actually "Assigned Orders")
- **Fix Required:**
  - Consider separate initial screens for drivers vs customers
  - OR rename screen based on role

#### 6. **MORE TAB INITIAL SCREEN** ⚠️ NAMING CONFUSION
- **File:** `src/navigation/MoreStack.tsx` (line 26)
- **Issue:** `MoreMain` screen is actually `SettingsScreen`
- **Impact:** Naming doesn't match implementation
- **Fix Required:**
  - Rename `MoreMain` to `Settings` in param list
  - OR create actual `MoreMain` screen that lists options

---

### E. UI/UX Implementation Issues

#### 1. **MISSING LOADING STATES**
- **Screens needing loading states:**
  - `FacilitySelectionScreen` - when fetching facilities
  - `SavedLocationsScreen` - when fetching saved locations
  - `AutoMessageScreen` - when saving messages
- **Fix Required:** Add `ActivityIndicator` and loading state management

#### 2. **MISSING EMPTY STATES**
- **Screens needing empty states:**
  - `NotificationsScreen` - when no notifications (currently shows dummy data)
  - `SavedLocationsScreen` - when no saved locations
  - `AvailableJobsScreen` - when no jobs available (may have, verify)
- **Fix Required:** Use `EmptyState` component where missing

#### 3. **MISSING ERROR STATES**
- **Screens needing error handling:**
  - All screens that fetch data from Supabase
  - Location autocomplete error handling exists, but other screens may not
- **Fix Required:** Add error boundaries and error state UI

#### 4. **Z-INDEX ISSUES**
- **File:** `src/components/LocationAutocomplete.tsx` (line 265)
- **Issue:** `zIndex: 100` on input wrapper, but dropdown may overlap other elements
- **Status:** May work, but verify on different screens
- **Fix Required:** Test on all screens using LocationAutocomplete

#### 5. **TOUCH BLOCKING**
- **Potential issue:** LocationAutocomplete dropdown may block touches on underlying content
- **Status:** Uses `keyboardShouldPersistTaps="handled"` which helps
- **Fix Required:** Test on real devices, especially with keyboard open

#### 6. **BUTTON DISABLED STATES**
- **Status:** Most buttons have disabled states (e.g., `PickupScreen`, `DropoffScreen`)
- **Good:** ✅

#### 7. **SEARCH BARS**
- **Status:** LocationAutocomplete is clickable and functional ✅
- **No issues found**

---

### F. Mapbox Integration Audit

#### 1. **LOCATION AUTOCOMPLETE USAGE** ✅ GOOD
- **Component:** `src/components/LocationAutocomplete.tsx`
- **Used in:**
  - `PickupScreen` ✅
  - `DropoffScreen` ✅
- **Status:** Properly integrated

#### 2. **MISSING LOCATION SEARCH**
- **Screens that may need location search but don't have it:**
  - `FacilitySelectionScreen` - should allow searching for facilities
  - `SavedLocationsScreen` - should allow adding new locations via search
- **Fix Required:** Add LocationAutocomplete to these screens

#### 3. **LOCATION DATA PROPAGATION** ✅ GOOD
- **Status:** `LocationData` type is consistent, passed correctly between screens
- **No issues found**

#### 4. **MAPBOX CONFIGURATION** ✅ GOOD
- **File:** `src/lib/mapbox.ts`
- **Status:** Proper validation, error handling, typed client
- **No issues found**

#### 5. **GOOGLE MAPS LEFT OVER** ⚠️ REMOVE
- **Package:** `react-native-google-places-autocomplete`
- **Status:** Not used, should be removed
- **Action:** Remove from package.json

---

### G. Supabase Integration Audit

#### 1. **AUTHENTICATION** ✅ COMPLETE
- **Files:** `src/context/AuthContext.tsx`, `src/lib/api/auth.ts`
- **Status:** OTP-based auth fully implemented
- **No issues found**

#### 2. **PROFILE MANAGEMENT** ✅ COMPLETE
- **Files:** `src/context/ProfileContext.tsx`
- **Status:** Profile CRUD operations implemented
- **No issues found**

#### 3. **DRIVER KYC** ✅ COMPLETE
- **Files:** `src/lib/api/driver.ts`, `src/hooks/useKyc.ts`, `src/hooks/useSubmitKyc.ts`
- **Status:** KYC submission and status checking implemented
- **No issues found**

#### 4. **ORDER MANAGEMENT** ✅ MOSTLY COMPLETE
- **Files:** `src/services/orderService.ts`
- **Status:** CRUD operations implemented
- **Missing:**
  - Realtime subscriptions not wired up in screens
  - Nearby orders search not implemented (returns all orders)

#### 5. **DRIVER LOCATION TRACKING** ⚠️ PARTIALLY IMPLEMENTED
- **Files:** `src/services/locationService.ts`, `src/hooks/useDriverLocation.ts`
- **Status:** Location update API exists
- **Missing:**
  - Continuous location tracking not implemented
  - Location updates not sent automatically
  - Realtime location broadcasting not set up

#### 6. **MISSING TABLES** ❌
- **Required but not found in schema:**
  - `notifications` - for order updates, driver assignments
  - `saved_locations` - for user's saved addresses
  - `facilities` - for bus depots/facilities
  - `driver_ratings` or `reviews` - for driver ratings
  - `auto_messages` - for automated messages (or add to profiles table)

#### 7. **MISSING RLS POLICIES** ⚠️ ASSUME MISSING
- **Status:** Cannot verify without database access
- **Required policies:**
  - Profiles: Users can read own profile, update own profile
  - Orders: Customers see own orders, drivers see assigned orders
  - Driver KYC: Drivers can read/update own KYC
  - Notifications: Users see own notifications
- **Action:** Verify RLS policies are set up correctly

#### 8. **MISSING SUPABASE FUNCTIONS** ⚠️
- **Required functions:**
  - `find_orders_nearby(lat, lng, radius_km)` - for driver job search
  - `calculate_price(pickup, dropoff, weight, dimensions)` - for accurate pricing
  - `create_notification(user_id, type, order_id, message)` - for notification creation
- **Action:** Create these functions or implement in client code

#### 9. **REALTIME SUBSCRIPTIONS** ⚠️ NOT WIRED
- **File:** `src/hooks/useRealtimeOrder.ts` exists
- **Issue:** Not used in any screens
- **Fix Required:**
  - Wire up in `PackageDetailsScreen`
  - Wire up in `DriverParcelDetailsScreen`
  - Wire up in `MyPackagesScreen` for real-time updates

---

## 🗺️ Corrected Full UI Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         SPLASH SCREEN                            │
│  - Check auth status                                             │
│  - Auto-redirect if authenticated                                │
└─────────────────┬───────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
   [Authenticated]    [Not Authenticated]
        │                   │
        │                   └───► LOGIN SCREEN
        │                           │
        │                           └───► OTP SCREEN
        │                                   │
        │                                   └───► ROLE SELECT
        │                                           │
        │                                   ┌───────┴───────┐
        │                                   │               │
        │                              [Customer]      [Driver]
        │                                   │               │
        │                                   │               └───► DRIVER KYC
        │                                   │                       │
        │                                   │                       └───► DRIVER BUS DETAILS
        │                                   │                               │
        │                                   │                               └───► DRIVER TERMS
        │                                   │                                       │
        │                                   └───────────────────────────────────────┘
        │                                                                   │
        └───────────────────────────────────────────────────────────────────┘
                                                                      │
                                                                      ▼
                                                          ┌─────────────────────┐
                                                          │   MAIN TABS         │
                                                          │  (Tab Navigator)    │
                                                          └───┬─────────────────┘
                                                              │
                    ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                    │                                         │                                         │
                    ▼                                         ▼                                         ▼
            ┌───────────────┐                        ┌───────────────┐                        ┌───────────────┐
            │  HOME TAB     │                        │ PACKAGES TAB  │                        │  MORE TAB     │
            │  (HomeStack)  │                        │(PackagesStack)│                        │  (MoreStack)  │
            └───────┬───────┘                        └───────┬───────┘                        └───────┬───────┘
                    │                                         │                                         │
        ┌───────────┴───────────┐                 ┌───────────┴───────────┐                 ┌───────────┴───────────┐
        │                       │                 │                       │                 │                       │
   [Customer]              [Driver]        [Customer]              [Driver]        [Customer]              [Driver]
        │                       │                 │                       │                 │                       │
        ▼                       ▼                 ▼                       ▼                 ▼                       ▼
┌───────────────┐      ┌───────────────┐  ┌───────────────┐      ┌───────────────┐  ┌───────────────┐      ┌───────────────┐
│Customer Home  │      │Driver Home    │  │My Packages    │      │Driver Parcels │  │Settings       │      │Settings       │
│Screen         │      │Screen         │  │Screen         │      │Screen         │  │Screen         │      │Screen         │
└───────┬───────┘      └───────┬───────┘  └───────┬───────┘      └───────┬───────┘  └───────┬───────┘      └───────┬───────┘
        │                     │                   │                     │                   │                     │
        │                     │                   │                     │                   │                     │
        │                     │                   │                     │                   │                     │
        ▼                     ▼                   ▼                     ▼                   ▼                     ▼
┌───────────────┐      ┌───────────────┐  ┌───────────────┐      ┌───────────────┐  ┌───────────────┐      ┌───────────────┐
│Send Parcel    │      │Available Jobs │  │Package Details│      │Driver Parcel │  │Edit Profile   │      │Edit Profile   │
│Screen         │      │Screen         │  │Screen         │      │Details       │  │Screen         │      │Screen         │
└───────┬───────┘      └───────┬───────┘  └───────┬───────┘      └───────┬───────┘  └───────┬───────┘      └───────┬───────┘
        │                     │                   │                     │                   │                     │
        │                     │                   │                     │                   │                     │
        ▼                     ▼                   ▼                     ▼                   ▼                     ▼
┌───────────────┐      ┌───────────────┐  ┌───────────────┐      ┌───────────────┐  ┌───────────────┐      ┌───────────────┐
│Pickup Screen  │      │Current Job    │  │Live Tracking   │      │Live Tracking  │  │Saved Locations│      │Saved Locations│
│               │      │Screen         │  │Screen          │      │Screen          │  │Screen         │      │Screen         │
└───────┬───────┘      └───────────────┘  └────────────────┘      └────────────────┘  └───────────────┘      └───────────────┘
        │
        ▼
┌───────────────┐
│Dropoff Screen │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│Parcel Details │
│Screen         │
└───────┬───────┘
        │
        ├───► Camera Measure Screen (Modal)
        │     │
        │     └───► Camera Measure Result Screen
        │           │
        │           └───► (back to Parcel Details with dimensions)
        │
        ▼
┌───────────────┐
│Price Estimate │
│Screen         │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│Confirm Order  │
│Screen         │
└───────┬───────┘
        │
        └───► (Order created, navigate to Packages tab)

NOTIFICATIONS TAB (standalone screen, no stack)
┌───────────────┐
│Notifications  │
│Screen         │
│(Dummy data)   │
└───────────────┘
```

**Key Navigation Paths:**
1. **Customer Order Creation:** Home → Send Parcel → Pickup → Dropoff → Parcel Details → (Camera) → Price Estimate → Confirm Order → Packages
2. **Driver Job Acceptance:** Home → Available Jobs → Driver Parcel Details → Accept → Current Job
3. **Driver Onboarding:** Role Select → Driver KYC → Driver Bus Details → Driver Terms → Main

---

## 🚨 Action Plan: Next 20 Tasks

### **HIGH PRIORITY (Blocking Release)**

#### Task 1: Fix Duplicate Supabase Clients 🔴
- **Files:** `src/lib/supabase.ts`, `src/lib/dimensionAI.ts`
- **Issue:** Two Supabase client instances, `dimensionAI.ts` uses old one
- **Fix:** 
  1. Delete `src/lib/supabase.ts`
  2. Update `src/lib/dimensionAI.ts` line 2: `import { supabase } from "./supabaseClient";`
  3. Verify no other files import from `supabase.ts`
- **Difficulty:** Easy (5 min)
- **Risk:** Low

#### Task 2: Fix Duplicate Camera Screen Registration 🔴
- **Files:** `src/navigation/RootNavigator.tsx`, `src/navigation/HomeStack.tsx`
- **Issue:** `CameraMeasure` registered in both navigators
- **Fix:**
  1. Remove `CameraMeasure` from `RootNavigator.tsx` (line 89)
  2. Keep only in `HomeStack.tsx`
  3. Update `ParcelDetailsScreen` navigation call if needed
- **Difficulty:** Easy (5 min)
- **Risk:** Low

#### Task 3: Implement Notifications System ❌
- **Files:** New `src/services/notificationService.ts`, `src/screens/NotificationsScreen.tsx`
- **Issue:** Notifications use dummy data
- **Fix:**
  1. Create `notifications` table in Supabase (user_id, type, order_id, message, read, created_at)
  2. Create notification service with CRUD operations
  3. Add realtime subscription for new notifications
  4. Wire up to `NotificationsScreen`
  5. Create notifications on order events (created, assigned, picked up, delivered)
- **Difficulty:** Medium (2-3 hours)
- **Risk:** Medium

#### Task 4: Wire Up Realtime Order Updates ⚠️
- **Files:** `src/hooks/useRealtimeOrder.ts`, `src/screens/packages/PackageDetailsScreen.tsx`, `src/screens/packages/MyPackagesScreen.tsx`
- **Issue:** Realtime hook exists but not used
- **Fix:**
  1. Import `useRealtimeOrder` in `PackageDetailsScreen`
  2. Import in `MyPackagesScreen`
  3. Subscribe to order status changes
  4. Update UI when status changes
- **Difficulty:** Easy (30 min)
- **Risk:** Low

#### Task 5: Implement Nearby Orders Search ⚠️
- **Files:** `src/services/orderService.ts`, Supabase database
- **Issue:** Returns all orders, not filtered by location
- **Fix:**
  1. Create Supabase RPC function `find_orders_nearby(lat, lng, radius_km)`
  2. Use PostGIS for spatial queries
  3. Update `findNearbyOrders` to call RPC function
  4. Wire up to `AvailableJobsScreen` with driver's current location
- **Difficulty:** Hard (3-4 hours, requires PostGIS setup)
- **Risk:** Medium

#### Task 6: Fix Camera Flow Data Propagation ⚠️
- **Files:** `src/screens/camera/CameraMeasureResultScreen.tsx`, `src/screens/parcel/ParcelDetailsScreen.tsx`
- **Issue:** AI dimensions may not be passed correctly
- **Fix:**
  1. Verify `CameraMeasureResultScreen` passes `aiDimensions` in navigation params
  2. Ensure `ParcelDetailsScreen` receives and uses `aiDimensions`
  3. Add fallback if dimensions not available
- **Difficulty:** Easy (15 min)
- **Risk:** Low

#### Task 7: Remove Dead Dependencies 🔴
- **Files:** `package.json`
- **Issue:** `react-native-google-places-autocomplete`, `react-native-maps` not used
- **Fix:**
  1. Remove `react-native-google-places-autocomplete` (using Mapbox instead)
  2. Remove `react-native-maps` if LiveTrackingScreen doesn't need it
  3. Run `npm install` to update lock file
- **Difficulty:** Easy (5 min)
- **Risk:** Low

#### Task 8: Standardize API Response Types ⚠️
- **Files:** `src/lib/api/auth.ts`, `src/lib/api/driver.ts`
- **Issue:** Uses `ApiResponse<T>`, services use `ServiceResponse<T>`
- **Fix:**
  1. Create shared type in `src/lib/api/types.ts`
  2. Update all API files to use same type
  3. Or migrate API files to use `ServiceResponse<T>`
- **Difficulty:** Easy (30 min)
- **Risk:** Low

### **MEDIUM PRIORITY (Important for UX)**

#### Task 9: Implement Saved Locations Feature ⚠️
- **Files:** `src/screens/more/SavedLocationsScreen.tsx`, new `src/services/savedLocationsService.ts`
- **Issue:** No backend integration
- **Fix:**
  1. Create `saved_locations` table (user_id, label, address, lat, lng, is_pickup, is_dropoff, created_at)
  2. Create service with CRUD operations
  3. Wire up to screen
  4. Add "Use Saved Location" option in LocationAutocomplete
- **Difficulty:** Medium (2 hours)
- **Risk:** Low

#### Task 10: Implement Live Tracking with Realtime Location ⚠️
- **Files:** `src/screens/packages/LiveTrackingScreen.tsx`, `src/services/locationService.ts`
- **Issue:** No real-time driver location updates
- **Fix:**
  1. Set up continuous location tracking for drivers (use `expo-location`)
  2. Update driver location every 30 seconds when online
  3. Subscribe to driver's `last_location` in `LiveTrackingScreen`
  4. Add map view showing driver location and route
- **Difficulty:** Hard (4-5 hours)
- **Risk:** Medium (battery usage, permissions)

#### Task 11: Add Loading States to All Screens ⚠️
- **Files:** Multiple screens
- **Issue:** Some screens don't show loading indicators
- **Fix:**
  1. Add loading state to `FacilitySelectionScreen`
  2. Add loading state to `SavedLocationsScreen`
  3. Add loading state to `AutoMessageScreen`
  4. Verify all data-fetching screens have loading states
- **Difficulty:** Easy (1 hour)
- **Risk:** Low

#### Task 12: Add Empty States to All Screens ⚠️
- **Files:** Multiple screens
- **Issue:** Some screens don't show empty states
- **Fix:**
  1. Add `EmptyState` to `NotificationsScreen` (when no notifications)
  2. Add `EmptyState` to `SavedLocationsScreen` (when no saved locations)
  3. Verify `AvailableJobsScreen` has empty state
- **Difficulty:** Easy (30 min)
- **Risk:** Low

#### Task 13: Implement Facilities/Depots Feature ⚠️
- **Files:** `src/screens/home/FacilitySelectionScreen.tsx`, new `src/services/facilityService.ts`
- **Issue:** No backend integration
- **Fix:**
  1. Create `facilities` table (name, address, lat, lng, operator, routes, created_at)
  2. Create service with CRUD operations
  3. Wire up to screen
  4. Add facility selection to order creation flow
- **Difficulty:** Medium (2-3 hours)
- **Risk:** Low

#### Task 14: Improve Price Estimation Logic ⚠️
- **Files:** `src/services/orderService.ts`
- **Issue:** Uses simple distance formula
- **Fix:**
  1. Implement proper haversine distance calculation
  2. Add pricing rules (base price, per km, weight tiers)
  3. Consider route-based pricing (bus routes)
  4. Add pricing configuration (can be in Supabase table)
- **Difficulty:** Medium (2 hours)
- **Risk:** Low

#### Task 15: Fix Navigation Param Type Inconsistencies ⚠️
- **Files:** `src/navigation/HomeStack.tsx`, `src/navigation/PackagesStack.tsx`
- **Issue:** Some params optional, some required, inconsistent
- **Fix:**
  1. Review all navigation param types
  2. Make optional params explicit with `?`
  3. Add runtime validation for required params
  4. Update TypeScript types to match actual usage
- **Difficulty:** Medium (1-2 hours)
- **Risk:** Low

#### Task 16: Consolidate ParcelData Type ⚠️
- **Files:** `src/navigation/HomeStack.tsx`, `src/navigation/PackagesStack.tsx`
- **Issue:** Same interface defined twice
- **Fix:**
  1. Move `ParcelData` to `src/lib/db/types.ts` or `src/types/parcel.ts`
  2. Import from single source in both files
  3. Remove duplicate definitions
- **Difficulty:** Easy (10 min)
- **Risk:** Low

#### Task 17: Add Error Boundaries and Error States ⚠️
- **Files:** Multiple screens
- **Issue:** No error handling UI
- **Fix:**
  1. Add error state to all data-fetching screens
  2. Show error message with retry button
  3. Consider adding React Error Boundary at app level
- **Difficulty:** Medium (2 hours)
- **Risk:** Low

#### Task 18: Implement Driver Rating System ⚠️
- **Files:** `src/services/locationService.ts`, new `src/services/ratingService.ts`
- **Issue:** Rating is hardcoded
- **Fix:**
  1. Create `driver_ratings` table (order_id, driver_id, customer_id, rating, comment, created_at)
  2. Create rating service
  3. Add rating submission flow after delivery
  4. Calculate average rating from reviews
  5. Update `getDriverStats` to use real ratings
- **Difficulty:** Medium (3 hours)
- **Risk:** Low

### **LOW PRIORITY (Polish & Future)**

#### Task 19: Remove or Consolidate RoleContext ⚠️
- **Files:** `src/context/RoleContext.tsx`
- **Issue:** Wraps ProfileContext with little added value
- **Fix:**
  1. Consider removing `RoleContext` entirely
  2. Update all `useRole()` calls to `useProfile()`
  3. OR merge RoleContext logic into ProfileContext
- **Difficulty:** Easy (1 hour)
- **Risk:** Low (but many files to update)

#### Task 20: Add Guest Mode Handling ⚠️
- **Files:** `src/screens/SplashScreen.tsx`, `src/context/RoleContext.tsx`
- **Issue:** Guest mode navigation unclear
- **Fix:**
  1. Define guest role behavior clearly
  2. Ensure guest users can browse but not create orders
  3. Add "Sign up to continue" prompts
- **Difficulty:** Easy (30 min)
- **Risk:** Low

---

## 🎨 Optional Enhancements / Future Versions

### Version 2.0 Features
1. **Push Notifications** - Use Expo Notifications for order updates
2. **Payment Integration** - Add payment gateway (Razorpay, Stripe)
3. **Order History & Analytics** - Detailed order history, earnings reports for drivers
4. **Multi-language Support** - Hindi, English, regional languages
5. **Driver Route Optimization** - Suggest optimal routes for multiple pickups
6. **Customer Reviews** - Full review system for drivers and service quality
7. **Scheduled Pickups** - Allow customers to schedule future pickups
8. **Parcel Insurance** - Optional insurance for high-value parcels
9. **Referral System** - Referral codes for customers and drivers
10. **Admin Dashboard** - Web dashboard for managing orders, drivers, facilities

### Technical Debt to Address
1. **State Management** - Consider Redux or Zustand for complex state
2. **Testing** - Add unit tests for services, integration tests for flows
3. **Performance** - Optimize image loading, add caching
4. **Offline Support** - Cache orders, queue actions when offline
5. **Analytics** - Add analytics tracking (Mixpanel, Amplitude)
6. **Error Tracking** - Add Sentry or similar for crash reporting
7. **Code Splitting** - Lazy load screens for better performance
8. **Documentation** - Add JSDoc comments, API documentation

---

## 📊 Summary Statistics

- **Total Screens:** 34
- **Critical Issues:** 2 (Duplicate Supabase clients, Duplicate Camera screen)
- **High Priority Tasks:** 8
- **Medium Priority Tasks:** 10
- **Low Priority Tasks:** 2
- **Missing Features:** 6 major features
- **Architectural Issues:** 7
- **Native Module Issues:** 2 (dead dependencies)

---

## ✅ Recommended Development Sequence

### **Batch 6 (Critical Fixes)**
1. Task 1: Fix Duplicate Supabase Clients
2. Task 2: Fix Duplicate Camera Screen Registration
3. Task 7: Remove Dead Dependencies
4. Task 8: Standardize API Response Types
5. Task 16: Consolidate ParcelData Type

### **Batch 7 (Core Features)**
6. Task 3: Implement Notifications System
7. Task 4: Wire Up Realtime Order Updates
8. Task 6: Fix Camera Flow Data Propagation
9. Task 11: Add Loading States
10. Task 12: Add Empty States

### **Batch 8 (Driver Features)**
11. Task 5: Implement Nearby Orders Search
12. Task 10: Implement Live Tracking with Realtime Location
13. Task 18: Implement Driver Rating System

### **Batch 9 (UX Improvements)**
14. Task 9: Implement Saved Locations Feature
15. Task 13: Implement Facilities/Depots Feature
16. Task 14: Improve Price Estimation Logic
17. Task 15: Fix Navigation Param Type Inconsistencies
18. Task 17: Add Error Boundaries and Error States

### **Batch 10 (Polish)**
19. Task 19: Remove or Consolidate RoleContext
20. Task 20: Add Guest Mode Handling

---

**End of Audit Report**



