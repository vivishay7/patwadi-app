# Patwadi notification copy sheet

| Field | Value |
| ----- | ----- |
| **Document** | Notification copy sheet (living doc) |
| **Version** | 0.2 |
| **Status** | Draft for brand + ops alignment |
| **Core brand promise** | Delivery that works around real life. |
| **Notification voice** | Humanity → Recognition → Trust |
| **Operational guardrail** | Every message must still tell the user what happened, what happens next, and what they can do. |
| **Pilot locks** | Intercity corridors only · no “fast” / “same-day” promises · 2 free delivery attempts · ₹100/day storage after 2nd failure · max 7 days hold · `customer_to_lmp` pickup confirm in app |

This doc replaces the earlier “better operations copy” direction. Patwadi notifications should not read like bank statements, airline alerts, or SaaS status logs. They should feel like a capable person is handling the parcel and understands the human situation around it.

**How to use:** One row per trigger in journey tables. Push title ≤ 40 chars where noted. Body is push + in-app unless marked otherwise. Localise via `LocaleProvider` when implemented — English is source of truth here.

---

## 1. Voice definition

### Patwadi sounds like

A calm neighborhood logistics host.

Someone who says:

> “Haan, it reached. It’ll move again tomorrow morning.”

Not:

> “Shipment status updated successfully.”

Not:

> “Sit tight, we’ve got this.”

Not:

> “Your parcel is on a magical journey.”

### Voice principles

- **Recognize the situation before giving the status.** The user is busy, away, waiting, sending something emotional, running a shop, or tracking anxiously.
- **Make the parcel feel real, not abstract.** It can reach, rest, move, wait, be held safely, continue tomorrow.
- **Use operational truth, but in human language.** Policies should be clear, but not punitive.
- **Avoid blame.** Use “missed each other,” not “you were unavailable.”
- **Avoid vague reassurance.** No “we’ve got this,” “don’t worry,” “sit tight,” unless paired with a concrete next step.

---

## 2. User profiles for vetting copy

### Profile A: Busy working customer

**Life state:** At office, college, shop, commute, or in meetings.  
**Fear:** Courier arrives at a bad time and sends the parcel back.  
**Needs:** Flexibility, no blame, clear next attempt.

Good Patwadi copy:

> Missed each other today. We’ll try again tomorrow. You can still update the delivery window before we come.

Bad copy:

> We could not complete delivery. One free attempt remains within 24 hours.

Why: accurate, but sterile.

### Profile B: Family sender / receiver

**Life state:** Sending achaar, mithai, clothes, medicines, books, festival items, documents.  
**Fear:** Parcel is treated like just another item.  
**Needs:** Care, location, confidence.

Good Patwadi copy:

> Your parcel reached Jaipur tonight. It’ll rest with our local partner and move for delivery tomorrow morning.

Bad copy:

> Your parcel reached Jaipur and is safe with our local partner.

Why: useful, but emotionally flat.

### Profile C: Small business sender

**Life state:** Sending customer orders.  
**Fear:** Delays hurt their reputation.  
**Needs:** Clarity, timestamps, proof, control.

Good Patwadi copy:

> Your order parcel reached Surat tonight. Delivery planning starts tomorrow morning, and we’ll update the tracking page before the next attempt.

Bad copy:

> Your shipment has arrived at destination hub.

Why: sounds like a warehouse system, not Patwadi.

### Profile D: Traveler / out-of-town customer

**Life state:** Away from home when parcel arrives.  
**Fear:** Parcel gets returned before they can act.  
**Needs:** Hold option, alternate delivery, no panic.

Good Patwadi copy:

> Away right now? We can hold your parcel safely for up to 7 days. Choose redelivery or pickup when you’re back.

Bad copy:

> Storage will begin after failed delivery attempts.

Why: policy-first instead of human-first.

### Profile E: Anxious tracker

**Life state:** Refreshing tracking repeatedly.  
**Fear:** No update means something went wrong.  
**Needs:** Silence explained.

Good Patwadi copy:

> Your parcel is on the Ahmedabad corridor tonight. The next update usually comes when it reaches the city.

Bad copy:

> Parcel in transit.

Why: technically true, emotionally useless.

### Profile F: Driver / corridor partner

**Life state:** Needs crisp job info.  
**Fear:** Unclear pickup, weight, payout, route.  
**Needs:** Direct, operational copy. Less softness.

