---
name: churn-prediction
description: Build churn and retention analysis workflows including churn definition, feature design, leakage checks, model interpretation, risk scoring, and retention playbooks.
---

# Churn Prediction

Use this skill when predicting customer/user/account churn or explaining retention risk.

## Workflow

1. Define churn:
   - Event, inactivity window, account/user level, voluntary/involuntary, revenue/customer churn.

2. Build dataset:
   - Observation date, prediction horizon, label window, features available before observation date.

3. Prevent leakage:
   - Remove features that reveal future churn, cancellation events, post-outcome support cases, or future billing fields.

4. Model and explain:
   - Baseline model, feature importance, calibration, precision/recall, lift by decile, segment performance.

5. Operationalize:
   - Risk tiers, retention actions, owner, timing, expected ROI, monitoring.

## Output Format

Return:
- Churn definition
- Feature plan
- Leakage checks
- Evaluation metrics
- Retention action plan
