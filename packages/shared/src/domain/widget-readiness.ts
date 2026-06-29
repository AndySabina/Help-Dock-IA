import { isAllowedWidgetDomain, type RuntimeEnvironment } from "./provider-readiness.ts";

export const WIDGET_CONVERSATION_TTL_MS = 8 * 60 * 60 * 1000;

export const WIDGET_DESIGN_METADATA = {
  language: "en",
  copyMode: "fixed_english",
  themeCustomization: "not_supported_v1"
} as const;

export interface WidgetEmbedSnippetInput {
  scriptSrc: string;
  widgetId: string;
}

export type WidgetInstallationValidation =
  | { ok: true; widgetId: string }
  | { ok: false; issues: string[] };

export interface WidgetReadinessInput {
  providerReady: boolean;
  smtpReady: boolean;
  ticketEscalationReady: boolean;
  documentsIndexed: boolean;
  allowedDomainConfigured: boolean;
  widgetSnippetConfigured: boolean;
  widgetSmokeTestPassed: boolean;
}

export type WidgetReadinessCheckName =
  | "provider"
  | "smtp"
  | "ticketEscalation"
  | "documentsIndexed"
  | "allowedDomains"
  | "widgetConfigured"
  | "widgetSmokeTest";

export interface WidgetReadinessState {
  ready: boolean;
  checks: Record<WidgetReadinessCheckName, boolean>;
  missing: WidgetReadinessCheckName[];
}

export type WidgetSessionAuthorization =
  | { authorized: true }
  | {
      authorized: false;
      reason: "widget_not_ready" | "widget_id_mismatch" | "origin_not_allowed";
    };

export interface WidgetSessionAuthorizationInput {
  origin: string;
  allowedDomains: readonly string[];
  environment: RuntimeEnvironment;
  requestedWidgetId: string;
  installationWidgetId: string;
  readiness: WidgetReadinessState;
}

export interface ConversationSessionSnapshotInput {
  conversationId: string;
  widgetId: string;
  startedAt: string;
  ticketLinked: boolean;
}

export interface ConversationSessionSnapshot extends ConversationSessionSnapshotInput {
  expiresAt: string;
  storageKey: string;
  retention: ConversationRetentionSignal;
}

export type ConversationRetentionSignal = "expire_after_ttl" | "retain_for_ticket_timeline";

export type ConversationTtlState =
  | { active: true; expiresAt: string; retention: ConversationRetentionSignal }
  | {
      active: false;
      reason: "ttl_expired";
      expiresAt: string;
      retention: ConversationRetentionSignal;
    };

export function generateWidgetEmbedSnippet(input: WidgetEmbedSnippetInput): string {
  return `<script src="${escapeHtmlAttribute(input.scriptSrc)}" data-helpdock-widget-id="${escapeHtmlAttribute(input.widgetId)}"></script>`;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function validateWidgetInstallation(
  widgetIds: readonly string[]
): WidgetInstallationValidation {
  if (widgetIds.length !== 1) {
    return { ok: false, issues: ["installation must have exactly one widget"] };
  }

  const widgetId = (widgetIds[0] as string).trim();

  return widgetId.length > 0
    ? { ok: true, widgetId }
    : { ok: false, issues: ["widget id is required"] };
}

export function createWidgetReadinessState(input: WidgetReadinessInput): WidgetReadinessState {
  const checks: WidgetReadinessState["checks"] = {
    provider: input.providerReady,
    smtp: input.smtpReady,
    ticketEscalation: input.ticketEscalationReady,
    documentsIndexed: input.documentsIndexed,
    allowedDomains: input.allowedDomainConfigured,
    widgetConfigured: input.widgetSnippetConfigured,
    widgetSmokeTest: input.widgetSmokeTestPassed
  };
  const missing = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name as WidgetReadinessCheckName);

  return { ready: missing.length === 0, checks, missing };
}

export function authorizeWidgetSessionRequest(
  input: WidgetSessionAuthorizationInput
): WidgetSessionAuthorization {
  if (!input.readiness.ready) {
    return { authorized: false, reason: "widget_not_ready" };
  }

  if (input.requestedWidgetId !== input.installationWidgetId) {
    return { authorized: false, reason: "widget_id_mismatch" };
  }

  if (!isAllowedWidgetDomain(input.origin, input.allowedDomains, input.environment)) {
    return { authorized: false, reason: "origin_not_allowed" };
  }

  return { authorized: true };
}

export function createConversationSessionSnapshot(
  input: ConversationSessionSnapshotInput
): ConversationSessionSnapshot {
  const expiresAt = new Date(
    Date.parse(input.startedAt) + WIDGET_CONVERSATION_TTL_MS
  ).toISOString();

  return {
    ...input,
    expiresAt,
    storageKey: `helpdock:${input.widgetId}:conversation`,
    retention: input.ticketLinked ? "retain_for_ticket_timeline" : "expire_after_ttl"
  };
}

export function evaluateConversationSessionTtl(
  snapshot: ConversationSessionSnapshot,
  now: string
): ConversationTtlState {
  const base = { expiresAt: snapshot.expiresAt, retention: snapshot.retention };

  return Date.parse(now) < Date.parse(snapshot.expiresAt)
    ? { active: true, ...base }
    : { active: false, reason: "ttl_expired", ...base };
}
