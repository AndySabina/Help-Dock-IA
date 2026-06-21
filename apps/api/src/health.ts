import type { HealthStatus } from "@helpdock/shared";

export interface HealthPayload {
  service: "api";
  status: HealthStatus;
}

export function createHealthPayload(): HealthPayload {
  return { service: "api", status: "ok" };
}
