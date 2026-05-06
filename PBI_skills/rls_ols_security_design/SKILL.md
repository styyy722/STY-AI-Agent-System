---
name: rls-ols-security-design
description: Design Power BI row-level security and object-level security for finance reporting by entity, region, business unit, cost centre, manager, and sensitive fields.
---

# RLS and OLS Security Design

Use this skill when designing or reviewing Power BI security for sensitive or segmented corporate reporting.

## Workflow

1. Identify security dimensions:
   - Legal entity, business unit, region, department, cost centre, manager, project, customer, or product.

2. Choose security pattern:
   - Static role filters for simple groups.
   - Dynamic RLS using user principal name and security mapping tables for enterprise use.
   - OLS for hiding sensitive tables or fields such as salary, margin, or customer PII.

3. Design security tables:
   - User table, user-to-entity bridge, entity hierarchy, exceptions, and admin override.
   - Avoid bidirectional security unless explicitly justified.

4. Validate:
   - Test as role.
   - Validate totals against expected scope.
   - Check export permissions and Analyze in Excel exposure.

## Output Format

Return:
- Security pattern
- Required tables/relationships
- DAX role filters
- Test cases
- Risk notes
