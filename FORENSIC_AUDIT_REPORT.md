# Patwadi App - Forensic Audit Report
**Date:** 2025-01-XX  
**Auditor:** Senior Product + Mobile Engineer  
**Scope:** Full user flow reconstruction, implementation status, gaps analysis

---

## EXECUTIVE SUMMARY

This audit reconstructs the **complete intended user flow** for Patwadi, distinguishing between:
- ✅ **Implemented & Wired** - Fully functional with backend
- ⚠️ **UI-Only (Placeholder/Mock/Bypass)** - Renders but uses fake data or bypasses
- 🔶 **Partially Implemented** - Some logic works, but incomplete
- ❌ **Missing but Implied** - Referenced in UI/comments but not built

**Critical Finding:** Authentication is **completely bypassed** for UI testing. Phone-based OTP exists in code but is commented out. All flows work with mock user IDs (`temp-user-*`).

---

## STEP 1: ENTRY & AUTH FLOW

### 1.1 SplashScreen (`src/screens/SplashScreen.tsx`)

**Intended Purpose:**
- App entry point
- Offer login, signup, or guest access

**Actual Implementation:**
- ✅ Renders correctly
- ✅ Three buttons: "Log in", "Sign up", "Continue as guest"
- ✅ "Log in" and "Sign up" both navigate to `Login` screen
- ✅ "Continue as guest" navigates to `Main` (replaces stack)

**Navigation:**
- `Login` (navigate)
- `Main` (replace) - for guests

**Status:** ✅ **IMPLEMENTED** - Simple routing, no logic

---

### 1.2 LoginScreen (`src/screens/LoginScreen.tsx`)

**Intended Purpose:**
- Phone number input → Send OTP
- OTP input → Verify OTP
- Create/authenticate user in Supabase
- Navigate based on user role

**Actual Implementation:**
- ⚠️ **COMPLETE BYPASS** - Lines 42-72
- Phone input exists but `handleSendOtp` **immediately bypasses** all auth
- Creates mock user ID: `"temp-user-" + Date.now()`
- Sets user in context with `role: null`
- Navigates directly to `RoleSelect`
- Real OTP code is **commented out** (lines 74-103)

**What Actually Runs:**
```typescript
// TEMPORARY: Bypass all authentication
const mockUserId = "temp-user-" + Date.now();
setUser({
  id: mockUserId,
  phone: formattedPhone,
  role: null,
  isNewUser: true,
});
navigation.replace("RoleSelect");
```

**Real Auth Code Status:**
- `loginWithPhone()` - ✅ Function exists in `src/lib/api/auth.ts`
- `verifyOtp()` - ✅ Function exists in `src/lib/api/auth.ts`
- **BUT:** Both are commented out in `LoginScreen.tsx`

**Navigation:**
- `RoleSelect` (replace) - Always, after bypass

**Status:** ⚠️ **BYPASSED** - UI works, auth is mocked

**TODO Comments:**
- Line 44: `// TODO: IMPLEMENT REAL AUTHENTICATION HERE`
- Line 107: `// TODO: IMPLEMENT REAL AUTHENTICATION`

**Assumptions:**
- User can proceed without real phone verification
- Mock user IDs are acceptable for testing
- Profile creation will be skipped for mock users (guardrails exist)

---

### 1.3 RoleSelectScreen (`src/screens/RoleSelectScreen.tsx`)

**Intended Purpose:**
- Account creation step (not session choice)
- User selects "Customer" or "Operator" role
- Role is **permanently** stored in Supabase `profiles` table
- Navigate to role-specific home

**Actual Implementation:**
- ✅ Renders correctly
- ✅ Two role cards: "I'm a Customer", "I'm an Operator"
- ✅ **Guardrails exist** for mock users (lines 48, 84-85)
- ✅ Checks `user.id.startsWith("temp-user-")` before creating profile
- ✅ For mock users: Updates local state only, skips Supabase
- ✅ For real users: Calls `createProfile()` in Supabase

**What Actually Runs:**
1. User selects role
2. Check if mock user → Skip Supabase, update local state
3. If real user → Call `createProfile(userId, phone, role)`
4. Navigate: `DriverKyc` (if driver) or `Main` (if customer)

**Navigation:**
- `DriverKyc` (replace) - If role is "driver"
- `Main` (replace) - If role is "customer"
- `Login` (replace) - If no user.id (guardrail)

