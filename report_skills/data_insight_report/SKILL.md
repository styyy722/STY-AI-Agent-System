---
name: data-insights-report
description: Turn data analysis findings into structured business reports for non-technical stakeholders. Use when EDA, cohort analysis, metric investigations, or dashboard findings need to be packaged into a narrative that drives decisions — not just shows data.
---

# Data Insights Report Skill

## When to use
- An EDA or analysis is complete and the findings need to be communicated to a business audience
- A dashboard has surfaced an anomaly and a written explanation is needed for management
- A data team needs to present findings to a stakeholder who won't read a Jupyter notebook
- A metric drop or spike has been investigated and the cause needs to be documented
- A product or commercial team needs data-backed recommendations in plain English

## Report structure

### Data insights report
1. **Key finding** — one sentence: what is the single most important thing the data shows? This is the headline.
2. **Business context** — why does this finding matter to the business right now? Link the data insight to a business decision, risk, or opportunity.
3. **What the data shows** — a plain-English summary of the analytical findings. Use specific numbers. Avoid technical jargon (p-values, standard deviations) unless the audience is technical. Translate statistical findings into business language.
4. **What is driving it** — root causes or contributing factors, in order of impact. Distinguish confirmed causes from hypotheses.
5. **What it means for the business** — implications for revenue, cost, customer behaviour, operational performance, or risk. Quantify where possible.
6. **Recommended actions** — specific actions tied to each insight. Name who should act, what they should do, and what success looks like.
7. **Limitations and caveats** — data quality issues, coverage gaps, time lags, or assumptions that affect the reliability of the findings. Be honest — hiding limitations damages trust.
8. **Next steps for analysis** — what further investigation would strengthen the findings or answer the remaining questions?

## Translating analysis into business language

| Analytical term | Business language |
|---|---|
| Statistically significant | Reliable finding — not due to chance |
| Confidence interval | We expect the true figure to be between X and Y |
| Correlation | These two things move together — but we haven't confirmed causation |
| Outlier | An unusual value that warrants investigation |
| Distribution | How the values are spread across the dataset |
| Cohort | A group of customers/users who started at the same time |
| Churn rate | The percentage of customers who stopped using the product |

## Writing rules for data insights reports
- Lead with the insight, not the methodology. ("Revenue per user has declined 12% since March, driven by a shift toward lower-tier plans" — not "We ran a cohort analysis and found...")
- Every number in the report must have a denominator or context. "Users dropped by 400" means nothing without "...out of a base of 8,000 (5% decline)."
- Do not present correlation as causation without stating the evidence for causation explicitly.
- Flag data quality issues upfront — do not hide them in footnotes.
- If the data does not support a conclusion, say so rather than overstating certainty.

## Tone
Clear, confident, and business-focused. Written for a reader who trusts numbers but does not want to see the working. Avoid academic hedging ("it appears that", "it could be argued") — state what the data shows and what you recommend.
