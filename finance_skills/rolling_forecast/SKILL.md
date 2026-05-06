---
name: rolling-forecast
description: Construct rolling forecasts for finance teams, including actualisation, forecast versioning, variance to prior forecast, forecast accuracy, and forward-looking risk commentary.
---

# Rolling Forecast

Use this skill for 12, 18, or 24-month rolling forecasts, reforecasts, forecast refreshes, or CFO forecast packs.

## Workflow

1. Set forecast structure:
   - Horizon, cadence, actualized months, forecast months, version naming, and scenario ownership.

2. Actualize:
   - Lock historical actuals.
   - Replace prior forecast periods with actuals.
   - Preserve prior forecast versions for comparison.

3. Forecast forward:
   - Use run-rate, driver-based, seasonality, pipeline, or management overlay methods.
   - Document all overrides separately from model-driven forecast.

4. Analyse:
   - Variance to budget, prior forecast, prior year, and latest actual run-rate.
   - Forecast accuracy by account, business unit, and driver.

## Output Format

Return:
- Forecast model structure
- Versioning approach
- Forecast method by line item
- Variance commentary
- Forecast accuracy and risks
