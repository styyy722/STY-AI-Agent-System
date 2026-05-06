# STY AI Agent System

A CLI and web-based AI business agent for finance, data analytics, Power BI, reporting, and decision-ready business writing.

This repo is designed around one goal: **produce better business outputs faster, while keeping assumptions, risks, evidence, cost, and review controls visible.**

---

## What the agent does

STY AI Agent System helps with:

- **Finance workflows**: WACC, CAPM, valuation, rolling forecasts, driver-based planning, variance bridges, working capital, cash flow, unit economics, pricing/margin analysis, covenant checks, stock analysis, and capital allocation.
- **Data analytics workflows**: dataset overview, EDA, data observability, data contracts, anomaly detection, forecasting, experiments, causal inference, segmentation, churn, SQL review, schema mapping, metrics, and root-cause investigation.
- **Power BI workflows**: DAX optimisation, finance measure libraries, financial reporting models, CFO dashboard trust review, semantic model review, calculation groups, incremental refresh, RLS/OLS, Power Query finance ETL, governance, ALM/deployment, audit monitoring, and report design.
- **Reporting workflows**: executive summaries, board papers, business cases, financial performance reports, project status reports, risk reports, and slide-ready insights.
- **Productivity workflows**: general business writing, structured analysis, action plans, reusable session context, and local output saving.

The agent is not just a chat wrapper. It includes a CLI, web UI, skill registry, file and image ingestion, auto multi-mode workflow orchestration, memory, RAG-style local knowledge indexing, governed plugin tools, optional web search, optional Python execution for data mode, cost tracking, confidence scoring, audit logs, access controls, and a review queue.

---

## How to get the best outputs

For efficient, high-quality results, use this pattern:

```bash
npm run dev -- <mode> "<clear task + audience + expected format>" \
  --file "<supporting file>" \
  --session <project-session> \
  --output "outputs/<deliverable>.md"
```

A strong prompt usually includes:

1. **Task**: what you want produced.
2. **Context**: project, company, dataset, assignment, or business situation.
3. **Audience**: analyst, manager, board, client, lecturer, technical reviewer.
4. **Format**: table, report, executive summary, code, bullet points, markdown, board paper.
5. **Quality bar**: assumptions, limitations, checks, calculations, risks, citations, or review criteria.

Example:

```bash
npm run dev -- data \
  "Run an EDA-style review of this dataset. Focus on data quality, missingness, target imbalance, modelling risks, and business implications. Return a concise summary table and recommended next steps." \
  --file "data/unicef_dataset.csv" \
  --session unicef-eda \
  --output "outputs/unicef-eda-review.md"
```

For complex cross-functional tasks, use the `auto` workflow and let the agent decide which specialist modes to apply:

```bash
npm run dev -- ask \
  "Review this CFO dashboard. Validate the Power BI design, data quality, metric definitions, finance logic, and produce an executive-ready action list." \
  --file "dashboard-screenshot.png" \
  --file "financials.xlsx" \
  --workflow auto
```

---

## Quick start

### 1. Install requirements

You need:

- Node.js **20+**
- npm
- Python 3, required for PDF/XLSX extraction scripts and optional Python code execution
- An Anthropic API key, or an OpenAI API key if using the OpenAI fallback provider

### 2. Install packages

```bash
npm install
```

### 3. Create your `.env`

macOS/Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then edit `.env` and add your keys.

Minimum Anthropic setup:

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_key_here
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_MODEL_PREMIUM=claude-opus-4-7
```

Optional OpenAI fallback:

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_key_here
```

Optional live web search:

```env
WEB_SEARCH_ENABLED=true
TAVILY_API_KEY=your_tavily_key_here
```

Optional data-mode Python execution:

```env
CODE_EXECUTION_ENABLED=true
```

Optional memory and RAG:

```env
MEMORY_ENABLED=true
RAG_ENABLED=true
```

Optional cost control:

```env
DAILY_BUDGET_USD=15.00
```