Good driver copy:

> 3 parcels available for Delhi → Jaipur tonight. Total load: 4.2 kg. Pickup: Kashmere Gate. Accept before 7:30 PM.

Bad driver copy:

> Some parcels are waiting for your ride.

Why: cute but not actionable.

---

## 3. Core copy rules

### Use this structure

**Recognition → Status → Next step → Action**

Example:

> Missed each other today. We’ll try again tomorrow. You can update the delivery window before the next attempt.

### Avoid these phrases

“Sit tight.” · “We’ve got this.” · “Your parcel has a seat.” · “Shipment status updated.” · “Delivery failed due to customer unavailability.” · “Kindly note.” · “Dear customer.” · “Your package is on an adventure.” · “Oops.” · “No worries!” unless the message is very low-stakes.

### Preferred words

Reached. · Resting. · Moving again. · Held safely. · Missed each other. · Delivery window. · Local partner. · Next attempt. · Tomorrow morning. · Tonight. · On the corridor. · Waiting safely.

---

## 4. First parcel CTA (pre-booking nudge)

For signed-up customers with zero bookings. Warm welcome — not pushy. One nudge per signup window; respect opt-out.

| Trigger / system event | Patwadi notification (push / in-app) | Action button | Policy note |
| -------------------- | ------------------------------------ | ------------- | ----------- |
| **Account created, no bookings yet** (day 1 or day 3 in-app nudge) | **Title:** Ready to send something? **Body:** You’re set up on Patwadi. When you book your first parcel, we’ll line up pickup on the corridor and update you at every handoff — no chasing, no guessing. | Book a parcel | In-app banner first; push only if notifications enabled and user hasn’t dismissed. No fake urgency or discount bait. |
| **Account created, no bookings — day 7 gentle reminder** (optional) | **Title:** Something to send? **Body:** Families and shops use Patwadi for the stuff that matters — mithai, clothes, documents, orders. Book when you’re ready; we’ll handle the corridor and tell you what’s next. | Book a parcel | Max one follow-up push. Skip if user opened Book flow but didn’t pay. |

---

## 5. Core customer journey notifications

