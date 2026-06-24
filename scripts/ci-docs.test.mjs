import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ciWorkflow = ".github/workflows/ci.yml";
const readme = "README.md";

function indexOfRequired(text, needle) {
  const index = text.indexOf(needle);
  assert.notEqual(index, -1, `Expected to find: ${needle}`);
  return index;
}

function workflowCommandIndex(workflow, command) {
  const lines = workflow.split("\n");
  const index = lines.findIndex((line) => line.trim() === `run: ${command}`);
  assert.notEqual(index, -1, `Expected workflow command: ${command}`);
  return index;
}

test("CI workflow runs Phase 1 gates in the required order", () => {
  const workflow = readFileSync(ciWorkflow, "utf8");
  const orderedCommands = [
    "pnpm public-safe",
    "bash scripts/test-check-public-safe.sh",
    "pnpm install --frozen-lockfile",
    "pnpm lint",
    "pnpm format",
    "pnpm typecheck",
    "pnpm test",
    "pnpm test:coverage",
    "pnpm ci:docs:test",
    "pnpm phase1:scope",
    "pnpm compose:smoke:test",
    "pnpm compose:smoke"
  ];

  let previousIndex = -1;
  for (const command of orderedCommands) {
    const commandIndex = workflowCommandIndex(workflow, command);
    assert.ok(commandIndex > previousIndex, `${command} should run after the previous gate`);
    previousIndex = commandIndex;
  }
});

test("README documents the Phase 1 local and CI setup path", () => {
  const documentation = readFileSync(readme, "utf8");
  for (const section of [
    "## Phase 1 scope",
    "## Prerequisites",
    "## Local setup",
    "## Configuration readiness",
    "## Verification commands",
    "pnpm phase1:scope",
    "## Docker Compose smoke path",
    "## Phase 1 exit traceability",
    "## CI expectations"
  ]) {
    indexOfRequired(documentation, section);
  }
});
