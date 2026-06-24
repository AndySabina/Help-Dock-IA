import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const allowedSourceFiles = new Set([
  "apps/admin/src/server.ts",
  "apps/admin/src/shell.test.ts",
  "apps/admin/src/shell.ts",
  "apps/api/src/health.test.ts",
  "apps/api/src/health.ts",
  "apps/api/src/server.ts",
  "apps/widget/src/server.ts",
  "apps/widget/src/widget.test.ts",
  "apps/widget/src/widget.ts",
  "apps/worker/src/worker.test.ts",
  "apps/worker/src/worker.ts",
  "packages/config/src/config.test.ts",
  "packages/config/src/index.ts",
  "packages/shared/src/index.ts"
]);

const forbiddenProductTerms = [
  "rbac",
  "permission",
  "role",
  "ticket",
  "conversation",
  "rag",
  "embedding",
  "ingestion",
  "dashboard",
  "audit",
  "privacy"
];

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function workspaceSourceFiles() {
  return ["apps", "packages"]
    .flatMap((workspace) => listFiles(workspace))
    .map((path) => relative(process.cwd(), path).replaceAll("\\", "/"))
    .filter((path) => path.includes("/src/"))
    .sort();
}

test("Phase 1 source tree stays within the approved shell-only file list", () => {
  assert.deepEqual(workspaceSourceFiles(), [...allowedSourceFiles].sort());
});

test("Phase 1 source files do not introduce product feature terms", () => {
  for (const path of workspaceSourceFiles()) {
    const content = readFileSync(path, "utf8").toLowerCase();
    const leakedTerms = forbiddenProductTerms.filter((term) =>
      new RegExp(`(^|[^a-z])${term}([^a-z]|$)`).test(content)
    );

    assert.deepEqual(leakedTerms, [], `${path} contains product-scope terms`);
  }
});

test("API shell exposes only the health route and generic not-found response", () => {
  const server = readFileSync("apps/api/src/server.ts", "utf8");

  assert.match(server, /request\.url === "\/health"/);
  assert.match(server, /not_found/);
  assert.doesNotMatch(server, /request\.url === "\/(?!health")/);
});
