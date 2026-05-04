# STY AI Agent System

STY AI Agent System is a Claude-powered business AI agent designed to support finance, data analytics, investment research, and reporting workflows.

The goal of this project is to build an installable terminal-based AI agent that helps business users improve efficiency while maintaining high-quality outputs.

---

## What This Agent Does

This agent is designed to help with:

- Finance analysis
- WACC and cost of capital analysis
- Stock and investment research
- Portfolio analysis
- Data analytics and exploratory data analysis
- Business reporting
- Executive summaries
- Board-ready recommendations
- Consulting-style output generation

---

## Current Project Status

This project is currently in early development.

Completed so far:

- GitHub repository setup
- TypeScript project setup
- Basic CLI structure
- Core agent brain
- Claude API client structure
- Finance skills folder
- Data skills folder
- Skill registry for loading relevant skills
- Basic local file-reading support for `.txt`, `.md`, `.csv`, and `.json` files

---

## Planned Terminal Commands

Once installed locally, the agent will support commands such as:

```bash
sty-agent hello
sty-agent ask "Help me plan a business workflow"
sty-agent finance "Explain WACC for Telstra"
sty-agent finance "Analyse AAPL stock"
sty-agent data "Summarise this sales dataset"
sty-agent report "Write an executive summary"
sty-agent skills
sty-agent session list
sty-agent session clear <session-id>
```

---

## File-Based Commands

The agent supports attaching local files using the `--file` option.

Supported file types:

```text
.txt
.md
.csv
.json
.xlsx
.pdf
```

Example commands:

```bash
sty-agent data "Run EDA and identify business insights" --file sales.csv
sty-agent finance "Analyse this company note" --file company-notes.md
sty-agent report "Turn this analysis into an executive summary" --file analysis.txt
sty-agent ask "Summarise this JSON file" --file config.json
```

When a file is attached, the agent reads the file content and includes it in the Claude request.

---

## Output Saving

The agent can save responses to a local file using the `--output` option.

Example commands:

```bash
sty-agent ask "Summarise this business idea" --output outputs/summary.md
sty-agent finance "Explain WACC" --output outputs/wacc-analysis.md
sty-agent data "Run EDA and identify business insights" --file sales.csv --output outputs/eda-report.md
sty-agent report "Turn this analysis into an executive summary" --file analysis.txt --output outputs/executive-summary.md
```

If the output folder does not exist, the agent will create it automatically.

For example:

```bash
sty-agent report "Write an executive summary" --file analysis.txt --output outputs/summary.md
```

will create:

```text
outputs/summary.md
```

## Project Structure

```text
STY-AI-Agent-System/
├── finance_skills/
│   ├── finance/
│   │   └── SKILL.md
│   ├── financial-analyst/
│   │   └── SKILL.md
│   ├── investment_advisor/
│   │   └── SKILL.md
│   └── stock_analysis/
│       └── SKILL.md
│
├── data_skills/
│   └── ...
│
├── report_skills/
│   └── executive-reporting/
│       └── SKILL.md
│
├── scripts/
│   ├── extract_xlsx.py
│   └── extract_pdf.py
│
├── src/
│   ├── agent/
│   │   └── coreAgent.ts
│   │
│   ├── llm/
│   │   └── claudeClient.ts
│   │
│   ├── skills/
│   │   └── skillRegistry.ts
│   │
│   ├── tools/
│   │   ├── fileReader.ts
│   │   ├── inputValidator.ts
│   │   ├── outputWriter.ts
│   │   └── sessionMemory.ts
│   │
│   └── cli.ts
│
├── .env.example
├── .gitignore
├── LICENSE
├── package.json
├── README.md
└── tsconfig.json
```

---

## How It Works

The agent follows this flow:

```text
User terminal command
↓
CLI receives the request
↓
Optional file input is read
↓
Core agent determines the mode
↓
Skill registry loads relevant skills
↓
Claude receives the user request, file context, and specialist skill context
↓
Agent returns a structured business response
```

---

## Agent Modes

### General Mode

For general business tasks, planning, writing, and productivity workflows.

```bash
sty-agent ask "Help me structure a business plan"
```

### Finance Mode

For finance, WACC, valuation, stock analysis, portfolio analysis, and investment-style reasoning.

```bash
sty-agent finance "Explain WACC and list the required assumptions"
```

Example with file input:

```bash
sty-agent finance "Analyse this company note and identify key risks" --file company-notes.md
```

### Data Mode

For data analytics, EDA, data cleaning, feature engineering, modelling, and dashboard-ready insights.

```bash
sty-agent data "Summarise this customer dataset" --file customers.csv
```

### Report Mode

For executive summaries, board papers, business cases, and consulting-style recommendations.

```bash
sty-agent report "Turn this analysis into a board-ready summary" --file analysis.txt
```

---

## Skill System

The project uses skill folders to provide specialist instructions to the agent.

Skills are organised by business domain:

```text
finance_skills/
data_skills/
report_skills/
```

Each skill folder contains a `SKILL.md` file that explains when the skill should be used, what workflow it supports, and how the agent should structure its response.

