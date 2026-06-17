# Patwadi App - Resync Report

**Date:** 2024  
**Purpose:** Resync after chat history loss - Current workspace state analysis

---

## 1. Progress Checkpoint

### ✅ Works End-to-End

#### 1.1 **App Entry & Navigation Structure**
- **Entrypoint:** `App.tsx` → `RootNavigator` → `SplashScreen` (initial route)
- **Files:**
  - `App.tsx` - Main app entry, wraps providers (AuthProvider, RoleProvider)
  - `src/navigation/RootNavigator.tsx` - Root stack navigator with auth flow
  - `src/navigation/MainTabs.tsx` - Bottom tab navigator (Home, Notifications, Settings)
- **Status:** ✅ Navigation structure is well-defined and functional

#### 1.2 **Authentication Flow**
- **Entrypoint:** `src/screens/SplashScreen.tsx` → `LoginScreen` → OTP → `RoleSelectScreen`
- **Files:**
  - `src/context/AuthContext.tsx` - Auth state management
  - `src/lib/api/auth.ts` - OTP-based authentication (loginWithPhone, verifyOtp)
  - `src/screens/LoginScreen.tsx` (inferred, referenced in navigation)
  - `src/screens/RoleSelectScreen.tsx` - Role selection (Customer/Driver)
- **Status:** ✅ OTP-based authentication implemented with Supabase

#### 1.3 **Supabase Client Configuration**
- **File:** `src/lib/supabase.ts`
- **Status:** ✅ Client created, validation functions implemented
- **Evidence:** Exports `supabase` client, `validateSupabase()`, configuration validation

#### 1.4 **Role-Based UI Switching**
- **File:** `src/screens/HomeScreen.tsx`
- **Status:** ✅ Conditionally renders CustomerHome or DriverHome based on role
- **Evidence:** Uses `useRole()` hook, renders `<CustomerHome />` or `<DriverHome />` based on role

#### 1.5 **Driver Onboarding Flow**
- **Files:**
  - `src/screens/onboarding/driver/DriverKycScreen.tsx`
  - `src/screens/onboarding/driver/DriverBusDetailsScreen.tsx`
  - `src/screens/onboarding/driver/DriverTermsScreen.tsx`
  - `src/lib/api/driver.ts` - KYC and bus details API
- **Status:** ⚠️ **PARTIAL** - UI flow defined, but API uses mock data (see 1.6)
- **Evidence:** Navigation routes exist, `driver.ts` has mock implementations (lines 40-94)

#### 1.6 **Driver KYC & Bus Details API**
- **File:** `src/lib/api/driver.ts`
- **Functions:** `saveDriverKyc()`, `saveDriverBusData()`, `fetchDriverKyc()`
- **Status:** ⚠️ **PARTIAL** - Mock implementations return placeholder data
- **Evidence:** 
  - `saveDriverKyc()` (lines 40-64): Returns mock data, TODO comment "Implement actual Supabase storage"
  - `saveDriverBusData()` (lines 70-94): Returns mock data, TODO comment
  - `fetchDriverKyc()` (lines 99-125): May have real implementation (not fully read)

#### 1.7 **Notifications Screen UI**
- **File:** `src/screens/NotificationsScreen.tsx`
- **Status:** ⚠️ **UI ONLY** - Renders hardcoded dummy data, no backend integration
- **Evidence:** Uses `dummyNotifications` array (lines 14-39), no API calls

---

### ⚠️ Partially Working / Broken

#### 2.1 **Order Service - BROKEN IMPORT** 🔴
- **File:** `src/services/orderService.ts`
- **Issue:** Line 1 imports from `"../lib/supabaseClient"` but file doesn't exist
- **Actual file:** Only `src/lib/supabase.ts` exists (not `supabaseClient.ts`)
- **Impact:** This file would fail to compile/run
- **Status:** 🔴 **BROKEN** - Import path incorrect

#### 2.2 **Customer Parcel Creation Flow**
- **Files:**
  - `src/screens/SendParcelScreen.tsx`
  - `src/screens/parcel/PickupScreen.tsx`
  - `src/screens/parcel/DropoffScreen.tsx`
  - `src/screens/parcel/ParcelDetailsScreen.tsx`
  - `src/screens/parcel/PriceEstimateScreen.tsx`
  - `src/screens/parcel/ConfirmOrderScreen.tsx`
- **Status:** ⚠️ **PARTIAL** - Navigation flow exists, but:
  - Order service has broken import (2.1)
  - Price estimation uses mock logic (per audit report)
  - Camera flow data propagation unclear (per audit report)

