---
name: dax-finance-measure-library
description: Create reusable finance DAX measures for revenue, margin, EBITDA, variance, price-volume-mix, FX, ARR, MRR, working capital, and financial statement reporting.
---

# DAX Finance Measure Library

Use this skill when the user asks for finance-specific DAX measures or wants a reusable measure pattern for Power BI financial reporting.

## Measure Standards

- Use explicit measures, not implicit aggregations.
- Use `VAR` / `RETURN` for readability and repeated expressions.
- Prefer `DIVIDE()` over `/`.
- Prefix helper measures clearly and hide technical measures from report users.
- State required table and column assumptions before writing DAX.

## Core Measure Families

1. Actual, budget, and forecast:
   - `[Actual Amount]`, `[Budget Amount]`, `[Forecast Amount]`
   - `[Variance to Budget]`, `[Variance to Budget %]`
   - `[Variance to Forecast]`, `[Prior Year Actual]`

2. Profitability:
   - `[Revenue]`, `[COGS]`, `[Gross Profit]`, `[Gross Margin %]`
   - `[EBITDA]`, `[EBITDA Margin %]`, `[Operating Profit]`

3. Price-volume-mix:
   - Volume impact, price/rate impact, mix impact, FX impact, residual.
   - Always disclose the decomposition formula used.

4. SaaS and recurring revenue:
   - `[MRR]`, `[ARR]`, `[New MRR]`, `[Expansion MRR]`, `[Churned MRR]`, `[NRR %]`, `[GRR %]`

5. Working capital:
   - `[DSO]`, `[DPO]`, `[DIO]`, `[Cash Conversion Cycle]`

## Output Format

For each measure:
- Purpose
- Required model assumptions
- DAX formula
- Explanation
- Validation check
