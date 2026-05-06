---
name: power-query-finance-etl
description: Build Power Query transformations for finance data such as trial balances, chart of accounts, budget files, forecast files, ERP exports, cost centres, and monthly close packs.
---

# Power Query Finance ETL

Use this skill when cleaning, shaping, or automating finance data ingestion in Power BI.

## Workflow

1. Profile the source:
   - ERP export, Excel workbook, CSV, SharePoint folder, dataflow, SQL table, or manual forecast template.

2. Standardize structure:
   - Promote headers, remove blank rows, unpivot monthly columns, enforce data types, trim text, standardize account codes.

3. Add finance mappings:
   - Chart of accounts hierarchy.
   - Cost centre/business unit mapping.
   - Scenario mapping: Actual, Budget, Forecast.
   - Currency and entity mapping.

4. Automate safely:
   - Prefer folder ingestion for recurring monthly files.
   - Keep transformation steps named and auditable.
   - Avoid hard-coded row numbers when files change monthly.

5. Validate:
   - Row count, account coverage, unmapped accounts, duplicate keys, total debits/credits, control totals.

## Output Format

Return:
- Power Query transformation plan
- M code where useful
- Mapping table requirements
- Validation checks
- Automation risks
