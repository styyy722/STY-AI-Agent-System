import crypto from "node:crypto";
import { dbExec_internal, dbRun_internal } from "./sessionMemory.js";

export type MemoryCategory = "preference" | "insight" | "pattern" | "fact";

export interface Memory {
  id: string;
  category: MemoryCategory;
  key: string;       // short slug — used for deduplication and matching
  value: string;     // the actual content to recall
  createdAt: string;
  lastAccessed: string;
  accessCount: number;
}

// ─── Write operations ─────────────────────────────────────────────────────────

// Stores a new memory or updates an existing one with the same key
export function storeMemory(
  category: MemoryCategory,
  key: string,
  value: string
): Memory {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  // Normalise the key — lowercase, hyphens only
  const normKey = key.toLowerCase().replace(/\s+/g, "-").slice(0, 80);

  try {
    dbRun_internal(
      `INSERT INTO long_term_memory (id, category, key, value, created_at, last_accessed, access_count)
       VALUES (?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT DO NOTHING`,
      [id, category, normKey, value, now, now]
    );

    // If key already exists, update the value and bump last_accessed
    dbRun_internal(
      `UPDATE long_term_memory
       SET value = ?, last_accessed = ?
       WHERE key = ? AND id != ?`,
      [value, now, normKey, id]
    );
  } catch {
    // Never crash the agent over a memory write failure
  }

  return { id, category, key: normKey, value, createdAt: now, lastAccessed: now, accessCount: 0 };
}

// ─── Read operations ──────────────────────────────────────────────────────────

// Returns up to topK memories whose key or value contains any word from the query
export function retrieveRelevantMemories(query: string, topK = 5): Memory[] {
  try {
    const result = dbExec_internal(
      `SELECT id, category, key, value, created_at, last_accessed, access_count
       FROM long_term_memory
       ORDER BY access_count DESC, last_accessed DESC`
    );

    if (!result.length || !result[0].values.length) return [];

    const words = query.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3); // skip short filler words

    const allMemories: Memory[] = result[0].values.map(
      ([id, category, key, value, createdAt, lastAccessed, accessCount]: any[]) => ({
        id: id as string,
        category: category as MemoryCategory,
        key: key as string,
        value: value as string,
        createdAt: createdAt as string,
        lastAccessed: lastAccessed as string,
        accessCount: accessCount as number
      })
    );

    // Score each memory by how many query words match
    const scored = allMemories
      .map(m => {
        const haystack = `${m.key} ${m.value}`.toLowerCase();
        const matches = words.filter(w => haystack.includes(w)).length;
        return { memory: m, score: matches };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || b.memory.accessCount - a.memory.accessCount)
      .slice(0, topK)
      .map(({ memory }) => memory);

    // Update last_accessed and access_count for retrieved memories
    for (const m of scored) {
      try {
        dbRun_internal(
          `UPDATE long_term_memory
           SET last_accessed = ?, access_count = access_count + 1
           WHERE id = ?`,
          [new Date().toISOString(), m.id]
        );
      } catch { /* ignore */ }
    }

    return scored;
  } catch {
    return [];
  }
}

export function listMemories(category?: MemoryCategory): Memory[] {
  try {
    const sql = category
      ? `SELECT id, category, key, value, created_at, last_accessed, access_count
         FROM long_term_memory WHERE category = ?
         ORDER BY last_accessed DESC`
      : `SELECT id, category, key, value, created_at, last_accessed, access_count
         FROM long_term_memory
         ORDER BY last_accessed DESC`;

    const result = dbExec_internal(sql, category ? [category] : []);

    if (!result.length || !result[0].values.length) return [];

    return result[0].values.map(
      ([id, cat, key, value, createdAt, lastAccessed, accessCount]: any[]) => ({
        id: id as string,
        category: cat as MemoryCategory,
        key: key as string,
        value: value as string,
        createdAt: createdAt as string,
        lastAccessed: lastAccessed as string,
        accessCount: accessCount as number
      })
    );
  } catch {
    return [];
  }
}

export function deleteMemory(id: string): boolean {
  try {
    const before = listMemories().length;
    dbRun_internal("DELETE FROM long_term_memory WHERE id = ?", [id]);
    return listMemories().length < before;
  } catch {
    return false;
  }
}

export function clearAllMemories(): number {
  try {
    const count = listMemories().length;
    dbRun_internal("DELETE FROM long_term_memory", []);
    return count;
  } catch {
    return 0;
  }
}

// ─── Format memories for system prompt injection ──────────────────────────────

export function buildMemoryContext(memories: Memory[]): string {
  if (memories.length === 0) return "";

  const lines = [
    "--- LONG-TERM MEMORY (context from past sessions) ---",
    ...memories.map(m => `[${m.category}] ${m.key}: ${m.value}`),
    "--- END MEMORY ---",
    "Use the above context to personalise and ground your response where relevant."
  ];

  return lines.join("\n");
}

// ─── Auto-store a lightweight record of what was just done ────────────────────
// Called after each successful agent response — no extra API call needed

export function autoStoreActivity(
  mode: string,
  userInput: string,
  outputSnippet: string
): void {
  try {
    const topic = userInput.slice(0, 60).replace(/\n/g, " ").trim();
    const snippet = outputSnippet.slice(0, 120).replace(/\n/g, " ").trim();
    const key = `last-${mode}-activity`;
    const value = `Topic: "${topic}" — Summary: ${snippet}`;
    storeMemory("pattern", key, value);
  } catch {
    // Never crash the agent over a memory write
  }
}
