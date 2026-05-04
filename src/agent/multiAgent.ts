import { callClaude } from "../llm/claudeClient.js";
import { buildSystemPrompt, type AgentMode } from "./coreAgent.js";
import { buildSkillContext } from "../skills/skillRegistry.js";
import { writeLog, buildLogEntry } from "../tools/logger.js";
import { recordUsage } from "../tools/costTracker.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubAgentRole = "planner" | "researcher" | "analyst" | "critic" | "synthesiser";

export interface SubAgentResult {
  role: SubAgentRole;
  output: string;
  durationMs: number;
}

export interface MultiAgentRequest {
  mode: AgentMode;
  userInput: string;
  sessionId?: string;
  roles?: SubAgentRole[];   // defaults to ["planner","analyst","critic","synthesiser"]
}

export interface MultiAgentResponse {
  mode: AgentMode;
  userInput: string;
  steps: SubAgentResult[];
  finalOutput: string;
  sessionId?: string;
}

// ─── Sub-agent system prompts ─────────────────────────────────────────────────

const ROLE_PROMPTS: Record<SubAgentRole, string> = {
  planner: `
You are a task planning agent. Your job is to read the user's request and produce a
structured plan that breaks it into 3–5 clear analytical steps. For each step, state:
- What needs to be done
- What information or data is required
- What the expected output looks like
Be specific and actionable. Do not perform the analysis yet — just plan it.
Output format: numbered list of steps.
`,

  researcher: `
You are a research and context agent. Your job is to read the user's request and:
1. Identify all key concepts, terms, and frameworks relevant to the task
2. State the standard methodology or best practice approach for this type of analysis
3. Identify what data or assumptions will be needed and flag any that are missing
4. Surface any important caveats, risks, or limitations that should be noted
Be thorough. Your output will be used by an analyst to perform the actual work.
`,

  analyst: `
You are an expert analyst. Your job is to perform the core analysis requested by the user.
You have been given the user's original request and context from a research phase.
Produce the most complete, accurate, and well-structured analysis you can.
- Separate facts from assumptions clearly
- Show your working where relevant (formulas, logic, reasoning)
- Quantify everything that can be quantified
- Flag anything that requires data you do not have
This is the primary deliverable — make it decision-ready.
`,

  critic: `
You are a quality assurance agent. Your job is to review an analysis and identify:
1. Any factual errors, unsupported claims, or logical inconsistencies
2. Assumptions that are not stated or not justified
3. Missing components the user asked for that were not delivered
4. Anything that could mislead a decision-maker if taken at face value
5. Specific suggestions to improve the output
Be direct and specific. Do not rewrite the analysis — only identify issues and improvements.
Format: numbered list of issues, then a brief overall quality rating (Strong / Adequate / Needs revision).
`,

  synthesiser: `
You are a synthesis agent. Your job is to produce the final, polished response to the user's
request by combining the analysis and incorporating the critic's feedback.
- Address all issues raised by the critic
- Present a clean, professional, decision-ready output
- Do not mention the multi-agent process — write as if this is a single coherent response
- Match the appropriate tone and format for the mode (finance = professional; report = executive-ready)
- This is what the user will see — make it the best possible answer to their original question.
`,
};

// ─── Sub-agent executor ───────────────────────────────────────────────────────

async function runSubAgent(params: {
  role: SubAgentRole;
  mode: AgentMode;
  originalRequest: string;
  priorContext: string;
  skillContext: string;
}): Promise<SubAgentResult> {
  const start = Date.now();

  const systemPrompt = [
    buildSystemPrompt(params.mode),
    params.skillContext,
    ROLE_PROMPTS[params.role]
  ].filter(Boolean).join("\n\n");

  const userMessage = params.priorContext
    ? `Original user request:\n${params.originalRequest}\n\n---\nContext from prior steps:\n${params.priorContext}`
    : `Original user request:\n${params.originalRequest}`;

  const response = await callClaude({
    systemPrompt,
    userInput: userMessage,
    usePremiumModel: params.mode === "report" || params.role === "synthesiser",
    maxTokens: params.role === "synthesiser" ? 8000 : 3000,
  });

  return {
    role: params.role,
    output: response.text,
    durationMs: Date.now() - start,
  };
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function runMultiAgent(
  request: MultiAgentRequest
): Promise<MultiAgentResponse> {
  const startTime = Date.now();
  const roles = request.roles ?? ["planner", "analyst", "critic", "synthesiser"];
  const skillContext = buildSkillContext(request.userInput);
  const steps: SubAgentResult[] = [];
  let priorContext = "";

  for (const role of roles) {
    const result = await runSubAgent({
      role,
      mode: request.mode,
      originalRequest: request.userInput,
      priorContext,
      skillContext,
    });

    steps.push(result);

    // Accumulate context for the next agent
    priorContext += `\n\n=== ${role.toUpperCase()} OUTPUT ===\n${result.output}`;

    // Record usage per sub-agent call
    recordUsage({
      mode: request.mode,
      model: request.mode === "report" || role === "synthesiser"
        ? (process.env.ANTHROPIC_MODEL_PREMIUM || "claude-opus-4-7")
        : (process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"),
      sessionId: request.sessionId,
      inputChars: request.userInput.length + priorContext.length,
      outputChars: result.output.length,
    });
  }

  const synthesiserStep = steps.find(s => s.role === "synthesiser");
  const finalOutput = synthesiserStep?.output ?? steps[steps.length - 1].output;

  // Log the completed multi-agent run
  writeLog(buildLogEntry({
    mode: request.mode,
    sessionId: request.sessionId,
    model: "multi-agent",
    userInput: request.userInput,
    output: finalOutput,
    skillsMatched: [],
    status: "success",
    startTime,
  }));

  return {
    mode: request.mode,
    userInput: request.userInput,
    steps,
    finalOutput,
    sessionId: request.sessionId,
  };
}
