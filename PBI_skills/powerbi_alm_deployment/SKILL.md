---
name: power-bi-alm-deployment
description: Plan Power BI application lifecycle management with PBIP, Git, deployment pipelines, dev/test/prod workspaces, release checks, rollback, and change governance.
---

# Power BI ALM and Deployment

Use this skill when teams need repeatable Power BI releases, version control, deployment pipelines, or production governance.

## Workflow

1. Define environments:
   - Development, test/UAT, production.
   - Separate workspace roles and ownership.

2. Define source control approach:
   - PBIP or other metadata-based project structure.
   - Branching, pull requests, code review, and release tagging.

3. Build deployment checklist:
   - Dataset schema changes.
   - Measure changes.
   - RLS/OLS changes.
   - Refresh settings.
   - Gateway/data source credentials.
   - App audience changes.

4. Validate before release:
   - Refresh test.
   - Key metric reconciliation.
   - Visual regression review.
   - Access/security review.
   - Performance smoke test.

5. Rollback plan:
   - Previous version, owner, rollback trigger, communication plan.

## Output Format

Return:
- ALM design
- Release checklist
- Approval gates
- Rollback plan
- Risks and owners
