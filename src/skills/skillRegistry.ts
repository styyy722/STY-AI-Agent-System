import fs from "node:fs";
import path from "node:path";

export type SkillCategory = "finance" | "data" | "report" | "general";

export interface AgentSkill {
  name: string;
  category: SkillCategory;
  rootFolder: string;
  folder: string;
  description: string;
  keywords: string[];
}

interface SkillRoot {
  category: SkillCategory;
  rootFolder: string;
  fallbackKeywords: string[];
}

const SKILL_ROOTS: SkillRoot[] = [
  {
    category: "finance",
    rootFolder: "finance_skills",
    fallbackKeywords: [
      // Core finance terms
      "finance", "financial", "wacc", "valuation", "investment",
      "stock", "portfolio", "equity", "crypto", "forecast", "ratio",
      "cash flow", "cashflow",
      // Profitability & income statement
      "revenue", "profit", "margin", "ebitda", "ebit", "net income",
      "gross profit", "operating profit", "earnings", "eps",
      "earnings per share", "profit margin", "operating margin",
      // Valuation multiples
      "p/e", "pe ratio", "price to earnings", "p/b", "price to book",
      "ev/ebitda", "enterprise value", "market cap", "price to sales",
      "p/s ratio", "p/fcf", "price to cash flow",
      // DCF & returns
      "dcf", "discounted cash flow", "irr", "npv", "net present value",
      "internal rate of return", "payback period", "return on equity",
      "roe", "roa", "return on assets", "roic", "roce",
      // Cost of capital
      "capm", "cost of equity", "cost of debt", "beta", "risk premium",
      "risk-free rate", "capital structure", "leverage",
      // Balance sheet
      "balance sheet", "income statement", "assets", "liabilities",
      "debt", "working capital", "liquidity", "solvency",
      "current ratio", "quick ratio", "debt to equity", "d/e ratio",
      // Investing & markets
      "dividend", "yield", "bond", "interest rate", "inflation",
      "etf", "fund", "asset allocation", "diversification",
      "risk tolerance", "sharpe ratio", "volatility",
      // Business performance
      "budget", "variance", "scenario analysis", "sensitivity",
      "financial model", "projection", "assumption"
    ]
  },
  {
    category: "data",
    rootFolder: "data_skills",
    fallbackKeywords: [
      // Core data terms
      "data", "dataset", "analytics", "eda", "exploratory data analysis",
      "missing value", "outlier", "correlation", "feature engineering",
      "model", "classification", "regression", "dashboard", "kpi",
      // Data quality & cleaning
      "data quality", "data cleaning", "null", "duplicate", "preprocessing",
      "imputation", "normalise", "normalize", "standardise", "standardize",
      "schema", "pipeline", "etl",
      // Analysis types
      "cohort", "retention", "churn", "segmentation", "clustering",
      "time series", "trend", "seasonality", "anomaly", "root cause",
      "metric", "kpi", "mrr", "arr", "ltv", "cac", "conversion rate",
      // SQL & databases
      "sql", "query", "table", "join", "aggregate", "group by",
      "database", "warehouse", "dbt", "bigquery", "snowflake",
      // ML & modelling
      "machine learning", "model selection", "accuracy", "precision",
      "recall", "f1", "cross validation", "overfitting", "feature",
      "prediction", "forecast", "training", "test set",
      // Visualisation
      "chart", "graph", "visuali", "plot", "histogram", "scatter",
      "heatmap", "bar chart", "line chart",
      // Business analytics
      "insight", "business intelligence", "bi",
      "distribution", "average", "median", "mean", "variance", "std"
    ]
  },
  {
    category: "report",
    rootFolder: "report_skills",
    fallbackKeywords: [
      // Report types
      "report", "executive summary", "board paper", "board-ready",
      "consulting", "recommendation", "business case", "stakeholder",
      "slide", "presentation", "summary", "decision paper",
      // Audience & format
      "senior", "c-suite", "ceo", "cfo", "board", "investor",
      "client", "memo", "briefing", "one-pager", "deck",
      // Content signals
      "action plan", "next steps", "risk", "mitigation", "strategic",
      "initiative", "priority", "objective", "outcome", "finding",
      "write up", "write-up", "document", "draft", "structure",
      // New report types
      "performance report", "risk report", "business case", "project status",
      "status report", "project update", "data insights", "insights report",
      "financial report", "monthly report", "quarterly report", "investment case"
    ]
  }
];

