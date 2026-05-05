import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccessLevel = "admin" | "analyst" | "viewer";

export interface UserPolicy {
  username: string;
  accessLevel: AccessLevel;
  allowedModes: string[];
  maxDailyBudgetUSD: number;
  canExportOutputs: boolean;
  canApproveReviews: boolean;
}

export interface DataClassificationRule {
  pattern: string;          // glob-style pattern matched against filename
  classification: "restricted" | "confidential" | "internal" | "public";
  blocked: boolean;         // if true, agent refuses to read this file
  requiresApproval: boolean; // if true, file read is logged and flagged
}

export interface AccessPolicy {
  version: string;
  defaultUser: UserPolicy;
  users: UserPolicy[];
  dataClassification: DataClassificationRule[];
  blockedExtensions: string[];
  blockedPathPatterns: string[];
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  warning?: string;
}

// ─── Default policy ───────────────────────────────────────────────────────────

const DEFAULT_POLICY: AccessPolicy = {
  version: "1.0",
  defaultUser: {
    username: "default",
    accessLevel: "analyst",
    allowedModes: ["general", "finance", "data", "report"],
    maxDailyBudgetUSD: 5.00,
    canExportOutputs: true,
    canApproveReviews: false
  },
  users: [],
  dataClassification: [
    { pattern: "*hr*",           classification: "restricted",   blocked: true,  requiresApproval: false },
    { pattern: "*payroll*",      classification: "restricted",   blocked: true,  requiresApproval: false },
    { pattern: "*salary*",       classification: "restricted",   blocked: true,  requiresApproval: false },
    { pattern: "*m&a*",          classification: "confidential", blocked: true,  requiresApproval: false },
    { pattern: "*acquisition*",  classification: "confidential", blocked: true,  requiresApproval: false },
    { pattern: "*merger*",       classification: "confidential", blocked: true,  requiresApproval: false },
    { pattern: "*legal*",        classification: "confidential", blocked: false, requiresApproval: true  },
    { pattern: "*contract*",     classification: "confidential", blocked: false, requiresApproval: true  },
    { pattern: "*personal*",     classification: "confidential", blocked: false, requiresApproval: true  },
    { pattern: "*private*",      classification: "confidential", blocked: false, requiresApproval: true  },
    { pattern: "*password*",     classification: "restricted",   blocked: true,  requiresApproval: false },
    { pattern: "*credential*",   classification: "restricted",   blocked: true,  requiresApproval: false },
    { pattern: "*.env*",         classification: "restricted",   blocked: true,  requiresApproval: false },
    { pattern: "*secret*",       classification: "restricted",   blocked: true,  requiresApproval: false },
  ],
  blockedExtensions: [".exe", ".sh", ".bat", ".ps1", ".key", ".pem", ".p12"],
  blockedPathPatterns: ["node_modules", ".git", ".env", "secrets", "private"]
};

// ─── Policy loading ───────────────────────────────────────────────────────────

function getPolicyPath(): string {
  return path.join(process.cwd(), "access_policy.json");
}