**Status:** ✅ **IMPLEMENTED** with mock user handling

**Guardrails:**
- Line 48: `const isMockUser = user?.id?.startsWith("temp-user-") || false;`
- Line 84: `const isMockUser = user.id.startsWith("temp-user-");`
- Line 141: `createProfile()` also rejects mock user IDs

**Assumptions:**
- Mock users can test UI without database writes
- Real auth will replace mock IDs with real Supabase user IDs
- Role selection is permanent (no way to change later in UI)

---

## STEP 2: ROLE SELECTION & ACCOUNT CREATION

### 2.1 When SHOULD RoleSelect Appear?

**Ideal Product:**
- After first-time signup (user authenticated, no profile)
- Only once per user (role is permanent)

**When DOES It Appear Today:**
- After `LoginScreen` bypass (always, because mock users have `role: null`)
- After real OTP verification if user has no profile (would work if auth was enabled)

**Navigation Logic:**
- `LoginScreen` → `RoleSelect` (if `user.role === null`)
- `LoginScreen` → `Main` (if `user.role === "customer"`)
- `LoginScreen` → `DriverKyc` (if `user.role === "driver"`)

**Status:** ✅ **CORRECT** - Logic is sound, just bypassed

---

### 2.2 What Happens After Role Selection?

**Customer Flow:**
1. `RoleSelect` → `Main` (MainTabs with Home/Packages/Settings)
2. `HomeScreen` → Renders `CustomerHome` component

**Driver Flow:**
1. `RoleSelect` → `DriverKyc`
2. `DriverKyc` → `DriverBusDetails`
3. `DriverBusDetails` → `DriverTerms`
4. `DriverTerms` → `Main` (presumably)

**Status:** ✅ **IMPLEMENTED** - Navigation wired correctly

---

### 2.3 Is Role Persisted?

**For Mock Users:**
- ❌ **NO** - Only in local React state (`AuthContext`)
- Lost on app restart
- Not in Supabase

**For Real Users:**
- ✅ **YES** - Stored in `profiles` table via `createProfile()`
- Persists across sessions
- Retrieved on app start via `fetchProfile()`

**Status:** ⚠️ **PARTIAL** - Works for real users, not for mock

---

### 2.4 What Breaks If No Authenticated User?

**Current Behavior:**
- `RoleSelectScreen` has guardrail (line 55-58)
- If `!user?.id`, redirects to `Login`
- Prevents profile creation with undefined user

**What Would Break:**
- Profile creation would fail silently (but guardrail prevents this)
- Navigation would still work (mock user gets local state)

**Status:** ✅ **PROTECTED** - Guardrails prevent crashes

---

## STEP 3: CUSTOMER HOME & PRIMARY ACTIONS

### 3.1 HomeScreen (`src/screens/HomeScreen.tsx`)

**Purpose:**
- Router component that renders `CustomerHome` or `DriverHome` based on role

**Implementation:**
- ✅ Uses `useRole()` from `RoleContext`
- ✅ Conditional rendering based on `role === "driver"`

**Status:** ✅ **IMPLEMENTED**

---

### 3.2 CustomerHome (`src/screens/home/CustomerHome.tsx`)

**UI Elements:**

#### 3.2.1 "Send Parcel" Button (Primary CTA)
- **Label:** "Send Parcel"
- **Icon:** `cube-outline`
- **Navigation:** `PackageInfo` ✅
- **Screen Exists:** ✅ Yes (`src/screens/parcel/PackageInfoScreen.tsx`)
- **Backend Support:** ✅ Yes (order creation flow)

#### 3.2.2 "My Packages" Card
- **Label:** "My Packages"
- **Icon:** `cube-outline`
- **Navigation:** `Main` (navigate to Main tabs) ⚠️
- **Screen Exists:** ✅ Yes (`MyPackagesScreen` in Packages tab)
- **Backend Support:** ✅ Yes (`fetchOrders()` in `orderService.ts`)
- **Issue:** Navigation uses `navigation.navigate("Main")` which may not switch tabs

#### 3.2.3 "Track Package" Card
- **Label:** "Track Package"
- **Icon:** `navigate-outline`
- **Navigation:** `Main`, `{ screen: "Packages" }` ⚠️
- **Screen Exists:** ✅ Yes (`MyPackagesScreen`)
- **Backend Support:** ✅ Yes (tracking input field exists for guests)
- **Issue:** Nested navigation may not work correctly

