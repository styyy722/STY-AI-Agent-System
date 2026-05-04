import { callClaude } from "../llm/claudeClient.js";
import { buildSkillContext, findRelevantSkills } from "../skills/skillRegistry.js";
import {
  getSessionHistory,
  appendToSession
} from "../tools/sessionMemory.js";
import { writeLog, buildLogEntry } from "../tools/logger.js";

export type AgentMode = "general" | "finance" | "data" | "report";

export interface AgentRequest {
  mode: AgentMode;
  userInput: string;
  sessionId?: string;
}

export interface AgentResponse {
  mode: AgentMode;
  title: string;
  summary: string;
  nextSteps: string[];
  sessionId?: string;
}

export function buildSystemPrompt(mode: AgentMode): string {
  const basePrompt = `
You are STY AI Agent System, a professional AI business agent.

Your goal is to help business users improve efficiency while maintaining high-quality outputs.

Always follow these rules:
- Be clear, structured, and practical.
- Use professional business language.
- Separate assumptions from facts.
- Do not invent numbers, sources, or evidence.
- If information is missing, explain what is needed.
- Make outputs decision-ready for business users.
`;

  const modePrompts: Record<AgentMode, string> = {
    general: `
You handle general business tasks, planning, writing, productivity workflows, and business problem solving.
`,
    finance: `
You specialise in finance workflows including:
- WACC analysis
- Cost of equity
- Cost of debt
- CAPM
- Valuation support
- Forecasting
- Financial ratio analysis
- Investment memo writing
- Scenario analysis
- Stock analysis
- Portfolio analysis

When dealing with finance tasks, clearly explain formulas, assumptions, limitations, and business implications.
`,
    data: `
You specialise in data analytics workflows including:
- Dataset overview
- Data cleaning
- Exploratory data analysis
- Missing value analysis
- Outlier detection
- Feature engineering
- Model comparison
- Dashboard-ready insights
- Business recommendations from data

When dealing with analytics tasks, focus on practical business interpretation, not just technical explanation.
`,
    report: `
You specialise in professional reporting including:
- Executive summaries
- Board papers
- Consulting-style recommendations
- Slide-ready insights
- Business case writing
- Risk summaries
- Action plans

When writing reports, make the output concise, structured, and suitable for senior stakeholders.
`
  };

  return `${basePrompt}\n${modePrompts[mode]}`;
}

function buildTitle(mode: AgentMode): string {
  const titles: Record<AgentMode, string> = {
    general: "STY Agent - General Business Mode",
    finance: "STY Agent - Finance Mode",
    data: "STY Agent - Data Analytics Mode",
    report: "STY Agent - Reporting Mode"
  };

  return titles[mode];
}

function buildNextSteps(mode: AgentMode): string[] {
  const nextSteps: Record<AgentMode, string[]> = {
    general: [
      "Review the response and refine the business objective if needed.",
      "Add more context if you want a more tailored recommendation.",
      "Use finance, data, or report mode for specialist workflows."
    ],
    finance: [
      "Check whether all finance assumptions are available.",
      "Provide company data, market data, or financial statements for deeper analysis.",
      "Use --file to attach Excel or PDF financial documents for richer analysis."
    ],
    data: [
      "Use --file to attach a CSV, Excel, or JSON dataset for real analysis.",
      "Use --session to continue this analysis across multiple commands.",
      "Use report mode to turn findings into a stakeholder-ready summary."
    ],
    report: [
      "Review whether the output is suitable for the target audience.",
      "Provide the preferred tone, format, and stakeholder type for a sharper report.",
      "Use --output to save the report to a file for sharing or archiving."
    ]
  };

  return nextSteps[mode];
}

const MODE_MAX_TOKENS: Record<AgentMode, number> = {
  general: 2000,
  finance: 4000,
  data: 6000,
  report: 8000
};

function getMaxTokens(mode: AgentMode): number {
  return MODE_MAX_TOKENS[mode];
}

function getModelName(usePremium: boolean): string {
  if (usePremium) {
    return process.env.ANTHROPIC_MODEL_PREMIUM || "claude-opus-4-7";
  }
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
}

export async function runCoreAgent(request: AgentRequest): Promise<AgentResponse> {
  const startTime = Date.now();
  const baseSystemPrompt = buildSystemPrompt(request.mode);
  const skillContext = buildSkillContext(request.userInput);
  const matchedSkills = findRelevantSkills(request.userInput).map(s => s.name);

  const finalSystemPrompt = skillContext
    ? `${baseSystemPrompt}\n\n${skillContext}`
    : baseSystemPrompt;

  const usePremiumModel = request.mode === "report";
  const modelName = getModelName(usePremiumModel);

  // Load history if a session ID was provided
  const history = request.sessionId
    ? getSessionHistory(request.sessionId)
    : [];

  try {
    const claudeResponse = await callClaude({
      systemPrompt: finalSystemPrompt,
      userInput: request.userInput,
      usePremiumModel,
      maxTokens: getMaxTokens(request.mode),
      history
    });

    // Persist exchange to session
    if (request.sessionId) {
      appendToSession(
        request.sessionId,
        request.mode,
        request.userInput,
        claudeResponse.text
      );
    }

    // Write success log
    writeLog(buildLogEntry({
      mode: request.mode,
      sessionId: request.sessionId,
      model: modelName,
      userInput: request.userInput,
      output: claudeResponse.text,
      skillsMatched: matchedSkills,
      status: "success",
      startTime
    }));

    return {
      mode: request.mode,
      title: buildTitle(request.mode),
      summary: claudeResponse.text,
      nextSteps: buildNextSteps(request.mode),
      sessionId: request.sessionId
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Write error log before re-throwing
    writeLog(buildLogEntry({
      mode: request.mode,
      sessionId: request.sessionId,
      model: modelName,
      userInput: request.userInput,
      output: "",
      skillsMatched: matchedSkills,
      status: "error",
      errorMessage,
      startTime
    }));

    throw error;
  }
}
