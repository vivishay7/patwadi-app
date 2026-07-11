# Patwadi repository knowledge vault

The repository root is configured as an Obsidian vault.

## Start

1. In Obsidian, choose **Open folder as vault**.
2. Select the Patwadi repository root, not a nested duplicate.
3. Open `knowledge/00 Home/Patwadi Knowledge Hub.md`.
4. Enable the prompted core plugins; no community plugins are required.

## Structure

The `knowledge/` folder contains curated maps and durable notes. Existing root planning files and `docs/` remain canonical and are linked from those maps. Personal workspace state is intentionally not committed.

## Validate

```bash
node scripts/validate-knowledge-base.mjs
```

Cursor maintenance rules live at `.cursor/rules/knowledge-base.mdc`.