export function loadPolicy(): AccessPolicy {
  // Test-only override: force the default policy regardless of disk state.
  // Production never sets this env var; it exists so unit tests can run
  // hermetically without depending on whatever access_policy.json is on disk.
  if (process.env.STY_FORCE_DEFAULT_POLICY === "1") {
    return DEFAULT_POLICY;
  }

  const policyPath = getPolicyPath();
  if (!fs.existsSync(policyPath)) {
    return DEFAULT_POLICY;
  }
  try {
    const raw = fs.readFileSync(policyPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AccessPolicy>;

    // Deep-merge with DEFAULT_POLICY so a partial user-supplied policy can't
    // delete required fields. Previously a shallow spread allowed a custom
    // `defaultUser` block missing `allowedModes` to crash checkModeAccess at
    // runtime with: "Cannot read properties of undefined (reading 'includes')".
    return {
      ...DEFAULT_POLICY,
      ...parsed,
      defaultUser: {
        ...DEFAULT_POLICY.defaultUser,
        ...(parsed.defaultUser ?? {})
      },
      users: Array.isArray(parsed.users)
        ? parsed.users.map((u: Partial<UserPolicy>) => ({
            ...DEFAULT_POLICY.defaultUser,
            ...u
          })) as UserPolicy[]
        : DEFAULT_POLICY.users,
      dataClassification: Array.isArray(parsed.dataClassification)
        ? parsed.dataClassification
        : DEFAULT_POLICY.dataClassification,
      blockedExtensions: Array.isArray(parsed.blockedExtensions)
        ? parsed.blockedExtensions
        : DEFAULT_POLICY.blockedExtensions,
      blockedPathPatterns: Array.isArray(parsed.blockedPathPatterns)
        ? parsed.blockedPathPatterns
        : DEFAULT_POLICY.blockedPathPatterns
    } as AccessPolicy;
  } catch {
    return DEFAULT_POLICY;
  }
}

export function writeDefaultPolicy(): void {
  const policyPath = getPolicyPath();
  if (fs.existsSync(policyPath)) return; // never overwrite existing policy
  fs.writeFileSync(policyPath, JSON.stringify(DEFAULT_POLICY, null, 2), "utf-8");
}

// ─── User resolution ──────────────────────────────────────────────────────────

function getCurrentUsername(): string {
  return process.env.STY_USER
    ?? process.env.USER
    ?? process.env.USERNAME
    ?? os.userInfo().username
    ?? "default";
}

export function resolveUser(policy: AccessPolicy): UserPolicy {
  const username = getCurrentUsername();
  const match = policy.users.find(
    u => u.username.toLowerCase() === username.toLowerCase()
  );
  return match ?? { ...policy.defaultUser, username };
}

// ─── Mode access check ────────────────────────────────────────────────────────

export function checkModeAccess(mode: string): AccessCheckResult {
  const policy = loadPolicy();
  const user = resolveUser(policy);

  if (!user.allowedModes.includes(mode)) {
    return {
      allowed: false,
      reason: `User "${user.username}" (${user.accessLevel}) does not have access to "${mode}" mode. ` +
               `Allowed modes: ${user.allowedModes.join(", ")}.`
    };
  }

  return { allowed: true };
}

// ─── File access check ────────────────────────────────────────────────────────

function matchesGlob(filename: string, pattern: string): boolean {
  // Simple glob: supports * as wildcard
  const regex = new RegExp(
    "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$",
    "i"
  );
  return regex.test(filename);
}

export function checkFileAccess(filePath: string): AccessCheckResult {
  const policy = loadPolicy();
  const filename = path.basename(filePath).toLowerCase();
  const absPath = path.resolve(process.cwd(), filePath).toLowerCase();
  const ext = path.extname(filename).toLowerCase();

  // Block dangerous extensions
  if (policy.blockedExtensions.includes(ext)) {
    return {
      allowed: false,
      reason: `File type "${ext}" is blocked for security reasons. ` +
               `Allowed types: .txt, .csv, .json, .md, .xlsx, .pdf`
    };
  }

  // Block sensitive path patterns
  for (const pattern of policy.blockedPathPatterns) {
    if (absPath.includes(pattern.toLowerCase())) {
      return {
        allowed: false,
        reason: `File path contains a blocked pattern: "${pattern}". ` +
                 `Do not pass system or configuration files to the agent.`
      };
    }
  }

  // Check data classification rules
  for (const rule of policy.dataClassification) {
    if (matchesGlob(filename, rule.pattern)) {
      if (rule.blocked) {
        return {
          allowed: false,
          reason: `File "${path.basename(filePath)}" matches a ${rule.classification.toUpperCase()} ` +
                   `data classification rule and cannot be sent to the agent. ` +
                   `If this classification is incorrect, update access_policy.json.`
        };
      }
      if (rule.requiresApproval) {
        return {
          allowed: true,
          warning: `File "${path.basename(filePath)}" is classified as ${rule.classification.toUpperCase()}. ` +
                    `This file read is being logged. Ensure you have authorisation to share this content.`
        };
      }
    }
  }

  return { allowed: true };
}

// ─── Export / review permission checks ───────────────────────────────────────

export function checkCanExport(): AccessCheckResult {
  const policy = loadPolicy();
  const user = resolveUser(policy);
  if (!user.canExportOutputs) {
    return {
      allowed: false,
      reason: `User "${user.username}" does not have permission to export outputs.`
    };
  }
  return { allowed: true };
}

export function checkCanApproveReview(): AccessCheckResult {
  const policy = loadPolicy();
  const user = resolveUser(policy);
  if (!user.canApproveReviews) {
    return {
      allowed: false,
      reason: `User "${user.username}" does not have permission to approve review items. ` +
               `Ask an admin-level user to approve this output.`
    };
  }
  return { allowed: true };
}

export function getCurrentUser(): UserPolicy {
  return resolveUser(loadPolicy());
}
