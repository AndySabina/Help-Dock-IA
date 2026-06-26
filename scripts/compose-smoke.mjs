import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export const requiredServices = [
  "api",
  "admin",
  "widget",
  "worker",
  "postgres",
  "valkey",
  "qdrant",
  "minio",
  "mailpit"
];

export const appEndpointChecks = [
  { service: "api", containerPort: 3001, path: "/health", expected: "api" },
  { service: "admin", containerPort: 3000, path: "/", expected: "HelpDock Admin" },
  { service: "widget", containerPort: 3002, path: "/", expected: "widget" }
];

export const composeRuntimeArgs = ["compose", "up", "-d", "--wait", "--wait-timeout", "180"];
export const composeCleanupArgs = ["down", "--volumes", "--remove-orphans"];

const appSourceFiles = [
  "apps/api/src/server.ts",
  "apps/admin/src/server.ts",
  "apps/widget/src/server.ts"
];

export function assertComposeServices(composeText) {
  const missing = requiredServices.filter((service) => !composeText.includes(`  ${service}:`));
  if (missing.length > 0) {
    throw new Error(`docker-compose.yml missing services: ${missing.join(", ")}`);
  }
}

export function assertAppSourcesUseRuntimeResolvableImports(readFile = readFileSync) {
  const offenders = appSourceFiles.filter((file) =>
    /from\s+["']\.\/[^"']+\.js["']/.test(readFile(file, "utf8"))
  );
  if (offenders.length > 0) {
    throw new Error(
      `TypeScript app sources import runtime-missing .js paths: ${offenders.join(", ")}`
    );
  }
}

function dockerCompose(projectName, args, options = {}) {
  return execFileSync("docker", ["compose", "-p", projectName, ...args], {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe"
  });
}

export function runComposeConfig() {
  execFileSync("docker", ["compose", "config", "--quiet"], { stdio: "inherit" });
}

function assertRequiredContainersRunning(projectName) {
  const runningServices = new Set(
    dockerCompose(projectName, ["ps", "--services", "--status", "running"])
      .split("\n")
      .map((service) => service.trim())
      .filter(Boolean)
  );
  const missing = requiredServices.filter((service) => !runningServices.has(service));
  if (missing.length > 0) {
    throw new Error(`Compose services are not running: ${missing.join(", ")}`);
  }
}

function mappedHostUrl(projectName, service, containerPort, path) {
  const endpoint = dockerCompose(projectName, ["port", service, String(containerPort)]).trim();
  const port = endpoint.match(/:(\d+)$/)?.[1];
  if (!port) {
    throw new Error(`No mapped port found for ${service}:${containerPort}`);
  }

  return `http://127.0.0.1:${port}${path}`;
}

async function assertEndpointResponds(projectName, check) {
  const url = mappedHostUrl(projectName, check.service, check.containerPort, check.path);
  const response = await fetch(url);
  const body = await response.text();
  if (!response.ok || !body.includes(check.expected)) {
    throw new Error(`${check.service} smoke endpoint failed: ${response.status} ${body}`);
  }
}

export async function runComposeRuntime(projectName = `helpdock-smoke-${process.pid}`) {
  try {
    dockerCompose(projectName, composeRuntimeArgs.slice(1), { stdio: "inherit" });
    assertRequiredContainersRunning(projectName);
    for (const check of appEndpointChecks) {
      await assertEndpointResponds(projectName, check);
    }
  } finally {
    dockerCompose(projectName, composeCleanupArgs, { stdio: "inherit" });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  assertComposeServices(readFileSync("docker-compose.yml", "utf8"));
  assertAppSourcesUseRuntimeResolvableImports();
  runComposeConfig();
  await runComposeRuntime();
  console.log("Compose smoke runtime passed.");
}