Optional tool permission policy:

```env
# Comma-separated permissions available to auto-invoked tools.
# Supported: context-read, network, filesystem-read, filesystem-write, code-execution, external-api
TOOL_ALLOWED_PERMISSIONS=context-read,network,external-api,code-execution
```

### 4. Verify setup

```bash
npm run dev -- hello
```

This checks that the `.env` exists, the API key is present, the API connection works, and skills can be loaded.

---

## Running the agent

During development, use:

```bash
npm run dev -- <command>
```

After building, use:

```bash
npm run build
npm start -- <command>
```

For a local global CLI command, build and link:

```bash
npm run build
npm link
sty-agent hello
```

---

## Main modes

| Mode | Use for | Example |
|---|---|---|
| `ask` | General business tasks, planning, writing, productivity | `npm run dev -- ask "Help me structure a project plan"` |
| `finance` | WACC, valuation, investment analysis, ratios, stock/portfolio analysis | `npm run dev -- finance "Explain WACC and list required assumptions"` |
| `data` | EDA, data quality, SQL, modelling, dashboards, metrics | `npm run dev -- data "Summarise this dataset" --file data.csv` |
| `report` | Executive summaries, board papers, business cases, risk/status reports | `npm run dev -- report "Turn this analysis into a board-ready summary" --file analysis.md` |
| `pbi` | Power BI, DAX, semantic models, report design, governance | `npm run dev -- pbi "Review this DAX measure"` |

Use `--deep` when quality matters more than speed. It runs a multi-agent pipeline: **Planner → Analyst → Critic → Synthesiser**.

```bash
npm run dev -- report \
  "Write a board-ready recommendation based on this analysis. Include risks, assumptions, and decision required." \
  --file "analysis.md" \
  --deep \
  --output "outputs/board-recommendation.md"
```

---

## Workflow types

Use `--workflow` when you want the agent to run through a specific orchestration pattern.

| Workflow | What it does | When to use |
|---|---|---|
| `standard` | Single specialist pass in the selected mode | Fast answers and normal analysis |
| `auto` | Detects multiple relevant modes, runs specialist passes, then synthesises one answer | Complex prompts spanning finance, data, Power BI, and reporting |
| `routing` | Routes to one best specialist mode before answering | You are unsure which single mode to use |
| `evaluator-optimizer` | Generates, scores, and rewrites if quality is below threshold | Higher-quality deliverables without full deep mode |
| `human-approval` | Generates output and forces it into the review queue | Corporate or high-risk outputs requiring sign-off |
| `long-running` | Iterates up to `--max-iterations` until completion or quality improves | Longer analytical tasks that benefit from repeated refinement |

Examples:

```bash
npm run dev -- ask "Review this CFO dashboard for Power BI, data quality, and finance logic" \
  --file dashboard.png \
  --file financials.xlsx \
  --workflow auto

npm run dev -- finance "Build a rolling forecast and variance commentary" \
  --file actuals.xlsx \
  --workflow evaluator-optimizer

npm run dev -- report "Draft this board paper and queue it for approval" \
  --file analysis.md \
  --workflow human-approval
```

`--deep` is separate from `--workflow`. Deep mode runs the multi-agent Planner → Analyst → Critic → Synthesiser pipeline. `--workflow auto` is better when one prompt needs multiple business modes in a single execution round.

---

## Common command options

The main agent modes support these options:

