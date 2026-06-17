# Patwadi App - Product Direction & Workflow Analysis

**Date:** 2024  
**Purpose:** Infer intended product direction and workflows from codebase evidence

---

## 1. Intended User Workflows (Pre-Traction Loss)

### Customer Journey: App Open → Parcel Creation → Pricing → Confirmation → Tracking → Delivery

#### Step 1: App Open & Authentication
**Entrypoint:** `App.tsx` → `SplashScreen` → `LoginScreen`
- **Implemented:** ✅ OTP-based phone authentication via Supabase (`src/lib/api/auth.ts`)
- **Stubbed:** None
- **Missing but implied:** Guest browsing capability (SplashScreen has "Continue as guest" button)

#### Step 2: Role Selection
**Entrypoint:** `RoleSelectScreen`
- **Implemented:** ✅ Role selection UI (Customer/Driver)
- **Stubbed:** None
- **Missing but implied:** Profile completion after role selection

#### Step 3: Home Screen
**Entrypoint:** `HomeScreen` → `CustomerHome` (role-based)
- **Implemented:** ✅ Role-based rendering
- **Stubbed:** `CustomerHome` component (file not found, directory empty)
- **Missing but implied:** Customer home should show "Send Parcel" action, order history, active orders

#### Step 4: Send Parcel Flow
**Entrypoint:** `SendParcelScreen` → `PickupScreen` → `DropoffScreen` → `ParcelDetailsScreen`
- **Implemented:** ✅
  - Navigation flow exists (`src/navigation/RootNavigator.tsx:100-103`)
  - `PickupScreen` has full UI with LocationAutocomplete (Mapbox integration)
  - Progress indicator shows "Step 1 of 4" (implies 4-step flow)
- **Stubbed:** 
  - `DropoffScreen.tsx:25` - Shows placeholder "📍 Location picker coming soon"
  - `PickupScreen` passes data via navigation params, but `DropoffScreen` doesn't use it
- **Missing but implied:** 
  - Dropoff location picker implementation
  - Facility/depot selection (mentioned in audit: `FacilitySelectionScreen`)
  - Saved locations integration (audit mentions `SavedLocationsScreen`)

#### Step 5: Parcel Details Entry
**Entrypoint:** `ParcelDetailsScreen`
- **Implemented:** ✅
  - Weight input
  - Dimensions input (L, W, H)
  - Contents description
  - Camera integration for dimension estimation (`src/lib/dimensionAI.ts`)
  - Auto-estimation when image captured (lines 38-56)
- **Stubbed:** None (fully functional)
- **Missing but implied:** Dimension validation rules, weight limits

#### Step 6: Price Estimation
**Entrypoint:** `PriceEstimateScreen`
- **Implemented:** ✅ UI structure
- **Stubbed:** 
  - `PriceEstimateScreen.tsx:14-17` - Uses static values: "₹199 - ₹249", "Overnight on bus corridor", "Delhi → Jaipur (example)"
  - Comment: "For now, static values - later we compute using real data"
  - `src/services/orderService.ts:182-204` - Simple haversine distance calculation
  - Comment: "You can later replace this with a Supabase RPC or Mapbox routing"
- **Missing but implied:**
  - Real pricing calculation using:
    - Bus route matching
    - Depot/facility selection
    - Weight-based pricing tiers
    - Route-based pricing (some routes more expensive)
  - Integration with dimension AI for accurate pricing
  - Mapbox routing for actual route distance
  - Supabase RPC function for server-side pricing

#### Step 7: Order Confirmation
**Entrypoint:** `ConfirmOrderScreen`
- **Implemented:** ✅ UI structure
- **Stubbed:** 
  - `ConfirmOrderScreen.tsx:14-20` - Static placeholder summary data
  - Comment: "Static placeholders for now – later we pass real data via params / store"
  - `ConfirmOrderScreen.tsx:23` - Comment: "Later: create order in Supabase + trigger WhatsApp"
  - `handleConfirm()` just navigates to Main, doesn't create order
- **Missing but implied:**
  - Order creation in Supabase (`src/services/orderService.ts:createOrder` exists but not called)
  - WhatsApp notification to customer/driver (WhatsApp helper exists: `src/lib/whatsapp.ts`)
  - Notification creation for order status
  - Redirect to order tracking/packages screen

#### Step 8: Order Tracking
**Entrypoint:** Packages tab → Order details screen
- **Implemented:** ⚠️ Partial
  - `orderService.ts` has `fetchOrders()`, `getOrderById()` functions
  - Schema supports order tracking (`supabase/schema/profiles.sql:106-120`)
