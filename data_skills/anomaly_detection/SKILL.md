---
name: anomaly-detection
description: Detect and explain unusual movements in business metrics such as revenue, cost, conversion, churn, usage, inventory, claims, refresh volume, or operational KPIs.
---

# Anomaly Detection

Use this skill when a metric spikes, drops, behaves unusually, or needs automated exception detection.

## Workflow

1. Define metric:
   - Metric formula, grain, time interval, dimensions, expected seasonality, and business owner.

2. Validate data:
   - Check freshness, row count, schema, missing values, duplicates, and definition changes.

3. Detect anomaly:
   - Compare to rolling average, standard deviation, seasonal baseline, prior period, prior year, and control limits.

4. Explain:
   - Decompose by dimension: product, customer, channel, region, cohort, source system, campaign, segment.

5. Classify:
   - Data issue, business event, seasonality, process change, one-off, or unknown.

## Output Format

Return:
- Anomaly summary
- Detection method
- Driver decomposition
- Confidence rating
- Recommended follow-up