const EXTRA_KEYWORDS_BY_FOLDER: Record<string, string[]> = {
  // --- Finance skills ---
  "financial-analyst": [
    "wacc", "dcf", "capm", "cost of equity", "cost of debt",
    "valuation", "budget", "variance", "forecast", "financial analysis",
    "irr", "npv", "net present value", "internal rate of return",
    "financial model", "financial modelling", "ratio analysis",
    "income statement", "balance sheet", "cash flow statement",
    "ebitda", "ebit", "operating income", "free cash flow", "fcf",
    "sensitivity analysis", "scenario", "assumption", "projection",
    "p&l", "profit and loss", "management accounts"
  ],
  finance: [
    "finance", "margin", "revenue", "profit", "cost", "ratio",
    "cash flow", "financial statement", "gross margin", "net margin",
    "operating margin", "ebitda margin", "return on", "roe", "roa",
    "roic", "roce", "working capital", "liquidity", "solvency",
    "current ratio", "quick ratio", "debt to equity", "leverage",
    "interest coverage", "asset turnover", "inventory turnover"
  ],
  investment_advisor: [
    "investment", "portfolio", "asset allocation", "risk tolerance",
    "return", "diversification", "etf", "fund", "rebalance",
    "sharpe ratio", "volatility", "risk-adjusted", "alpha", "beta",
    "benchmark", "index fund", "passive", "active management",
    "where should i invest", "what should i buy", "build a portfolio",
    "asset class", "bonds", "equities", "real estate", "commodities",
    "dollar cost averaging", "dca", "lump sum", "time horizon"
  ],
  stock_analysis: [
    "stock", "ticker", "equity", "crypto", "buy", "hold", "sell",
    "technical analysis", "fundamental analysis", "rsi", "market cap",
    "p/e", "pe ratio", "price to earnings", "ev/ebitda", "price to book",
    "earnings per share", "eps", "dividend yield", "payout ratio",
    "moving average", "macd", "support", "resistance", "52 week",
    "analyst rating", "price target", "bull", "bear", "short",
    "analyse", "analyze", "evaluate", "asx", "nyse", "nasdaq"
  ],

  // --- Data skills ---
  eda: [
    "eda", "exploratory data analysis", "dataset overview", "missing value",
    "outlier", "correlation", "feature engineering", "model selection",
    "business insights", "profile", "data profile", "summarise dataset",
    "summarize dataset", "understand the data", "what is in this data"
  ],
  cohort_analysis: [
    "cohort", "retention", "churn", "cohort analysis", "user retention",
    "monthly retention", "weekly retention", "n-day retention",
    "lifetime value", "ltv", "customer lifetime", "acquisition cohort"
  ],
  dashboard_builder: [
    "dashboard", "dashboard design", "kpi dashboard", "metrics dashboard",
    "visualisation", "visualization", "chart", "graph", "report design",
    "what to show", "what to track", "business metrics"
  ],
  data_quality_check: [
    "data quality", "data validation", "data audit", "quality check",
    "data issues", "bad data", "data errors", "null", "missing",
    "duplicates", "stale data", "freshness", "pipeline validation"
  ],
  metric_reconciliation: [
    "reconciliation", "metric discrepancy", "numbers don't match",
    "different values", "why is this number wrong", "mismatch",
    "two dashboards", "conflicting data", "data inconsistency"
  ],
  metrics_calculator: [
    "mrr", "arr", "ltv", "cac", "churn rate", "conversion rate",
    "arpu", "average revenue per user", "nps", "saas metrics",
    "calculate", "how do i calculate", "metric definition",
    "business metric", "kpi definition"
  ],
  query: [
    "sql", "query", "sql query", "database query", "review my query",
    "optimise query", "slow query", "query performance", "join",
    "subquery", "cte", "window function", "aggregate"
  ],
  root_cause_investigation: [
    "root cause", "why did", "what caused", "metric dropped",
    "metric spike", "why is", "investigate", "anomaly", "unexpected",
    "revenue dropped", "users dropped", "explain the drop"
  ],
  schema_mapper: [
    "schema", "database schema", "erd", "entity relationship",
    "table relationships", "joins", "data model", "unfamiliar database",
    "understand the schema", "how are tables related", "foreign key"
  ],
  semantic_model_builder: [
    "semantic model", "metric definition", "dbt", "dbt semantic layer",
    "data catalog", "canonical definition", "single source of truth",
    "yaml", "dimension", "measure", "entity"
  ],
  analysis_documentation: [
    "document", "documentation", "reproducible", "analysis notebook",
    "hand off", "handover", "archive", "record my analysis"
  ],
  visualisation_builder: [
    "chart type", "which chart", "visualise", "visualize", "plot",
    "histogram", "scatter", "bar chart", "line chart", "heatmap",
    "publication ready", "presentation chart", "chart design"
  ],

  // --- Report skills ---
  "financial_performance_report": [
    "financial performance", "performance report", "monthly report", "quarterly report",
    "annual report", "management report", "p&l commentary", "p&l report",
    "budget variance", "actuals vs budget", "revenue commentary", "cost commentary",
    "margin analysis", "financial results", "period results", "kpi report",
    "financial review", "management accounts", "board pack", "finance report",
    "revenue report", "income report", "earnings report", "financial update"
  ],
  "risk_report": [
    "risk report", "risk register", "risk assessment", "risk summary",
    "risk matrix", "risk rating", "risk appetite", "residual risk",
    "risk mitigation", "audit committee", "risk register update", "top risks",
    "operational risk", "regulatory risk", "strategic risk", "reputational risk",
    "risk and compliance", "control environment", "inherent risk", "risk tier",
    "risk owner", "risk escalation", "emerging risk", "risk profile"
  ],
  "business_case": [
    "business case", "investment case", "cost benefit", "cost-benefit",
    "npv analysis", "irr analysis", "payback period", "return on investment",
    "roi", "build vs buy", "make vs buy", "capex approval", "opex approval",
    "funding request", "investment approval", "budget approval", "headcount request",
    "business justification", "strategic case", "feasibility", "proposal",
    "investment committee", "hurdle rate", "sensitivity analysis", "break even",
    "justify", "justification", "should we invest", "case for investment"
  ],
  "data_insights_report": [
    "data insights", "insights report", "analysis report", "findings report",
    "data findings", "analytics report", "present findings", "share findings",
    "data story", "data narrative", "non-technical audience", "business audience",
    "explain the data", "what does the data show", "data summary for",
    "turn analysis into", "package the findings", "communicate the results",
    "translate the analysis", "write up the analysis", "analysis writeup"
  ],
  "project_status_report": [
    "project status", "status report", "project update", "steering committee",
    "project report", "programme update", "workstream update", "milestone report",
    "project progress", "on track", "off track", "amber status", "red status",
    "project risks", "project issues", "decisions required", "project budget",
    "project close", "close-out report", "lessons learned", "project sponsor",
    "traffic light", "rag status", "sprint report", "project dashboard"
  ],
  "exec_summary_generator": [
    "executive summary", "executive brief", "board summary", "board briefing",
    "write a summary for", "condensed summary", "one page", "one-page",
    "board deck", "exec summary", "summarise for", "summarize for",
    "key findings", "decision ready", "c-suite summary"
  ],
  "executive-reporting": [
    "executive summary", "board paper", "board-ready", "consulting-style",
    "recommendation", "business report", "slide-ready",
    "stakeholder communication", "decision paper", "business case",
    "risk summary", "action plan", "write for the board",
    "write for senior", "one page summary", "key findings",
    "strategic recommendation", "c-suite", "ceo", "cfo"
  ]
};

