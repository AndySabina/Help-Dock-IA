export const HELPDOCK_PROJECT_NAME = "HelpDock AI";

export type HealthStatus = "ok" | "degraded";

export * from "./domain/foundation.ts";
export * from "./domain/document-ingestion.ts";
export * from "./domain/provider-readiness.ts";
export * from "./domain/rag-answer.ts";
export * from "./domain/ticket-support.ts";
export * from "./domain/widget-readiness.ts";