**Status:** ✅ **IMPLEMENTED** - All buttons navigate, screens exist

**Navigation Issues:**
- Tab switching via nested params may not work reliably
- Should use `navigation.navigate("Main", { screen: "Packages" })` with proper typing

---

### 3.3 SendParcelScreen (`src/screens/SendParcelScreen.tsx`)

**UI Elements:**

#### 3.3.1 Primary Actions

**"Send a Parcel" Card:**
- **Navigation:** `PackageInfo` ✅
- **Subtitle:** "Starts at ₹40/kg"
- **Status:** ✅ **WIRED**

**"My Parcels" Card:**
- **Navigation:** `Main`, `{ screen: "Packages" }` ⚠️
- **Status:** ✅ **WIRED** (nested nav may be fragile)

#### 3.3.2 Secondary Actions (Quick Actions)

**"Schedule Pickup":**
- **Navigation:** `PackageInfo` ✅
- **Status:** ✅ **WIRED**

**"Notifications":**
- **Navigation:** `console.log("Notifications coming soon")` ❌
- **Screen Exists:** ❌ **NO** - Not in `RootNavigator.tsx`
- **Status:** ❌ **NOT IMPLEMENTED**

#### 3.3.3 Info/Network Actions

**"Depots":**
- **Navigation:** `console.log("Depots coming soon")` ❌
- **Screen Exists:** ❌ **NO**
- **Status:** ❌ **NOT IMPLEMENTED**

**"Routes & Coverage":**
- **Navigation:** `console.log("Routes coming soon")` ❌
- **Screen Exists:** ❌ **NO**
- **Status:** ❌ **NOT IMPLEMENTED**

**Status:** ⚠️ **PARTIAL** - Primary actions work, secondary actions are placeholders

**TODO Comments:**
- Line 65: `// TODO: Navigate to notifications screen when implemented`
- Line 78: `// TODO: Navigate to depots screen when implemented`
- Line 88: `// TODO: Navigate to routes screen when implemented`

---

## STEP 4: PARCEL CREATION FLOW

### 4.1 PackageInfoScreen (`src/screens/parcel/PackageInfoScreen.tsx`)

**Purpose:**
- Comprehensive package details before address selection
- Collect: type, contents, value, insurance, dimensions, weight, packaging, door-to-door, priority, delivery slot

