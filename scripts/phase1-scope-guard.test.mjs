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
  ["rbac"],
  ["permission", "permissions"],
  ["role", "roles"],
  ["ticket", "tickets"],
  ["conversation", "conversations"],
  ["rag"],
  ["embedding", "embeddings"],
  ["ingestion", "ingestions"],
  ["dashboard", "dashboards"],
  ["audit", "audits"],
  ["privacy", "privacies"]
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

function isAsciiLetter(character) {
  return /^[a-z]$/iu.test(character);
}

function isUppercaseAsciiLetter(character) {
  return /^[A-Z]$/.test(character);
}

function isLowercaseAsciiLetter(character) {
  return /^[a-z]$/.test(character);
}

function startsPascalCaseWord(content, index) {
  const currentCharacter = content[index] ?? "";
  const nextCharacter = content[index + 1] ?? "";

  return isUppercaseAsciiLetter(currentCharacter) && isLowercaseAsciiLetter(nextCharacter);
}

function isUppercaseAcronym(content, index, length) {
  const value = content.slice(index, index + length);

  return value.length === length && [...value].every(isUppercaseAsciiLetter);
}

function startsAcronymProductTermAfterPrefix(content, index, length) {
  const previousCharacter = content[index - 1] ?? "";
  const nextCharacter = content[index + length] ?? "";
  const characterAfterNext = content[index + length + 1] ?? "";

  return (
    isUppercaseAsciiLetter(previousCharacter) &&
    isUppercaseAcronym(content, index, length) &&
    isUppercaseAsciiLetter(nextCharacter) &&
    isLowercaseAsciiLetter(characterAfterNext)
  );
}

function containsProductTerm(content, termVariants) {
  const normalizedContent = content.toLowerCase();

  return termVariants.some((term) => {
    let index = normalizedContent.indexOf(term);

    while (index !== -1) {
      const previousCharacter = content[index - 1] ?? "";
      const currentCharacter = content[index] ?? "";
      const termEndCharacter = content[index + term.length - 1] ?? "";
      const nextCharacter = content[index + term.length] ?? "";
      const characterAfterNext = content[index + term.length + 1] ?? "";
      const startsAtBoundary =
        !previousCharacter ||
        !isAsciiLetter(previousCharacter) ||
        (isLowercaseAsciiLetter(previousCharacter) && isUppercaseAsciiLetter(currentCharacter)) ||
        (isUppercaseAsciiLetter(previousCharacter) && startsPascalCaseWord(content, index)) ||
        startsAcronymProductTermAfterPrefix(content, index, term.length);
      const endsAtBoundary =
        !nextCharacter ||
        !isAsciiLetter(nextCharacter) ||
        (isLowercaseAsciiLetter(termEndCharacter) && isUppercaseAsciiLetter(nextCharacter)) ||
        (isUppercaseAsciiLetter(termEndCharacter) &&
          isUppercaseAsciiLetter(nextCharacter) &&
          isLowercaseAsciiLetter(characterAfterNext));

      if (startsAtBoundary && endsAtBoundary) {
        return true;
      }

      index = normalizedContent.indexOf(term, index + 1);
    }

    return false;
  });
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
    const content = readFileSync(path, "utf8");
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

test("Phase 1 product term guard catches product terms in common identifier compounds", () => {
  for (const identifier of [
    "ticketRoute",
    "ticketsRoute",
    "permissionCheck",
    "dashboardConfig",
    "TicketRoute",
    "getTicketRoute",
    "APITicketRoute",
    "RBACPermission",
    "HTTPDashboardConfig",
    "UITicket",
    "RBACGuard",
    "RAGPipeline",
    "APIRAGPipeline",
    "HTTPRAGClient",
    "APIRBACGuard",
    "HTTPRBACMiddleware"
  ]) {
    assert.ok(productTermsIn(`const ${identifier} = true;`).length > 0, `missed ${identifier}`);
  }
});

test("Phase 1 product term guard allows approved shell-only compound identifiers", () => {
  for (const identifier of [
    "healthRoute",
    "healthRoutes",
    "notFoundResponse",
    "OBJECT_STORAGE",
    "serverConfig",
    "widgetShell",
    "workerConfig"
  ]) {
    assert.deepEqual(productTermsIn(`const ${identifier} = true;`), [], `flagged ${identifier}`);
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
