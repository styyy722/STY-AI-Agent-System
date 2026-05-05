# STY AI Agent System

A terminal-based AI business agent for finance, data analytics, Power BI, reporting, and decision-ready business writing.

This repo is designed around one goal: **produce better business outputs faster, while keeping assumptions, risks, evidence, cost, and review controls visible.**

---

## What the agent does

STY AI Agent System helps with:

- **Finance workflows**: WACC, CAPM, cost of debt, cost of equity, valuation, financial ratios, scenario analysis, investment cases, stock analysis, and portfolio-style analysis.
- **Data analytics workflows**: dataset overview, EDA, missing value checks, data quality audits, SQL review, feature engineering, model comparison, dashboards, metrics, and root-cause investigation.
- **Power BI workflows**: DAX optimisation, semantic model review, star schema design, measure logic, dashboard layout, report visualisation, and Power BI best-practice review.
- **Reporting workflows**: executive summaries, board papers, business cases, financial performance reports, project status reports, risk reports, and slide-ready insights.
- **Productivity workflows**: general business writing, structured analysis, action plans, reusable session context, and local output saving.

The agent is not just a chat wrapper. It includes a CLI, skill registry, file ingestion, memory, RAG-style local knowledge indexing, optional web search, optional Python execution for data mode, cost tracking, confidence scoring, audit logs, access controls, and a review queue.

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

Use `--deep` when quality matters more than speed. It runs a multi-agent pipeline: **Planner → Analyst → Critic → Synthesiser**.

```bash
npm run dev -- report \
  "Write a board-ready recommendation based on this analysis. Include risks, assumptions, and decision required." \
  --file "analysis.md" \
  --deep \
  --output "outputs/board-recommendation.md"
```

---

## Common command options

The four main agent modes support these options:

| Option | Purpose | Example |
|---|---|---|
| `-f, --file <path>` | Attach a supported file or image. Repeat for multiple files. | `--file data.csv --file brief.pdf` |
| `--folder <path>` | Load supported files from a folder. | `--folder docs` |
| `-r, --recursive` | With `--folder`, include subfolders up to the built-in depth limit. | `--folder docs --recursive` |
| `--pattern <text>` | With `--folder`, only include files whose name contains text. | `--folder docs --pattern forecast` |
| `-o, --output <path>` | Save the response locally. | `--output outputs/summary.md` |
| `-s, --session <id>` | Continue a reusable conversation session. | `--session telstra-wacc` |
| `--deep` | Use multi-agent quality review. | `--deep` |

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

Folder ingestion skips common system folders such as `.git`, `node_modules`, `dist`, `logs`, `usage`, and `review_queue`.

### Important PDF/XLSX setup note

`src/tools/fileReader.ts` expects extraction scripts in a folder named `scripts/`:

```text
scripts/extract_pdf.py
scripts/extract_xlsx.py
```

If your repo currently has these files under `script/`, rename the folder to `scripts/` before using PDF or Excel ingestion.

---

## Output saving

Use `--output` to save the agent response:

```bash
npm run dev -- report \
  "Write an executive summary from this analysis" \
  --file "analysis.md" \
  --output "outputs/executive-summary.md"
```

The CLI currently saves a markdown-formatted response using `saveAgentOutput()`.

The codebase also includes `saveAgentOutputFile()` in `src/tools/outputWriter.ts`, with helper support for:

```text
.docx
.xlsx
.pdf
.ipynb
.md
.txt
```

However, the current CLI path calls `saveAgentOutput()` directly. If you want true Word, Excel, PDF, or notebook export from the CLI, update `src/cli.ts` to call `saveAgentOutputFile()` instead of `saveAgentOutput()` in the output-saving block.

Until that change is wired in, prefer:

