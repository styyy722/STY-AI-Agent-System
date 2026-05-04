import fs from "node:fs";
import path from "node:path";

export interface AgentSkill {
  name: string;
  folder: string;
  description: string;
  keywords: string[];
}

const FINANCE_SKILL_ROOT = "finance_skills";

export const availableSkills: AgentSkill[] = [
  {
    name: "finance",
    folder: "finance",
    description: "General finance analysis skill.",
    keywords: [
      "finance",
      "financial analysis",
      "ratio",
      "profitability",
      "margin",
      "revenue",
      "cost",
      "forecast"
    ]
  },
  {
    name: "financial-analyst",
    folder: "financial-analyst",
    description: "Financial analyst skill for valuation, forecasting, ratio analysis, and business finance.",
    keywords: [
      "financial analyst",
      "valuation",
      "dcf",
      "wacc",
      "capm",
      "cost of equity",
      "cost of debt",
      "budget",
      "variance",
      "forecast",
      "scenario"
    ]
  },
  {
    name: "investment_advisor",
    folder: "investment_advisor",
    description: "Investment advisory skill for portfolio and investment decision support.",
    keywords: [
      "investment",
      "portfolio",
      "asset allocation",
      "risk tolerance",
      "return",
      "diversification",
      "etf",
      "fund"
    ]
  },
  {
    name: "stock_analysis",
    folder: "stock_analysis",
    description: "Stock and crypto analysis skill.",
    keywords: [
      "stock",
      "ticker",
      "equity",
      "crypto",
      "portfolio",
      "buy",
      "hold",
      "sell",
      "technical analysis",
      "fundamental analysis",
      "market cap",
      "rsi"
    ]
  }
];

export function findRelevantSkills(userInput: string): AgentSkill[] {
  const normalizedInput = userInput.toLowerCase();

  return availableSkills.filter((skill) =>
    skill.keywords.some((keyword) =>
      normalizedInput.includes(keyword.toLowerCase())
    )
  );
}

export function loadSkillContent(skill: AgentSkill): string {
  const skillPath = path.join(
    process.cwd(),
    FINANCE_SKILL_ROOT,
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
