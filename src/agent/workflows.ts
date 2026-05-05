import {
  runCoreAgent,
  type AgentMode,
  type AgentRequest,
  type AgentResponse
} from "./coreAgent.js";
import { findRelevantSkills } from "../skills/skillRegistry.js";
import { addToReviewQueue } from "../tools/reviewQueue.js";
import type { ConfidenceResult } from "../tools/confidenceScorer.js";

export type WorkflowType =
  | "auto"
  | "standard"
  | "routing"
  | "evaluator-optimizer"
  | "human-approval"
  | "long-running";

export interface WorkflowRequest extends AgentRequest {
  workflowType?: WorkflowType;
  maxIterations?: number;
  minConfidenceScore?: number;
}

const ROUTABLE_MODES: AgentMode[] = ["finance", "data", "report", "pbi"];
const AUTO_MODES: AgentMode[] = ["finance", "data", "pbi", "report"];

const AUTO_MODE_KEYWORDS: Record<AgentMode, string[]> = {
  general: [],
  finance: [
    "finance",
    "financial",
    "cfo",
    "budget",
    "forecast",
    "variance",
    "cash",
    "margin",
    "revenue",
    "profit",
    "ebitda",
    "wacc",
    "valuation",
    "npv",
    "irr",
    "working capital",
    "pricing",
    "unit economics"
  ],
  data: [
    "data",
    "dataset",
    "quality",
    "reconcile",
    "metric",
    "anomaly",
    "forecasting",
    "sql",
    "pipeline",
    "schema",
    "observability",
    "experiment",
    "cohort",
    "churn",
    "segmentation"
  ],
  pbi: [
    "power bi",
    "pbi",
    "dashboard",
    "semantic model",
    "dax",
    "measure",
    "visual",
    "report page",
    "calculation group",
    "rls",
    "power query",
    "refresh",
    "workspace"
  ],
  report: [
    "report",
    "summary",
    "executive",
    "board",
    "recommendation",
    "brief",
    "memo",
    "stakeholder",
    "presentation",
    "pack",
    "commentary"
  ]
};

function routeModeFromInput(input: string, fallback: AgentMode): AgentMode {
  const skills = findRelevantSkills(input);
  const matchedMode = skills
    .map(skill => skill.category)
    .find(category => ROUTABLE_MODES.includes(category as AgentMode));

  return (matchedMode as AgentMode | undefined) ?? fallback;
}

function inferAutoModes(input: string, fallback: AgentMode): AgentMode[] {
  const normalizedInput = input.toLowerCase();
  const scores = new Map<AgentMode, number>();

  for (const mode of AUTO_MODES) {
    scores.set(mode, mode === fallback ? 1 : 0);
  }

  for (const skill of findRelevantSkills(input)) {
    if (AUTO_MODES.includes(skill.category as AgentMode)) {
      const mode = skill.category as AgentMode;
      scores.set(mode, (scores.get(mode) ?? 0) + 3);
    }
  }

  for (const mode of AUTO_MODES) {
    const keywordHits = AUTO_MODE_KEYWORDS[mode].filter(keyword =>
      normalizedInput.includes(keyword)
    ).length;
    scores.set(mode, (scores.get(mode) ?? 0) + keywordHits);
  }

  const selected: AgentMode[] = AUTO_MODES
    .filter(mode => (scores.get(mode) ?? 0) > 0)
    .sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0));

  if (selected.length === 0) {
    selected.push(fallback === "general" ? "report" : fallback);
  }

  if (selected.length > 1 && selected.includes("report")) {
    return [...selected.filter(mode => mode !== "report"), "report"];
  }

  return selected.slice(0, 4);
}

