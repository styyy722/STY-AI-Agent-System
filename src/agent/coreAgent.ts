import { callClaude } from "../llm/claudeClient.js";

export type AgentMode = "general" | "finance" | "data" | "report";

export interface AgentRequest {
  mode: AgentMode;
  userInput: string;
}

export interface AgentResponse {
  mode: AgentMode;
  title: string;
  summary: string;
  nextSteps: string[];
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
      "Add a WACC or valuation skill module later for more structured finance workflows."
    ],
    data: [
      "Provide a dataset file later so the agent can perform real analysis.",
      "Add CSV and Excel reading support in the next development stage.",
      "Create reusable analytics templates for EDA, modelling, and dashboards."
    ],
    report: [
      "Review whether the output is suitable for the target audience.",
      "Provide the preferred tone, format, and stakeholder type for a sharper report.",
      "Add reporting templates later for executive summaries, board papers, and slide content."
    ]
  };

  return nextSteps[mode];
}

export async function runCoreAgent(request: AgentRequest): Promise<AgentResponse> {
  const systemPrompt = buildSystemPrompt(request.mode);

  const claudeResponse = await callClaude({
    systemPrompt,
    userInput: request.userInput
  });

  return {
    mode: request.mode,
    title: buildTitle(request.mode),
    summary: claudeResponse.text,
    nextSteps: buildNextSteps(request.mode)
  };
}