| Option | Purpose | Example |
|---|---|---|
| `-f, --file <path>` | Attach a supported file or image. Repeat for multiple files. | `--file data.csv --file brief.pdf` |
| `--folder <path>` | Load supported files from a folder. | `--folder docs` |
| `-r, --recursive` | With `--folder`, include subfolders up to the built-in depth limit. | `--folder docs --recursive` |
| `--pattern <text>` | With `--folder`, only include files whose name contains text. | `--folder docs --pattern forecast` |
| `-o, --output <path>` | Save the response locally. | `--output outputs/summary.md` |
| `-s, --session <id>` | Continue a reusable conversation session. | `--session telstra-wacc` |
| `--deep` | Use multi-agent quality review. | `--deep` |
| `--workflow <type>` | Use a workflow: `auto`, `standard`, `routing`, `evaluator-optimizer`, `human-approval`, `long-running`. | `--workflow auto` |
| `--dry-run-tools` | Preview relevant tool calls without side effects. | `--dry-run-tools` |
| `--tool-permission <permission>` | Restrict which tool permissions are allowed for this run. Repeat or comma-separate. | `--tool-permission context-read,network` |
| `--max-iterations <n>` | Maximum loop count for `long-running` workflow. | `--max-iterations 4` |

---

## File input support

The file reader supports:

```text
.txt
.md
.csv
.json
.xlsx
.pdf
```

Image attachments are also supported for vision-capable models:

```text
.png
.jpg
.jpeg
.gif
.webp
```

Examples:

```bash
npm run dev -- ask "Summarise this document" --file "brief.md"

npm run dev -- data "Profile this dataset and identify quality issues" --file "dataset.csv"

npm run dev -- finance "Analyse this company note and flag valuation assumptions" --file "company-note.pdf"

npm run dev -- report "Create a concise executive summary from these files" \
  --file "analysis.md" \
  --file "financials.xlsx"
```

### Folder input

```bash
npm run dev -- report \
  "Read these project notes and prepare a steering committee update" \
  --folder "project_docs" \
  --recursive \
  --pattern "status"
```

Folder ingestion skips common system folders such as `.git`, `node_modules`, `dist`, `logs`, `usage`, `review_queue`, `tool_audit`, `web_uploads`, and `web_outputs`.

### Important PDF/XLSX setup note

`src/tools/fileReader.ts` looks for extraction scripts in either `scripts/` or `script/`:

```text
scripts/extract_pdf.py
scripts/extract_xlsx.py
script/extract_pdf.py
script/extract_xlsx.py
```

If PDF or Excel ingestion fails, check that one of those script locations exists and that Python 3 is available.

---

## Output saving

Use `--output` to save the CLI agent response:

```bash
npm run dev -- report \
  "Write an executive summary from this analysis" \
  --file "analysis.md" \
  --output "outputs/executive-summary.md"
```

CLI and web output saving use `saveAgentOutputFile()` in `src/tools/outputWriter.ts` and can generate:

```text
.docx
.xlsx
.pdf
.ipynb
.md
.txt
```

Examples:

```bash
npm run dev -- report "Write a CFO-ready summary" --file analysis.md --output outputs/summary.docx
npm run dev -- data "Create a reproducible analysis note" --file dataset.csv --output outputs/analysis.ipynb
npm run dev -- finance "Summarise this forecast" --file forecast.xlsx --output outputs/forecast-review.pdf
```

Run the web UI with:

```bash
npm run web
```

Then open:

```text
http://localhost:3000
```

From the web UI, use the saved output/download controls to export Markdown, text, Word, Excel, PDF, or notebook files.

---

## Command cheat sheet

### Setup and diagnostics

```bash
npm run dev -- hello
npm run dev -- skills
npm run dev -- skills --category finance
npm run dev -- skills --category data
npm run dev -- skills --category report
npm run dev -- skills --category pbi
npm run dev -- ask "Review this finance dashboard" --workflow auto
npm run dev -- policy
npm run dev -- usage
npm run dev -- usage --week
npm run dev -- logs
npm run dev -- logs --lines 50
```

### Sessions

Use sessions when a project needs several turns of context.

```bash
npm run dev -- finance "Read this project brief and remember the requirements" \
  --file "brief.pdf" \
  --session finc3600-p2

npm run dev -- finance "Now create the WACC assumptions checklist" \
  --session finc3600-p2

npm run dev -- session list
npm run dev -- session clear finc3600-p2
npm run dev -- session clear-all
```

