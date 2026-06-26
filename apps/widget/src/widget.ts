import type { HealthStatus } from "@helpdock/shared";

export interface WidgetPlaceholder {
  service: "widget";
  status: HealthStatus;
}

export function createWidgetPlaceholder(): WidgetPlaceholder {
  return { service: "widget", status: "ok" };
}
