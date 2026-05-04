import { callClaude } from "../llm/claudeClient.js";

export type ConfidenceTier = "High" | "Moderate" | "Low";

export interface ConfidenceResult {
  tier: ConfidenceTier;
  score: number;          // 0–100
  flags: string[];        // specific things the user should verify
  reviewNote: string;     // one-line summary for display
}

const SCORER_SYSTEM_PROMPT = `
You are an output quality auditor for an AI business agent.

You will be given:
- The user's original request
- The agent's response
- The mode it ran in (finance, data, report, general)

Your job is to assess the response quality across four dimensions and return a JSON object.

Scoring dimensions (each 0–25):
1. factual_groundedness: Are claims based on provided data or stated clearly as general knowledge? Penalise if numbers appear invented or sourced without evidence.
2. assumption_transparency: Are assumptions explicitly stated? Penalise if the response relies on unstated assumptions.
3. completeness: Does the response fully address the request? Penalise if it skips key parts or deflects.
4. domain_risk: How high-stakes is this output? Finance and regulatory outputs carry higher risk. Penalise if the output could cause harm if wrong.

Return ONLY a valid JSON object — no preamble, no markdown, no explanation:
{
  "factual_groundedness": <0-25>,
  "assumption_transparency": <0-25>,
  "completeness": <0-25>,
  "domain_risk_adjustment": <0-25>,
  "flags": ["<specific thing to verify>", ...],
  "review_note": "<one sentence summary>"
}

flags must be concrete and specific — not generic warnings. Maximum 4 flags.
If the output is high quality with no concerns, return an empty flags array.
`;

function tierFromScore(score: number): ConfidenceTier {
  if (score >= 75) return "High";
  if (score >= 50) return "Moderate";
  return "Low";
}

function tierDisplay(tier: ConfidenceTier): string {
  const icons: Record<ConfidenceTier, string> = {
    High:     "✔ High confidence",
    Moderate: "⚠ Moderate confidence — review flagged items",
    Low:      "✖ Low confidence — verify before use"
  };
  return icons[tier];
}

export async function scoreOutput(params: {
  mode: string;
  userInput: string;
  agentOutput: string;
}): Promise<ConfidenceResult> {
  const prompt = `
Mode: ${params.mode}

User request:
${params.userInput.slice(0, 1000)}

Agent response:
${params.agentOutput.slice(0, 2000)}
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
      (parsed.domain_risk_adjustment ?? 20)
    ));

    const tier = tierFromScore(score);

    return {
      tier,
      score,
      flags: Array.isArray(parsed.flags) ? parsed.flags.slice(0, 4) : [],
      reviewNote: parsed.review_note ?? tierDisplay(tier)
    };

  } catch {
    // If scorer fails for any reason, return a neutral result — never block the user
    return {
      tier: "Moderate",
      score: 50,
      flags: ["Confidence scoring unavailable for this response — review manually."],
      reviewNote: "Confidence scoring failed — treat output with normal diligence."
    };
  }
}

export function formatConfidenceBlock(result: ConfidenceResult): string {
  const tierLine: Record<ConfidenceTier, string> = {
    High:     "✔  Confidence: HIGH",
    Moderate: "⚠  Confidence: MODERATE",
    Low:      "✖  Confidence: LOW"
  };

  const lines: string[] = [
    "",
    "------------------------------------",
    tierLine[result.tier] + `  (${result.score}/100)`,
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
