# 🔴 Broken Issues - Exact Fixes Needed

Since you have Supabase setup, here's what's **actually broken** and blocking the app:

---

## 🔴 CRITICAL: Broken Import (App Won't Run)

### Issue #1: Wrong Supabase Client Import

**File:** `src/services/orderService.ts:1`

**Current (BROKEN):**
```typescript
import { supabase } from "../lib/supabaseClient";
```

**Problem:** The file `src/lib/supabaseClient.ts` **doesn't exist**. Only `src/lib/supabase.ts` exists.

**Fix:**
```typescript
import { supabase } from "../lib/supabase";
```

**Impact:** 
- ❌ `orderService.ts` cannot be imported/used anywhere
- ❌ Order creation functions won't work
- ❌ This blocks the entire order management system

---

### Issue #2: Missing Types Import Path

**File:** `src/services/orderService.ts:2`

**Current:**
```typescript
import { Order, OrderStatus, LocationData } from "../types/db";
```

**Problem:** Need to verify if `src/types/db.ts` exists, or if types are in `src/lib/db/types.ts`

**Check needed:** Verify the actual path - types might be in `../lib/db/types` instead

**Fix (if path is wrong):**
```typescript
import { Order, OrderStatus, LocationData } from "../lib/db/types";
```

---

### Issue #3: Missing HomeStack Navigation File

**File:** `src/screens/parcel/PickupScreen.tsx:8`

**Current:**
```typescript
import { HomeStackParamList, LocationData } from "../../navigation/HomeStack";
```

**Problem:** `src/navigation/HomeStack.tsx` **doesn't exist**. Navigation structure uses `RootNavigator.tsx` instead.

**Impact:**
- ❌ `PickupScreen` cannot compile/import
- ❌ Breaks the entire parcel creation flow

**Fix Options:**
1. Create `HomeStack.tsx` with proper type definitions, OR
2. Change import to use `RootNavigator` types if that's what's intended

**Need to check:** What navigation structure is actually being used?

---

## ⚠️ INCOMPLETE: Functions Not Wired to UI

### Issue #4: Order Creation Not Called

**File:** `src/screens/parcel/ConfirmOrderScreen.tsx:22-24`

**Current:**
```typescript
const handleConfirm = () => {
  // Later: create order in Supabase + trigger WhatsApp
  navigation.navigate("Main");
};
```

**Problem:** Order creation function exists (`orderService.ts:createOrder()`) but is never called.

**Fix needed:**
```typescript
import { createOrder } from "../../services/orderService";
import { useAuth } from "../../context/AuthContext";
// ... get order data from route params or context

const handleConfirm = async () => {
  const orderData = {
    customer_id: user.id,
    pickup_location: pickupLocation.address,
    dropoff_location: dropoffLocation.address,
    weight_kg: parseFloat(weight),
    dimensions: { length, width, height },
    contents: contents,
    price_estimate: priceEstimate,
    // ... other fields
  };
  
  const order = await createOrder(orderData);
  if (order) {
    // Trigger WhatsApp if needed
    navigation.navigate("Main");
  }
};
```

---

## ⚠️ STUBBED: Mock Data Still Being Used

### Issue #5: Driver KYC API Returns Mock Data

**File:** `src/lib/api/driver.ts:44, 74`

**Current:** Both `saveDriverKyc()` and `saveDriverBusData()` return mock data with TODO comments.

**Fix needed:** Implement actual Supabase inserts to `driver_kyc` and `driver_bus_details` tables.

---

## ✅ WORKING (Don't Need Fixes)

- ✅ **Mapbox Integration:** `LocationAutocomplete` component works
- ✅ **Vision AI:** `dimensionAI.ts` works (uses Supabase function endpoint directly)
- ✅ **Authentication:** OTP flow works
- ✅ **Supabase Client:** `src/lib/supabase.ts` is properly configured

---

## Quick Fix Priority

1. **Fix Issue #1** (5 seconds) - Change import path in `orderService.ts`
2. **Fix Issue #2** (5 seconds) - Fix types import path if wrong
3. **Fix Issue #3** (5 minutes) - Create HomeStack or fix navigation imports
4. **Fix Issue #4** (30 minutes) - Wire order creation to ConfirmOrderScreen

These 4 fixes will unblock the app to run and allow order creation to work.






