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
  /rbac/,
  /permissions?/,
  /roles?/,
  /tickets?/,
  /conversations?/,
  /rag/,
  /embeddings?/,
  /ingestions?/,
  /dashboards?/,
  /audits?/,
  /privacy|privacies/
];

const allowedApiRoutes = new Set(["/health"]);
const routeLiteralPattern = /["'`]\/[a-z0-9._~!$&'()*+,;=:@%/-]*["'`]/giu;

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

function containsProductTerm(content, term) {
  return new RegExp(`(^|[^a-z])${term.source}([^a-z]|$)`, "iu").test(content);
}

function productTermsIn(content) {
  return forbiddenProductTerms.filter((term) => containsProductTerm(content, term));
}

function routeLiteralsIn(content) {
  return [...content.matchAll(routeLiteralPattern)].map((match) => match[0].slice(1, -1));
}

test("Phase 1 source tree stays within the approved shell-only file list", () => {
  assert.deepEqual(workspaceSourceFiles(), [...allowedSourceFiles].sort());
});

test("Phase 1 source files do not introduce product feature terms", () => {
  for (const path of workspaceSourceFiles()) {
    const content = readFileSync(path, "utf8").toLowerCase();
    const leakedTerms = productTermsIn(content);

    assert.deepEqual(leakedTerms, [], `${path} contains product-scope terms`);
  }
});

test("Phase 1 product term guard catches singular and normal plural variants", () => {
  for (const term of [
    "ticket",
    "tickets",
    "permission",
    "permissions",
    "role",
    "roles",
    "conversation",
    "conversations",
    "embedding",
    "embeddings",
    "dashboard",
    "dashboards",
    "audit",
    "audits"
  ]) {
    assert.equal(productTermsIn(`adds ${term} behavior`).length, 1, `missed ${term}`);
  }
});

test("API shell exposes only the health route and generic not-found response", () => {
  const server = readFileSync("apps/api/src/server.ts", "utf8");

  const routeLiterals = routeLiteralsIn(server);

  assert.deepEqual(routeLiterals, ["/health"]);
  assert.ok(routeLiterals.every((route) => allowedApiRoutes.has(route)));
  assert.match(server, /not_found/);
});

test("API route guard catches route literals beyond request.url equality", () => {
  for (const routeUsage of [
    'request.url === "/tickets"',
    'new URL(request.url, "http://localhost").pathname === "/tickets"',
    'const ticketRoute = "/tickets"',
    'router.get("/tickets", handler)'
  ]) {
    const leakedRoutes = routeLiteralsIn(routeUsage).filter(
      (route) => !allowedApiRoutes.has(route)
    );

    assert.deepEqual(leakedRoutes, ["/tickets"], `missed route usage: ${routeUsage}`);
  }
});
