---
name: data-lineage-impact
description: Map data lineage and impact before changing tables, columns, metrics, semantic models, dashboards, reports, pipelines, or business definitions.
---

# Data Lineage and Impact Analysis

Use this skill when a data model, report, table, metric, or pipeline change could affect downstream assets.

## Workflow

1. Define proposed change:
   - Table, column, metric, relationship, calculation, refresh logic, business definition, source system.

2. Map upstream:
   - Source tables, pipelines, transformations, owners, data contracts, refresh cadence.

3. Map downstream:
   - Semantic models, reports, dashboards, extracts, notebooks, teams, executives, regulatory outputs.

4. Assess impact:
   - Breaking change risk, metric change, refresh risk, security risk, historical restatement, communication need.

5. Plan rollout:
   - Versioning, parallel run, validation, stakeholder sign-off, release date, rollback.

## Output Format

Return:
- Lineage map
- Impact table
- Risk rating
- Validation plan
- Communication plan
