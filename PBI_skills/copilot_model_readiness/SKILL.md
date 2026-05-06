---
name: copilot-model-readiness
description: Prepare Power BI semantic models for Copilot, Q&A, natural language querying, business-friendly metadata, descriptions, synonyms, hidden technical fields, and canonical metrics.
---

# Copilot and Q&A Model Readiness

Use this skill when a Power BI model needs to work well with Copilot, Q&A, natural language analytics, or self-service business users.

## Workflow

1. Improve semantic clarity:
   - Business-friendly table and column names.
   - Clear measure names.
   - Hide technical keys, sort columns, bridge tables, and helper fields.

2. Add metadata:
   - Descriptions for tables, columns, and measures.
   - Synonyms for common business terms.
   - Business definitions for canonical metrics.

3. Reduce ambiguity:
   - Avoid duplicate measures with similar names.
   - Document metric grain and filters.
   - Define preferred date, scenario, and currency fields.

4. Validate:
   - Test likely natural language questions.
   - Compare returned answers with known control totals.
   - Flag fields that produce misleading aggregations.

## Output Format

Return:
- Readiness score
- Metadata gaps
- Recommended descriptions/synonyms
- Fields to hide
- Test question set
