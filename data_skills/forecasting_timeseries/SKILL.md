---
name: forecasting-timeseries
description: Build time-series forecasts with trend, seasonality, holidays, forecast intervals, backtesting, forecast accuracy, and business interpretation.
---

# Forecasting and Time Series

Use this skill when forecasting revenue, demand, usage, cost, churn, inventory, cash flow, or operational metrics over time.

## Workflow

1. Define forecast target:
   - Metric, grain, horizon, cadence, required accuracy, and decision use.

2. Profile series:
   - Trend, seasonality, missing periods, outliers, structural breaks, calendar/holiday effects.

3. Choose method:
   - Naive, moving average, exponential smoothing, regression with drivers, ARIMA-style, Prophet-style, or machine learning.

4. Backtest:
   - Train/test split by time.
   - Measure MAPE, MAE, RMSE, bias, and forecast interval coverage.

5. Interpret:
   - Explain expected trend, uncertainty range, key assumptions, and risks.

## Output Format

Return:
- Forecast method
- Data requirements
- Backtest plan
- Forecast output table
- Business interpretation
