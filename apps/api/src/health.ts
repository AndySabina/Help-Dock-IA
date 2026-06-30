import type { AppConfig } from "@helpdock/config";
import type { HealthStatus } from "@helpdock/shared";

export type ApiRuntimeDependency = "database" | "valkey" | "qdrant" | "objectStorage";

export interface ApiRuntimeState {
  config: AppConfig;
}

export interface HealthPayload {
  service: "api";
  status: HealthStatus;
  runtime: {
    mode: AppConfig["mode"];
    config: "loaded";
  };
  checks: Record<ApiRuntimeDependency, "configured">;
}

export function createHealthPayload(runtime: ApiRuntimeState): HealthPayload {
  return {
    service: "api",
    status: "ok",
    runtime: {
      mode: runtime.config.mode,
      config: "loaded"
    },
    checks: {
      database: "configured",
      valkey: "configured",
      qdrant: "configured",
      objectStorage: "configured"
    }
  };
}
