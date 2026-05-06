import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { checkModeAccess, checkFileAccess, checkCanExport, checkCanApproveReview } from "../tools/accessControl.js";

// Use the default policy (no access_policy.json) for all tests.
// We force this via the STY_FORCE_DEFAULT_POLICY env override so the suite
// is hermetic: it doesn't matter what access_policy.json exists on the
// developer's machine. Previously these tests silently passed (because
// vitest wasn't picking the file up); now they run, so the assumption
// must be made explicit.
// Default: analyst level, all modes allowed, canExport=true, canApproveReviews=false

const ORIGINAL_FORCE = process.env.STY_FORCE_DEFAULT_POLICY;

beforeAll(() => {
  process.env.STY_FORCE_DEFAULT_POLICY = "1";
});

afterAll(() => {
  if (ORIGINAL_FORCE === undefined) delete process.env.STY_FORCE_DEFAULT_POLICY;
  else process.env.STY_FORCE_DEFAULT_POLICY = ORIGINAL_FORCE;
});

describe("checkModeAccess", () => {
  it("allows finance mode by default", () => {
    expect(checkModeAccess("finance").allowed).toBe(true);
  });

  it("allows data mode by default", () => {
    expect(checkModeAccess("data").allowed).toBe(true);
  });

  it("allows report mode by default", () => {
    expect(checkModeAccess("report").allowed).toBe(true);
  });

  it("allows general mode by default", () => {
    expect(checkModeAccess("general").allowed).toBe(true);
  });
});

describe("checkFileAccess — blocked classifications", () => {
  it("blocks HR files", () => {
    const result = checkFileAccess("hr_records_2024.xlsx");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/restricted/i);
  });

  it("blocks payroll files", () => {
    expect(checkFileAccess("payroll_june.xlsx").allowed).toBe(false);
  });

  it("blocks salary files", () => {
    expect(checkFileAccess("salary_bands.csv").allowed).toBe(false);
  });

  it("blocks M&A files", () => {
    expect(checkFileAccess("m&a_target_analysis.pdf").allowed).toBe(false);
  });

  it("blocks acquisition files", () => {
    expect(checkFileAccess("acquisition_memo.pdf").allowed).toBe(false);
  });

  it("blocks .env files", () => {
    expect(checkFileAccess(".env").allowed).toBe(false);
    expect(checkFileAccess(".env.local").allowed).toBe(false);
  });

  it("blocks credential files", () => {
    expect(checkFileAccess("credentials.json").allowed).toBe(false);
  });

  it("blocks password files", () => {
    expect(checkFileAccess("passwords.txt").allowed).toBe(false);
  });

  it("blocks secret files", () => {
    expect(checkFileAccess("secret_key.json").allowed).toBe(false);
  });
});

describe("checkFileAccess — blocked extensions", () => {
  it("blocks .exe files", () => {
    expect(checkFileAccess("setup.exe").allowed).toBe(false);
  });

  it("blocks .sh files", () => {
    expect(checkFileAccess("deploy.sh").allowed).toBe(false);
  });

  it("blocks .pem files", () => {
    expect(checkFileAccess("server.pem").allowed).toBe(false);
  });

  it("blocks .key files", () => {
    expect(checkFileAccess("private.key").allowed).toBe(false);
  });
});

describe("checkFileAccess — blocked path patterns", () => {
  it("blocks node_modules paths", () => {
    expect(checkFileAccess("node_modules/somelib/file.json").allowed).toBe(false);
  });

  it("blocks .git paths", () => {
    expect(checkFileAccess(".git/config").allowed).toBe(false);
  });
});

describe("checkFileAccess — confidential with warning", () => {
  it("allows legal files with a warning", () => {
    const result = checkFileAccess("legal_agreement.pdf");
    expect(result.allowed).toBe(true);
    expect(result.warning).toMatch(/confidential/i);
  });

  it("allows contract files with a warning", () => {
    const result = checkFileAccess("supplier_contract_2024.pdf");
    expect(result.allowed).toBe(true);
    expect(result.warning).toBeDefined();
  });
});

describe("checkFileAccess — allowed files", () => {
  it("allows normal financial reports", () => {
    expect(checkFileAccess("annual_report_2024.pdf").allowed).toBe(true);
  });

  it("allows sales data CSV", () => {
    expect(checkFileAccess("sales_data_q3.csv").allowed).toBe(true);
  });

  it("allows Excel datasets", () => {
    expect(checkFileAccess("revenue_model.xlsx").allowed).toBe(true);
  });

  it("allows markdown files", () => {
    expect(checkFileAccess("analysis_notes.md").allowed).toBe(true);
  });
});

describe("checkCanExport", () => {
  it("allows export by default", () => {
    expect(checkCanExport().allowed).toBe(true);
  });
});

describe("checkCanApproveReview", () => {
  it("denies review approval by default", () => {
    const result = checkCanApproveReview();
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/permission/i);
  });
});
