---
type: hub
status: active
owner: engineering
last_reviewed: 2026-07-11
tags:
  - engineering
  - architecture
  - moc
---

# Engineering MOC

## Architecture and implementation

- [[PATWADI_APP_DOCUMENTATION#2. Architecture overview|Architecture overview]]
- [[PATWADI_APP_DOCUMENTATION#4. Edge functions|Edge-function inventory]]
- [[PATWADI_APP_DOCUMENTATION#5. Environment setup|Environment setup]]
- [[SETUP_GUIDE]]
- [[PATWADI_LAUNCH_ARCHITECTURE]]

## Database and enforcement

Treat `supabase/schema/`, RLS policies, RPCs and deployed edge functions as runtime source of truth. A migration file being present does not prove it has been applied. Record deployment and verification separately in [[Roadmap Releases MOC]].

## Integrations

- [[docs/razorpay-dashboard-setup|Razorpay setup and webhooks]]
- [[docs/web-tracking-integration-brief|Public tracking integration]]
- Mapbox and location behavior: verify against current code and environment configuration

## Engineering note types

- architecture maps and bounded contexts
- booking, custody, payment and tracking flows
- database tables, RLS, RPCs and migrations
- edge functions and external integrations
- authentication, permissions and threat controls
- deployment, environments, observability and incident notes
- test strategy and dated verification evidence

## Evidence labels

Use these exact labels when summarizing state:

- **Implemented:** code exists on the active branch.
- **Configured:** required settings or secrets are present in the named environment.
- **Deployed:** migration/function/build is present in the named shared environment.
- **Verified:** a dated test demonstrates the behavior.
- **Planned:** approved but not implemented.
- **Proposed:** not yet approved.

Do not collapse these labels into “done.”
