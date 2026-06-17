# 🔧 Exact Fixes Needed - What's Broken

## Critical Issues (Blocking App from Running)

### 1. ❌ Wrong Supabase Import Path

**File:** `src/services/orderService.ts:1`

**Broken:**
```typescript
import { supabase } from "../lib/supabaseClient";  // ❌ File doesn't exist
```

**Fixed:**
```typescript
import { supabase } from "../lib/supabase";  // ✅ File exists
```

---

### 2. ❌ Wrong Types Import Path

**File:** `src/services/orderService.ts:2`

**Broken:**
```typescript
import { Order, OrderStatus, LocationData } from "../types/db";  // ❌ Wrong path
```

**Fixed:**
```typescript
import { Order, OrderStatus } from "../lib/db/types";  // ✅ Correct path

// Note: LocationData is likely defined elsewhere, need to check
// It might be in navigation types or mapbox types
```

**Location of types:**
- ✅ `Order` interface exists in `src/lib/db/types.ts:65`
- ✅ `OrderStatus` is the union type from Order interface: `"pending" | "accepted" | "in_transit" | "delivered" | "cancelled"`
- ⚠️ `LocationData` - need to find where this is defined

---

### 3. ❌ Missing HomeStack Navigation File

**File:** `src/screens/parcel/PickupScreen.tsx:8`

**Broken:**
```typescript
import { HomeStackParamList, LocationData } from "../../navigation/HomeStack";  // ❌ File doesn't exist
```

**Problem:** 
- `src/navigation/HomeStack.tsx` doesn't exist
- Only `RootNavigator.tsx` and `MainTabs.tsx` exist in navigation folder
- `PickupScreen` uses `HomeStackParamList` which is undefined

**Options:**

**Option A:** Create `HomeStack.tsx` (if intended architecture)
**Option B:** Change to use `RootNavigator` types (simpler, matches current structure)

**Check:** What navigation structure do you want?
- Current: `RootNavigator` handles all main screens
- Intended: Separate `HomeStack` for home-related screens?

---

## What's Working ✅

1. ✅ **Supabase client:** `src/lib/supabase.ts` - properly configured
2. ✅ **Mapbox:** `LocationAutocomplete` component works
3. ✅ **Vision AI:** `dimensionAI.ts` - works (uses Supabase function)
4. ✅ **Authentication:** OTP flow complete
5. ✅ **Database schema:** Tables defined in `supabase/schema/profiles.sql`

---

## Quick Fix Steps

### Step 1: Fix orderService.ts imports (30 seconds)

```typescript
// src/services/orderService.ts
import { supabase } from "../lib/supabase";  // Changed from supabaseClient
import { Order } from "../lib/db/types";     // Changed from ../types/db

// Define OrderStatus type locally (or export from types file)
type OrderStatus = Order["status"];

// LocationData - need to find where this is defined or define it
interface LocationData {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  placeName?: string;
}
```

### Step 2: Fix PickupScreen navigation import (5 minutes)

**Option A - Use RootNavigator types:**
```typescript
// src/screens/parcel/PickupScreen.tsx
import { RootStackParamList } from "../../navigation/RootNavigator";
import { LocationData } from "../../components/LocationAutocomplete"; // or wherever it's defined

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Pickup">;
```

**Option B - Create HomeStack.tsx:**
Create `src/navigation/HomeStack.tsx` with proper type definitions.

---

## Summary

**Critical blockers:**
1. ✅ `orderService.ts` wrong import path (easy fix)
2. ✅ Types import path wrong (easy fix)  
3. ⚠️ Navigation structure unclear (needs decision)

**After these fixes:**
- ✅ App should compile
- ✅ Order service functions will work
- ✅ Can wire order creation to UI






