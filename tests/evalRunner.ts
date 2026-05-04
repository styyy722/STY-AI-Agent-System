#!/usr/bin/env tsx

/**
 * STY Agent — Output Quality Eval Harness
 *
 * Usage:
 *   npm run eval              → smoke test (no API calls)
 *   npm run eval -- --live    → full live evaluation with Claude-as-judge
 *   npm run eval -- --live --category finance  → run only finance evals
 */

import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

const LIVE_MODE = process.argv.includes("--live");
const CATEGORY_FILTER = (() => {
  const idx = process.argv.indexOf("--category");
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const EVALS_DIR = path.join(process.cwd(), "tests", "evals");
const RESULTS_DIR = path.join(EVALS_DIR, "results");

interface EvalCase {
  id: string;
  mode: string;
  question: string;
  expectedKeyPoints: string[];
  minimumScore: number;
}

interface EvalResult {
  id: string;
  mode: string;
  question: string;
  score: number;
  minimumScore: number;
  passed: boolean;
  reason: string;
  durationMs: number;
  agentResponse?: string;
}

// ── Load eval cases ───────────────────────────────────────────────────────────

function loadEvalCases(): EvalCase[] {
  const files = fs.readdirSync(EVALS_DIR)
    .filter(f => f.endsWith("_evals.json"));

  const allCases: EvalCase[] = [];

  for (const file of files) {
    const category = file.replace("_evals.json", "");
    if (CATEGORY_FILTER && category !== CATEGORY_FILTER) continue;

    const raw = fs.readFileSync(path.join(EVALS_DIR, file), "utf-8");
    const cases: EvalCase[] = JSON.parse(raw);
    allCases.push(...cases);
  }

  return allCases;
}

// ── Judge a response using Claude ─────────────────────────────────────────────

async function judgeResponse(
  question: string,
  expectedKeyPoints: string[],
  actualResponse: string
): Promise<{ score: number; reason: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const judgePrompt = `You are an expert evaluator for a professional business AI agent.

QUESTION ASKED:
${question}

EXPECTED KEY POINTS (the response should cover these):
${expectedKeyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

ACTUAL AGENT RESPONSE:
${actualResponse.slice(0, 3000)}

Rate the actual response on a scale of 0 to 10:
- 9-10: Excellent. Covers all key points accurately, professional, no significant errors.
- 7-8:  Good. Covers most key points, minor gaps or imprecision.
- 5-6:  Adequate. Covers some key points but has notable gaps.
- 3-4:  Poor. Misses most key points or contains errors.
- 0-2:  Failing. Wrong, irrelevant, or harmful output.

Respond with ONLY a valid JSON object on a single line, no other text:
{"score": <integer 0-10>, "reason": "<one sentence explaining the score>"}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 200,
      messages: [{ role: "user", content: judgePrompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Judge API call failed: ${response.status}`);
  }

  const data = await response.json() as any;
  const text = data.content?.[0]?.text?.trim() ?? "";

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{.*\}/s);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Could not parse judge response: ${text}`);
  }
}

// ── Run a single eval case ────────────────────────────────────────────────────

async function runEvalCase(evalCase: EvalCase): Promise<EvalResult> {
  const startTime = Date.now();

  console.log(`  Running: [${evalCase.id}] ${evalCase.question.slice(0, 60)}...`);

  try {
    const { runCoreAgent } = await import("../src/agent/coreAgent.js");
    const agentResponse = await runCoreAgent({
      mode: evalCase.mode as any,
      userInput: evalCase.question
    });

    const durationMs = Date.now() - startTime;

    const judgment = await judgeResponse(
      evalCase.question,
      evalCase.expectedKeyPoints,
      agentResponse.summary
    );

    const passed = judgment.score >= evalCase.minimumScore;
    console.log(`    ${passed ? "✔" : "✖"} Score: ${judgment.score}/10 — ${judgment.reason}`);

    return {
      id: evalCase.id,
      mode: evalCase.mode,
      question: evalCase.question,
      score: judgment.score,
      minimumScore: evalCase.minimumScore,
      passed,
      reason: judgment.reason,
      durationMs,
      agentResponse: agentResponse.summary
    };

  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`    ✖ ERROR: ${errorMsg}`);

    return {
      id: evalCase.id,
      mode: evalCase.mode,
      question: evalCase.question,
      score: 0,
      minimumScore: evalCase.minimumScore,
      passed: false,
      reason: `Error: ${errorMsg}`,
      durationMs
    };
  }
}

// ── Smoke test (no API calls) ─────────────────────────────────────────────────

async function runSmokeTest(cases: EvalCase[]): Promise<void> {
  console.log("\n── Smoke Test (structure checks only, no API calls) ──\n");

  let passed = 0;
  let failed = 0;

  // Check 1: eval files loaded
  if (cases.length === 0) {
    console.log("  ✖ No eval cases found in tests/evals/");
    process.exit(1);
  }
  console.log(`  ✔ Loaded ${cases.length} eval case(s) from tests/evals/`);
  passed++;

  // Check 2: all cases have required fields
  let structureOk = true;
  for (const c of cases) {
    if (!c.id || !c.mode || !c.question || !c.expectedKeyPoints?.length || !c.minimumScore) {
      console.log(`  ✖ Eval case missing required fields: ${JSON.stringify(c)}`);
      structureOk = false;
      failed++;
    }
  }
  if (structureOk) {
    console.log(`  ✔ All eval cases have required fields`);
    passed++;
  }

  // Check 3: results directory is writable
  try {
    if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
    const testFile = path.join(RESULTS_DIR, ".writecheck");
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
    console.log(`  ✔ Results directory is writable: ${RESULTS_DIR}`);
    passed++;
  } catch (err) {
    console.log(`  ✖ Cannot write to results directory: ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }

  // Check 4: all eval JSON files are valid (no parse errors)
  const evalFiles = fs.readdirSync(EVALS_DIR).filter(f => f.endsWith("_evals.json"));
  let jsonOk = true;
  for (const file of evalFiles) {
    try {
      JSON.parse(fs.readFileSync(path.join(EVALS_DIR, file), "utf-8"));
    } catch {
      console.log(`  ✖ Invalid JSON in: ${file}`);
      jsonOk = false;
      failed++;
    }
  }
  if (jsonOk) {
    console.log(`  ✔ All ${evalFiles.length} eval file(s) contain valid JSON`);
    passed++;
  }

  console.log(`\n  ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log("\n  Fix the issues above.\n");
    process.exit(1);
  }

  console.log("\n  Smoke test passed. Run with --live to execute full evaluation.\n");
  console.log("  Example: npm run eval -- --live");
  console.log("  Example: npm run eval -- --live --category finance\n");
}

// ── Live evaluation ───────────────────────────────────────────────────────────

async function runLiveEval(cases: EvalCase[]): Promise<void> {
  console.log(`\n── Live Evaluation (${cases.length} case(s)) ──\n`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("  ✖ ANTHROPIC_API_KEY not set. Cannot run live evaluation.\n");
    process.exit(1);
  }

  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const results: EvalResult[] = [];
  const byMode: Record<string, { passed: number; total: number; avgScore: number; scores: number[] }> = {};

  for (const evalCase of cases) {
    const result = await runEvalCase(evalCase);
    results.push(result);

    if (!byMode[result.mode]) {
      byMode[result.mode] = { passed: 0, total: 0, avgScore: 0, scores: [] };
    }
    byMode[result.mode].total++;
    byMode[result.mode].scores.push(result.score);
    if (result.passed) byMode[result.mode].passed++;
  }

  for (const mode of Object.keys(byMode)) {
    const scores = byMode[mode].scores;
    byMode[mode].avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10;
  }

  const totalPassed = results.filter(r => r.passed).length;
  const totalFailed = results.length - totalPassed;
  const overallAvg = Math.round(
    results.reduce((sum, r) => sum + r.score, 0) / results.length * 10
  ) / 10;

  console.log("\n─────────────────────────────────────────");
  console.log("  EVAL RESULTS");
  console.log("─────────────────────────────────────────");
  console.log(`  Total:     ${results.length} case(s)`);
  console.log(`  Passed:    ${totalPassed}`);
  console.log(`  Failed:    ${totalFailed}`);
  console.log(`  Avg Score: ${overallAvg}/10`);
  console.log("");

  for (const [mode, stats] of Object.entries(byMode)) {
    const bar = "█".repeat(Math.round(stats.avgScore)) + "░".repeat(10 - Math.round(stats.avgScore));
    console.log(`  ${mode.padEnd(10)} ${stats.passed}/${stats.total} passed  [${bar}] ${stats.avgScore}/10`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const resultsFile = path.join(RESULTS_DIR, `eval-${timestamp}.json`);

  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: { total: results.length, passed: totalPassed, failed: totalFailed, avgScore: overallAvg },
    byMode,
    results
  }, null, 2));

  console.log(`\n  Full results saved to: ${resultsFile}`);
  console.log("─────────────────────────────────────────\n");

  if (totalFailed > 0) {
    console.log(`  ${totalFailed} eval(s) failed. Review the results file for details.\n`);
    process.exit(1);
  }

  console.log("  All evals passed.\n");
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  console.log("\n====================================");
  console.log("STY Agent — Eval Harness");
  console.log("====================================");

  if (LIVE_MODE) {
    console.log(`  Mode: LIVE${CATEGORY_FILTER ? ` (category: ${CATEGORY_FILTER})` : ""}`);
  } else {
    console.log("  Mode: SMOKE TEST");
  }

  const cases = loadEvalCases();

  if (LIVE_MODE) {
    await runLiveEval(cases);
  } else {
    await runSmokeTest(cases);
  }
}

main().catch((err) => {
  console.error("\nEval runner crashed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
