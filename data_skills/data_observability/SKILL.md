---
name: data-observability
description: Monitor data pipeline health, freshness, volume, schema drift, null spikes, duplicates, distribution shifts, and data incident risk for production analytics.
---

# Data Observability

Use this skill when production reports, dashboards, semantic models, or pipelines need monitoring or incident diagnosis.

## Workflow

1. Define monitored asset:
   - Table, pipeline, dashboard, semantic model, report, metric, or data product.

2. Monitor key signals:
   - Freshness, volume, schema, null rate, duplicate rate, referential integrity, distribution drift, failed jobs.

3. Set thresholds:
   - Static thresholds for known business rules.
   - Dynamic thresholds based on rolling historical behavior.
   - Severity levels: critical, high, medium, low.

4. Diagnose incidents:
   - Identify first failing point, upstream dependency, affected metrics, downstream reports, owner, and business impact.

5. Recommend controls:
   - Alerts, SLAs, ownership, incident runbook, data contracts, and automated quality checks.

## Output Format

Return:
- Observability checklist
- Suggested monitors
- Thresholds
- Incident diagnosis
- Remediation plan
