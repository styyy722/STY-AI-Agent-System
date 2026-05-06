import { defineConfig } from "vitest/config";

// Test discovery for the STY AI Agent System.
//
// We support BOTH naming conventions found in src/tests/:
//   - <name>.test.ts        (vitest default)
//   - <name>_test.ts        (existing files: access_control_test, session_memory_test,
//                            skill_registry_test) — without this, those files would
//                            silently never run.
//
// We exclude dist/ so the compiled JS copies of the source tests don't get
// double-run after `npm run build`.
export default defineConfig({
  test: {
    include: [
      "src/**/*.test.ts",
      "src/**/*_test.ts",
      "src/**/*.spec.ts"
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.git/**"
    ]
  }
});
