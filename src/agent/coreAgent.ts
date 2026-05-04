import { getLLMClient } from "../llm/llmRouter.js";
import { buildSkillContext, findRelevantSkills } from "../skills/skillRegistry.js";
import {
  getSessionHistory,
  appendToSession
} from "../tools/sessionMemory.js";
import { writeLog, buildLogEntry } from "../tools/logger.js";
import { scoreOutput, formatConfidenceBlock, type ConfidenceResult } from "../tools/confidenceScorer.js";
import { requiresReview, addToReviewQueue } from "../tools/reviewQueue.js";
import { recordUsage } from "../tools/costTracker.js";
import { searchDocuments, buildRagContext, autoIndexOutput } from "../tools/ragStore.js";
import { extractPythonBlocks } from "../tools/codeExtractor.js";
import { executePythonCode, formatExecutionResult } from "../tools/codeExecutor.js";
import { runRelevantTools, buildToolsSystemContext } from "../tools/toolRegistry.js";
import { retrieveRelevantMemories, buildMemoryContext, autoStoreActivity } from "../tools/memoryManager.js";
import type { ImageAttachment } from "../llm/llmInterface.js";

export type AgentMode = "general" | "finance" | "data" | "report";

export interface AgentRequest {
  mode: AgentMode;
  userInput: string;
  sessionId?: string;
  images?: ImageAttachment[];
}

export interface AgentResponse {
  mode: AgentMode;
  title: string;
  summary: string;
  nextSteps: string[];
  sessionId?: string;
  confidence?: ConfidenceResult;
  confidenceBlock?: string;
  reviewQueued?: boolean;
  reviewId?: string;
  toolsUsed?: string[];
  codeExecuted?: boolean;
  memoriesUsed?: number;
}

export function buildSystemPrompt(mode: AgentMode, toolsContext?: string): string {
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
- Before producing your final answer, think through the problem carefully:
  1. Identify what the user is actually asking for.
  2. Identify what information is available vs missing.
  3. Consider the most important frameworks or approaches for this task.
  4. Identify any risks, assumptions, or limitations to flag.
  5. Then produce a structured, complete response.
- Do not rush to a conclusion. A thorough, well-reasoned answer is always preferred over a fast one.
${toolsContext ? `\n${toolsContext}` : ""}
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

IMPORTANT: When writing Python code for analysis, always use print() statements to show your results.
Write complete, self-contained scripts that include any sample data needed if no file is provided.
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
  general: 6000,
  finance: 18000,
  data: 24000,
  report: 30000
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
  const skillContext = buildSkillContext(request.userInput);
  const matchedSkills = findRelevantSkills(request.userInput).map(s => s.name);

  // ── Long-term memory: retrieve relevant past context ─────────────────────
  let memoryContext = "";
  let memoriesUsed = 0;

  if (process.env.MEMORY_ENABLED !== "false") {
    try {
      const memories = retrieveRelevantMemories(request.userInput, 5);
      memoriesUsed = memories.length;
      memoryContext = buildMemoryContext(memories);
    } catch {
      // Memory failure must never block the agent
    }
  }

  // ── Tool registry: get descriptions for system prompt ────────────────────
  const toolsSystemContext = await buildToolsSystemContext();
  const baseSystemPrompt = buildSystemPrompt(request.mode, toolsSystemContext);

  // Inject memory context into system prompt when available
  const finalSystemPrompt = [
    baseSystemPrompt,
    memoryContext,
    skillContext
  ].filter(Boolean).join("\n\n");

  const usePremiumModel = request.mode === "report";
  const modelName = getModelName(usePremiumModel);

  const history = request.sessionId
    ? getSessionHistory(request.sessionId)
    : [];

  // ── RAG ──────────────────────────────────────────────────────────────────
  let ragContext = "";
  if (process.env.RAG_ENABLED !== "false") {
    try {
      const ragResults = searchDocuments({
        query: request.userInput,
        topK: 3,
        category: request.mode
      });
      ragContext = buildRagContext(ragResults);
    } catch {
      // RAG failure must never block the agent
    }
  }

  // ── Plugin tools ─────────────────────────────────────────────────────────
  let toolsOutput = "";
  let toolsUsed: string[] = [];

  try {
    const toolResult = await runRelevantTools({
      mode: request.mode,
      sessionId: request.sessionId,
      userInput: request.userInput
    });
    toolsOutput = toolResult.combinedOutput;
    toolsUsed = toolResult.toolsUsed;
  } catch {
    // Tool failure must never block the agent
  }

  const enrichedUserInput = [
    ragContext,
    toolsOutput,
    request.userInput
  ].filter(Boolean).join("\n\n");

  try {
    const llm = getLLMClient();
    const llmResponse = await llm.complete({
      systemPrompt: finalSystemPrompt,
      userInput: enrichedUserInput,
      usePremiumModel,
      maxTokens: getMaxTokens(request.mode),
      history,
      images: request.images
    });

    // ── Code execution ────────────────────────────────────────────────────
    let finalText = llmResponse.text;
    let codeExecuted = false;
    const codeExecutionEnabled = process.env.CODE_EXECUTION_ENABLED === "true";

    if (codeExecutionEnabled && request.mode === "data") {
      const blocks = extractPythonBlocks(llmResponse.text);

      if (blocks.length > 0) {
        codeExecuted = true;
        let executionAppendix = "\n\n═══════════════════════════════════════\n⚙ CODE EXECUTION RESULTS\n═══════════════════════════════════════";

        for (const block of blocks) {
          const result = await executePythonCode(block.code);
          executionAppendix += formatExecutionResult(result, block.index);
        }

        finalText = llmResponse.text + executionAppendix;
      }
    }

    if (request.sessionId) {
      appendToSession(
        request.sessionId,
        request.mode,
        request.userInput,
        finalText
      );
    }

    recordUsage({
      mode: request.mode,
      model: modelName,
      sessionId: request.sessionId,
      inputChars: request.userInput.length,
      outputChars: finalText.length
    });

    const confidence = await scoreOutput({
      mode: request.mode,
      userInput: request.userInput,
      agentOutput: finalText
    });
    const confidenceBlock = formatConfidenceBlock(confidence);

    writeLog(buildLogEntry({
      mode: request.mode,
      sessionId: request.sessionId,
      model: modelName,
      userInput: request.userInput,
      output: finalText,
      skillsMatched: matchedSkills,
      status: "success",
      startTime,
      confidenceTier: confidence.tier,
      confidenceScore: confidence.score,
      confidenceFlags: confidence.flags
    }));

    let reviewQueued = false;
    let reviewId: string | undefined;

    if (requiresReview(request.mode, confidence)) {
      const queueItem = addToReviewQueue({
        mode: request.mode,
        sessionId: request.sessionId,
        userInput: request.userInput,
        agentOutput: finalText,
        confidence
      });
      reviewQueued = true;
      reviewId = queueItem.id;
    }

    if (process.env.RAG_ENABLED !== "false") {
      autoIndexOutput({
        mode: request.mode,
        userInput: request.userInput,
        agentOutput: finalText,
        sessionId: request.sessionId
      });
    }

    // ── Auto-store activity in long-term memory ───────────────────────────
    if (process.env.MEMORY_ENABLED !== "false") {
      autoStoreActivity(request.mode, request.userInput, finalText);
    }

    return {
      mode: request.mode,
      title: buildTitle(request.mode),
      summary: finalText,
      nextSteps: buildNextSteps(request.mode),
      sessionId: request.sessionId,
      confidence,
      confidenceBlock,
      reviewQueued,
      reviewId,
      toolsUsed,
      codeExecuted,
      memoriesUsed
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

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
