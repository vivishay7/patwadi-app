# Current State & Critical Fixes

## ⚠️ Discrepancy Note

**Document says:** Batch 6 complete, realtime working, LiveTrackingScreen functional  
**Codebase shows:** Missing files, broken imports, realtime not wired

**Action needed:** Clarify if there's a different branch or if document is aspirational.

---

## ✅ FIXED (Just Now)

### 1. `src/services/orderService.ts`
- ✅ Fixed: `import { supabase } from "../lib/supabase"` (was `supabaseClient`)
- ✅ Fixed: `import { Order } from "../lib/db/types"` (was `../types/db`)
- ✅ Added: `LocationData` interface definition

### 2. `src/screens/parcel/PickupScreen.tsx`
- ✅ Fixed: Changed from `HomeStack` → `RootNavigator` types
- ✅ Added: `LocationData` interface export

---

## 🔴 STILL BROKEN (Blocks App from Running)

### 3. Missing `src/lib/mapbox.ts` File

**Files that import from it (will crash):**
- `src/hooks/useAutocomplete.ts:7-12`
- `src/components/LocationAutocomplete.tsx:21`
- `src/screens/parcel/PickupScreen.tsx:10`

**Expected exports:**
```typescript
// src/lib/mapbox.ts should export:
- geocodingClient (Mapbox client instance)
- isMapboxConfigured() (validation function)
- MapboxFeature (type)
- SelectedLocation (type)
- featureToLocation() (utility function)
```

**This file MUST exist for the app to compile.**

---

## 📋 What the Codebase Actually Has

### ✅ Working:
- Supabase client configured (`src/lib/supabase.ts`)
- Order service functions exist (now with fixed imports)
- Authentication flow
- Navigation structure
- Database schema defined

### ❌ Missing/Broken:
- `mapbox.ts` file (critical)
- Realtime hooks (not found)
- LiveTrackingScreen (not found)
- Packages screens (directory empty)
- Realtime subscriptions (audit says not wired)

---

## 🎯 Immediate Action Plan

### Step 1: Create Missing `mapbox.ts` File
This is blocking compilation. Need to create it with Mapbox SDK integration.

### Step 2: Verify Supabase Setup
- Check `.env.local` has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON`
- Verify Mapbox token is configured

### Step 3: Test Basic Flow
- Can app start?
- Can user login?
- Can user navigate to PickupScreen?

### Step 4: Reconcile Document vs Codebase
- Is there a different branch with Batch 6 complete?
- Or does Batch 6 need to be implemented?

---

## Quick Question

**Which is true?**
1. Batch 6 code exists in a different branch/commit?
2. Document is aspirational (what should be, not what is)?
3. Codebase got reset/reverted after Batch 6?

This will determine next steps.






