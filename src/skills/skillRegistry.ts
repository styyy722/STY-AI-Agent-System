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
      "finance",
      "financial",
      "wacc",
      "valuation",
      "investment",
      "stock",
      "portfolio",
      "equity",
      "crypto",
      "forecast",
      "ratio",
      "cash flow"
    ]
  },
  {
    category: "data",
    rootFolder: "data_skills",
    fallbackKeywords: [
      "data",
      "dataset",
      "analytics",
      "eda",
      "exploratory data analysis",
      "missing value",
      "outlier",
      "correlation",
      "feature engineering",
      "model",
      "classification",
      "regression",
      "dashboard",
      "kpi"
    ]
  },
  {
    category: "report",
    rootFolder: "report_skills",
    fallbackKeywords: [
      "report",
      "executive summary",
      "board paper",
      "board-ready",
      "consulting",
      "recommendation",
      "business case",
      "stakeholder",
      "slide",
      "presentation",
      "summary",
      "risk",
      "decision paper"
    ]
  }
];

const EXTRA_KEYWORDS_BY_FOLDER: Record<string, string[]> = {
  "financial-analyst": [
    "wacc",
    "dcf",
    "capm",
    "cost of equity",
    "cost of debt",
    "valuation",
    "budget",
    "variance",
    "forecast",
    "financial analysis"
  ],
  finance: [
    "finance",
    "margin",
    "revenue",
    "profit",
    "cost",
    "ratio",
    "cash flow",
    "financial statement"
  ],
  investment_advisor: [
    "investment",
    "portfolio",
    "asset allocation",
    "risk tolerance",
    "return",
    "diversification",
    "etf",
    "fund"
  ],
  stock_analysis: [
    "stock",
    "ticker",
    "equity",
    "crypto",
    "buy",
    "hold",
    "sell",
    "technical analysis",
    "fundamental analysis",
    "rsi",
    "market cap"
  ],
  "eda-analysis": [
    "eda",
    "exploratory data analysis",
    "dataset overview",
    "missing value",
    "outlier",
    "correlation",
    "feature engineering",
    "model selection",
    "business insights"
  ],
  "data-cleaning": [
    "data cleaning",
    "missing values",
    "duplicates",
    "outliers",
    "data quality",
    "preprocessing"
  ],
  "model-comparison": [
    "model comparison",
    "classification",
    "regression",
    "f1 score",
    "accuracy",
    "precision",
    "recall",
    "cross validation",
    "machine learning"
  ],
  "executive-reporting": [
    "executive summary",
    "board paper",
    "board-ready",
    "consulting-style",
    "recommendation",
    "business report",
    "slide-ready",
    "stakeholder communication",
    "decision paper",
    "business case",
    "risk summary"
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

  return availableSkills
    .filter((skill) =>
      skill.keywords.some((keyword) => normalizedInput.includes(keyword))
    )
    .slice(0, 4);
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
