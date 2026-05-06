---
name: experimentation-ab-testing
description: Design and evaluate A/B tests, experiments, sample sizes, lift, statistical significance, confidence intervals, guardrail metrics, and rollout decisions.
---

# Experimentation and A/B Testing

Use this skill when designing experiments or evaluating test results for product, marketing, pricing, UX, or operations.

## Workflow

1. Define hypothesis:
   - Treatment, control, target metric, expected direction, minimum detectable effect, and decision rule.

2. Design test:
   - Randomization unit, eligibility, exclusions, sample size, duration, guardrail metrics, and stopping rules.

3. Validate data:
   - Sample ratio mismatch, duplicate users, exposure logging, pre-period balance, missing outcomes.

4. Analyze:
   - Lift, confidence interval, p-value where appropriate, practical significance, segment effects, guardrail impact.

5. Recommend:
   - Ship, iterate, stop, extend test, or rerun due to invalid design.

## Output Format

Return:
- Experiment design
- Metric definitions
- Analysis plan
- Result interpretation
- Rollout recommendation
