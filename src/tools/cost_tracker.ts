import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Anthropic pricing as of mid-2025 (USD per million tokens)
// These are estimates — actual billing is on Anthropic's invoice
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3.00,  output: 15.00 },
  "claude-opus-4-7":   { input: 15.00, output: 75.00 },
  "default":           { input: 3.00,  output: 15.00 }
};

// Characters-per-token estimate (conservative)
const CHARS_PER_TOKEN = 3.5;

export interface UsageRecord {
  timestamp: string;
  date: string;           // YYYY-MM-DD
  mode: string;
  model: string;
  sessionId: string | null;
  inputChars: number;
  outputChars: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUSD: number;
}

export interface DailySummary {
  date: string;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  byMode: Record<string, { calls: number; costUSD: number }>;
  byModel: Record<string, { calls: number; costUSD: number }>;
}

function getLedgerDir(): string {
  const projectLedger = path.join(process.cwd(), "usage");
  try {
    fs.mkdirSync(projectLedger, { recursive: true });
    fs.accessSync(projectLedger, fs.constants.W_OK);
    return projectLedger;
  } catch {
    const fallback = path.join(os.homedir(), ".sty-agent", "usage");
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function getLedgerPath(date: string): string {
  return path.join(getLedgerDir(), `usage-${date}.json`);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadDayRecords(date: string): UsageRecord[] {
  const filePath = getLedgerPath(date);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as UsageRecord[];
  } catch {
    return [];
  }
}

function saveDayRecords(date: string, records: UsageRecord[]): void {
  fs.writeFileSync(getLedgerPath(date), JSON.stringify(records, null, 2), "utf-8");
}

function estimateCost(model: string, inputChars: number, outputChars: number): {
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
} {
  const pricing = PRICING[model] ?? PRICING["default"];
  const inputTokens = Math.ceil(inputChars / CHARS_PER_TOKEN);
  const outputTokens = Math.ceil(outputChars / CHARS_PER_TOKEN);
  const costUSD =
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output;
  return { inputTokens, outputTokens, costUSD };
}

export function getDailyBudgetUSD(): number {
  const val = parseFloat(process.env.DAILY_BUDGET_USD ?? "");
  return isNaN(val) ? 5.00; // default $5/day
}

export function getDailySpend(date: string = todayStr()): number {
  return loadDayRecords(date).reduce((sum, r) => sum + r.estimatedCostUSD, 0);
}

export function checkBudget(): { allowed: boolean; spentUSD: number; budgetUSD: number; remainingUSD: number } {
  const budgetUSD = getDailyBudgetUSD();
  const spentUSD = getDailySpend();
  const remainingUSD = Math.max(0, budgetUSD - spentUSD);
  return { allowed: spentUSD < budgetUSD, spentUSD, budgetUSD, remainingUSD };
}

export function recordUsage(params: {
  mode: string;
  model: string;
  sessionId: string | undefined;
  inputChars: number;
  outputChars: number;
}): UsageRecord {
  const date = todayStr();
  const { inputTokens, outputTokens, costUSD } = estimateCost(
    params.model, params.inputChars, params.outputChars
  );

  const record: UsageRecord = {
    timestamp: new Date().toISOString(),
    date,
    mode: params.mode,
    model: params.model,
    sessionId: params.sessionId ?? null,
    inputChars: params.inputChars,
    outputChars: params.outputChars,
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    estimatedCostUSD: costUSD
  };

  const records = loadDayRecords(date);
  records.push(record);
  saveDayRecords(date, records);
  return record;
}

export function getDailySummary(date: string = todayStr()): DailySummary {
  const records = loadDayRecords(date);

  const summary: DailySummary = {
    date,
    totalCalls: records.length,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUSD: 0,
    byMode: {},
    byModel: {}
  };

  for (const r of records) {
    summary.totalInputTokens += r.estimatedInputTokens;
    summary.totalOutputTokens += r.estimatedOutputTokens;
    summary.totalCostUSD += r.estimatedCostUSD;

    if (!summary.byMode[r.mode]) summary.byMode[r.mode] = { calls: 0, costUSD: 0 };
    summary.byMode[r.mode].calls++;
    summary.byMode[r.mode].costUSD += r.estimatedCostUSD;

    if (!summary.byModel[r.model]) summary.byModel[r.model] = { calls: 0, costUSD: 0 };
    summary.byModel[r.model].calls++;
    summary.byModel[r.model].costUSD += r.estimatedCostUSD;
  }

  return summary;
}

export function getWeeklySummary(): DailySummary[] {
  const summaries: DailySummary[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    summaries.push(getDailySummary(dateStr));
  }
  return summaries;
}

export function getLedgerDir_public(): string {
  return getLedgerDir();
}