function buildSpecialistPrompt(
  originalRequest: string,
  mode: AgentMode,
  selectedModes: AgentMode[]
): string {
  return `
AUTO MULTI-MODE WORKFLOW

Original user request:
${originalRequest}

Selected specialist modes for this execution:
${selectedModes.map(selectedMode => `- ${selectedMode}`).join("\n")}

Your assigned specialist lens: ${mode}

Instructions:
- Analyse only from the ${mode} perspective.
- Do not produce the final consolidated answer.
- Return specialist findings, risks, assumptions, validation checks, and recommended actions.
- If this mode is not materially relevant after inspection, say so briefly and explain why.
`;
}

function buildSynthesisPrompt(
  originalRequest: string,
  specialistResults: AgentResponse[]
): string {
  return `
AUTO MULTI-MODE SYNTHESIS

Original user request:
${originalRequest}

Specialist findings:
${specialistResults
  .map(result => `
--- ${result.mode.toUpperCase()} FINDINGS ---
${result.summary}
`)
  .join("\n")}

Produce one final answer for the user.

Requirements:
- Merge findings across modes without duplication.
- Resolve or call out conflicts between specialist findings.
- Prioritise issues by business impact and risk.
- State assumptions and confidence caveats.
- Give concrete next steps.
- Do not mention internal prompt mechanics.
`;
}

function defaultConfidence(): ConfidenceResult {
  return {
    tier: "Unscored",
    score: 0,
    flags: ["Human approval workflow requested manual review."],
    reviewNote: "Human approval required before corporate use.",
    scoringFailed: true
  };
}

function withWorkflow(
  response: AgentResponse,
  workflowType: WorkflowType,
  steps: string[]
): AgentResponse {
  return {
    ...response,
    workflowType,
    workflowSteps: steps
  };
}

async function runRoutingWorkflow(request: WorkflowRequest): Promise<AgentResponse> {
  const routedMode = routeModeFromInput(request.userInput, request.mode);
  const response = await runCoreAgent({
    ...request,
    mode: routedMode
  });

  return withWorkflow(response, "routing", [
    `Inspected request and matched specialist skills.`,
    `Selected ${routedMode} mode${routedMode === request.mode ? " (unchanged)" : ` instead of ${request.mode}`}.`,
    `Ran standard agent workflow in ${routedMode} mode.`
  ]);
}

async function runAutoWorkflow(request: WorkflowRequest): Promise<AgentResponse> {
  const selectedModes = inferAutoModes(request.userInput, request.mode);
  const specialistResults: AgentResponse[] = [];
  const steps: string[] = [
    `Detected specialist modes: ${selectedModes.join(", ")}.`
  ];

  for (const mode of selectedModes) {
    const result = await runCoreAgent({
      ...request,
      mode,
      userInput: buildSpecialistPrompt(request.userInput, mode, selectedModes),
      dryRunTools: request.dryRunTools ?? specialistResults.length > 0
    });

    specialistResults.push(result);
    steps.push(
      `Ran ${mode} specialist pass: ${result.confidence?.tier ?? "Unscored"} confidence (${result.confidence?.score ?? 0}/100).`
    );
  }

  const synthesisMode: AgentMode = selectedModes.includes("report")
    ? "report"
    : selectedModes[0] ?? request.mode;

  const finalResponse = await runCoreAgent({
    ...request,
    mode: synthesisMode,
    userInput: buildSynthesisPrompt(request.userInput, specialistResults)
  });

  return withWorkflow(finalResponse, "auto", [
    ...steps,
    `Synthesised final answer in ${synthesisMode} mode.`
  ]);
}

