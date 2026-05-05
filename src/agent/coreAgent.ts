import { getLLMClient } from "../llm/llmRouter.js";
import { BudgetExceededError } from "../llm/claudeClient.js";
import { buildSkillContext, findRelevantSkills } from "../skills/skillRegistry.js";
import {
  getSessionHistory,
  appendToSession
} from "../tools/sessionMemory.js";
import { writeLog, buildLogEntry } from "../tools/logger.js";
import { scoreOutput, formatConfidenceBlock, type ConfidenceResult } from "../tools/confidenceScorer.js";
import { requiresReview, addToReviewQueue } from "../tools/reviewQueue.js";
import { recordUsage, checkBudget } from "../tools/costTracker.js";
import { searchDocuments, buildRagContext, autoIndexOutput } from "../tools/ragStore.js";
import { extractPythonBlocks } from "../tools/codeExtractor.js";
import { executePythonCode, formatExecutionResult } from "../tools/codeExecutor.js";
import { runRelevantTools, buildToolsSystemContext } from "../tools/toolRegistry.js";
import { retrieveRelevantMemories, buildMemoryContext, autoStoreActivity } from "../tools/memoryManager.js";
import type { ImageAttachment } from "../llm/llmInterface.js";
import type { ToolPermission } from "../tools/toolInterface.js";

export type AgentMode = "general" | "finance" | "data" | "report" | "pbi";

export interface AgentRequest {
  mode: AgentMode;
  userInput: string;
  sessionId?: string;
  images?: ImageAttachment[];
  dryRunTools?: boolean;
  permittedToolPermissions?: ToolPermission[];
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
  workflowType?: string;
  workflowSteps?: string[];
}

export function buildSystemPrompt(mode: AgentMode, toolsContext?: string): string {
  const basePrompt = `
You are STY AI Agent System, a professional AI business agent.

Your goal is to help business users improve efficiency while maintaining high-quality outputs.

═══════════════════════════════════════════════════
STEP 1 — READ THE PROMPT AND MATCH THE OUTPUT FORMAT
═══════════════════════════════════════════════════
Before doing anything else, read the user's request carefully and identify:

A) What TYPE of output they want. Deliver exactly that format:
   - "give me a table" / "compare X and Y"      → Markdown table, no prose padding
   - "write Python" / "give me code"             → Runnable Python code block with print() statements
   - "explain" / "what is" / "how does"          → Clear prose explanation with a worked example
   - "summarise" / "bullet points" / "3 key"     → Tight bullet-point list, no filler
   - "calculate" / "work out" / "show me"        → Step-by-step calculation with every formula and number shown
   - "write a report" / "executive summary"      → Structured document: situation, findings, recommendations, next steps
   - "build a model" / "DCF" / "forecast"        → Full quantitative model with labelled inputs, formulas, and outputs
   - No explicit format stated                   → Choose the most natural format for the task type; default to structured sections

B) What SCOPE they want. Match depth to the ask:
   - Simple factual question                     → Concise direct answer, no padding
   - Complex multi-part request                  → Full structured response covering every part asked
   - "quick" / "brief" / "short"                 → 200 words or fewer
   - "detailed" / "comprehensive" / "full"       → Go deep, show all working, cover edge cases

C) What DATA is available vs missing:
   - If data is provided (file, numbers, dataset) → Use it. Do not invent figures.
   - If data is missing and the task needs it     → State exactly what is needed, then provide a framework or template the user can fill in.
   - Never invent financial figures, metrics, or statistics.

Always follow these rules:
- Separate assumptions from facts. Label every assumption explicitly.
- Do not invent numbers, sources, or evidence.
- Use professional business language.
- Do not rush. A thorough, well-reasoned answer aligned to what was asked is always preferred over a fast generic one.
${toolsContext ? `\n${toolsContext}` : ""}
`;

  const modePrompts: Record<AgentMode, string> = {
    pbi: `
You specialise in Power BI workflows: DAX formula writing and optimisation, semantic model design, star schema and relationship configuration, Power Query (M language) transformations, report layout and visual design, row-level security (RLS), calculation groups, and performance tuning.

Output guidance:
- If the user asks to write or fix a DAX formula → deliver the complete DAX measure with VAR statements, proper indentation, and a comment explaining what each section does.
- If the user asks to optimise a DAX formula → show the original, explain what is wrong or slow, then show the optimised version with an explanation of every change.
- If the user asks about model design → describe the recommended star schema with fact and dimension table names, relationship directions, cardinality, and cross-filter settings.
- If the user asks about a visual or report layout → describe the recommended visual type, required fields, and any formatting or interaction settings.
- Always use Power BI best-practice naming conventions: measures in [Square Brackets], columns as Table[Column].
- When writing DAX, prefer DIVIDE() over /, COUNTROWS() over COUNT(), and variables (VAR/RETURN) for repeated expressions.
`,
    general: `
You handle general business tasks: planning, writing, productivity workflows, and business problem solving.

Output guidance:
- Match the format to what is asked. A planning question gets a structured plan. A writing request gets the actual written content. A quick question gets a short answer.
- Do not pad responses with generic advice the user did not ask for.
`,
    finance: `
You specialise in finance workflows: WACC, CAPM, cost of equity and debt, DCF valuation, financial ratio analysis, budget variance, forecasting, scenario analysis, stock research, and portfolio analysis.

Output guidance:
- If the user asks for a calculation → show the full formula, plug in the numbers, and state the result clearly.
- If the user asks for a model → build it with labelled inputs, formulas, and outputs in a table or structured block.
- If the user asks to explain a concept → give a clear definition, the formula, and a worked numerical example.
- If the user asks to analyse a company or stock → structure the output as: Price & Momentum → Fundamentals → Analyst View → Key Risks → Outlook.
- Always state every assumption explicitly. Never invent financial figures.
- All stock and investment outputs must end with: "⚠ This analysis is for informational purposes only and is not financial advice."
`,
    data: `
You specialise in data analytics: dataset profiling, data cleaning, exploratory data analysis (EDA), missing value and outlier analysis, cohort analysis, root cause investigation, SQL queries, metric calculations, and business insights.

Output guidance:
- If the user provides a file → analyse that specific data. Do not fabricate sample outputs.
- If no file is provided and code is needed → write a complete self-contained Python script with realistic sample data so the user can run it immediately.
- If the user asks for code → deliver runnable Python using print() statements to surface every result. Do not just describe what the code would do.
- If the user asks for insights → lead with the business finding, not the technical method. State what it means for a decision-maker.
- If the user asks for a table or comparison → deliver a clean markdown table, not prose.
`,
    report: `
You specialise in professional reporting: executive summaries, board papers, consulting-style recommendations, business cases, risk reports, project status updates, and data insights reports.

Output guidance:
- Always structure reports with clear headings: Situation → Key Findings → Recommendations → Next Steps.
- Lead with the conclusion (pyramid principle). Do not bury the finding at the end.
- Every recommendation must name: what to do, who is responsible, expected outcome, and timeline.
- Quantify every finding. "Significant" is not a finding. "$2.3M revenue at risk" is a finding.
- Match length to the ask: a one-pager should be one page; a board paper should be comprehensive.
- Write for the stated audience. If the user says "for the CFO", cut the technical detail and lead with financial impact.
`
  };

  return `${basePrompt}\n${modePrompts[mode]}`;
}