### Memory

Use memory for durable preferences, facts, or reusable project context.

```bash
npm run dev -- memory add "User prefers concise, professional business writing" --category preference
npm run dev -- memory list
npm run dev -- memory list --category preference
npm run dev -- memory delete <memory-id>
npm run dev -- memory clear
```

### RAG knowledge base

Use RAG for reusable local context that should be searchable later.

```bash
npm run dev -- rag index "docs/telstra-wacc-notes.md" --category finance
npm run dev -- rag index "unicef eda assumptions" --text "Target variable is TARGET_purchased; focus on F1 under class imbalance." --category data
npm run dev -- rag search "Telstra WACC assumptions" --category finance --top-k 5
npm run dev -- rag list
npm run dev -- rag stats
npm run dev -- rag delete <document-id>
```

### Review queue

Outputs with lower confidence or higher risk can be placed into the review queue.

```bash
npm run dev -- review list
npm run dev -- review list --pending
npm run dev -- review show <review-id>
npm run dev -- review approve <review-id> --by "Tiffany" --note "Checked calculations"
npm run dev -- review reject <review-id> --by "Tiffany" --note "Needs better assumptions"
npm run dev -- review export <review-id> --output outputs/approved-output.md
```

### Tool governance

Plugin tools declare schemas, permissions, validation rules, and dry-run support. Each relevant, denied, invalid, successful, failed, or dry-run tool event is written to:

```text
tool_audit/
```

Use dry-run mode before allowing tools to make external calls or execute code:

```bash
npm run dev -- data \
  "Analyse this dataset and write any Python needed, but do not run tools yet" \
  --file dataset.csv \
  --dry-run-tools
```

Restrict permissions for a single run:

```bash
npm run dev -- finance \
  "Use current web context if allowed, then summarise market risk" \
  --workflow auto \
  --tool-permission context-read,network,external-api
```

### Access policy

Create a default policy file:

```bash
npm run dev -- policy --init
```

Then edit:

```text
access_policy.json
```

The policy can restrict modes, exports, review approval, blocked extensions, blocked paths, and filename-based data classifications.

---

## Skill system

Skills are domain-specific instruction packs stored as `SKILL.md` files. The agent scans skill folders, matches them against the user request, and injects relevant specialist instructions into the system prompt.

Skill roots in this repo:

```text
finance_skills/
data_skills/
report_skills/
PBI_skills/
general_skills/
```

### Current skill categories

| Category | Folder | Examples |
|---|---|---|
| Finance | `finance_skills/` | financial analyst, WACC, DCF, board finance quality review, investment advisor, stock analysis |
| Data | `data_skills/` | EDA, cohort analysis, data quality, metric governance, observability, data contracts, anomaly detection, forecasting, SQL review |
| Report | `report_skills/` | corporate decision memo, business case, data insights report, executive reporting, financial performance, project status, risk report |
| Power BI | `PBI_skills/` | CFO dashboard trust review, DAX optimisation, finance measure libraries, financial reporting, semantic modelling, governance, ALM, RLS/OLS |
| General | `general_skills/` | screenshot and photo analysis |

### Listing installed skills

```bash
npm run dev -- skills
npm run dev -- skills --category finance
npm run dev -- skills --category data
npm run dev -- skills --category report
npm run dev -- skills --category pbi
```

### Adding a new skill

Create a folder with a `SKILL.md` file:

```text
data_skills/model_comparison/SKILL.md
```

Recommended front matter:

```md
---
name: model-comparison
description: Compare classification and regression models using appropriate validation, metrics, and business interpretation.
---

# Model Comparison Skill

## When to use
Use when the user asks to compare models, rank models, optimise F1, evaluate performance, or prepare modelling recommendations.

## Process
1. Confirm target variable and metric.
2. Check leakage, class imbalance, missingness, and feature types.
3. Establish baseline model.
4. Compare models using cross-validation.
5. Tune only when useful.
6. Report trade-offs and recommended model.

## Output structure
- Objective
- Data assumptions
- Model comparison table
- Best model recommendation
- Risks and next steps
```