- **Stubbed:** None (functions exist)
- **Missing but implied:**
  - Packages screen implementation (not found in codebase)
  - Live tracking screen with driver location (`PROJECT_AUDIT_REPORT.md` mentions `LiveTrackingScreen`)
  - Real-time status updates (audit mentions `useRealtimeOrder` hook exists but not wired)
  - Status change notifications

#### Step 9: Delivery Completion
- **Implemented:** ✅ Schema supports status: `'pending', 'accepted', 'in_transit', 'delivered', 'cancelled'`
- **Stubbed:** None
- **Missing but implied:**
  - Delivery confirmation UI
  - Rating/review flow (audit mentions driver ratings system missing)
  - Payment processing (no payment integration found)
  - Receipt generation

---

### Driver Journey: Onboarding → Availability → Order Discovery → Acceptance → Delivery → Completion

#### Step 1: Driver Onboarding
**Entrypoint:** `RoleSelectScreen` → `DriverKycScreen` → `DriverBusDetailsScreen` → `DriverTermsScreen`
- **Implemented:** ✅ Navigation flow exists
- **Stubbed:**
  - `src/lib/api/driver.ts:44` - TODO: "Implement actual Supabase storage"
  - `src/lib/api/driver.ts:74` - TODO: "Implement actual Supabase storage"
  - Both `saveDriverKyc()` and `saveDriverBusData()` return mock data
  - KYC schema exists (`profiles.sql:40-68`) but API doesn't use it
- **Missing but implied:**
  - KYC verification workflow (admin approval)
  - Bus operator verification
  - Terms acceptance storage

#### Step 2: Driver Home / Availability
**Entrypoint:** `HomeScreen` → `DriverHome`
- **Implemented:** ✅ Role-based rendering
- **Stubbed:** `DriverHome` component (file not found, directory empty)
- **Missing but implied:**
  - "Go Online/Offline" toggle
  - Current active order display
  - "Available Jobs" button/link
  - Driver stats (rating, deliveries, earnings)

#### Step 3: Order Discovery
**Entrypoint:** Available Jobs screen → Order list
- **Implemented:** ✅ 
  - `orderService.ts:getAvailableOrders()` - Gets pending orders with null driver_id
  - `orderService.ts:findNearbyOrders()` - Filters by location (simple haversine)
- **Stubbed:**
  - `orderService.ts:207` - Comment: "simple filter; replace later with PostGIS"
  - Current implementation uses client-side filtering, not spatial database