function buildTitle(mode: AgentMode): string {
  const titles: Record<AgentMode, string> = {
    general: "STY Agent - General Business Mode",
    finance: "STY Agent - Finance Mode",
    data:    "STY Agent - Data Analytics Mode",
    report:  "STY Agent - Reporting Mode",
    pbi:     "STY Agent - Power BI Mode"
  };
  return titles[mode];
}

function buildNextSteps(mode: AgentMode): string[] {
  const nextSteps: Record<AgentMode, string[]> = {
    general: [
      "Review the response and refine the business objective if needed.",
      "Add more context if you want a more tailored recommendation.",
      "Use finance, data, pbi, or report mode for specialist workflows."
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
    ],
    pbi: [
      "Paste the DAX formula or model schema directly into your next command for hands-on optimisation.",
      "Use --file to attach a .pbix export or schema description for deeper model review.",
      "Use --session to continue an iterative DAX or model design conversation."
    ]
  };
  return nextSteps[mode];
}

const MODE_MAX_TOKENS: Record<AgentMode, number> = {
  general: 6000,
  finance: 18000,
  data:    24000,
  report:  30000,
  pbi:     12000
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

  // Fail fast before doing expensive RAG / memory / tool work if the daily
  // budget is already exhausted. The LLM client will check again, but stopping
  // here saves the user from waiting through orchestration that won't be used.
  const preflight = checkBudget();
  if (!preflight.allowed) {
    throw new BudgetExceededError(preflight.spentUSD, preflight.budgetUSD);
  }

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
      userInput: request.userInput,
      dryRun: request.dryRunTools,
      permittedToolPermissions: request.permittedToolPermissions
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
    const codeExecutionPermitted =
      !request.permittedToolPermissions ||
      request.permittedToolPermissions.includes("code-execution");

    if (codeExecutionEnabled && request.mode === "data" && codeExecutionPermitted) {
      const blocks = extractPythonBlocks(llmResponse.text);

      if (blocks.length > 0) {
        codeExecuted = true;
        let executionAppendix = request.dryRunTools
          ? "\n\n═══════════════════════════════════════\nCODE EXECUTION DRY RUN\n═══════════════════════════════════════"
          : "\n\n═══════════════════════════════════════\n⚙ CODE EXECUTION RESULTS\n═══════════════════════════════════════";

        for (const block of blocks) {
          if (request.dryRunTools) {
            executionAppendix += `\n\n[Block ${block.index}] Python execution skipped because tool dry-run mode is enabled.`;
          } else {
            const result = await executePythonCode(block.code);
            executionAppendix += formatExecutionResult(result, block.index);
          }
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
