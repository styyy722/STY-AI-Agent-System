# STY AI Agent System

STY AI Agent System is a Claude-powered business AI agent designed to help users improve productivity, analysis quality, and decision-making across finance, data analytics, investment research, and reporting workflows.

The long-term goal is to create an installable terminal-based AI agent that business users can run locally with Claude.

---

## What This Agent Does

The agent is designed to support business workflows such as:

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

## Current Status

This project is currently in early development.

Completed so far:

- GitHub repository setup
- TypeScript project setup
- Basic CLI structure
- Core agent brain
- Claude API client structure
- Finance skills folder
- Skill registry for finance-related skills

---

## Planned Terminal Commands

Once fully installed, the agent will support commands such as:

```bash
sty-agent hello
sty-agent ask "Help me plan a business workflow"
sty-agent finance "Explain WACC for Telstra"
sty-agent finance "Analyse AAPL stock"
sty-agent data "Summarise this sales dataset"
sty-agent report "Write an executive summary"

## How it works

STY-AI-Agent-System/
├── finance_skills/
│   ├── finance/
│   ├── financial-analyst/
│   ├── investment_advisor/
│   └── stock_analysis/
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
│   └── cli.ts
│
├── .env.example
├── .gitignore
├── LICENSE
├── package.json
├── README.md
└── tsconfig.json
