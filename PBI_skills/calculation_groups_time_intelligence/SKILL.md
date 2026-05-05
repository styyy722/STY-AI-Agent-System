---
name: calculation-groups-time-intelligence
description: Design Power BI calculation groups and time intelligence patterns for MTD, QTD, YTD, prior year, rolling periods, scenarios, and reusable financial reporting logic.
---

# Calculation Groups and Time Intelligence

Use this skill for reusable Power BI time intelligence, calculation groups, scenario selectors, and financial reporting period logic.

## Workflow

1. Confirm date model readiness:
   - Dedicated date table marked as date table.
   - Continuous date range.
   - Fiscal year, fiscal quarter, month, week, and period columns if finance reporting needs them.

2. Choose calculation group pattern:
   - Time period group: Current, MTD, QTD, YTD, Rolling 3M, Rolling 12M.
   - Comparison group: Prior Period, Prior Year, Variance, Variance %.
   - Scenario group: Actual, Budget, Forecast, Prior Forecast.

3. Use calculation items carefully:
   - Use `SELECTEDMEASURE()` for reusable logic.
   - Avoid applying time intelligence to ratios without checking numerator/denominator logic.
   - Use format string expressions where currency, percentage, and decimal formats differ.

4. Validate:
   - Compare calculation group output to standalone measures.
   - Test totals, subtotals, blank periods, fiscal year rollovers, and inactive relationships.

## Output Format

Return:
- Calculation group design
- Calculation items
- DAX expressions
- Format strings
- Validation checklist