The skill registry automatically scans the available skill folders and loads relevant skill instructions based on the user’s request.

---

### Current Skill Categories

| Category | Folder | Purpose |
|---|---|---|
| Finance | `finance_skills/` | Finance analysis, WACC, valuation, stock analysis, portfolio analysis, and investment research |
| Data Analytics | `data_skills/` | EDA, missing value analysis, modelling, feature engineering, and business insights |
| Reporting | `report_skills/` | Executive summaries, board papers, consulting-style recommendations, and slide-ready insights |

---

### How Skills Are Used

When a user enters a command, the agent checks the request for relevant keywords.

For example:

```bash
sty-agent finance "Explain WACC"
```

may load a finance or financial analyst skill.

```bash
sty-agent data "Run EDA and handle missing values"
```

may load a data analytics skill.

```bash
sty-agent report "Turn this into a board-ready executive summary"
```

may load an executive reporting skill.

The loaded skill content is added to the Claude system prompt so the agent can produce a more structured and domain-specific response.

---

### List Installed Skills

You can list all installed skills using:

```bash
sty-agent skills
```

Filter skills by category:

```bash
sty-agent skills --category finance
sty-agent skills --category data
sty-agent skills --category report
```

During development, use:

```bash
npm run dev -- skills
npm run dev -- skills --category finance
npm run dev -- skills --category data
npm run dev -- skills --category report
```

---

### Example Skill Structure

A typical skill folder looks like this:

```text
finance_skills/
└── financial-analyst/
    └── SKILL.md
```

The `SKILL.md` file usually contains:

```text
- Skill name
- Skill description
- When to use the skill
- Required inputs
- Output structure
- Quality rules
- Domain-specific formulas, frameworks, or templates
```

---

### Planned Skill Improvements

Future improvements may include:

- More advanced finance skills
- More data analytics and machine learning skills
- More reporting and presentation skills
- Skill priority scoring
- Better skill matching beyond keyword detection
- Support for custom user-installed skills
- Support for external tool-based skills with scripts and APIs
---

## Environment Setup

This project uses Claude through the Anthropic API.

Create a private `.env` file based on `.env.example`:

```bash
ANTHROPIC_API_KEY=your_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-6
AGENT_STYLE=professional
OUTPUT_FORMAT=markdown
```

Do not commit your real `.env` file to GitHub.

---

## Local Development Setup

To run this project locally, install Node.js first.

Then clone the repository:

```bash
git clone https://github.com/YOUR-USERNAME/STY-AI-Agent-System.git
cd STY-AI-Agent-System
```

Install packages:

```bash
npm install
```

Run the development version:

```bash
npm run dev -- hello
```

Run a finance command:

```bash
npm run dev -- finance "Explain WACC"
```

Run a data command with a file:

```bash
npm run dev -- data "Summarise this dataset" --file sales.csv
```

Build the project:

```bash
npm run build
```

Run the built version:

```bash
npm start -- hello
```

---

## Current Limitations

This project is still in early development.

Current limitations:

- The package is not published to npm yet.
- The agent depends on a valid Anthropic API key.
- Skill matching is based on keyword detection and may miss unusual phrasing.
- Session memory is stored in the OS temp directory and does not persist across system restarts.
- Excel reading works best on well-structured spreadsheets; heavily formatted or merged-cell files may not parse cleanly.
- PDF reading extracts text and tables but does not support scanned or image-based PDFs.

---

## Development Roadmap

### Phase 1: Foundation

- Set up GitHub repo
- Add TypeScript project structure
- Build basic CLI
- Add Claude API connection
- Add core agent brain

### Phase 2: Finance Skills

- Add finance skill folders
- Add financial analyst skill
- Add stock analysis skill
- Add investment advisor skill
- Connect skills to the core agent

### Phase 3: Data Analytics Skills

- Add data analytics skills
- Add CSV and Excel reading support
- Add EDA templates
- Add model comparison workflows
- Add business insight generation

### Phase 4: Reporting Skills

- Add executive summary templates
- Add board paper templates
- Add consulting-style recommendation templates
- Add export options

### Phase 5: Installation and Release

- Test locally
- Build the project
- Make the terminal command installable
- Publish or package for business users

---

## Target Users

This agent is designed for:

- Business analysts
- Finance analysts
- Data analysts
- Consultants
- Startup teams
- Strategy teams
- Business students
- Small business owners

---

## Example Use Cases

### Finance

```bash
sty-agent finance "Explain the key assumptions needed for WACC"
```

### Stock Analysis

```bash
sty-agent finance "Analyse AAPL and explain the key risks"
```

### Data Analytics

```bash
sty-agent data "Run an EDA-style summary and suggest modelling approaches" --file dataset.csv
```

### Reporting

```bash
sty-agent report "Convert this analysis into an executive summary" --file analysis.md
```

---

## Disclaimer

This project is for productivity, education, and business analysis support.

Finance and investment outputs are informational only and should not be treated as personal financial advice.

Users should verify important calculations, assumptions, data sources, and recommendations before making business or investment decisions.

---

## License

This project is licensed under the MIT License.