---

## Prompt recipes for high-quality outputs

### Finance analysis

```bash
npm run dev -- finance \
  "Analyse this company for WACC. Separate facts from assumptions. Include cost of equity, cost of debt, capital structure, tax treatment, sensitivity checks, and risks. Return a table plus a concise recommendation." \
  --file "company-financials.xlsx" \
  --session company-wacc \
  --output "outputs/company-wacc.md"
```

### Data analysis / EDA

```bash
npm run dev -- data \
  "Run an EDA and data quality review. Focus on schema, missingness, duplicates, outliers, class imbalance, leakage risk, useful feature engineering, and modelling implications. Include a summary table and recommended next steps." \
  --file "dataset.csv" \
  --session dataset-eda \
  --output "outputs/dataset-eda.md"
```

### Model comparison

```bash
npm run dev -- data \
  "Design a low-runtime model comparison workflow to maximise macro F1. Compare Logistic Regression, Random Forest, LightGBM, XGBoost, and CatBoost. Include class imbalance handling, cross-validation, threshold tuning, and a final model comparison table." \
  --file "training_data.csv" \
  --deep \
  --output "outputs/model-comparison-plan.md"
```

### Executive summary

```bash
npm run dev -- report \
  "Turn this analysis into a 1-page executive summary for senior stakeholders. Start with the recommendation. Include evidence, business impact, risks, assumptions, and decision required." \
  --file "analysis.md" \
  --deep \
  --output "outputs/executive-summary.md"
```

### Power BI / DAX review

```bash
npm run dev -- pbi \
  "Review this Power BI DAX measure for correctness, filter context issues, performance, and readability. Explain the issue and provide a cleaner replacement measure." \
  --file "dax-measures.md" \
  --output "outputs/dax-review.md"
```

### Auto multi-mode review

```bash
npm run dev -- ask \
  "Review this CFO dashboard. Validate Power BI design, data quality, metric definitions, finance logic, and produce a prioritised remediation plan." \
  --file "dashboard.png" \
  --file "financials.xlsx" \
  --workflow auto \
  --output "outputs/cfo-dashboard-review.md"
```

### Multi-document project brief workflow

```bash
npm run dev -- report \
  "Read these project documents and produce a decision-ready brief. Include objective, scope, key facts, open questions, risks, and next actions." \
  --folder "project_docs" \
  --recursive \
  --output "outputs/project-brief.md"
```

---

## When to use sessions, memory, RAG, or deep mode

| Feature | Best for | Do not use for |
|---|---|---|
| `--session` | Continuing one project across multiple prompts | Permanent knowledge that should apply across projects |
| `memory` | Stable preferences, reusable facts, recurring project context | Temporary details or sensitive data |
| `rag` | Searchable local knowledge base from documents/notes | One-off attached files that are only needed once |
| `--deep` | High-stakes, final, board-ready, technical, or complex outputs | Quick drafts or simple questions |
| `--workflow auto` | Complex cross-functional prompts needing multiple specialist modes | Simple prompts where one mode is obvious |
| `--output` | Saving outputs for review, sharing, or version control | Secret or sensitive content unless policy allows it |

Recommended workflow for serious deliverables:

```bash
# 1. Load project context into a session
npm run dev -- ask "Read and remember this brief. Summarise requirements and constraints only." \
  --file "brief.pdf" \
  --session project-x

# 2. Generate analysis
npm run dev -- data "Analyse the dataset against the project requirements" \
  --file "dataset.csv" \
  --session project-x \
  --output "outputs/project-x-analysis.md"

# 3. Produce final stakeholder output with deep review
npm run dev -- report "Create the final executive summary with recommendation, evidence, risks, assumptions, and next steps" \
  --session project-x \
  --deep \
  --output "outputs/project-x-exec-summary.md"
```

