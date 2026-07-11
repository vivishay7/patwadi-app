---
type: hub
status: active
owner: product
last_reviewed: 2026-07-11
tags:
  - patwadi
  - knowledge-base
  - moc
---

# Patwadi Knowledge Hub

This is the front door to Patwadi's repository knowledge system. Open the **repository root** as an Obsidian vault, then pin this note.

## Areas

- [[Product MOC]] — product definition, users, journeys, commercial logic and scope
- [[Engineering MOC]] — architecture, code, database, integrations, security and deployment
- [[UI UX MOC]] — navigation, screen behavior, design system, usability findings and content design
- [[Marketing Brand MOC]] — positioning, audiences, campaigns, store presence and brand voice
- [[Operations MOC]] — corridor operations, custody, operator onboarding, handoffs and support
- [[Legal Compliance MOC]] — policies, agreements, privacy, claims and compliance coverage
- [[Decision Log]] — accepted, superseded and proposed product/technical decisions
- [[Research MOC]] — external research, assumptions, evidence and open questions
- [[Roadmap Releases MOC]] — current state, launch gates, releases, migrations and deferred work

## Canonical repo references

- [[PATWADI_LAUNCH_ARCHITECTURE]]
- [[PATWADI_APP_DOCUMENTATION]]
- [[PATWADI_EXECUTION_PLAN]]
- [[PATWADI_FOR_TEAM]]
- [[SETUP_GUIDE]]
- [[docs/README|Existing documentation index]]

## Current operating rule

The knowledge layer organizes and connects source material; it does not silently replace it. Implementation claims must point to code, schema, edge functions, tests or a dated verification note. Product and policy claims must identify the approved decision or canonical document.

## Capture flow

1. Put uncategorized notes in `knowledge/10 Inbox`.
2. Apply the [[Standard Note]] template.
3. Link the note from one primary MOC.
4. Record decisions in [[Decision Log]] or with the [[Decision Record]] template.
5. Run `node scripts/validate-knowledge-base.mjs` before committing.

See [[How to Use This Vault]] for precedence, lifecycle and maintenance rules.