#### 2.3 **Camera Dimension AI**
- **File:** `src/lib/dimensionAI.ts`
- **Status:** ✅ **WORKS** - Uses hardcoded endpoint, no Supabase dependency
- **Evidence:** Sends image to Supabase function endpoint, returns dimension estimates
- **Note:** Audit report incorrectly states this imports from supabase.ts - it doesn't

#### 2.4 **Driver Parcel Management**
- **Files:**
  - `src/screens/driver/DriverParcelsScreen.tsx`
  - `src/screens/driver/DriverParcelDetailsScreen.tsx`
- **Status:** ⚠️ **PARTIAL** - Navigation routes exist, implementation status unknown (files not read)

---

### 🔴 Broken / Missing

#### 3.1 **Order Service Import Error**
- **File:** `src/services/orderService.ts:1`
- **Error:** `import { supabase } from "../lib/supabaseClient";` - file doesn't exist
- **Fix Required:** Change import to `"../lib/supabase"` OR create missing `supabaseClient.ts`
- **Impact:** This file cannot be used until fixed

#### 3.2 **Missing Navigation Files** (Referenced in Audit Report)
- **Files mentioned in audit but NOT FOUND:**
  - `src/navigation/HomeStack.tsx` - Audit mentions duplicate CameraMeasure registration
  - `src/navigation/PackagesStack.tsx` - Audit mentions this exists
  - `src/navigation/MoreStack.tsx` - Audit mentions this exists
- **Actual navigation structure:** Only `RootNavigator.tsx` and `MainTabs.tsx` found
- **Status:** ⚠️ Audit report may be outdated or describes intended structure

#### 3.3 **Notifications System Backend**
- **File:** `src/screens/NotificationsScreen.tsx`
- **Status:** ❌ No backend - Uses hardcoded dummy data
- **Missing:** No notifications table, no service, no realtime subscriptions

---

### Runbook

#### Commands to Run App:
```bash
# Start Expo development server
npm start
# or
expo start

# Run on Android
npm run android
# or
expo run:android

# Run on iOS
npm run ios
# or
expo run:ios

# Run on web
npm run web
# or
expo start --web
```

#### Commands to Build:
```bash
# Build Android (requires Expo EAS or local build setup)
eas build --platform android
# or
cd android && ./gradlew assembleRelease

# Build iOS (requires macOS and Xcode)
eas build --platform ios
```

#### Commands to Test:
```bash
# No test scripts found in package.json
# Would need to add Jest/React Native Testing Library setup
```

#### Commands to Lint:
```bash
# No lint scripts found in package.json
# TypeScript checking would be:
npx tsc --noEmit
```

#### Expected Errors:
1. **Import Error:** `src/services/orderService.ts:1` - `supabaseClient` module not found
   - **Origin:** Incorrect import path
   - **Fix:** Change to `"../lib/supabase"` OR create missing file