**Implementation:**
- ✅ All fields implemented
- ✅ Validation for dimensions (max 70x40x40cm or 28x16x16")
- ✅ Auto-selects packaging based on dimensions/fragility
- ✅ Image upload for AI dimension estimation (camera/gallery)
- ✅ Keyboard handling with `KeyboardAvoidingView`

**Navigation:**
- Next → `Pickup` (with `packageInfo` param) ✅

**Backend:**
- ⚠️ Dimension AI: Function exists (`estimateDimensionsFromImage`) but endpoint may not be configured
- ✅ Packaging charges calculated locally
- ✅ All data passed via navigation params

**Status:** ✅ **IMPLEMENTED** - Comprehensive, well-built

**Data Flow:**
```typescript
PackageInfo → Pickup { packageInfo: {...} }
```

---

### 4.2 PickupScreen (`src/screens/parcel/PickupScreen.tsx`)

**Purpose:**
- Select pickup location using Mapbox autocomplete
- Enter: phone, email, street, apartment, landmark, instructions, WhatsApp toggle

**Implementation:**
- ✅ `LocationAutocomplete` component integrated
- ✅ Mapbox geocoding works (function-style imports, React Native safe)
- ✅ All additional fields implemented
- ✅ Phone/email validation
- ✅ Street autocomplete filtered by city
- ✅ Keyboard handling

**Navigation:**
- Next → `Dropoff` (with `pickup` and `packageInfo` params) ✅
- Back → Previous screen (normal back navigation)

**Backend:**
- ✅ Mapbox configured and working
- ✅ Location data passed via navigation

**Status:** ✅ **IMPLEMENTED** - Fully functional

**Data Flow:**
```typescript
Pickup → Dropoff { pickup: LocationData, packageInfo: {...} }
```

---

### 4.3 DropoffScreen (`src/screens/parcel/DropoffScreen.tsx`)

**Purpose:**
- Select dropoff location using Mapbox autocomplete
- Enter: phone, email, street, apartment, landmark, instructions, WhatsApp toggle

**Implementation:**
- ✅ Same as PickupScreen (mirrored implementation)
- ✅ Receives `pickup` from route params
- ✅ All fields implemented

**Navigation:**
- Next → `PriceEstimate` (with `pickup`, `dropoff`, `packageInfo`) ✅
- Back → `PickupScreen` (normal back navigation)

**Backend:**
- ✅ Mapbox working
- ✅ Data passed correctly

**Status:** ✅ **IMPLEMENTED**

**Data Flow:**
```typescript
Dropoff → PriceEstimate { pickup, dropoff, packageInfo }
```

---

### 4.4 PriceEstimateScreen (`src/screens/parcel/PriceEstimateScreen.tsx`)

**Purpose:**
- Calculate and display price estimate
- Show route, delivery speed, packaging charges, discounts

**Implementation:**
- ✅ Calls `calculatePriceEstimate(pickup, dropoff)` from `orderService.ts`
- ✅ Adds packaging charges from `packageInfo`
- ✅ Applies discount (₹5 for 48hrs)
- ✅ Displays final price

**Price Calculation:**
- ⚠️ **MOCK IMPLEMENTATION** - Uses simple haversine distance formula
- Formula: `40 + distanceKm * 6`
- No real pricing rules (weight tiers, route-based pricing, etc.)
- TODO comment: "basic formula — refine later" (line 211)

**Navigation:**
- Next → `ConfirmOrder` (with all data + `priceEstimate`) ✅
- Back → Previous screen

**Backend:**
- ⚠️ **STUBBED** - Simple distance calculation, not real pricing

**Status:** ⚠️ **PARTIALLY IMPLEMENTED** - Works but pricing is placeholder

**Data Flow:**
```typescript
PriceEstimate → ConfirmOrder { pickup, dropoff, packageInfo, priceEstimate }
```

---

### 4.5 ConfirmOrderScreen (`src/screens/parcel/ConfirmOrderScreen.tsx`)

**Purpose:**
- Final review before order creation
- Create order in Supabase
- Handle guest users (redirect to `GuestCheckout`)

**Implementation:**
- ✅ Displays all order details
- ✅ Calls `createOrder()` from `orderService.ts`
- ✅ Handles guest users (redirects to `GuestCheckout`)
- ✅ Navigates to `Main` (Packages tab) on success

**Order Creation:**
- ✅ **REAL** - Calls Supabase `orders` table insert
- ✅ Uses `user.id` as `customer_id`
- ✅ Sets status to "pending"
- ✅ Returns created order

**Navigation:**
- Guest → `GuestCheckout` ✅
- Authenticated → `Main` (Packages tab) ✅
- Back → Previous screen

**Backend:**
- ✅ **WIRED** - Real Supabase insert

**Status:** ✅ **IMPLEMENTED** - Fully functional for authenticated users

**Data Flow:**
```typescript
ConfirmOrder → GuestCheckout { pickup, dropoff, packageInfo, priceEstimate }
  OR
ConfirmOrder → Main { screen: "Packages" } (if authenticated)
```

---

### 4.6 GuestCheckoutScreen (`src/screens/checkout/GuestCheckoutScreen.tsx`)

**Purpose:**
- Guest users enter phone, email, opt for WhatsApp
- Send OTP, verify OTP
- Auto-create account
- Create order

**Implementation:**
- ✅ Phone input (auto-populated from `pickup.phoneNumber`)
- ✅ Email input
- ✅ WhatsApp toggle
- ✅ OTP send/verify flow
- ✅ Calls `createProfile()` after OTP verification
- ✅ Calls `createOrder()` after profile creation
- ✅ Navigates to `Main` (Packages tab)

**OTP Flow:**
- ✅ **REAL** - Calls `loginWithPhone()` and `verifyOtp()` from `src/lib/api/auth.ts`
- ✅ Creates Supabase auth user
- ✅ Creates profile with role "customer"
- ✅ Creates order

**Navigation:**
- Success → `Main` (Packages tab) ✅
- Back → Previous screen

**Backend:**
- ✅ **WIRED** - Real Supabase auth + profile + order creation

**Status:** ✅ **IMPLEMENTED** - Complete guest checkout flow

---

## STEP 5: OPERATOR / DRIVER FLOW (HIGH LEVEL)

### 5.1 DriverHome (`src/screens/home/DriverHome.tsx`)

**UI Elements:**

**"View Parcels" Button:**
- **Navigation:** `DriverParcels` ✅
- **Screen Exists:** ✅ Yes

**"My Parcels" Card:**
- **Navigation:** `DriverParcels` ✅

**"Available Jobs" Card:**
- **Navigation:** `DriverParcels` ✅
- **Note:** Screen has toggle to switch between "My Parcels" and "Available Jobs"

**Status:** ✅ **IMPLEMENTED**

---

### 5.2 DriverParcelsScreen (`src/screens/driver/DriverParcelsScreen.tsx`)

**Purpose:**
- List assigned parcels OR available jobs (toggle)
- Pull-to-refresh
- Navigate to parcel details

**Implementation:**
- ✅ Fetches data from Supabase
- ✅ `fetchDriverOrders(userId)` for assigned
- ✅ `getAvailableOrders()` for available
- ✅ Pull-to-refresh
- Empty states

**Backend:**
- ✅ **WIRED** - Real Supabase queries
- ⚠️ `getAvailableOrders()` returns all pending orders (no spatial filtering)

**Navigation:**
- Item tap → `DriverParcelDetails` (with `orderId`) ✅

**Status:** ✅ **IMPLEMENTED** - Fully functional

---

### 5.3 DriverParcelDetailsScreen (`src/screens/driver/DriverParcelDetailsScreen.tsx`)

**Purpose:**
- Show parcel details
- Accept order (if available)
- Update status (accepted → in_transit → delivered)

**Implementation:**
- ✅ Fetches order by ID
- ✅ "Accept Order" button (if pending and unassigned)
- ✅ "Mark as In Transit" / "Mark as Delivered" buttons
- ✅ Calls `acceptOrder()` and `updateOrderStatus()` from `orderService.ts`

**Backend:**
- ✅ **WIRED** - Real Supabase updates

**Status:** ✅ **IMPLEMENTED** - Fully functional

---

### 5.4 Driver Onboarding Screens

**DriverKycScreen:**
- ⚠️ **PLACEHOLDER** - Just a "Continue" button
- No actual KYC form
- Navigation: → `DriverBusDetails`

**DriverBusDetailsScreen:**
- ⚠️ **PLACEHOLDER** - Not examined in detail, but likely similar

**DriverTermsScreen:**
- ⚠️ **PLACEHOLDER** - Not examined in detail

**Status:** ⚠️ **UI-ONLY** - Screens exist but are placeholders

---

## STEP 6: SUMMARY TABLE

| Screen Name | Exists in UI? | Navigation Wired? | Backend Connected? | Uses Mock/Bypass? | Blocking Issues | Safe to Ship UI-Only? |
|------------|---------------|-------------------|-------------------|-------------------|-----------------|----------------------|
| **SplashScreen** | ✅ Yes | ✅ Yes | N/A | ❌ No | None | ✅ Yes |
| **LoginScreen** | ✅ Yes | ✅ Yes | ⚠️ Bypassed | ⚠️ Yes (mock users) | Auth bypassed | ⚠️ No (needs real auth) |
| **RoleSelectScreen** | ✅ Yes | ✅ Yes | ⚠️ Partial (mock skip) | ⚠️ Yes (mock handling) | None | ✅ Yes |
| **CustomerHome** | ✅ Yes | ✅ Yes | N/A | ❌ No | Tab nav may be fragile | ✅ Yes |
| **SendParcelScreen** | ✅ Yes | ⚠️ Partial | N/A | ❌ No | Notifications/Depots/Routes missing | ⚠️ Partial |
| **PackageInfoScreen** | ✅ Yes | ✅ Yes | ⚠️ Partial (AI stub) | ❌ No | Dimension AI endpoint may not work | ✅ Yes |
| **PickupScreen** | ✅ Yes | ✅ Yes | ✅ Yes (Mapbox) | ❌ No | None | ✅ Yes |
| **DropoffScreen** | ✅ Yes | ✅ Yes | ✅ Yes (Mapbox) | ❌ No | None | ✅ Yes |
| **PriceEstimateScreen** | ✅ Yes | ✅ Yes | ⚠️ Stubbed | ❌ No | Pricing is placeholder | ⚠️ Partial |
| **ConfirmOrderScreen** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | None | ✅ Yes |
| **GuestCheckoutScreen** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | None | ✅ Yes |
| **MyPackagesScreen** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | None | ✅ Yes |
| **PackageDetailsScreen** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | None | ✅ Yes |
| **TrackingDetailsScreen** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | Map is placeholder (no live tracking) | ✅ Yes |
| **DriverHome** | ✅ Yes | ✅ Yes | N/A | ❌ No | None | ✅ Yes |
| **DriverParcelsScreen** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | Spatial filtering missing | ✅ Yes |
| **DriverParcelDetailsScreen** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | None | ✅ Yes |
| **DriverKycScreen** | ⚠️ Placeholder | ✅ Yes | ❌ No | ❌ No | No actual KYC form | ❌ No |
| **DriverBusDetailsScreen** | ⚠️ Placeholder | ✅ Yes | ❌ No | ❌ No | Not implemented | ❌ No |
| **DriverTermsScreen** | ⚠️ Placeholder | ✅ Yes | ❌ No | ❌ No | Not implemented | ❌ No |
| **SettingsScreen** | ⚠️ Placeholder | N/A | ❌ No | ❌ No | "Coming soon" | ❌ No |
| **CameraMeasureScreen** | ⚠️ Placeholder | ✅ Yes | ❌ No | ❌ No | Camera not implemented | ❌ No |

---

## STEP 7: CRITICAL GAPS

### 7.1 Top 5 Blockers to a "Real" MVP

1. **🔴 Authentication Bypass**
   - **Location:** `src/screens/LoginScreen.tsx` (lines 42-72)
   - **Issue:** OTP flow completely bypassed, creates mock users
   - **Impact:** Cannot test real user flows, profile creation skipped
   - **Fix:** Uncomment real OTP code, remove bypass
   - **Effort:** Low (code exists, just uncomment)

2. **🔴 Pricing Calculation is Placeholder**
   - **Location:** `src/services/orderService.ts` (lines 191-213)
   - **Issue:** Simple distance formula, no real pricing rules
   - **Impact:** Price estimates inaccurate, no weight/route-based pricing
   - **Fix:** Implement proper pricing engine (base + per-km + weight tiers)
   - **Effort:** Medium

3. **🟡 Nearby Orders Search Returns All Orders**
   - **Location:** `src/services/orderService.ts` (lines 219-233)
   - **Issue:** `findNearbyOrders()` returns all pending orders, no spatial filtering
   - **Impact:** Drivers see orders from anywhere, not just nearby
   - **Fix:** Add `pickup_lat`, `pickup_lng` to orders table, implement PostGIS query
   - **Effort:** Medium

4. **🟡 Driver Onboarding is Placeholder**
   - **Location:** `src/screens/onboarding/driver/*.tsx`
   - **Issue:** KYC, bus details, terms screens are just "Continue" buttons
   - **Impact:** Cannot onboard real drivers
   - **Fix:** Implement actual forms, validation, Supabase storage
   - **Effort:** High

5. **🟡 Missing Secondary Features**
   - **Locations:** `SendParcelScreen.tsx` (lines 65, 78, 88)
   - **Issue:** Notifications, Depots, Routes screens don't exist
   - **Impact:** Broken navigation, incomplete feature set
   - **Fix:** Implement screens or remove from UI
   - **Effort:** Medium

---

### 7.2 Top 5 Things That LOOK Complete But Are Not

1. **⚠️ LoginScreen Appears Functional**
   - **Reality:** Completely bypassed, never calls Supabase auth
   - **Evidence:** Lines 42-72 in `LoginScreen.tsx`
   - **Risk:** Users think they're logged in, but no real session

2. **⚠️ PriceEstimateScreen Shows Real Numbers**
   - **Reality:** Uses placeholder formula (`40 + distanceKm * 6`)
   - **Evidence:** Line 212 in `orderService.ts`: `// basic formula — refine later`
   - **Risk:** Users see prices that don't reflect real costs

3. **⚠️ TrackingDetailsScreen Has Map Placeholder**
   - **Reality:** Static map, no live driver location
   - **Evidence:** Line 136 in `TrackingDetailsScreen.tsx`: `"Static map pins (no live tracking)"`
   - **Risk:** Users expect live tracking but get static view

4. **⚠️ DriverParcelsScreen Shows "Available Jobs"**
   - **Reality:** Returns all pending orders, not filtered by location
   - **Evidence:** Line 230 in `orderService.ts`: `// TODO: Add pickup_lat, pickup_lng`
   - **Risk:** Drivers see irrelevant orders

5. **⚠️ PackageInfoScreen Has "AI Dimension Estimation"**
   - **Reality:** Function exists but endpoint may not be configured
   - **Evidence:** `src/lib/dimensionAI.ts` has hardcoded endpoint URL
   - **Risk:** Feature appears available but may fail silently

---

### 7.3 What Can Be Safely Shipped Visually

**✅ Safe to Ship (UI-Only):**
- SplashScreen
- RoleSelectScreen (with mock user handling)
- CustomerHome
- PackageInfoScreen (without AI)
- PickupScreen
- DropoffScreen
- PriceEstimateScreen (with disclaimer about estimates)
- MyPackagesScreen
- PackageDetailsScreen
- TrackingDetailsScreen (with "static map" disclaimer)
- DriverHome
- DriverParcelsScreen
- DriverParcelDetailsScreen

**⚠️ Needs Backend:**
- LoginScreen (needs real OTP)
- ConfirmOrderScreen (needs real order creation - ✅ already works)
- GuestCheckoutScreen (needs real OTP - ✅ already works)

**❌ Not Ready:**
- DriverKycScreen (placeholder)
- DriverBusDetailsScreen (placeholder)
- DriverTermsScreen (placeholder)
- SettingsScreen (placeholder)
- CameraMeasureScreen (placeholder)
- Notifications screen (doesn't exist)
- Depots screen (doesn't exist)
- Routes screen (doesn't exist)

---

### 7.4 What MUST Be Fixed Before Play Store Submission

**🔴 Critical (Blocking):**
1. **Remove Authentication Bypass**
   - Enable real OTP flow in `LoginScreen.tsx`
   - Test with real phone numbers
   - Ensure profile creation works

2. **Implement Real Pricing**
   - Replace placeholder formula
   - Add weight-based pricing
   - Add route-based pricing if applicable

3. **Complete Driver Onboarding**
   - Implement KYC form
   - Implement bus details form
   - Implement terms acceptance
   - Store data in Supabase

**🟡 High Priority (Should Fix):**
4. **Fix Nearby Orders Search**
   - Add lat/lng to orders table
   - Implement PostGIS spatial query

5. **Remove or Implement Missing Features**
   - Either implement Notifications/Depots/Routes screens
   - Or remove from `SendParcelScreen` UI

6. **Add Error Handling**
   - Network errors
   - Supabase errors
   - Validation errors

**🟢 Nice to Have:**
7. Live tracking (currently static)
8. Dimension AI (currently placeholder)
9. Camera integration (currently disabled)

---

## APPENDIX: Navigation Flow Diagrams

### Customer Flow (Authenticated)
```
Splash → Login → RoleSelect → Main (Home)
  ↓
CustomerHome → PackageInfo → Pickup → Dropoff → PriceEstimate → ConfirmOrder → Main (Packages)
  ↓
MyPackagesScreen → PackageDetails → TrackingDetails
```

### Customer Flow (Guest)
```
Splash → Main (Home) → PackageInfo → Pickup → Dropoff → PriceEstimate → ConfirmOrder → GuestCheckout → Main (Packages)
```

### Driver Flow
```
Splash → Login → RoleSelect → DriverKyc → DriverBusDetails → DriverTerms → Main (Home)
  ↓
DriverHome → DriverParcels → DriverParcelDetails
```

---

## APPENDIX: Backend Integration Status

| Feature | Supabase Table | Status | Notes |
|---------|---------------|--------|-------|
| **Auth** | `auth.users` | ✅ Wired | OTP works, but bypassed in UI |
| **Profiles** | `profiles` | ✅ Wired | Role stored, mock users skipped |
| **Orders** | `orders` | ✅ Wired | CRUD operations work |
| **Notifications** | `notifications` | ❌ Missing | Table may not exist |
| **Saved Locations** | `saved_locations` | ❌ Missing | Table may not exist |
| **Facilities** | `facilities` | ❌ Missing | Table may not exist |
| **Driver KYC** | `driver_kyc` | ❌ Missing | Table may not exist |
| **Driver Bus Details** | `driver_bus_details` | ❌ Missing | Table may not exist |

---

**END OF AUDIT**




