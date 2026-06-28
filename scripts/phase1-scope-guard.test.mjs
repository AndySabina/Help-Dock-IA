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

const approvedFullProductV1FoundationFiles = new Set([
  ...allowedSourceFiles,
  "packages/shared/src/domain/foundation.test.ts",
  "packages/shared/src/domain/foundation.ts"
]);

const approvedProductSliceFiles = new Set(
  [...approvedFullProductV1FoundationFiles].filter((path) => !allowedSourceFiles.has(path))
);

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
const expectedWorkspaceMode = process.env.PHASE_SCOPE_MODE ?? "auto";

function sortedValues(values) {
  return [...values].sort();
}

function filesMatch(files, approvedFiles) {
  return files.length === approvedFiles.size && files.every((path) => approvedFiles.has(path));
}

function classifyWorkspaceScope(sourceFiles) {
  const files = [...sourceFiles].sort();

  if (filesMatch(files, allowedSourceFiles)) {
    return { mode: "archived-phase-1", productFiles: [] };
  }

  if (filesMatch(files, approvedFullProductV1FoundationFiles)) {
    return {
      mode: "full-product-v1-foundation",
      productFiles: sortedValues(approvedProductSliceFiles)
    };
  }

  const approvedPostPhase1Files = new Set([...allowedSourceFiles, ...approvedProductSliceFiles]);
  const unapprovedFiles = files.filter((path) => !approvedPostPhase1Files.has(path));
  const missingFiles = sortedValues(approvedPostPhase1Files).filter(
    (path) => !files.includes(path)
  );

  throw new Error(
    [
      "Workspace has unapproved post-Phase-1 source files.",
      `Unapproved files: ${unapprovedFiles.join(", ") || "none"}.`,
      `Missing files from an approved scope: ${missingFiles.join(", ") || "none"}.`
    ].join(" ")
  );
}

test("phase scope classifier keeps the archived Phase 1 shell-only tree strict", () => {
  assert.deepEqual(classifyWorkspaceScope([...allowedSourceFiles].sort()), {
    mode: "archived-phase-1",
    productFiles: []
  });
});

test("phase scope classifier accepts the approved full-product-v1 foundation slice", () => {
  const fullProductFoundationFiles = [
    ...allowedSourceFiles,
    "packages/shared/src/domain/foundation.test.ts",
    "packages/shared/src/domain/foundation.ts"
  ].sort();

  assert.deepEqual(classifyWorkspaceScope(fullProductFoundationFiles), {
    mode: "full-product-v1-foundation",
    productFiles: [
      "packages/shared/src/domain/foundation.test.ts",
      "packages/shared/src/domain/foundation.ts"
    ]
  });
});

test("phase scope classifier rejects unapproved product implementation files", () => {
  const unapprovedProductFiles = [...allowedSourceFiles, "apps/api/src/tickets.ts"].sort();

  assert.throws(
    () => classifyWorkspaceScope(unapprovedProductFiles),
    /unapproved post-Phase-1 source files/
  );
});

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

function uppercaseAcronymPrefixLength(content, index) {
  let cursor = index - 1;

  while (cursor >= 0 && isUppercaseAsciiLetter(content[cursor] ?? "")) {
    cursor -= 1;
  }

  return index - cursor - 1;
}

function startsAcronymProductTermAfterPrefix(content, index, length) {
  const previousCharacter = content[index - 1] ?? "";
  const nextCharacter = content[index + length] ?? "";
  const characterAfterNext = content[index + length + 1] ?? "";
  const hasAcronymPrefix = uppercaseAcronymPrefixLength(content, index) >= 2;

  return (
    isUppercaseAsciiLetter(previousCharacter) &&
    isUppercaseAcronym(content, index, length) &&
    ((isUppercaseAsciiLetter(nextCharacter) && isLowercaseAsciiLetter(characterAfterNext)) ||
      (hasAcronymPrefix && (!nextCharacter || !isAsciiLetter(nextCharacter))))
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

test("workspace source tree stays within an approved phase scope", () => {
  const scope = classifyWorkspaceScope(workspaceSourceFiles());

  if (expectedWorkspaceMode !== "auto") {
    assert.equal(scope.mode, expectedWorkspaceMode);
    return;
  }

  assert.ok(["archived-phase-1", "full-product-v1-foundation"].includes(scope.mode));
});

test("Phase 1 source files do not introduce product feature terms", () => {
  const scope = classifyWorkspaceScope(workspaceSourceFiles());

  for (const path of workspaceSourceFiles()) {
    if (scope.productFiles.includes(path)) {
      continue;
    }

    const content = readFileSync(path, "utf8");
    const leakedTerms = productTermsIn(content);

    assert.deepEqual(leakedTerms, [], `${path} contains product-scope terms`);
  }
});

test("post-Phase-1 product terms stay confined to approved product slice files", () => {
  const scope = classifyWorkspaceScope(workspaceSourceFiles());

  if (scope.mode === "archived-phase-1") {
    assert.deepEqual(scope.productFiles, []);
    return;
  }

  for (const path of scope.productFiles) {
    assert.ok(approvedProductSliceFiles.has(path), `${path} is not an approved product slice file`);
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
    "HTTPRBACMiddleware",
    "APIRAG",
    "HTTPRAG",
    "APIRBAC",
    "HTTPRBAC",
    "UIRAG",
    "UIRBAC"
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
    "OBJECT_STORAGE_ACCESS_KEY_ID",
    "PUBLIC_APP_URL",
    "NODE_ENV",
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
