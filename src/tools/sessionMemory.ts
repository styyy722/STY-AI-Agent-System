import fs from "node:fs";
import path from "node:path";
import os from "node:os";

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

const SESSION_DIR = path.join(os.tmpdir(), "sty-agent-sessions");
const MAX_HISTORY_MESSAGES = 20; // keep last 10 turns (user + assistant pairs)

function getSessionPath(sessionId: string): string {
  return path.join(SESSION_DIR, `${sessionId}.json`);
}

function ensureSessionDir(): void {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
}

export function loadSession(sessionId: string): Session | null {
  const sessionPath = getSessionPath(sessionId);

  if (!fs.existsSync(sessionPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(sessionPath, "utf-8");
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  ensureSessionDir();
  const sessionPath = getSessionPath(session.id);
  session.updatedAt = new Date().toISOString();
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), "utf-8");
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

  // Trim to keep context window manageable - keep most recent messages
  if (session.messages.length > MAX_HISTORY_MESSAGES) {
    session.messages = session.messages.slice(-MAX_HISTORY_MESSAGES);
  }

  saveSession(session);
  return session;
}

export function clearSession(sessionId: string): boolean {
  const sessionPath = getSessionPath(sessionId);

  if (!fs.existsSync(sessionPath)) {
    return false;
  }

  fs.unlinkSync(sessionPath);
  return true;
}

export function getSessionHistory(sessionId: string): ConversationMessage[] {
  const session = loadSession(sessionId);
  return session?.messages ?? [];
}

export function listSessions(): Session[] {
  ensureSessionDir();

  return fs
    .readdirSync(SESSION_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        const raw = fs.readFileSync(path.join(SESSION_DIR, f), "utf-8");
        return JSON.parse(raw) as Session;
      } catch {
        return null;
      }
    })
    .filter((s): s is Session => s !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
