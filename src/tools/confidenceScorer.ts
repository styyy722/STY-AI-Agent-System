import { callClaude } from "../llm/claudeClient.js";

export type ConfidenceTier = "High" | "Moderate" | "Low" | "Unscored";

export interface ConfidenceResult {
  tier: ConfidenceTier;
  score: number;          // 0–100; ignored when tier is "Unscored"
  flags: string[];        // specific things the user should verify
  reviewNote: string;     // one-line summary for display
  scoringFailed?: boolean; // true when the scorer itself errored
}

// How much of the input/output the auditor sees. Long finance/data outputs
// were previously truncated to 2k chars, which meant the scorer was judging a
// snippet rather than the deliverable.
const SCORER_INPUT_BUDGET = 4000;
const SCORER_OUTPUT_BUDGET = 8000;

const SCORER_SYSTEM_PROMPT = `
You are an output quality auditor for an AI business agent.

You will be given:
- The user's original request
- The agent's response
- The mode it ran in (finance, data, report, general)

Your job is to assess the QUALITY of the agent's response across four dimensions
and return a JSON object. Score the response on its own merits — do NOT penalise
the response for being about a high-stakes topic. Topic-level governance is
handled separately by the review queue.

Scoring dimensions (each 0–25):
1. factual_groundedness: Are claims based on provided data or stated clearly as general knowledge? Penalise if numbers appear invented or sourced without evidence.
2. assumption_transparency: Are assumptions explicitly stated? Penalise if the response relies on unstated assumptions.
3. completeness: Does the response fully address the request? Penalise if it skips key parts or deflects.
4. structure_and_clarity: Is the response well-structured, readable, and decision-ready for a business audience? Penalise rambling, missing structure, or unclear logic.

Return ONLY a valid JSON object — no preamble, no markdown, no explanation:
{
  "factual_groundedness": <0-25>,
  "assumption_transparency": <0-25>,
  "completeness": <0-25>,
  "structure_and_clarity": <0-25>,
  "flags": ["<specific thing to verify>", ...],
  "review_note": "<one sentence summary>"
}

flags must be concrete and specific — not generic warnings. Maximum 4 flags.
If the output is high quality with no concerns, return an empty flags array.
`;

export function tierFromScore(score: number): ConfidenceTier {
  if (score >= 75) return "High";
  if (score >= 50) return "Moderate";
  return "Low";
}

function tierDisplay(tier: ConfidenceTier): string {
  const icons: Record<ConfidenceTier, string> = {
    High:     "✔ High confidence",
    Moderate: "⚠ Moderate confidence — review flagged items",
    Low:      "✖ Low confidence — verify before use",
    Unscored: "? Confidence scoring unavailable — review manually"
  };
  return icons[tier];
}

export async function scoreOutput(params: {
  mode: string;
  userInput: string;
  agentOutput: string;
}): Promise<ConfidenceResult> {
  const inputPreview = params.userInput.length > SCORER_INPUT_BUDGET
    ? params.userInput.slice(0, SCORER_INPUT_BUDGET) + "\n…[truncated]"
    : params.userInput;
  const outputPreview = params.agentOutput.length > SCORER_OUTPUT_BUDGET
    ? params.agentOutput.slice(0, SCORER_OUTPUT_BUDGET) + "\n…[truncated]"
    : params.agentOutput;

  const prompt = `
Mode: ${params.mode}

User request:
${inputPreview}

Agent response:
${outputPreview}
`;

  try {
    const response = await callClaude({
      systemPrompt: SCORER_SYSTEM_PROMPT,
      userInput: prompt,
      usePremiumModel: false,   // always use Sonnet — keep this cheap and fast
      maxTokens: 400
    });

    const raw = response.text.trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

    const parsed = JSON.parse(raw);

    const score = Math.min(100, Math.max(0,
      (parsed.factual_groundedness ?? 20) +
      (parsed.assumption_transparency ?? 20) +
      (parsed.completeness ?? 20) +
      (parsed.structure_and_clarity ?? 20)
    ));

    const tier = tierFromScore(score);

    return {
      tier,
      score,
      flags: Array.isArray(parsed.flags) ? parsed.flags.slice(0, 4) : [],
      reviewNote: parsed.review_note ?? tierDisplay(tier)
    };

  } catch {
    // Scorer itself failed (network, parse, etc.). Return an explicit "Unscored"
    // tier rather than silently labelling the output Moderate (50). The review
    // queue still treats Unscored finance/report outputs as needing a human
    // look, so the safety net is preserved without polluting score telemetry.
    return {
      tier: "Unscored",
      score: 0,
      flags: ["Confidence scoring unavailable for this response — review manually."],
      reviewNote: "Confidence scoring failed — treat output with normal diligence.",
      scoringFailed: true
    };
  }
}

export function formatConfidenceBlock(result: ConfidenceResult): string {
  const tierLine: Record<ConfidenceTier, string> = {
    High:     "✔  Confidence: HIGH",
    Moderate: "⚠  Confidence: MODERATE",
    Low:      "✖  Confidence: LOW",
    Unscored: "?  Confidence: UNSCORED"
  };

  const headline = result.tier === "Unscored"
    ? tierLine[result.tier]
    : tierLine[result.tier] + `  (${result.score}/100)`;

  const lines: string[] = [
    "",
    "------------------------------------",
    headline,
    result.reviewNote,
  ];

  if (result.flags.length > 0) {
    lines.push("");
    lines.push("Verify before use:");
    result.flags.forEach(f => lines.push(`  • ${f}`));
  }

  lines.push("------------------------------------");
  return lines.join("\n");
}
