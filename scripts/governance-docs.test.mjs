import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = {
  packageJson: "package.json",
  ciWorkflow: ".github/workflows/ci.yml",
  readme: "README.md",
  tddEvidence: "docs/governance/strict-tdd-evidence.md",
  cleanupLedger: "docs/governance/repository-cleanup-ledger.md"
};

function read(path) {
  return readFileSync(path, "utf8");
}

function requireText(content, expected, context) {
  assert.ok(content.includes(expected), `${context} must include: ${expected}`);
}

function workflowCommandIndex(workflow, command) {
  const index = workflow.split("\n").findIndex((line) => line.trim() === `run: ${command}`);

  assert.notEqual(index, -1, `CI workflow must run: ${command}`);

  return index;
}

test("governance docs check is available locally and in CI", () => {
  const packageJson = JSON.parse(read(files.packageJson));
  const workflow = read(files.ciWorkflow);
  const readme = read(files.readme);

  assert.equal(
    packageJson.scripts["governance:docs:test"],
    "node --test scripts/governance-docs.test.mjs"
  );
  assert.ok(
    workflowCommandIndex(workflow, "pnpm governance:docs:test") >
      workflowCommandIndex(workflow, "pnpm ci:docs:test"),
    "governance docs check should run after CI docs contract checks"
  );
  assert.ok(
    workflowCommandIndex(workflow, "pnpm governance:docs:test") <
      workflowCommandIndex(workflow, "pnpm phase1:scope"),
    "governance docs check should run before Phase 1 scope enforcement"
  );
  requireText(readme, "pnpm governance:docs:test", "README verification commands");
});

test("strict TDD evidence docs preserve required governance states", () => {
  const evidence = read(files.tddEvidence);

  for (const requiredText of [
    "Strict TDD is mandatory for every implementation-affecting HelpDock AI change.",
    "fail-first evidence present",
    "approved exception",
    "historical evidence absent; no compliance claim",
    "docs-safe",
    "| RED | Failing command, test name, log, or CI artifact captured before implementation. |",
    "| GREEN | Passing command, test name, log, or CI artifact after the minimum change. |",
    "| REFACTOR | Passing command after cleanup, or `None needed`. |"
  ]) {
    requireText(evidence, requiredText, files.tddEvidence);
  }
});

test("cleanup ledger docs preserve the required preservation-first schema", () => {
  const ledger = read(files.cleanupLedger);

  for (const requiredText of [
    "## Required cleanup record",
    "| Area | Repo docs, generated local artifacts, branch, stash, PR, issue, remote branch, or external artifact. |",
    "| Candidate | Public-safe identifier only; do not include secrets, local absolute paths, or private stash contents. |",
    "| Evidence/refs | Read-only evidence such as file path, branch name, PR/issue number, merge state, or Engram reference. |",
    "| Classification | Preserve, supersede, safe-local-clean, needs-owner-review, or destructive-action-required. |",
    "| Preserve decision | Keep, export, summarize in Engram, replace with link, or no preservation needed. |",
    "| Approval | Named approver and approval reference for destructive or remote mutation actions. |",
    "| Action | No action, document, move, delete, close, drop, prune, or rewrite. |",
    "| Verification | Command, reviewer check, or state comparison after the action. |",
    "| Status | Pending, approved, completed, blocked, or intentionally preserved. |",
    "Remote branches are never deleted from an automated apply run without explicit human approval.",
    "Stash contents are not pasted into public repo files.",
    "Any comment, label, closure, or reopening action has explicit maintainer approval."
  ]) {
    requireText(ledger, requiredText, files.cleanupLedger);
  }
});