```bash
--output outputs/result.md
```

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
```

### Current skill categories

| Category | Folder | Examples |
|---|---|---|
| Finance | `finance_skills/` | financial analyst, WACC, DCF, investment advisor, stock analysis |
| Data | `data_skills/` | EDA, cohort analysis, data quality, SQL review, metrics, schema mapping, visualisation |
| Report | `report_skills/` | business case, data insights report, executive reporting, financial performance, project status, risk report |
| Power BI | `PBI_skills/` | DAX optimisation, semantic modelling, model design review, visualisation designer |

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
npm run dev -- data \
  "Review this Power BI DAX measure for correctness, filter context issues, performance, and readability. Explain the issue and provide a cleaner replacement measure." \
  --file "dax-measures.md" \
  --output "outputs/dax-review.md"
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
| Confidence scoring | Scores factual grounding, assumptions, completeness, and domain risk |
| Review queue | Holds outputs that need approval before export or use |
| Cost tracking | Tracks estimated API usage against a daily budget |
| Audit logs | Records command activity, model, duration, matched skills, confidence, and status |
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
├── finance_skills/
│   ├── finance/
│   ├── financial-analyst/
│   ├── investment_advisor/
│   └── stock_analysis/
├── data_skills/
│   ├── analysis_documentation/
│   ├── cohort_analysis/
│   ├── dashboard_builder/
│   ├── data_quality_check/
│   ├── eda/
│   ├── exec_summary_generator/
│   ├── metric_reconciliation/
│   ├── metrics_calculator/
│   ├── query/
│   ├── root_cause_investigation/
│   ├── schema_mapper/
│   ├── semantic_model_builder/
│   └── visualisation_builder/
├── report_skills/
│   ├── business_case_report/
│   ├── data_insight_report/
│   ├── executive-reporting/
│   ├── financial_performance_report/
│   ├── project_status_report/
│   └── risk_report/
├── PBI_skills/
│   ├── dax_optimisation/
│   ├── model_design_review/
│   ├── pbi_general/
│   ├── semantic_modelling/
│   └── visualisation_designer/
├── plugins/
│   ├── code-execution/
│   └── web-search/
├── script/                  # Rename to scripts/ for current PDF/XLSX reader compatibility
│   ├── embed.py
│   ├── extract_pdf.py
│   └── extract_xlsx.py
├── src/
│   ├── agent/
│   │   ├── coreAgent.ts
│   │   └── multiAgent.ts
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
│   │   └── sessionMemory.ts
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

Check the script folder name. The reader expects:

```text
scripts/extract_pdf.py
scripts/extract_xlsx.py
```

If your repo has `script/`, rename it:

```bash
mv script scripts
```

### Folder contains too many files

The folder reader has a built-in file limit. Use `--pattern` or attach specific files:

```bash
npm run dev -- report "Summarise forecast files" --folder docs --pattern forecast
```

### Output saves but is not a real `.docx`, `.xlsx`, `.pdf`, or `.ipynb`

The CLI currently writes markdown-formatted text via `saveAgentOutput()`. Wire `saveAgentOutputFile()` into `src/cli.ts` if you want true structured exports.

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
- CLI output saving is currently markdown/text-first; true `.docx`, `.xlsx`, `.pdf`, and `.ipynb` generation needs the existing `saveAgentOutputFile()` helper to be wired into `cli.ts`.
- The Power BI skill category exists, but there is no dedicated `pbi` command yet. Use `ask`, `data`, or `report` with Power BI/DAX wording.
- `--deep` improves review quality but increases API calls and cost.

---

## Recommended roadmap

### High priority

- Rename `script/` to `scripts/`, or update `fileReader.ts` to look for the existing folder.
- Wire `saveAgentOutputFile()` into `src/cli.ts` so `--output report.docx`, `--output model.ipynb`, `--output summary.pdf`, and `--output table.xlsx` generate true files.
- Add a dedicated `pbi` command or update command help text to mention `--category pbi`.
- Add live CI eval option guarded by API secrets.

### Medium priority

- Add validation for skill category values.
- Add structured output schemas for report/data/finance deliverables.
- Add export tests for `.docx`, `.xlsx`, `.pdf`, and `.ipynb`.
- Add richer PDF parsing or OCR fallback for scanned PDFs.
- Add a `--format` option for output style, such as `memo`, `board-paper`, `notebook`, or `slide-outline`.

### Future improvements

- Better semantic skill matching beyond keyword detection.
- Local vector embeddings for stronger RAG retrieval.
- A dedicated notebook generation workflow.
- A dedicated web UI for sessions, review queue, logs, and RAG documents.
- More granular model routing by task complexity and budget.

---

## Disclaimer

This project supports productivity, education, business analysis, and decision preparation. Finance and investment outputs are informational only and should not be treated as personal financial advice. Always verify important calculations, assumptions, source data, and recommendations before making business, legal, financial, or operational decisions.

---

## License

MIT License. See `LICENSE` for details.
