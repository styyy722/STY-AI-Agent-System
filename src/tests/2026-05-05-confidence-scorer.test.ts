import { describe, it, expect } from "vitest";
import {
  tierFromScore,
  formatConfidenceBlock,
  type ConfidenceResult
} from "../tools/confidenceScorer.js";
import { requiresReview } from "../tools/reviewQueue.js";

// ─── tierFromScore ────────────────────────────────────────────────────────────

describe("tierFromScore", () => {
  it("returns High at and above 75", () => {
    expect(tierFromScore(75)).toBe("High");
    expect(tierFromScore(95)).toBe("High");
    expect(tierFromScore(100)).toBe("High");
  });

  it("returns Moderate between 50 and 74", () => {
    expect(tierFromScore(50)).toBe("Moderate");
    expect(tierFromScore(60)).toBe("Moderate");
    expect(tierFromScore(74)).toBe("Moderate");
  });

  it("returns Low below 50", () => {
    expect(tierFromScore(0)).toBe("Low");
    expect(tierFromScore(49)).toBe("Low");
  });
});

// ─── formatConfidenceBlock ────────────────────────────────────────────────────

describe("formatConfidenceBlock", () => {
  function make(tier: ConfidenceResult["tier"], score = 0, flags: string[] = []): ConfidenceResult {
    return {
      tier,
      score,
      flags,
      reviewNote: "test note"
    };
  }

  it("renders High tier with score", () => {
    const block = formatConfidenceBlock(make("High", 88));
    expect(block).toMatch(/HIGH/);
    expect(block).toMatch(/88\/100/);
    expect(block).toMatch(/test note/);
  });

  it("renders Moderate tier with score", () => {
    const block = formatConfidenceBlock(make("Moderate", 60));
    expect(block).toMatch(/MODERATE/);
    expect(block).toMatch(/60\/100/);
  });

  it("renders Low tier with score", () => {
    const block = formatConfidenceBlock(make("Low", 30));
    expect(block).toMatch(/LOW/);
    expect(block).toMatch(/30\/100/);
  });

  it("renders Unscored tier WITHOUT a numeric score", () => {
    const block = formatConfidenceBlock(make("Unscored", 0));
    expect(block).toMatch(/UNSCORED/);
    // We must not display "0/100" for Unscored — that's misleading
    expect(block).not.toMatch(/0\/100/);
  });

  it("includes flags when present", () => {
    const block = formatConfidenceBlock(
      make("Moderate", 55, ["Verify the WACC assumption", "Re-check terminal value"])
    );
    expect(block).toMatch(/Verify before use/);
    expect(block).toMatch(/Verify the WACC assumption/);
    expect(block).toMatch(/Re-check terminal value/);
  });

  it("omits the verify section when flags are empty", () => {
    const block = formatConfidenceBlock(make("High", 90, []));
    expect(block).not.toMatch(/Verify before use/);
  });
});

// ─── requiresReview ───────────────────────────────────────────────────────────

describe("requiresReview", () => {
  function conf(tier: ConfidenceResult["tier"]): ConfidenceResult {
    return { tier, score: 0, flags: [], reviewNote: "" };
  }

  it("queues finance Low / Moderate / Unscored outputs", () => {
    expect(requiresReview("finance", conf("Low"))).toBe(true);
    expect(requiresReview("finance", conf("Moderate"))).toBe(true);
    expect(requiresReview("finance", conf("Unscored"))).toBe(true);
  });

  it("queues report Low / Moderate / Unscored outputs", () => {
    expect(requiresReview("report", conf("Low"))).toBe(true);
    expect(requiresReview("report", conf("Moderate"))).toBe(true);
    expect(requiresReview("report", conf("Unscored"))).toBe(true);
  });

  it("does NOT queue High-confidence finance/report outputs", () => {
    expect(requiresReview("finance", conf("High"))).toBe(false);
    expect(requiresReview("report", conf("High"))).toBe(false);
  });

  it("does NOT queue data or general mode outputs regardless of tier", () => {
    for (const tier of ["High", "Moderate", "Low", "Unscored"] as const) {
      expect(requiresReview("data", conf(tier))).toBe(false);
      expect(requiresReview("general", conf(tier))).toBe(false);
    }
  });
});
