import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  appendToSession,
  loadSession,
  clearSession,
  getSessionHistory,
  listSessions
} from "../tools/sessionMemory.js";

// Use a unique test session prefix to avoid colliding with real sessions
const TEST_PREFIX = `test-${Date.now()}`;
const SESSION_DIR = path.join(os.tmpdir(), "sty-agent-sessions");

function testId(suffix: string): string {
  return `${TEST_PREFIX}-${suffix}`;
}

afterEach(() => {
  // Clean up all test sessions after each test
  if (fs.existsSync(SESSION_DIR)) {
    fs.readdirSync(SESSION_DIR)
      .filter(f => f.startsWith(TEST_PREFIX))
      .forEach(f => fs.unlinkSync(path.join(SESSION_DIR, f)));
  }
});

describe("appendToSession + loadSession", () => {
  it("creates a new session on first append", () => {
    const id = testId("new");
    appendToSession(id, "finance", "What is WACC?", "WACC is the weighted average cost of capital.");
    const session = loadSession(id);
    expect(session).not.toBeNull();
    expect(session!.id).toBe(id);
    expect(session!.mode).toBe("finance");
    expect(session!.messages).toHaveLength(2);
  });

  it("stores user and assistant messages in order", () => {
    const id = testId("order");
    appendToSession(id, "data", "Explain EDA", "EDA stands for exploratory data analysis.");
    const session = loadSession(id);
    expect(session!.messages[0].role).toBe("user");
    expect(session!.messages[0].content).toBe("Explain EDA");
    expect(session!.messages[1].role).toBe("assistant");
    expect(session!.messages[1].content).toBe("EDA stands for exploratory data analysis.");
  });

  it("accumulates messages across multiple appends", () => {
    const id = testId("accumulate");
    appendToSession(id, "finance", "First question", "First answer");
    appendToSession(id, "finance", "Second question", "Second answer");
    appendToSession(id, "finance", "Third question", "Third answer");
    const session = loadSession(id);
    expect(session!.messages).toHaveLength(6);
  });

  it("trims history to MAX_HISTORY_MESSAGES (20) when exceeded", () => {
    const id = testId("trim");
    for (let i = 0; i < 12; i++) {
      appendToSession(id, "general", `Question ${i}`, `Answer ${i}`);
    }
    const session = loadSession(id);
    // 12 turns = 24 messages, trimmed to 20
    expect(session!.messages.length).toBeLessThanOrEqual(20);
  });

  it("preserves the most recent messages after trimming", () => {
    const id = testId("trim-recent");
    for (let i = 0; i < 12; i++) {
      appendToSession(id, "general", `Q${i}`, `A${i}`);
    }
    const session = loadSession(id);
    const lastMsg = session!.messages[session!.messages.length - 1];
    expect(lastMsg.content).toBe("A11"); // most recent answer preserved
  });
});

describe("getSessionHistory", () => {
  it("returns empty array for non-existent session", () => {
    const history = getSessionHistory("does-not-exist-xyz");
    expect(history).toEqual([]);
  });

  it("returns messages for an existing session", () => {
    const id = testId("history");
    appendToSession(id, "report", "Write a summary", "Here is the summary.");
    const history = getSessionHistory(id);
    expect(history).toHaveLength(2);
  });
});

describe("clearSession", () => {
  it("returns true and removes the session file", () => {
    const id = testId("clear");
    appendToSession(id, "data", "Q", "A");
    expect(loadSession(id)).not.toBeNull();
    const cleared = clearSession(id);
    expect(cleared).toBe(true);
    expect(loadSession(id)).toBeNull();
  });

  it("returns false for a non-existent session", () => {
    expect(clearSession("never-existed-xyz")).toBe(false);
  });
});

describe("listSessions", () => {
  it("returns sessions sorted by most recently updated", () => {
    const id1 = testId("list-a");
    const id2 = testId("list-b");
    appendToSession(id1, "finance", "Q1", "A1");
    appendToSession(id2, "data", "Q2", "A2");
    appendToSession(id1, "finance", "Q3", "A3"); // id1 updated more recently

    const sessions = listSessions().filter(s => s.id.startsWith(TEST_PREFIX));
    expect(sessions[0].id).toBe(id1); // most recently updated first
  });
});