2. **Missing Environment Variables:** Supabase configuration requires:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON`
   - **Location:** Should be in `.env` file (not found in repo)

---

## 2. App Structure Map

### Architecture Overview

**Tech Stack:**
- React Native 0.81.5
- Expo SDK 54
- React Navigation v7 (Native Stack, Bottom Tabs)
- Supabase (Backend/DB)
- TypeScript
- Mapbox SDK (for location services)

**State Management:**
- Context API (`AuthContext`, `RoleContext`)
- No Redux/Zustand

**API Layer:**
- Service layer pattern (`src/services/`, `src/lib/api/`)
- Supabase client for backend calls
- Custom hooks for data fetching

### Entry Points

1. **App Entry:** `App.tsx`
   - Wraps: GestureHandlerRootView, SafeAreaProvider
   - Providers: AuthProvider, RoleProvider
   - Navigation: NavigationContainer → RootNavigator

2. **Root Navigation:** `src/navigation/RootNavigator.tsx`
   - Initial route: `Splash`
   - Auth flow: Splash → Login → RoleSelect
   - Driver onboarding: DriverKyc → DriverBusDetails → DriverTerms
   - Main app: Main (tabs)
   - Customer flow: SendParcel → Pickup → Dropoff → ParcelDetails → PriceEstimate → ConfirmOrder
   - Camera: CameraMeasure
   - Driver flow: DriverParcels → DriverParcelDetails

3. **Main Tabs:** `src/navigation/MainTabs.tsx`
   - Home tab → `HomeScreen` (role-based: CustomerHome/DriverHome)
   - Notifications tab → `NotificationsScreen`
   - Settings tab → `SettingsScreen`

### Key Files Index

| Path | Purpose |
|------|---------|
| `App.tsx` | Main app entry point, providers setup |
| `src/navigation/RootNavigator.tsx` | Root stack navigator, auth & main flows |
| `src/navigation/MainTabs.tsx` | Bottom tab navigator (Home, Notifications, Settings) |
| `src/context/AuthContext.tsx` | Authentication state management |
| `src/context/RoleContext.tsx` | User role (customer/driver) management |
| `src/lib/supabase.ts` | Supabase client instance and validation |
| `src/lib/api/auth.ts` | Authentication API (OTP login, verify) |
| `src/lib/api/driver.ts` | Driver KYC and bus details API (mock) |
| `src/services/orderService.ts` | Order CRUD operations (BROKEN import) |
| `src/lib/dimensionAI.ts` | Camera dimension estimation service |
| `src/screens/SplashScreen.tsx` | Initial screen, entry point |
| `src/screens/HomeScreen.tsx` | Role-based home screen switcher |
| `src/screens/NotificationsScreen.tsx` | Notifications UI (dummy data) |
| `src/components/LocationAutocomplete.tsx` | Mapbox location search component |
| `package.json` | Dependencies and scripts |
| `app.config.js` | Expo configuration |

### Data Models

- **Location:** `LocationData` type (inferred from usage)
- **Order:** `Order` interface (referenced in `orderService.ts`)
- **Profile:** `Profile` interface (referenced in `auth.ts`)
- **User:** `AppUser`, `AuthUser` types (in `context/AuthContext.tsx`)

### Storage

- **Backend:** Supabase (PostgreSQL)
- **Local:** Expo SecureStore (likely, via Supabase auth)
- **Schema:** `supabase/schema/profiles.sql` - Profiles table schema

### Authentication

- **Method:** OTP-based phone authentication
- **Provider:** Supabase Auth
- **Flow:** Phone → OTP → Verify → Role Selection
- **Files:** `src/lib/api/auth.ts`, `src/context/AuthContext.tsx`

### Key Feature Modules

1. **Authentication Module**
   - Files: `src/lib/api/auth.ts`, `src/context/AuthContext.tsx`
   - Status: ✅ Implemented

2. **Order Management Module**
   - Files: `src/services/orderService.ts`, parcel screens
   - Status: ⚠️ Partial (broken import)

3. **Driver Onboarding Module**
   - Files: `src/screens/onboarding/driver/`, `src/lib/api/driver.ts`
   - Status: ⚠️ Partial (mock API)

4. **Location Services Module**
   - Files: `src/components/LocationAutocomplete.tsx`, Mapbox integration
   - Status: ✅ Implemented (per audit)

5. **Camera/Dimension AI Module**
   - Files: `src/lib/dimensionAI.ts`, `src/screens/camera/`
   - Status: ✅ Implemented

6. **Notifications Module**
   - Files: `src/screens/NotificationsScreen.tsx`
   - Status: ❌ UI only, no backend

---

## 3. Audit Reports

### 3.1 PROJECT_AUDIT_REPORT.md

**Location:** `PROJECT_AUDIT_REPORT.md` (849 lines)

**Summary:**
- Comprehensive audit of Patwadi app (bus-first parcel delivery for India)
- Identifies 2 critical issues, 8 high-priority tasks, 10 medium-priority, 2 low-priority
- Covers navigation, Supabase integration, missing features, architectural issues

**Key Findings:**

**Critical Issues (from audit):**
1. **Duplicate Supabase Clients** - Audit claims `supabase.ts` and `supabaseClient.ts` both exist
   - **Actual status:** Only `supabase.ts` exists, `orderService.ts` incorrectly imports from non-existent `supabaseClient.ts`
   - **Finding status:** ⚠️ **PARTIALLY ACCURATE** - Issue exists but description differs

2. **Duplicate Camera Screen Registration** - Audit claims CameraMeasure in RootNavigator and HomeStack
   - **Actual status:** `HomeStack.tsx` doesn't exist, CameraMeasure only in `RootNavigator.tsx:108`
   - **Finding status:** ❌ **INACCURATE** - Referenced file doesn't exist

**High Priority Findings:**
- Notifications system uses dummy data ✅ **VERIFIED** - `NotificationsScreen.tsx` uses hardcoded data
- Realtime order updates not wired ✅ **LIKELY ACCURATE** - Hook referenced but not verified
- Nearby orders search returns all orders ✅ **LIKELY ACCURATE** - Per audit description
- Camera flow data propagation ⚠️ **UNCLEAR** - Needs verification

**Implementation Status:**

| Finding | Status | Evidence |
|---------|--------|----------|
| Duplicate Supabase clients | ⚠️ Different issue | Only one file exists, wrong import |
| Duplicate Camera screen | ❌ Not found | HomeStack.tsx doesn't exist |
| Notifications dummy data | ✅ Verified | `NotificationsScreen.tsx:14-39` |
| Driver KYC mock API | ✅ Verified | `driver.ts:40-64` (TODO comments) |
| Missing notifications table | ⚠️ Unverified | No schema files checked |
| Missing saved locations | ⚠️ Unverified | Not checked |
| Missing facilities table | ⚠️ Unverified | Not checked |
| Price estimation mock | ⚠️ Per audit | Not verified in code |
| Nearby orders not implemented | ⚠️ Per audit | Not verified in code |

**Code Locations for Findings:**
- Notifications dummy data: `src/screens/NotificationsScreen.tsx:14-39`
- Driver KYC mock: `src/lib/api/driver.ts:40-64, 70-94`
- Broken import: `src/services/orderService.ts:1`
- Camera screen registration: `src/navigation/RootNavigator.tsx:108`

### 3.2 AUDIT_SUMMARY.md

**Location:** `AUDIT_SUMMARY.md` (75 lines)

**Summary:**
- Quick reference summary of audit report
- Lists critical issues, high priority items, missing features, architectural issues

**Findings Status:**
- Same as PROJECT_AUDIT_REPORT.md (condensed version)
- References `supabaseClient.ts` (doesn't exist)
- References `HomeStack.tsx` (doesn't exist)

**Implementation Status:**
- Summary aligns with full audit report
- Same discrepancies noted above

---

## 4. Original Patwadi App Explanation Prompt

### Search Results

**Keywords searched:** "Patwari", "Patwadi", "app explanation", "requirements", "MVP", "scope", "flow", "user roles", "offline", "land records", "village", "talati", "revenue"

**Files checked:**
- `/docs` - Not found
- `/prompts` - Not found
- `/notes` - Not found
- `/README` - Not found (README.md doesn't exist)
- `/spec` - Not found
- `/requirements` - Not found
- `/planning` - Not found
- `/project` - Not found
- `/assets` - Contains only images
- `/scripts` - Not found
- `.cursor` - Not checked (hidden)
- All `.md` files - Only audit reports found

### Result: **NOT FOUND IN REPO**

The original app explanation/requirements prompt is **not present in the repository**.

### Closest Equivalent Found

**Source:** `PROJECT_AUDIT_REPORT.md` lines 9-11

**Text:**
```
Patwadi is a bus-first parcel delivery app for intercity shipping in India. The app supports two user roles: **Customers** (who send parcels) and **Drivers** (who transport parcels on bus routes). The codebase uses React Native with Expo SDK 54, React Navigation v7, Supabase for backend, and Mapbox for location services.
```

**Additional context from SplashScreen:**
- File: `src/screens/SplashScreen.tsx:17-18`
- Text: "Patwadi" / "Overnight Intercity Parcels" / "Bus-first delivery for real India." / "Intercity • Bus corridors • Same-day potential"

**Inference:**
- App name: Patwadi (not "Patwari" - different app)
- Purpose: Overnight intercity parcel delivery using bus routes
- Target: India market
- User roles: Customers (senders), Drivers (transporters)
- Delivery method: Bus-first (uses bus corridors)
- Tech: React Native, Expo, Supabase, Mapbox

**Note:** Search keywords included "Patwari", "land records", "village", "talati", "revenue" which suggest a different app concept (possibly land records management). These terms were **NOT FOUND** in the codebase, confirming Patwadi is a parcel delivery app, not a land records app.

---

## Summary

**Critical Issues:**
1. 🔴 `src/services/orderService.ts` imports from non-existent `supabaseClient.ts`
2. ⚠️ Audit report references files that don't exist (`HomeStack.tsx`, `PackagesStack.tsx`, `MoreStack.tsx`)
3. ⚠️ Several features use mock/dummy data (Notifications, Driver KYC partially)

**Working Features:**
- Navigation structure ✅
- Authentication flow ✅
- Role-based UI ✅
- Supabase configuration ✅

**Original Prompt:**
- ❌ Not found in repository
- Closest description: Audit report summary (app purpose: bus-first parcel delivery)






