import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RagDocument {
  id: string;
  text: string;
  source: string;
  category: string;
  indexedAt: string;
}

export interface RagSearchResult {
  id: string;
  score: number;
  source: string;
  category: string;
  text: string;
  indexedAt: string;
}

export interface RagStats {
  total: number;
  categories: Record<string, number>;
  indexPath: string;
}

// ─── Internals ────────────────────────────────────────────────────────────────

const MIN_RELEVANCE_SCORE = 0.72;  // cosine similarity threshold

function getScriptPath(): string {
  const p = path.join(process.cwd(), "scripts", "embed.py");
  if (!fs.existsSync(p)) {
    throw new Error(
      `RAG script not found at: ${p}. ` +
      `Make sure scripts/embed.py is present in your project root.`
    );
  }
  return p;
}

function runScript(args: string[]): any {
  const script = getScriptPath();
  const cmd = `python3 "${script}" ${args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`;
  try {
    const output = execSync(cmd, {
      encoding: "utf-8",
      timeout: 60000,
      env: { ...process.env }
    });
    return JSON.parse(output.trim());
  } catch (err) {
    throw new Error(
      `RAG store error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

function generateId(text: string): string {
  return crypto.createHash("md5").update(text.slice(0, 200)).digest("hex").slice(0, 12);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Index a document into the RAG store.
 * id is auto-generated from content hash if not provided.
 */
export function indexDocument(params: {
  text: string;
  source: string;
  category?: string;
  id?: string;
}): { ok: boolean; id: string } {
  const id = params.id ?? generateId(params.text);
  const result = runScript([
    "index", id, params.text,
    "--source", params.source,
    "--category", params.category ?? "general"
  ]);
  return { ok: result.ok ?? false, id };
}

/**
 * Search for relevant documents given a query string.
 * Returns only results above MIN_RELEVANCE_SCORE.
 */
export function searchDocuments(params: {
  query: string;
  topK?: number;
  category?: string;
  minScore?: number;
}): RagSearchResult[] {
  const args = ["search", params.query, "--top-k", String(params.topK ?? 4)];
  if (params.category) args.push("--category", params.category);

  const result = runScript(args);
  const threshold = params.minScore ?? MIN_RELEVANCE_SCORE;

  return (result.results ?? []).filter((r: RagSearchResult) => r.score >= threshold);
}

/**
 * Delete a document by ID.
 */
export function deleteDocument(id: string): boolean {
  const result = runScript(["delete", id]);
  return result.removed > 0;
}

/**
 * List all indexed documents.
 */
export function listDocuments(category?: string): RagDocument[] {
  const args = ["list"];
  if (category) args.push("--category", category);
  const result = runScript(args);
  return result.entries ?? [];
}

/**
 * Get stats about the RAG store.
 */
export function getStats(): RagStats {
  const result = runScript(["stats"]);
  return {
    total: result.total ?? 0,
    categories: result.categories ?? {},
    indexPath: result.index_path ?? ""
  };
}

/**
 * Build a context block from search results to inject into a prompt.
 * Returns empty string if no relevant results found.
 */
export function buildRagContext(results: RagSearchResult[]): string {
  if (results.length === 0) return "";

  const lines = [
    "── Relevant context from your knowledge base ──────────────────────────",
    `Found ${results.length} relevant document(s). Use this context to inform your response.`,
    ""
  ];

  results.forEach((r, i) => {
    lines.push(`[${i + 1}] Source: ${r.source} | Category: ${r.category} | Relevance: ${(r.score * 100).toFixed(0)}%`);
    lines.push(r.text);
    lines.push("");
  });

  lines.push("── End of knowledge base context ──────────────────────────────────────");
  return lines.join("\n");
}

/**
 * Auto-index an agent output for future retrieval.
 * Call after successful agent responses to build the knowledge base over time.
 */
export function autoIndexOutput(params: {
  mode: string;
  userInput: string;
  agentOutput: string;
  sessionId?: string;
}): void {
  try {
    const text = `Q: ${params.userInput.slice(0, 500)}\n\nA: ${params.agentOutput.slice(0, 1500)}`;
    const source = params.sessionId
      ? `session:${params.sessionId}`
      : `mode:${params.mode}`;

    indexDocument({
      text,
      source,
      category: params.mode
    });
  } catch {
    // Auto-indexing must never crash the agent
  }
}
