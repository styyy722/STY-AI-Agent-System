---
name: power-bi-financial-reporting
description: Build Power BI financial reporting models for P&L, balance sheet, cash flow, actuals, budget, forecast, variance, YTD, rolling periods, and CFO-ready reporting.
---

# Power BI Financial Reporting

Use this skill when designing or reviewing Power BI reports for finance teams, CFO packs, month-end reporting, board packs, management accounts, actual vs budget reporting, or forecast reporting.

## Workflow

1. Confirm the financial reporting grain:
   - Legal entity, business unit, cost centre, account, product, customer, date, scenario, and currency.
   - Confirm whether the report is monthly, weekly, daily, or transaction-level.

2. Design the semantic model:
   - Use a star schema with `FactGL`, `FactBudget`, `FactForecast`, and dimensions for date, account, entity, department, scenario, product/customer, and currency.
   - Keep chart-of-accounts hierarchy in a dedicated account dimension.
   - Avoid many-to-many relationships unless there is a documented bridge table.

3. Define core finance measures:
   - Actual, Budget, Forecast, Prior Year, Variance, Variance %, YTD, QTD, MTD, Rolling 12M.
   - Revenue, COGS, Gross Profit, EBITDA, EBIT, Net Income, Free Cash Flow.
   - Working capital, debt, cash, and covenant metrics where relevant.

4. Build statement layouts:
   - P&L: use account hierarchy, subtotal logic, sign convention, and custom sort order.
   - Balance sheet: classify assets, liabilities, equity, current/non-current.
   - Cash flow: operating, investing, financing, opening cash, movement, closing cash.

5. Check reporting controls:
   - Tie totals back to source trial balance or ERP extract.
   - Validate actual/budget/forecast scenario filters.
   - Reconcile report totals to source system control totals.

## Output Format

Return:
- Recommended model structure
- Required tables and relationships
- Core DAX measures
- Validation checks
- Known risks and assumptions