function readSkillFolders(rootFolder: string): string[] {
  const rootPath = path.join(process.cwd(), rootFolder);

  if (!fs.existsSync(rootPath)) {
    return [];
  }

  return fs
    .readdirSync(rootPath, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name);
}

function readSkillFile(rootFolder: string, folder: string): string | null {
  const skillPath = path.join(process.cwd(), rootFolder, folder, "SKILL.md");

  if (!fs.existsSync(skillPath)) {
    return null;
  }

  return fs.readFileSync(skillPath, "utf-8");
}

function getFrontMatterValue(content: string, key: string): string | null {
  const frontMatterMatch = content.match(/^---\s*([\s\S]*?)\s*---/);

  if (!frontMatterMatch) {
    return null;
  }

  const frontMatter = frontMatterMatch[1];
  const lines = frontMatter.split("\n");

  const matchingLine = lines.find((line) =>
    line.trim().toLowerCase().startsWith(`${key.toLowerCase()}:`)
  );

  if (!matchingLine) {
    return null;
  }

  return matchingLine
    .split(":")
    .slice(1)
    .join(":")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function createKeywords(skill: AgentSkill, fallbackKeywords: string[]): string[] {
  const folderWords = skill.folder.replace(/[-_]/g, " ").split(" ");

  const descriptionWords = skill.description
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3);

  const extraKeywords =
    EXTRA_KEYWORDS_BY_FOLDER[skill.folder] ||
    EXTRA_KEYWORDS_BY_FOLDER[skill.name] ||
    [];

  const keywords = [
    skill.name,
    skill.folder,
    skill.folder.replace(/[-_]/g, " "),
    ...folderWords,
    ...descriptionWords,
    ...fallbackKeywords,
    ...extraKeywords
  ];

  return Array.from(new Set(keywords.map((keyword) => keyword.toLowerCase())));
}

