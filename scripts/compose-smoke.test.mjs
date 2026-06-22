import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  appEndpointChecks,
  assertAppSourcesUseRuntimeResolvableImports,
  composeRuntimeArgs,
  requiredServices
} from "./compose-smoke.mjs";

test("compose smoke tracks every required local service", () => {
  assert.deepEqual(requiredServices, [
    "api",
    "admin",
    "widget",
    "worker",
    "postgres",
    "valkey",
    "qdrant",
    "minio",
    "mailpit"
  ]);
});

test("app TypeScript entrypoints use imports resolvable by node strip-types", () => {
  assert.doesNotThrow(() => assertAppSourcesUseRuntimeResolvableImports(readFileSync));
});

test("compose smoke starts the stack and checks app endpoints", () => {
  assert.deepEqual(composeRuntimeArgs.slice(0, 3), ["compose", "up", "-d"]);
  assert.ok(composeRuntimeArgs.includes("--wait"));
  assert.deepEqual(appEndpointChecks, [
    { service: "api", containerPort: 3001, path: "/health", expected: "api" },
    { service: "admin", containerPort: 3000, path: "/", expected: "HelpDock Admin" },
    { service: "widget", containerPort: 3002, path: "/", expected: "widget" }
  ]);
});
