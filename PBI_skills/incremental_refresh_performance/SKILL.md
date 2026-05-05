---
name: incremental-refresh-performance
description: Configure Power BI incremental refresh, aggregations, partitioning, and large semantic model performance practices for enterprise-scale reporting.
---

# Incremental Refresh and Performance

Use this skill when a Power BI model is large, refreshes slowly, has growing fact tables, or needs enterprise-scale performance.

## Workflow

1. Diagnose model size and refresh pain:
   - Table row counts, refresh duration, source query folding, calculated columns, cardinality, and relationships.

2. Configure incremental refresh:
   - Identify date column suitable for partitioning.
   - Define archive period and refresh period.
   - Confirm query folding works through the `RangeStart` and `RangeEnd` filters.
   - Use Detect Data Changes only where reliable update timestamps exist.

3. Improve model performance:
   - Remove unused columns.
   - Reduce high-cardinality text columns.
   - Prefer measures over calculated columns where appropriate.
   - Use aggregations for large detail tables.
   - Use star schema and one-direction filters by default.

4. Validate:
   - Test initial refresh and incremental refresh.
   - Confirm historical partitions remain stable.
   - Compare row counts and totals to source system.

## Output Format

Return:
- Diagnosis
- Recommended refresh policy
- Model optimization actions
- Risk checklist
- Test plan
