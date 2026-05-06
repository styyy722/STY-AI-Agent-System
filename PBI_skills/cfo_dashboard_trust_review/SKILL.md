---
name: cfo-dashboard-trust-review
description: Review whether a Power BI dashboard is trustworthy for CFO or executive use across visual design, metric definitions, model quality, data freshness, security, and actionability.
---

# CFO Dashboard Trust Review

Use this skill when the user asks whether a Power BI dashboard, finance dashboard, or executive report can be trusted for decision-making.

## Review Workflow

1. Check audience and decision:
   - Identify the CFO/executive decision the dashboard supports.
   - Flag visuals that are interesting but not decision-critical.

2. Review metric trust:
   - Confirm metric definitions, scenario filters, time periods, currency, and variance logic.
   - Flag ambiguous labels like "Revenue", "Margin", or "Forecast" without definition.

3. Review model and refresh risk:
   - Star schema quality, relationship direction, DAX complexity, refresh status, source lineage, and certified dataset use.

4. Review visual communication:
   - Executive layout, KPI hierarchy, variance callouts, exception highlighting, chart choice, accessibility, and clutter.

5. Review governance:
   - RLS/OLS, sensitivity labels, export risk, ownership, data freshness, and sign-off controls.

## Output Format

Return:
- CFO trust rating: High / Moderate / Low
- Top 5 trust blockers
- Metric validation checklist
- Power BI remediation actions
- Executive-ready recommendation