| # | Trigger / system event | Patwadi notification (push / in-app) | Action button | Policy note |
| - | ---------------------- | ------------------------------------ | ------------- | ----------- |
| 1 | **Booking confirmed** (payment success, before 10pm IST) | **Title:** Booking confirmed **Body:** Your parcel is booked for the corridor. We’ll assign a pickup partner and update you here. | View booking | Razorpay prepay only. Corridor = intercity route, not express courier. |
| 2 | **Booking confirmed** (payment success, after 10pm IST) | **Title:** Booked for tomorrow **Body:** Your order came in after today’s pickup window. We’ll assign a pickup partner tomorrow morning. | View booking | Per ToS: after-10pm orders get LMP assignment next morning. No overnight pickup promise. |
| 3 | **Pickup partner assigned** (`lmp_pickup_id` set, no `customer_to_lmp` yet) | **Title:** Pickup partner assigned **Body:** [Partner name] will collect your parcel in the [slot] window. You’ll confirm the handoff in the app when you meet. | View pickup | Assignment is ops-timed (target 30 min after payment during support hours). |
| 4 | **Pickup day — morning of** | **Title:** Pickup today **Body:** Your pickup is scheduled for today. Keep the parcel ready, and confirm the handoff in the app when your partner arrives. | Confirm pickup | Alternate: *Your pickup is scheduled for today. Keep the parcel ready; the handoff takes less than a minute in the app.* |
| 5 | **Pickup partner nearby** (ops trigger or LMP ping — future) | **Title:** Pickup partner is nearby **Body:** Your pickup partner is close. Open Patwadi when you’re ready to hand over the parcel. | Confirm pickup | Tied to `ConfirmHandoffScreen` step `customer_to_lmp`. |
| 6 | **Pickup missed — first attempt** (Playbook A) | **Title:** Missed each other today **Body:** We couldn’t complete pickup today. We’ll help arrange another slot based on the next corridor movement. | Reschedule pickup | Alternate: *Missed each other today. Choose another pickup slot and we’ll plan it with the next corridor movement.* First pickup failure: rebook, no charge (pilot manual). |
| 7 | **Pickup confirmed** (`customer_to_lmp` recorded) | **Title:** Picked up **Body:** Your parcel is with our pickup partner now. The next update comes when it reaches the corridor handoff. | Track parcel | Status → “Picked up”. Custody chain begins. |
| 8 | **Handoff to corridor** (`lmp_to_linehaul` recorded) | **Title:** Moving on the corridor **Body:** Your parcel is on the [city → city] corridor tonight. The next update usually comes when it reaches [destination city]. | Track parcel | Explains silence during corridor movement. Never “express” or “same-day”. |
| 9 | **Reached destination city overnight** (linehaul arrived overnight) | **Title:** Reached [city] tonight **Body:** Your parcel reached [city] tonight. It’ll rest with our local partner and move for delivery tomorrow morning. | Track parcel | Keeper line — honest about overnight corridor timing. |
| 10 | **Reached destination city — morning** | **Title:** Reached [city] **Body:** Your parcel reached [city] and is with our local partner. Delivery planning starts today. | Track parcel | Same-day arrival variant when not overnight. |
| 11 | **Out for delivery** (`linehaul_to_lmp` → local LMP has parcel) | **Title:** Out for delivery today **Body:** Your parcel is with our delivery partner in [city]. We’ll try during your selected window. | Track parcel | If no window: *We’ll try delivery today and update you here.* |
| 12 | **Delivery attempt 1 missed** | **Title:** Missed each other today **Body:** We couldn’t complete delivery today. We’ll try again tomorrow. You can update the delivery window before the next attempt. | Update delivery window | Attempt 1 of 2 free (Shipping Policy §6). |
| 13 | **Delivery attempt 2 missed — storage starts** | **Title:** We’re holding it safely **Body:** We missed delivery twice, so your parcel is now in safe hold. Storage is ₹100/day for up to 7 days. | Arrange redelivery | Alternate: *Missed each other twice. Your parcel is now being held safely, and storage is ₹100/day for up to 7 days.* |
| 14 | **Storage day 3 check-in** | **Title:** Your parcel is waiting **Body:** Your parcel has been in safe hold for 3 days. You can arrange redelivery or pickup before the 7-day hold ends. | Arrange redelivery | Human check-in, not dunning. |
| 15 | **Storage day 5 warning** | **Title:** 2 days left to arrange it **Body:** We can hold your parcel for 2 more days. After that, return-to-sender will begin. | Arrange redelivery | Return freight details in in-app view, not necessarily push body. |
| 16 | **Return-to-sender starting** | **Title:** Return is starting **Body:** The 7-day hold has ended, so we’re starting return-to-sender. You can still view the return status in tracking. | Track return | Per §7: return freight = original booking rate. |
| 17 | **Delivered** (`lmp_to_customer` recorded) | **Title:** Delivered **Body:** Your parcel has been handed over. If something looks off, tell us within 48 hours. | View proof | Alternate: *Delivered. Your parcel has been handed over. If something looks off, tell us within 48 hours.* Damage claims window 48h (§8). |
| 18 | **Delivery exception / blocked** (`blocked_exception` or overdue recovery) | **Title:** We’re checking this **Body:** Your parcel hit a delay on the corridor. Our team is checking the next movement and will update this page. | Track status | Customer-facing label matches app. Never say “lost” until ops confirms (Playbook D). |

---

## 6. “Life happens” notification thread

Use sparingly as proactive nudges, banners, or WhatsApp — not every line needs to be push.

| Trigger / system event | Patwadi notification (push / in-app) | Action button | Policy note |
| ---------------------- | ------------------------------------ | ------------- | ----------- |
| **Running late — pickup window** | **Title:** Running late? **Body:** If today’s pickup window no longer works, update it before your partner arrives. We’ll plan around the next available corridor slot. | Update pickup | No penalty on first reschedule. |
| **Customer traveling** | **Title:** Away from home? **Body:** Tell us before delivery day. We can try an alternate recipient or hold the parcel safely within the 7-day window. | Update instructions | Storage fees apply after 2 failed attempts only. |
| **Before second delivery attempt** | **Title:** We’ll try again tomorrow **Body:** We missed each other today. Update your delivery window if tomorrow needs to be different. | Update window | Reinforces 2 free attempts before storage. |
| **Hold option prompt** | **Title:** Need us to hold it? **Body:** If you’re away, we can hold your parcel safely for up to 7 days instead of sending it back immediately. | Hold parcel | Coordinate alternate recipient or storage. |

---

## 7. Driver / corridor partner notifications