---

## Output quality controls

The system includes several quality mechanisms:

| Control | Purpose |
|---|---|
| Skill registry | Adds domain-specific instructions to improve structure and accuracy |
| Multi-agent `--deep` mode | Adds planning, analysis, critique, and synthesis for stronger outputs |
| Auto workflow | Detects relevant modes, runs specialist passes, and synthesises one final answer |
| Confidence scoring | Scores factual grounding, assumptions, completeness, and domain risk |
| Review queue | Holds outputs that need approval before export or use |
| Cost tracking | Tracks estimated API usage against a daily budget |
| Audit logs | Records command activity, model, duration, matched skills, confidence, and status |
| Tool audit logs | Records tool relevance, permission denial, validation errors, dry-runs, success, and failure |
| Access policy | Blocks sensitive file types, restricted paths, and classified filenames |
| RAG | Reuses indexed local knowledge for more consistent project-specific outputs |
| Memory | Recalls useful preferences and durable context across sessions |

A high-quality output should:

- answer the actual task directly;
- separate facts, assumptions, and recommendations;
- show formulas or logic where relevant;
- avoid invented numbers or unsupported claims;
- flag missing data and limitations;
- include a clear next action or decision;
- be tailored to the audience and format requested.

---

## Cost and efficiency tips

- Use `ask`, `finance`, or `data` without `--deep` for quick drafts.
- Use `report --deep` only for final or high-stakes outputs.
- Use `--workflow auto` for complex prompts that naturally span finance, data, Power BI, and reporting.
- Use `--dry-run-tools` when you want to preview tool usage before external calls or code execution.
- Attach only the files needed for the task.
- Use `--pattern` when reading folders to avoid irrelevant context.
- Use `--session` to avoid repeatedly re-uploading or re-explaining the same project context.
- Use `rag index` for reusable notes, not for every temporary file.
- Check usage regularly:

```bash
npm run dev -- usage
npm run dev -- usage --week
```

---

## Web search

The web-search plugin is auto-invoked when:

```env
WEB_SEARCH_ENABLED=true
TAVILY_API_KEY=your_tavily_key_here
```

The query must include live-data signals such as:

```text
current, latest, today, recent, price, stock price, interest rate, RBA, Fed, ASX, earnings, CPI, GDP, unemployment, 2025, 2026
```

Example:

```bash
npm run dev -- finance \
  "Use current market data to explain the latest RBA cash rate implications for Australian bank funding costs. Cite source URLs when using specific figures." \
  --output "outputs/rba-bank-funding.md"
```

---

## Python code execution

When enabled, data mode can execute Python code blocks produced by the model and append results to the response.

```env
CODE_EXECUTION_ENABLED=true
```

Use this for small checks, lightweight calculations, and reproducible snippets. For larger modelling jobs, prefer generating a notebook or script first, reviewing it, then running it locally.

Example:

```bash
npm run dev -- data \
  "Write and run Python code to calculate missing values, target distribution, and simple summary statistics. Use print statements for all outputs." \
  --file "dataset.csv"
```

---

## Project structure

