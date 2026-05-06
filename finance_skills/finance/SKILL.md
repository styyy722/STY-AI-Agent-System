---
name: "sty-finance-overview"
description: "STY Agent finance domain overview. Routes to the correct specialist skill for financial ratio analysis, DCF valuation, budget variance, forecasting, stock analysis, investment analysis, and capital allocation decisions."
version: 2.0.0
---

# STY Finance Skills — Overview

This skill provides orientation for all finance-related requests in the STY Agent system. When a finance query is received, use this overview to select the most appropriate specialist skill and apply it.

## Finance Skills Available

| Skill Folder | Focus Area | When to Use |
|---|---|---|
| `financial-analyst/` | Ratio analysis, DCF, WACC, budget variance, forecasting | Financial statements, company valuation, modelling |
| `stock_analysis/` | Stock and crypto analysis via yfinance | Ticker-based analysis, market data, portfolio P&L |
| `investment_advisor/` | Capital allocation, ROI, IRR, NPV, build vs buy | Business investment decisions, capex approval, ROI |
| `driver_based_planning/` | Driver-based planning and FP&A models | Budgeting, planning, forecasts driven by operational levers |
| `rolling_forecast/` | Rolling forecasts and forecast versioning | 12/18/24-month forecasts, actualisation, forecast accuracy |
| `variance_bridge/` | Variance bridge and CFO commentary | Actual vs budget/forecast/prior year, price-volume-mix, FX |
| `three_statement_model/` | Integrated financial statements | Linked P&L, balance sheet, cash flow, debt, working capital |
| `working_capital_cashflow/` | Working capital and liquidity | DSO, DPO, DIO, cash conversion, cash runway, cash forecast |
| `scenario_monte_carlo/` | Scenario, sensitivity, Monte Carlo | NPV/IRR/EBITDA/cash risk analysis under uncertainty |
| `unit_economics/` | Unit economics and SaaS metrics | CAC, LTV, payback, NRR, GRR, churn, contribution margin |
| `pricing_margin_analysis/` | Pricing and profitability | Discounting, margin leakage, cost-to-serve, price increases |
| `close_reporting_pack/` | Month-end and CFO packs | Flash reports, management accounts, board finance summaries |
| `covenant_credit_analysis/` | Debt covenant and credit analysis | Leverage, interest cover, DSCR, covenant headroom |

## Skill Selection Guide

Use this decision tree every time a finance request arrives:

**Does the user name a stock ticker or crypto symbol (e.g. AAPL, BTC-USD, ASX:CBA)?**
→ Yes → Use `stock_analysis` skill. Fetch live data with yfinance. Output: Price & Momentum, Fundamentals, Analyst View, Key Risks, Outlook (Positive / Neutral / Cautious). Never use BUY/SELL language.

**Does the user ask about financial statements, ratios, DCF, WACC, CAPM, or company valuation?**
→ Yes → Use `financial-analyst` skill. Show formulas, plug in numbers, state every assumption.

**Does the user ask "should I invest in / buy / build / hire / lease X" where X is a business decision (equipment, software, real estate, headcount)?**
→ Yes → Use `investment_advisor` skill. Calculate ROI, IRR, NPV, payback period. This skill is for business capital allocation — NOT for securities or stock market advice.

**Does the user ask for budget, forecast, planning, management reporting, or CFO pack support?**
→ Yes → Use `driver_based_planning`, `rolling_forecast`, `variance_bridge`, or `close_reporting_pack` depending on the wording. Prioritise driver logic, variance decomposition, and decision-ready commentary.

**Does the user ask about cash, liquidity, working capital, debt, covenants, or downside risk?**
→ Yes → Use `working_capital_cashflow`, `covenant_credit_analysis`, or `scenario_monte_carlo`. Quantify headroom, cash runway, breach risk, and sensitivity.

**Does the user ask about pricing, margins, SaaS metrics, or customer/product profitability?**
→ Yes → Use `pricing_margin_analysis` or `unit_economics`. Separate revenue, discounting, direct cost, cost-to-serve, gross margin, contribution margin, and payback.

**Does the user ask for a full financial model?**
→ Yes → Use `three_statement_model` with `driver_based_planning` and `scenario_monte_carlo` where appropriate.

**Is the request general finance education (e.g. "what is EBITDA", "explain leverage")?**
→ Yes → Answer directly using financial-analyst knowledge. Give a definition, the formula, and a worked example.

**Overlap rule:** If a query matches more than one skill, load both and combine them. For example, "should I invest in Tesla stock" touches both stock_analysis (ticker research) and investment_advisor (decision framework) — use both.

## Core Finance Rules

- Always separate facts from assumptions. Label every assumption explicitly with 🔴 if low-confidence.
- Never invent financial figures, ratios, or market data. Fetch live data or ask the user to provide it.
- For DCF and valuation work, always state: discount rate, terminal growth rate, projection period, and data source.
- When writing Python for financial calculations, always use `print()` statements so results surface for interpretation.
- Every stock, crypto, or investment output must end with the standard disclaimer: "⚠ This analysis is for informational purposes only and is not financial advice."
