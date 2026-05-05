---
name: data-contracts
description: Define data contracts for analytics assets including schema, grain, freshness SLA, owner, valid values, quality rules, breaking changes, and downstream consumers.
---

# Data Contracts

Use this skill when creating or reviewing formal agreements between data producers and consumers.

## Workflow

1. Define asset identity:
   - Table/model name, owner, business domain, purpose, consumer teams, and criticality.

2. Specify schema:
   - Field name, type, nullable, description, accepted values, primary key, foreign keys, and sensitivity.

3. Specify operational expectations:
   - Freshness SLA, load cadence, retention, backfill rules, incident contact, support hours.

4. Specify quality rules:
   - Row count ranges, uniqueness, completeness, referential integrity, accepted ranges, distribution checks.

5. Specify change management:
   - Breaking vs non-breaking changes, notice period, versioning, approval, and migration plan.

## Output Format

Return:
- Data contract template
- Required schema fields
- Quality rules
- Ownership and SLA
- Change-control checklist