```text
STY-AI-Agent-System/
├── .github/workflows/
│   └── eval.yml
├── finance_skills/         # Financial analysis, FP&A, valuation, cash, pricing, covenant, unit economics skills
│   ├── finance/
│   ├── financial-analyst/
│   ├── driver_based_planning/
│   ├── rolling_forecast/
│   ├── variance_bridge/
│   ├── working_capital_cashflow/
│   ├── scenario_monte_carlo/
│   ├── unit_economics/
│   ├── pricing_margin_analysis/
│   ├── close_reporting_pack/
│   ├── covenant_credit_analysis/
│   ├── three_statement_model/
│   ├── investment_advisor/
│   └── stock_analysis/
├── data_skills/            # EDA, quality, observability, forecasting, experiments, causal, lineage, and analytics skills
│   ├── analysis_documentation/
│   ├── anomaly_detection/
│   ├── causal_inference/
│   ├── churn_prediction/
│   ├── cohort_analysis/
│   ├── customer_segmentation/
│   ├── dashboard_builder/
│   ├── data_contracts/
│   ├── data_lineage_impact/
│   ├── data_observability/
│   ├── data_quality_check/
│   ├── eda/
│   ├── experimentation_ab_testing/
│   ├── exec_summary_generator/
│   ├── forecasting_timeseries/
│   ├── metric_reconciliation/
│   ├── metrics_calculator/
│   ├── query/
│   ├── root_cause_investigation/
│   ├── schema_mapper/
│   ├── semantic_model_builder/
│   ├── statistical_quality_control/
│   └── visualisation_builder/
├── general_skills/
│   └── screenshot_photo_analysis/
├── report_skills/
│   ├── business_case_report/
│   ├── data_insight_report/
│   ├── executive-reporting/
│   ├── financial_performance_report/
│   ├── project_status_report/
│   └── risk_report/
├── PBI_skills/             # Power BI modelling, financial reporting, DAX, governance, ALM, security, and audit skills
│   ├── calculation_groups_time_intelligence/
│   ├── copilot_model_readiness/
│   ├── dax_finance_measure_library/
│   ├── dax_optimisation/
│   ├── incremental_refresh_performance/
│   ├── model_design_review/
│   ├── pbi_audit_monitoring/
│   ├── pbi_financial_reporting/
│   ├── pbi_general/
│   ├── power_query_finance_etl/
│   ├── powerbi_alm_deployment/
│   ├── powerbi_governance_review/
│   ├── rls_ols_security_design/
│   ├── semantic_modelling/
│   └── visualisation_designer/
├── plugins/
│   ├── code-execution/
│   └── web-search/
├── script/                  # PDF/XLSX/RAG helper scripts; file reader also supports scripts/
│   ├── embed.py
│   ├── extract_pdf.py
│   └── extract_xlsx.py
├── src/
│   ├── agent/
│   │   ├── coreAgent.ts
│   │   ├── multiAgent.ts
│   │   └── workflows.ts
│   ├── llm/
│   │   ├── claudeClient.ts
│   │   ├── llmInterface.ts
│   │   ├── llmRouter.ts
│   │   └── openaiClient.ts
│   ├── skills/
│   │   └── skillRegistry.ts
│   ├── tools/
│   │   ├── accessControl.ts
│   │   ├── codeExecutor.ts
│   │   ├── confidenceScorer.ts
│   │   ├── costTracker.ts
│   │   ├── fileReader.ts
│   │   ├── logger.ts
│   │   ├── memoryManager.ts
│   │   ├── outputWriter.ts
│   │   ├── ragStore.ts
│   │   ├── reviewQueue.ts
│   │   ├── sessionMemory.ts
│   │   ├── toolAudit.ts
│   │   ├── toolInterface.ts
│   │   └── toolRegistry.ts
│   └── cli.ts
├── tests/
│   ├── evalRunner.ts
│   └── evals/
├── web/
│   ├── public/index.html
│   └── server.ts
├── .env.example
├── package.json
├── README.md
└── tsconfig.json
```

---

## Development scripts

```bash
npm run dev -- hello        # Run CLI through tsx
npm run build               # Compile TypeScript in src/ to dist/
npm start -- hello          # Run compiled CLI
npm run web                 # Run web server
npm test                    # Run Vitest unit tests
npm run test:watch          # Watch tests
npm run test:coverage       # Test coverage
npm run eval                # Eval smoke test, no API calls
npm run eval -- --live      # Live eval with model judge
```

Run category-specific evals:

```bash
npm run eval -- --live --category finance
npm run eval -- --live --category data
npm run eval -- --live --category report
```

---

## GitHub Actions

The included workflow validates eval JSON files on push and pull request to `main`:

```text
.github/workflows/eval.yml
```

