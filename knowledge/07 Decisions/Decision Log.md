---
type: decision-log
status: active
owner: product-engineering
last_reviewed: 2026-07-11
tags:
  - decisions
  - adr
---

# Decision Log

Use one row for discovery, then create a dedicated note from [[Decision Record]] when context, alternatives or consequences matter.

| ID | Date | Decision | Status | Area | Canonical evidence |
|---|---|---|---|---|---|
| KB-001 | 2026-07-11 | The repository root is the Obsidian vault; `knowledge/` is the curated navigation layer. | accepted | knowledge | [[How to Use This Vault]] |
| KB-002 | 2026-07-11 | Curated notes link to canonical documents and code rather than copying them. | accepted | knowledge | [[How to Use This Vault]] |
| ARCH-001 | existing | Custody events, not the legacy order status, are the parcel-state source of truth. | accepted | architecture | [[PATWADI_APP_DOCUMENTATION#Key concepts]] |
| AUTH-001 | existing | Launch operator accounts are admin-created and gated by approval/status; in-app signup is customer-only. | accepted | product/auth | [[PATWADI_APP_DOCUMENTATION#1. What Patwadi is]] |

## Status meanings

- **proposed:** under consideration; must not drive implementation as settled fact
- **accepted:** approved and current
- **implemented:** accepted and present in code, but not necessarily deployed
- **verified:** demonstrated in the named environment and date
- **superseded:** replaced; link the replacement
- **rejected:** considered and not adopted

## Recording a material decision

Capture:

- problem and decision trigger
- constraints and non-goals
- options considered
- chosen decision and rationale
- product, technical, UI, operational, marketing and legal consequences
- migration or rollout plan
- verification method
- supersession relationship

Never rewrite history by editing an old decision into the new one. Mark the old record `superseded` and link the replacement.