export function getAvailableSkills(): AgentSkill[] {
  const skills: AgentSkill[] = [];

  for (const root of SKILL_ROOTS) {
    const folders = readSkillFolders(root.rootFolder);

    for (const folder of folders) {
      const content = readSkillFile(root.rootFolder, folder);

      if (!content) {
        continue;
      }

      const name = getFrontMatterValue(content, "name") || folder;
      const description =
        getFrontMatterValue(content, "description") ||
        `${folder} skill for ${root.category} workflows.`;

      const skill: AgentSkill = {
        name,
        category: root.category,
        rootFolder: root.rootFolder,
        folder,
        description,
        keywords: []
      };

      skill.keywords = createKeywords(skill, root.fallbackKeywords);
      skills.push(skill);
    }
  }

  return skills;
}

export function findRelevantSkills(userInput: string): AgentSkill[] {
  const normalizedInput = userInput.toLowerCase();
  const availableSkills = getAvailableSkills();

  const ORDER: Record<string, number> = { report: 0, finance: 1, data: 2, general: 3 };
  return availableSkills
    .filter((skill) =>
      skill.keywords.some((keyword) => normalizedInput.includes(keyword))
    )
    .sort((a, b) => (ORDER[a.category] ?? 9) - (ORDER[b.category] ?? 9))
    .slice(0, 8);
}

export function loadSkillContent(skill: AgentSkill): string {
  const skillPath = path.join(
    process.cwd(),
    skill.rootFolder,
    skill.folder,
    "SKILL.md"
  );

  if (!fs.existsSync(skillPath)) {
    return `Skill file not found for ${skill.name}. Expected path: ${skillPath}`;
  }

  return fs.readFileSync(skillPath, "utf-8");
}

export function buildSkillContext(userInput: string): string {
  const relevantSkills = findRelevantSkills(userInput);

  if (relevantSkills.length === 0) {
    return "";
  }

  const skillContents = relevantSkills
    .map((skill) => {
      const content = loadSkillContent(skill);

      return `
---
Loaded skill: ${skill.name}
Category: ${skill.category}
Description: ${skill.description}
---

${content}
`;
    })
    .join("\n\n");

  return `
The following specialist skills are relevant to the user's request.
Use them to improve the quality, structure, and domain-specific accuracy of your response.

${skillContents}
`;
}