Driver copy should be more operational than customer copy. Warmth comes from clarity and respect for their time.

| Trigger / system event | Patwadi notification (push / in-app) | Action button | Notes |
| ---------------------- | ------------------------------------ | ------------- | ----- |
| **Parcels available** | **Title:** Parcels on your route **Body:** 3 parcels available for Delhi → Jaipur tonight. Total load: 4.2 kg. Pickup: Kashmere Gate. | View parcels | Example corridor; substitute live counts. |
| **Accept deadline** | **Title:** Accept before 7:30 PM **Body:** Delhi → Jaipur parcels are open for acceptance until 7:30 PM. After that, they’ll move to another partner. | Accept route | Hard deadline — no softening. |
| **Parcel assigned** | **Title:** Parcel assigned **Body:** Parcel PKG123 is assigned to you for Delhi → Jaipur. Pickup point: Kashmere Gate. Show the parcel code at handoff. | View details | Use real parcel code. |
| **Loading confirmed** | **Title:** Loading confirmed **Body:** PKG123 has been marked loaded for Delhi → Jaipur. Confirm arrival when you reach the destination handoff. | View parcel | Linehaul conductor app. |
| **Arrival handoff** | **Title:** Confirm destination handoff **Body:** PKG123 is due for handoff in Jaipur. Confirm once the local partner receives it. | Confirm handoff | Custody event trigger. |

See also `strings.ts` `notificationTransferTitle` / `Body` and `notificationJobsTitle` / `Body` for transfer and job alerts.

---

## 8. Copy stress test

Before approving any notification, ask:

1. Does this sound like Patwadi or a bank?
2. Does the user feel seen before being instructed?
3. Is the operational truth still clear?
4. Is there any blame?
5. Is there fake certainty?
6. Does it explain the next step?
7. Would this work for a family parcel and a small business parcel?
8. Is it too cute for a stressed customer?
9. Is it too cold for a human brand?
10. Could this line sit on the same website as “Delivery that works around real life”?

If it fails 2 or more, rewrite.

---

## 9. Tone benchmarks

| Too cold | Too cute | Patwadi |
| -------- | -------- | ------- |
| Delivery attempt could not be completed. One free attempt remains within 24 hours. | Oops, looks like you and your parcel played hide and seek today. | Missed each other today. We’ll try again tomorrow. You can update the delivery window before the next attempt. |
| Sit tight, we’ve got this. | — | Your parcel reached Ahmedabad tonight. It’ll rest here and move again tomorrow morning. |
| Your shipment has reached the destination hub and is awaiting last-mile processing. | — | Your parcel reached Ahmedabad tonight. It’ll rest here and move again tomorrow morning. |

---

## 10. Working copy bank

Reuse across the system:

- **Missed each other today.**
- **It’ll rest here tonight and move again tomorrow morning.**
- **Your parcel is waiting safely.**
- **We’ll plan it around the next corridor movement.**
- **The next update usually comes when it reaches the city.**
- **Choose the delivery window that works for you.**
- **If you’re away, we can hold it safely.**
- **We’ll update this page when the next movement is confirmed.**
- **Delivery should work around your day, not the other way around.**

---

## 11. Emotional sequence (recommendation)

Build notifications around:

**Recognition → Movement → Care → Control**

Example:

> Missed each other today.  
> Your parcel is waiting safely.  
> We’ll try again tomorrow.  
> You can update the delivery window before we come.

That is Patwadi. Not more “professional.” More human. More specific. More trusted.

---

## Voice checklist (before shipping copy)

- [ ] No “fast”, “instant”, “same-day”, or “express” unless legally qualified and true for that corridor.
- [ ] Corridor imagery OK; fake courier-bike urgency not OK.
- [ ] No banned marketing phrases: “sit tight”, “we’ve got this”, “your parcel has a seat”.
- [ ] Storage and attempt limits stated plainly when relevant — wrapped in warmth, not fine print.
- [ ] Exception copy reassures through action, not vibes.
- [ ] CTAs point to real screens: Book parcel, Tracking, Confirm pickup, WhatsApp support.

---

## Changelog

| Date | Change |
| ---- | ------ |
| 18 Jun 2026 | v0.1 — initial sheet for pilot push planning |
| 18 Jun 2026 | v0.2 — brand voice refresh (Humanity → Recognition → Trust); full journey + Life happens + driver tables; first-parcel CTA; bus → corridor in customer-facing copy |
