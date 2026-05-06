import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { ConfidenceResult } from "./confidenceScorer.js";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewItem {
  id: string;
  timestamp: string;
  mode: string;
  sessionId: string | null;
  userInput: string;
  agentOutput: string;
  confidence: ConfidenceResult;
  status: ReviewStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

// Modes and tiers that require mandatory review.
// "Unscored" is included as a safety net: if the scorer itself fails, finance
// and report outputs still go to a human reviewer rather than slipping past.
const REVIEW_REQUIRED_MODES = new Set(["finance", "report"]);
const REVIEW_REQUIRED_TIERS = new Set(["Low", "Moderate", "Unscored"]);

function getQueueDir(): string {
  const projectQueue = path.join(process.cwd(), "review_queue");
  try {
    fs.mkdirSync(projectQueue, { recursive: true });
    fs.accessSync(projectQueue, fs.constants.W_OK);
    return projectQueue;
  } catch {
    const fallback = path.join(os.homedir(), ".sty-agent", "review_queue");
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function getQueueFilePath(): string {
  return path.join(getQueueDir(), "queue.json");
}

function generateId(): string {
  return `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadQueue(): ReviewItem[] {
  const filePath = getQueueFilePath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as ReviewItem[];
  } catch {
    return [];
  }
}

function saveQueue(items: ReviewItem[]): void {
  fs.writeFileSync(getQueueFilePath(), JSON.stringify(items, null, 2), "utf-8");
}

export function requiresReview(mode: string, confidence: ConfidenceResult): boolean {
  return (
    REVIEW_REQUIRED_MODES.has(mode) &&
    REVIEW_REQUIRED_TIERS.has(confidence.tier)
  );
}

export function addToReviewQueue(params: {
  mode: string;
  sessionId: string | undefined;
  userInput: string;
  agentOutput: string;
  confidence: ConfidenceResult;
}): ReviewItem {
  const queue = loadQueue();

  const item: ReviewItem = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    mode: params.mode,
    sessionId: params.sessionId ?? null,
    userInput: params.userInput,
    agentOutput: params.agentOutput,
    confidence: params.confidence,
    status: "pending"
  };

  queue.push(item);
  saveQueue(queue);
  return item;
}

export function getPendingItems(): ReviewItem[] {
  return loadQueue().filter(i => i.status === "pending");
}

export function getAllItems(): ReviewItem[] {
  return loadQueue().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function approveItem(id: string, reviewedBy: string, note?: string): ReviewItem | null {
  const queue = loadQueue();
  const item = queue.find(i => i.id === id);
  if (!item) return null;

  item.status = "approved";
  item.reviewedAt = new Date().toISOString();
  item.reviewedBy = reviewedBy;
  item.reviewNote = note;

  saveQueue(queue);
  return item;
}

export function rejectItem(id: string, reviewedBy: string, note?: string): ReviewItem | null {
  const queue = loadQueue();
  const item = queue.find(i => i.id === id);
  if (!item) return null;

  item.status = "rejected";
  item.reviewedAt = new Date().toISOString();
  item.reviewedBy = reviewedBy;
  item.reviewNote = note;

  saveQueue(queue);
  return item;
}

export function getItemById(id: string): ReviewItem | null {
  return loadQueue().find(i => i.id === id) ?? null;
}

export function exportApprovedOutput(id: string, outputPath: string): boolean {
  const item = getItemById(id);
  if (!item || item.status !== "approved") return false;

  const content = [
    `# Approved Output`,
    ``,
    `**Review ID:** ${item.id}`,
    `**Mode:** ${item.mode}`,
    `**Approved by:** ${item.reviewedBy}`,
    `**Approved at:** ${new Date(item.reviewedAt!).toLocaleString()}`,
    `**Confidence:** ${item.confidence.tier} (${item.confidence.score}/100)`,
    item.reviewNote ? `**Review note:** ${item.reviewNote}` : "",
    ``,
    `---`,
    ``,
    `## Request`,
    ``,
    item.userInput,
    ``,
    `## Output`,
    ``,
    item.agentOutput,
  ].filter(l => l !== undefined).join("\n");

  const absPath = path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, "utf-8");
  return true;
}

export function getQueueDir_public(): string {
  return getQueueDir();
}
