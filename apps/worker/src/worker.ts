import { loadConfig } from "@helpdock/config";
import type { HealthStatus } from "@helpdock/shared";

export interface WorkerStatus {
  service: "worker";
  status: HealthStatus;
  mode: "idle";
}

export function createWorkerStatus(): WorkerStatus {
  return { service: "worker", status: "ok", mode: "idle" };
}

if (process.env.NODE_ENV !== "test") {
  loadConfig();
  console.log(JSON.stringify(createWorkerStatus()));
  setInterval(() => undefined, 60_000);
}
