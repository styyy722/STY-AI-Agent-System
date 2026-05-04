/**
 * Input validation for STY Agent CLI commands.
 * All validation errors throw with a clear, user-facing message.
 */

const MAX_INPUT_CHARS = 8000;
const MIN_INPUT_CHARS = 2;
const MAX_SESSION_ID_CHARS = 50;
const MAX_OUTPUT_PATH_CHARS = 260;

// Characters that are safe in a session ID
const VALID_SESSION_ID = /^[a-zA-Z0-9_\-]+$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate the user's text input before sending to Claude.
 */
export function validateUserInput(input: string): ValidationResult {
  if (typeof input !== "string") {
    return { valid: false, error: "Input must be a text string." };
  }

  const trimmed = input.trim();

  if (trimmed.length < MIN_INPUT_CHARS) {
    return {
      valid: false,
      error: `Input is too short. Please provide at least ${MIN_INPUT_CHARS} characters.`
    };
  }

  if (trimmed.length > MAX_INPUT_CHARS) {
    return {
      valid: false,
      error:
        `Input is too long (${trimmed.length} characters). ` +
        `Maximum allowed is ${MAX_INPUT_CHARS} characters. ` +
        `For large content, use the --file option instead.`
    };
  }

  return { valid: true };
}

/**
 * Validate a session ID provided via --session flag.
 */
export function validateSessionId(sessionId: string): ValidationResult {
  if (typeof sessionId !== "string") {
    return { valid: false, error: "Session ID must be a string." };
  }

  const trimmed = sessionId.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Session ID cannot be empty." };
  }

  if (trimmed.length > MAX_SESSION_ID_CHARS) {
    return {
      valid: false,
      error: `Session ID is too long. Maximum ${MAX_SESSION_ID_CHARS} characters allowed.`
    };
  }

  if (!VALID_SESSION_ID.test(trimmed)) {
    return {
      valid: false,
      error:
        `Session ID "${trimmed}" contains invalid characters. ` +
        `Only letters, numbers, hyphens, and underscores are allowed. ` +
        `Example: --session telstra-analysis`
    };
  }

  return { valid: true };
}

/**
 * Validate an output file path provided via --output flag.
 */
export function validateOutputPath(outputPath: string): ValidationResult {
  if (typeof outputPath !== "string") {
    return { valid: false, error: "Output path must be a string." };
  }

  const trimmed = outputPath.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Output path cannot be empty." };
  }

  if (trimmed.length > MAX_OUTPUT_PATH_CHARS) {
    return {
      valid: false,
      error: `Output path is too long. Maximum ${MAX_OUTPUT_PATH_CHARS} characters allowed.`
    };
  }

  // Block path traversal attempts
  if (trimmed.includes("..")) {
    return {
      valid: false,
      error: `Output path cannot contain "..". Please use a direct path like outputs/my-report.md`
    };
  }

  return { valid: true };
}

/**
 * Run all relevant validations for an agent command and exit with a clear
 * error message if any fail. Call this at the top of handleAgentCommand.
 */
export function validateAgentCommand(
  userInput: string,
  options: { session?: string; output?: string }
): void {
  const inputResult = validateUserInput(userInput);
  if (!inputResult.valid) {
    console.error("");
    console.error("Input error: " + inputResult.error);
    console.error("");
    process.exit(1);
  }

  if (options.session) {
    const sessionResult = validateSessionId(options.session);
    if (!sessionResult.valid) {
      console.error("");
      console.error("Session error: " + sessionResult.error);
      console.error("");
      process.exit(1);
    }
  }

  if (options.output) {
    const outputResult = validateOutputPath(options.output);
    if (!outputResult.valid) {
      console.error("");
      console.error("Output path error: " + outputResult.error);
      console.error("");
      process.exit(1);
    }
  }
}
