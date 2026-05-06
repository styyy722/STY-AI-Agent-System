---
name: scenario-monte-carlo
description: Perform scenario, sensitivity, and Monte Carlo risk analysis for NPV, IRR, EBITDA, revenue, margin, cash flow, valuation, and downside planning.
---

# Scenario and Monte Carlo Analysis

Use this skill when a finance decision depends on uncertainty, ranges, scenarios, or probabilistic outcomes.

## Workflow

1. Define decision metric:
   - NPV, IRR, payback, EBITDA, cash balance, covenant headroom, valuation, revenue, margin.

2. Identify uncertain inputs:
   - Price, volume, churn, conversion, cost inflation, capex, FX, interest rates, working capital, timing.

3. Build scenarios:
   - Base, upside, downside, stress case.
   - State assumptions and probability if known.

4. Run sensitivity:
   - One-way and two-way sensitivities.
   - Tornado chart ranking where useful.

5. Monte Carlo:
   - Use distributions only when ranges are justifiable.
   - Report percentile outcomes: P10, P50, P90, probability of loss, probability of covenant breach.

## Output Format

Return:
- Scenario table
- Sensitivity analysis
- Monte Carlo design
- Risk interpretation
- Decision recommendation
