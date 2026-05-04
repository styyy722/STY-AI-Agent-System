import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Session {
  id: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
}

const MAX_HISTORY_MESSAGES = 20;

function getDbPath(): string {
  return path.join(process.cwd(), "sessions.db");
}

let _db: any = null;
let _SQL: any = null;

async function getDb(): Promise<any> {
  if (_db) return _db;

  const initSqlJs = require("sql.js");
  _SQL = await initSqlJs();

  const dbPath = getDbPath();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    _db = new _SQL.Database(fileBuffer);
  } else {
    _db = new _SQL.Database();
  }

  // Sessions table
  _db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      messages TEXT NOT NULL
    )
  `);

  // Long-term memory table — NEW
  _db.run(`
    CREATE TABLE IF NOT EXISTS long_term_memory (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_accessed TEXT NOT NULL,
      access_count INTEGER NOT NULL DEFAULT 0
    )
  `);

  persist();
  return _db;
}

function persist(): void {
  if (!_db) return;
  try {
    const data = _db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(getDbPath(), buffer);
  } catch {
    // Never crash the agent over a persist failure
  }
}

function dbExec(sql: string, params: any[] = []): any[] {
  if (!_db) throw new Error("Database not initialised. Call initDb() first.");
  return _db.exec(sql, params);
}

function dbRun(sql: string, params: any[] = []): void {
  if (!_db) throw new Error("Database not initialised. Call initDb() first.");
  _db.run(sql, params);
  persist();
}

// ─── Internal helpers exported for memoryManager.ts ──────────────────────────
// These share the same db instance — do not use outside src/tools/

export function dbExec_internal(sql: string, params: any[] = []): any[] {
  return dbExec(sql, params);
}

export function dbRun_internal(sql: string, params: any[] = []): void {
  return dbRun(sql, params);
}

// ─── Public init ──────────────────────────────────────────────────────────────

export async function initDb(): Promise<void> {
  await getDb();
}

// ─── Session operations ───────────────────────────────────────────────────────

export function loadSession(sessionId: string): Session | null {
  try {
    const result = dbExec(
      "SELECT id, mode, created_at, updated_at, messages FROM sessions WHERE id = ?",
      [sessionId]
    );

    if (!result.length || !result[0].values.length) return null;

    const [id, mode, createdAt, updatedAt, messagesJson] = result[0].values[0];
    return {
      id: id as string,
      mode: mode as string,
      createdAt: createdAt as string,
      updatedAt: updatedAt as string,
      messages: JSON.parse(messagesJson as string)
    };
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  session.updatedAt = new Date().toISOString();
  dbRun(
    `INSERT INTO sessions (id, mode, created_at, updated_at, messages)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       mode = excluded.mode,
       updated_at = excluded.updated_at,
       messages = excluded.messages`,
    [session.id, session.mode, session.createdAt, session.updatedAt, JSON.stringify(session.messages)]
  );
}

export function appendToSession(
  sessionId: string,
  mode: string,
  userMessage: string,
  assistantMessage: string
): Session {
  const existing = loadSession(sessionId);

  const session: Session = existing ?? {
    id: sessionId,
    mode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: []
  };

  session.messages.push(
    { role: "user", content: userMessage },
    { role: "assistant", content: assistantMessage }
  );

  if (session.messages.length > MAX_HISTORY_MESSAGES) {
    session.messages = session.messages.slice(-MAX_HISTORY_MESSAGES);
  }

  saveSession(session);
  return session;
}

export function clearSession(sessionId: string): boolean {
  const existing = loadSession(sessionId);
  if (!existing) return false;
  dbRun("DELETE FROM sessions WHERE id = ?", [sessionId]);
  return true;
}

export function getSessionHistory(sessionId: string): ConversationMessage[] {
  return loadSession(sessionId)?.messages ?? [];
}

export function listSessions(): Session[] {
  try {
    const result = dbExec(
      "SELECT id, mode, created_at, updated_at, messages FROM sessions ORDER BY updated_at DESC"
    );

    if (!result.length) return [];

    return result[0].values.map(([id, mode, createdAt, updatedAt, messagesJson]: any[]) => ({
      id: id as string,
      mode: mode as string,
      createdAt: createdAt as string,
      updatedAt: updatedAt as string,
      messages: JSON.parse(messagesJson as string)
    }));
  } catch {
    return [];
  }
}

export function getDbPath_public(): string {
  return getDbPath();
}
