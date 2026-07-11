---
type: guide
status: active
owner: product
last_reviewed: 2026-07-11
tags:
  - knowledge-base
  - governance
---

# How to Use This Vault

## Open it

Open the repository root as an Obsidian vault. Do not open only `knowledge/`; the vault intentionally includes root planning documents and `docs/` so links resolve without copied content.

## Source-of-truth precedence

Use the following order when sources conflict:

1. **Runtime and enforcement:** deployed database schema, RLS, RPCs and edge functions.
2. **Current implementation:** code on the active branch plus passing tests or dated manual verification.
3. **Accepted decisions:** approved ADRs and locked product decisions.
4. **Canonical specifications:** launch architecture, execution plan and maintained domain documents.
5. **Working notes:** research, proposals, meeting notes and drafts.

A higher item describes what currently happens. A lower item may describe intended future behavior. Never merge those two states into one claim.

## Required properties

Every maintained note under `knowledge/` must include:

- `type`: hub, concept, flow, decision, research, meeting, release, issue or guide
- `status`: draft, proposed, active, blocked, superseded or archived
- `owner`: accountable function or person
- `last_reviewed`: ISO date (`YYYY-MM-DD`)
- `tags`: small, reusable taxonomy

Add `source_of_truth`, `supersedes`, `superseded_by`, `related_code`, `related_schema` or `release` where useful.

## Note rules

- One note should answer one durable question.
- Link to canonical documents instead of duplicating paragraphs.
- Distinguish **implemented**, **configured**, **deployed**, **verified** and **planned**.
- Record unknowns as explicit open questions; do not fill them with plausible guesses.
- Use wiki links for notes and ordinary Markdown links for external URLs.
- Keep UI observations separate from approved UI decisions.
- Date time-sensitive claims.

## Maintenance events

Update the vault when a change affects any of these:

- booking or custody flow
- roles, permissions or authentication
- database schema, RPCs, RLS or edge functions
- supported corridors, routing or delivery windows
- pricing, payment, refund or claims behavior
- customer-visible screens or copy
- brand positioning or campaign rules
- operating SOPs, partner rules or launch gates

Minor refactors that do not change behavior do not require a new note; update `related_code` only when navigation would otherwise become misleading.

## Review cadence

- Release notes: every production or pilot release
- Roadmap and launch gates: weekly during active build
- Operations and policies: whenever rules change
- Marketing and UI/UX: whenever approved direction changes
- Architecture maps: after material system changes

## Validation

Run:

```bash
node scripts/validate-knowledge-base.mjs
```

The validator checks frontmatter, duplicate titles and unresolved wiki links inside the curated knowledge layer.
