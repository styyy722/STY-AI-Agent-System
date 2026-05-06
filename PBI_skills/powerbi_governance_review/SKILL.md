---
name: power-bi-governance-review
description: Review Power BI governance for workspaces, access, sensitivity labels, endorsements, certified datasets, sharing, lineage, and corporate reporting controls.
---

# Power BI Governance Review

Use this skill for corporate Power BI governance, risk, access reviews, reporting controls, and enterprise adoption.

## Review Areas

1. Workspace governance:
   - Workspace purpose, owner, admin list, lifecycle stage, dev/test/prod separation.

2. Dataset and report certification:
   - Promoted/certified semantic models.
   - Clear data owner and business owner.
   - Deprecated duplicate reports flagged for retirement.

3. Security:
   - Workspace roles, app audiences, external sharing, RLS/OLS, sensitivity labels.
   - Check whether users can export underlying data.

4. Lineage and impact:
   - Upstream dataflows, semantic models, reports, dashboards, and downstream dependencies.

5. Operational controls:
   - Refresh failures, gateway status, ownership gaps, unused assets, and duplicate models.

## Output Format

Return:
- Governance risk rating
- Findings by severity
- Recommended controls
- Owner/action/timeline table
- Questions for admins
