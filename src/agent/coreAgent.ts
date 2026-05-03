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
Always be clear, structured, practical, and business-focused.
`;

  const modePrompts: Record<AgentMode, string> = {
    general: `
You handle general business tasks, planning, writing, and productivity workflows.
`,
    finance: `
You specialise in finance workflows including WACC, valuation, forecasting, financial analysis, and investment-style reasoning.
`,
    data: `
You specialise in data analytics workflows including EDA, data cleaning, model selection, business insights, and dashboard-ready summaries.
`,
    report: `
You specialise in professional reporting including executive summaries, board papers, consulting-style recommendations, and slide-ready insights.
`
  };

  return `${basePrompt}\n${modePrompts[mode]}`;
}

export async function runCoreAgent(request: AgentRequest): Promise<AgentResponse> {
  const systemPrompt = buildSystemPrompt(request.mode);

  return {
    mode: request.mode,
    title: `STY Agent - ${request.mode.toUpperCase()} Mode`,
    summary: `The agent received your request: "${request.userInput}". This is currently a placeholder response. Later, this will be sent to Claude using the system prompt: ${systemPrompt.trim()}`,
    nextSteps: [
      "Connect this core agent to Claude API",
      "Add specialist skills for finance, data analytics, and reporting",
      "Add file-reading support for CSV, Excel, PDF, and Markdown files"
    ]
  };
}