It currently checks that eval files exist and contain required fields. Live model evals are not run by default in CI.

---

## Troubleshooting

### `.env file not found`

Create it from the example:

```bash
cp .env.example .env
```

### `ANTHROPIC_API_KEY is missing`

Open `.env` and replace the placeholder with your actual API key.

### PDF or Excel files fail to load

Check the script folder. The reader looks for:

```text
scripts/extract_pdf.py
scripts/extract_xlsx.py
script/extract_pdf.py
script/extract_xlsx.py
```

Make sure Python 3 is installed and the helper scripts are present in one of those locations.

### Folder contains too many files

The folder reader has a built-in file limit. Use `--pattern` or attach specific files:

```bash
npm run dev -- report "Summarise forecast files" --folder docs --pattern forecast
```

### Output export fails

Check that the target folder is writable and that the output extension is one of `.md`, `.txt`, `.docx`, `.xlsx`, `.pdf`, or `.ipynb`.

### Web search does not run

Check:

```env
WEB_SEARCH_ENABLED=true
TAVILY_API_KEY=your_tavily_key_here
```

Also make sure the prompt contains live-data wording such as `latest`, `current`, `today`, `price`, `interest rate`, `ASX`, or `2026`.

### Too much context or weak answer quality

Use a tighter prompt and fewer files:

```bash
npm run dev -- data \
  "Only analyse target imbalance, missing values, leakage risk, and F1 modelling implications. Ignore visualisation suggestions." \
  --file dataset.csv
```

### High-cost usage

Check usage:

```bash
npm run dev -- usage --week
```

Reduce use of `--deep`, large files, and repeated context uploads.

---

## Security and data handling

The access policy blocks or warns on sensitive file names and paths. By default, files matching patterns such as `password`, `credential`, `.env`, `secret`, `salary`, `payroll`, `m&a`, `merger`, and `acquisition` are restricted or blocked.

Before sending files to the model, check that you are authorised to share them and that they do not contain unnecessary personal, confidential, or restricted information.

Create a local policy file with:

```bash
npm run dev -- policy --init
```

Then edit `access_policy.json` to match your workplace or project requirements.

---

## Current limitations

- The package is not published to npm.
- The primary provider is Anthropic; OpenAI is available as a fallback through `LLM_PROVIDER=openai`.
- Skill matching is keyword-based, so unusual phrasing may miss a relevant skill.
- PDF extraction is text-based and does not handle scanned/image-only PDFs well.
- Excel extraction works best on clean, structured workbooks.
- `--deep` improves review quality but increases API calls and cost.
- `--workflow auto` can run multiple specialist passes, so it may cost more than a single standard run.

---

## Recommended roadmap

### High priority

- Add eval cases for `--workflow auto`, Power BI finance reporting, image/screenshot analysis, and tool permission denial.
- Add live CI eval option guarded by API secrets.

### Medium priority

- Add validation for skill category values.
- Add structured output schemas for report/data/finance deliverables.
- Add export tests for `.docx`, `.xlsx`, `.pdf`, and `.ipynb`.
- Add richer PDF parsing or OCR fallback for scanned PDFs.
- Add a `--format` option for output style, such as `memo`, `board-paper`, `notebook`, or `slide-outline`.
- Add an admin page for tool audit logs, workflow traces, and review queue operations.

### Future improvements

- Better semantic skill matching beyond keyword detection.
- Local vector embeddings for stronger RAG retrieval.
- A dedicated notebook generation workflow.
- Richer web UI pages for sessions, review queue, logs, tool audits, and RAG documents.
- More granular model routing by task complexity and budget.

---

## Disclaimer

This project supports productivity, education, business analysis, and decision preparation. Finance and investment outputs are informational only and should not be treated as personal financial advice. Always verify important calculations, assumptions, source data, and recommendations before making business, legal, financial, or operational decisions.

---

## License

MIT License. See `LICENSE` for details.