async function runEvaluatorOptimizerWorkflow(
  request: WorkflowRequest
): Promise<AgentResponse> {
  const minScore = request.minConfidenceScore ?? 75;
  const first = await runCoreAgent(request);
  const score = first.confidence?.score ?? 0;

  if (first.confidence?.tier === "High" || score >= minScore) {
    return withWorkflow(first, "evaluator-optimizer", [
      "Generated initial answer.",
      `Evaluator scored output at ${score}/100, meeting the ${minScore}/100 quality bar.`,
      "No optimization pass required."
    ]);
  }

  const flags = first.confidence?.flags?.length
    ? first.confidence.flags.map(flag => `- ${flag}`).join("\n")
    : "- Improve factual grounding, assumption transparency, completeness, and clarity.";

  const optimizationPrompt = `
User request:
${request.userInput}

First draft:
${first.summary}

Evaluator findings:
${flags}

Rewrite the answer so it resolves the evaluator findings. Preserve accurate content, remove unsupported claims, state assumptions clearly, and return only the improved final answer.
`;

  const optimized = await runCoreAgent({
    ...request,
    userInput: optimizationPrompt
  });

  return withWorkflow(optimized, "evaluator-optimizer", [
    "Generated initial answer.",
    `Evaluator scored first output at ${score}/100, below the ${minScore}/100 quality bar.`,
    "Ran optimizer pass using evaluator findings.",
    `Final evaluator score: ${optimized.confidence?.score ?? "unscored"}.`
  ]);
}

async function runHumanApprovalWorkflow(
  request: WorkflowRequest
): Promise<AgentResponse> {
  const response = await runCoreAgent(request);

  if (!response.reviewQueued) {
    const queueItem = addToReviewQueue({
      mode: response.mode,
      sessionId: request.sessionId,
      userInput: request.userInput,
      agentOutput: response.summary,
      confidence: response.confidence ?? defaultConfidence()
    });

    response.reviewQueued = true;
    response.reviewId = queueItem.id;
  }

  return withWorkflow(response, "human-approval", [
    "Generated answer.",
    "Forced output into the human review queue.",
    `Review ID: ${response.reviewId ?? "not available"}.`
  ]);
}

async function runLongRunningWorkflow(
  request: WorkflowRequest
): Promise<AgentResponse> {
  const maxIterations = Math.max(1, Math.min(request.maxIterations ?? 3, 8));
  const minScore = request.minConfidenceScore ?? 75;
  let latest: AgentResponse | null = null;
  const steps: string[] = [];

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const iterationPrompt = latest
      ? `
Long-running workflow iteration ${iteration} of ${maxIterations}.

Original request:
${request.userInput}

Previous output:
${latest.summary}

Continue or refine the work. If the work is complete, lead with "COMPLETE:" and provide the final response. Otherwise, lead with "CONTINUE:" and provide the next useful iteration.
`
      : `
Long-running workflow iteration ${iteration} of ${maxIterations}.

Original request:
${request.userInput}

Start the task. If the work is complete in this iteration, lead with "COMPLETE:". Otherwise, lead with "CONTINUE:" and provide the current progress plus what remains.
`;

    latest = await runCoreAgent({
      ...request,
      userInput: iterationPrompt
    });

    const score = latest.confidence?.score ?? 0;
    steps.push(`Iteration ${iteration}: ${latest.confidence?.tier ?? "Unscored"} confidence (${score}/100).`);

    if (latest.summary.trim().toUpperCase().startsWith("COMPLETE:") || score >= minScore) {
      break;
    }
  }

  return withWorkflow(latest!, "long-running", [
    `Ran up to ${maxIterations} iteration(s).`,
    ...steps
  ]);
}

export async function runAgentWorkflow(
  request: WorkflowRequest
): Promise<AgentResponse> {
  const workflowType = request.workflowType ?? "standard";

  switch (workflowType) {
    case "auto":
      return runAutoWorkflow(request);

    case "routing":
      return runRoutingWorkflow(request);

    case "evaluator-optimizer":
      return runEvaluatorOptimizerWorkflow(request);

    case "human-approval":
      return runHumanApprovalWorkflow(request);

    case "long-running":
      return runLongRunningWorkflow(request);

    case "standard":
    default: {
      const response = await runCoreAgent(request);
      return withWorkflow(response, "standard", ["Ran standard single-pass workflow."]);
    }
  }
}
