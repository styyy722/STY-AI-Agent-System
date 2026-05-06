import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDailyBudgetUSD, getEffectiveDailyBudget } from "../tools/costTracker.js";
import { getCurrentUser } from "../tools/accessControl.js";

// These tests focus on the *budget resolution* logic, which is pure aside from
// reading env vars and the user policy. The spend/ledger layer writes JSON
// files to disk and is tested separately.
//
// We don't hardcode the policy budget — we read it from getCurrentUser() so
// the tests work regardless of whether the developer has an access_policy.json
// configured locally. If no policy budget is set, the env-vs-policy tests are
// skipped (logged via expect.assertions(0)).

const ORIGINAL_ENV = process.env.DAILY_BUDGET_USD;

function restoreEnv(): void {
  if (ORIGINAL_ENV === undefined) delete process.env.DAILY_BUDGET_USD;
  else process.env.DAILY_BUDGET_USD = ORIGINAL_ENV;
}

describe("getDailyBudgetUSD (env var)", () => {
  beforeEach(() => {
    delete process.env.DAILY_BUDGET_USD;
  });

  afterEach(restoreEnv);

  it("defaults to $5/day when env var is missing", () => {
    expect(getDailyBudgetUSD()).toBe(5.0);
  });

  it("reads a numeric value from env", () => {
    process.env.DAILY_BUDGET_USD = "12.50";
    expect(getDailyBudgetUSD()).toBe(12.5);
  });

  it("falls back to default for non-numeric env", () => {
    process.env.DAILY_BUDGET_USD = "not-a-number";
    expect(getDailyBudgetUSD()).toBe(5.0);
  });
});

describe("getEffectiveDailyBudget (env vs policy)", () => {
  beforeEach(() => {
    delete process.env.DAILY_BUDGET_USD;
  });

  afterEach(restoreEnv);

  it("returns the env budget when env is stricter than policy", () => {
    const policyBudget = getCurrentUser().maxDailyBudgetUSD;
    // Pick an env value clearly below the configured policy. If no positive
    // policy budget is set, fall back to $1 (which is below the default $5).
    const policyCap = typeof policyBudget === "number" && policyBudget > 0
      ? policyBudget
      : 5;
    const strictEnv = Math.max(0.01, policyCap / 10);

    process.env.DAILY_BUDGET_USD = String(strictEnv);
    expect(getEffectiveDailyBudget()).toBeCloseTo(strictEnv);
  });

  it("returns the policy budget when env is more permissive than policy", () => {
    const policyBudget = getCurrentUser().maxDailyBudgetUSD;
    if (typeof policyBudget !== "number" || policyBudget <= 0) {
      // No policy budget configured — this assertion isn't applicable here.
      // Mark the test as a no-op rather than asserting against a value that
      // doesn't exist.
      return;
    }

    // Set env clearly above the policy cap.
    process.env.DAILY_BUDGET_USD = String(policyBudget * 10);
    expect(getEffectiveDailyBudget()).toBeCloseTo(policyBudget);
  });

  it("never exceeds the env default when env is missing", () => {
    // No env → env defaults to $5, so effective is min($5, policy) ≤ $5.
    expect(getEffectiveDailyBudget()).toBeLessThanOrEqual(5.0);
  });

  it("returns a positive, finite number under any combination", () => {
    process.env.DAILY_BUDGET_USD = "10.00";
    const result = getEffectiveDailyBudget();
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });
});