- **Missing but implied:**
  - PostGIS integration for efficient spatial queries
  - Route matching (driver's bus routes vs order pickup/dropoff routes)
  - Distance-based sorting
  - Available Jobs screen UI (not found)

#### Step 4: Order Acceptance
**Entrypoint:** Order details → Accept button
- **Implemented:** ✅
  - `orderService.ts:acceptOrder()` - Updates order with driver_id, status='accepted'
  - Race condition handling (only accepts if status='pending')
- **Stubbed:** None (fully functional)
- **Missing but implied:**
  - Notification to customer when order accepted
  - WhatsApp message to customer
  - Real-time order status update propagation

#### Step 5: Pickup & In-Transit
**Entrypoint:** Driver parcel details → Status updates
- **Implemented:** ✅
  - `orderService.ts:updateOrderStatus()` - Can update status
  - `orderService.ts:getDriverActiveOrder()` - Gets active orders (accepted, picked_up, in_transit)
- **Stubbed:** None (functions exist)
- **Missing but implied:**
  - Location tracking during transit (audit mentions location tracking partially implemented)
  - Status update UI screens
  - Customer notification on pickup
  - Location sharing with customer (live tracking)

#### Step 6: Delivery & Completion
- **Implemented:** ✅ Status update function exists
- **Stubbed:** None
- **Missing but implied:**
  - Delivery confirmation UI
  - Customer notification
  - Rating request to customer
  - Earnings calculation and display

---

## 2. Intended System Behavior

### Order Flow Through System

#### Order Creation
**Intended Flow:**
1. Customer fills pickup/dropoff locations → `PickupScreen`, `DropoffScreen`
2. Customer enters parcel details (weight, dimensions, contents) → `ParcelDetailsScreen`
3. System estimates price using:
   - Distance calculation (haversine → intended: Mapbox routing)
   - Weight-based pricing
   - Route-based pricing (bus corridors)
   - Dimension-based pricing (uses AI dimensions)
4. Customer confirms → Creates order in Supabase → `orders` table
5. Order status: `pending`, driver_id: null

**Evidence:**
- `src/services/orderService.ts:createOrder()` function exists (lines 7-22)
- `ConfirmOrderScreen.tsx:23` comment: "Later: create order in Supabase + trigger WhatsApp"
- Schema supports order creation (`profiles.sql:106-120`)
- Price estimation function exists but simplified (`orderService.ts:182-204`)

**Current State:** Order creation function exists but not called from UI

#### Pricing Logic

**Intended Logic:**
- Use real route distance (Mapbox routing API)
- Consider bus route matching
- Weight tiers (light/medium/heavy pricing)
- Dimension-based pricing (volumetric weight)
- Route-based pricing (premium routes cost more)

**Evidence:**
- `orderService.ts:180` comment: "You can later replace this with a Supabase RPC or Mapbox routing"
- `PriceEstimateScreen.tsx:14` comment: "For now, static values - later we compute using real data"
- Current implementation: Simple haversine distance × 6 + 40 base price
- Dimension AI exists (`dimensionAI.ts`) - suggests dimensions factor into pricing

**Current State:** Simple distance-based pricing, no route/weight/dimension tiers

#### Order Assignment

**Intended Flow:**
1. Driver browses available orders (filtered by location, route)
2. Driver accepts order → Updates order with driver_id, status='accepted'
3. Customer notified (notification + WhatsApp)
4. Order status propagates via realtime subscription

**Evidence:**
- `orderService.ts:acceptOrder()` implemented with race condition protection
- `orderService.ts:findNearbyOrders()` exists but uses client-side filtering
- Comment: "replace later with PostGIS" (line 207)
- Schema supports driver assignment (`profiles.sql:109`)

**Current State:** Assignment works, but discovery is inefficient (client-side filtering)

#### Status Changes

**Intended Status Flow:**
`pending` → `accepted` → `picked_up` → `in_transit` → `delivered` (or `cancelled`)

**Evidence:**
- Schema defines status enum: `'pending', 'accepted', 'in_transit', 'delivered', 'cancelled'` (line 117)
- `orderService.ts:updateOrderStatus()` function exists
- `orderService.ts:getDriverActiveOrder()` filters for: `['accepted', 'picked_up', 'in_transit']`

**Intended Behavior:**
- Each status change triggers notification
- Real-time updates via Supabase Realtime
- Customer sees status changes immediately
- Driver can update status through UI

**Evidence:**
- Audit mentions `useRealtimeOrder` hook exists but not wired
- Notifications screen exists but uses dummy data
- WhatsApp integration exists (`whatsapp.ts`) - likely for status notifications

**Current State:** Status update functions exist, but realtime subscriptions not wired

### Driver Order Discovery

**Intended Flow:**
1. Driver goes "online" (sets availability status)
2. Driver views available jobs filtered by:
   - Geographic proximity (PostGIS spatial query)
   - Bus route matching (driver's routes vs order pickup/dropoff)
   - Distance radius (configurable, default 25km per `findNearbyOrders`)
3. Orders sorted by distance/relevance
4. Driver can see order details before accepting

**Evidence:**
- `orderService.ts:findNearbyOrders()` function signature shows radius parameter (default 25km)
- Comment: "replace later with PostGIS" (line 207)
- Driver bus details table stores routes array (`profiles.sql:77`)
- Current implementation filters client-side (inefficient)

**Current State:** Simple client-side filtering, no route matching, no PostGIS

### Notifications & Realtime Updates

**Intended Behavior:**
- Notifications table stores all user notifications
- Realtime subscriptions for:
  - New notifications
  - Order status changes
  - Driver location updates (for live tracking)
- Notification triggers on:
  - Order created
  - Order accepted by driver
  - Order picked up
  - Order in transit (location updates)
  - Order delivered
  - Order cancelled

**Evidence:**
- `NotificationsScreen.tsx` exists but uses dummy data (lines 14-39)
- Audit mentions notifications table missing
- Audit mentions `useRealtimeOrder` hook exists but not used
- WhatsApp integration exists - likely for SMS-style notifications

**Current State:** Notification UI exists, but no backend, no realtime subscriptions

### Camera Dimension AI Integration

**Intended Behavior:**
- Customer takes photo of parcel → AI estimates dimensions (L, W, H)
- Dimensions auto-populate in ParcelDetailsScreen
- Dimensions factor into pricing calculation
- Dimensions stored in order (schema supports: `dimensions JSONB`)

**Evidence:**
- `ParcelDetailsScreen.tsx:38-56` - Auto-runs AI when image captured
- `dimensionAI.ts` - Sends image to Supabase function endpoint
- Schema has `dimensions JSONB` field in orders table
- Pricing comment mentions dimensions should be used

**Current State:** ✅ Fully functional - AI estimates dimensions, auto-populates form

---

## 3. Product Direction Signals

### MVP vs Scalable Marketplace

**Evidence suggests: MVP with scalability considerations**

**MVP Signals:**
- Simple pricing formula (can be upgraded)
- Client-side filtering (can be upgraded to PostGIS)
- Mock implementations with TODO comments (fast iteration, upgrade later)
- Static placeholder data in UI (ship fast, iterate)
- WhatsApp integration (low-friction communication, popular in India)

**Scalability Signals:**
- Proper database schema with indexes (`profiles.sql:143-149`)
- Row Level Security policies implemented
- Service layer pattern (API functions separated from UI)
- Type-safe navigation (TypeScript throughout)
- Supabase Realtime architecture (ready for real-time features)
- PostGIS mentions (spatial database for scale)
- Notification system designed (just not implemented)

### Future Features Evidence

#### 1. **Facilities/Depots System**
**Evidence:**
- Audit mentions `FacilitySelectionScreen` exists
- Pricing mentions "depot & weight" (`PriceEstimateScreen.tsx:25`)
- Bus-first model implies depot-to-depot delivery
- Driver bus details stores `operator_name` (suggests multiple operators)

**Implied:** Users select pickup/dropoff depots, pricing considers depot locations

#### 2. **Saved Locations**
**Evidence:**
- Audit mentions `SavedLocationsScreen` exists
- LocationAutocomplete component exists (could integrate saved locations)
- Order creation flow uses locations repeatedly

**Implied:** Customers save home/work addresses, reuse for frequent orders

#### 3. **Driver Ratings/Reviews**
**Evidence:**
- Audit mentions driver ratings system missing
- `locationService.ts` mentioned as having hardcoded rating 4.8
- Marketplace model suggests trust/rating system needed

**Implied:** Post-delivery rating flow, driver profiles show ratings

#### 4. **Route Matching & Optimization**
**Evidence:**
- Driver bus details stores `routes TEXT[]` (array of routes)
- Pricing mentions route-based pricing
- "Bus corridor" mentioned in pricing (`PriceEstimateScreen.tsx:16`)
- Order discovery should match driver routes

**Implied:** System matches orders to driver routes, optimizes routing

#### 5. **Auto-Messages**
**Evidence:**
- Audit mentions `AutoMessageScreen` exists
- WhatsApp integration exists
- Audit suggests `auto_messages` table or profile field

**Implied:** Customers set default messages sent to drivers automatically

#### 6. **Live Tracking**
**Evidence:**
- Audit mentions `LiveTrackingScreen` exists
- `locationService.ts` mentioned (driver location tracking)
- Schema likely has location fields (not verified)
- Realtime subscriptions mentioned

**Implied:** Real-time driver location tracking, map view with route

#### 7. **Payment Integration**
**Evidence:**
- None found (no payment gateway integration)
- Pricing calculated but no payment flow
- Likely post-MVP feature

**Implied:** Payment gateway integration (Razorpay/Stripe) for order completion

### India-Specific Operational Assumptions

#### 1. **Bus-First Delivery Model**
**Evidence:**
- SplashScreen tagline: "Bus-first delivery for real India"
- Subtitle: "Overnight Intercity Parcels"
- Pricing mentions "Overnight on bus corridor"
- Driver bus details model (operator, routes, vehicle number)
- Facilities/depots suggest bus depot network

**Implied:** Leverages existing intercity bus network for parcel delivery (lower cost, overnight delivery)

#### 2. **Role Separation (Customer vs Driver)**
**Evidence:**
- Role selection screen separates customers and drivers
- Driver onboarding flow (KYC, bus details, terms)
- Schema enforces role separation (`role TEXT CHECK (role IN ('customer', 'driver'))`)
- Driver-specific tables (driver_kyc, driver_bus_details)

**Implied:** Drivers are verified, onboarded separately. Not gig economy model (Uber-style), but verified network model

#### 3. **OTP Authentication**
**Evidence:**
- Phone-based OTP authentication (Supabase Auth)
- No email/password flow
- India-standard authentication method

**Implied:** Designed for Indian users (phone-first, OTP standard)

#### 4. **Aadhaar KYC**
**Evidence:**
- Driver KYC table includes `aadhaar_number TEXT`
- India-specific ID verification
- KYC status workflow (pending, verified, rejected)

**Implied:** Regulatory compliance for driver verification in India

#### 5. **WhatsApp Integration**
**Evidence:**
- `whatsapp.ts` helper function exists
- Comment mentions triggering WhatsApp on order creation
- Very popular communication method in India

**Implied:** Low-friction communication channel (no SMS costs, user-friendly)

#### 6. **Overnight Delivery Promise**
**Evidence:**
- SplashScreen: "Overnight Intercity Parcels"
- Pricing: "Overnight on bus corridor"
- Bus-first model enables overnight delivery

**Implied:** USP is overnight intercity delivery using bus network

---

## 4. Traction Loss Hypothesis

### Likely Reasons Development Stalled

#### 1. **Broken Import Blocker** 🔴 HIGHEST PROBABILITY
**Issue:** `src/services/orderService.ts:1` imports from non-existent `"../lib/supabaseClient"`
**Impact:** Order service cannot be used, blocking core functionality
**Evidence:**
- Import error would prevent app from running
- Order creation flow cannot complete
- This is a critical blocker

**Hypothesis:** Developer hit this error, couldn't resolve quickly, stalled development

#### 2. **Missing Backend Primitives**
**Issues:**
- Driver KYC API returns mock data (TODO comments)
- Order creation function exists but not wired to UI
- Notifications system missing (table, service, realtime)
- PostGIS not set up (spatial queries needed)

**Impact:** Core features cannot be tested end-to-end

**Evidence:**
- Multiple TODO comments in driver API
- Static placeholders in ConfirmOrderScreen
- Notification screen uses dummy data

**Hypothesis:** Backend setup incomplete, hard to test real workflows

#### 3. **Architectural Friction**
**Issues:**
- Data flow gaps (PickupScreen → DropoffScreen data not passed properly)
- Missing screens (CustomerHome, DriverHome, Packages screen)
- Navigation structure incomplete (some screens referenced but not found)

**Impact:** UI flows broken, hard to test user journeys

**Evidence:**
- DropoffScreen placeholder
- Empty home screen directories
- Navigation structure simpler than audit suggests

**Hypothesis:** Navigation refactoring needed, but incomplete, causing confusion

#### 4. **Scalability Concerns**
**Issues:**
- Client-side location filtering (won't scale)
- Simple pricing formula (needs upgrade)
- No PostGIS setup (needed for production)

**Impact:** Technical debt visible, may have stalled to "fix it right"

**Evidence:**
- Comments mention PostGIS replacement needed
- Simple haversine calculation for pricing
- Client-side filtering in `findNearbyOrders`

**Hypothesis:** Developer recognized scalability issues, wanted to fix before continuing

### Single Most Likely "Next Milestone" That Was Never Completed

**🎯 Order Creation End-to-End Flow**

**Evidence:**
1. **ConfirmOrderScreen.tsx:23** - Comment: "Later: create order in Supabase + trigger WhatsApp"
   - This is the exact next step that was planned
2. **orderService.ts:createOrder()** - Function exists, ready to use
3. **Broken import** - Would prevent this function from working
4. **Static placeholders** - Data not flowing from previous screens to confirmation

**Intended Completion:**
- Fix import error in orderService
- Wire ConfirmOrderScreen to call createOrder()
- Pass order data from previous screens (pickup, dropoff, parcel details, price)
- Create order in Supabase
- Trigger WhatsApp notification
- Create notification record
- Redirect to order tracking screen

**Why This Makes Sense:**
- This is the critical user journey completion (customer can create order)
- Everything else (driver flow, tracking, etc.) depends on orders existing
- Comment directly states this was next step
- Broken import would block this milestone
- All pieces exist except wiring them together

**Alternative Hypothesis:**
- **Driver KYC Backend Implementation** - Multiple TODO comments suggest this was next
- However, order creation is more critical (enables testing end-to-end)
- KYC can work with mock data for testing

---

## Summary

**Product Type:** MVP for bus-first intercity parcel delivery marketplace (India-focused)

**Current State:** 60-70% complete - Core UI flows exist, backend partially implemented, critical blockers prevent completion

**Intended Architecture:** Scalable marketplace with real-time updates, spatial queries, route matching

**Key Blocker:** Broken import in orderService preventing order creation flow

**Next Logical Step:** Fix import, wire order creation, complete customer order flow end-to-end






