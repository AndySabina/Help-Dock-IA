import type { StaffRole } from "./foundation.ts";

export type DashboardSectionId =
  | "setup"
  | "openai_config"
  | "smtp_config"
  | "widget_config"
  | "markdown_documents"
  | "ai_conversations"
  | "internal_sources"
  | "documentation_gaps"
  | "tickets"
  | "staff_users";

export interface DashboardSectionDefinition {
  id: DashboardSectionId;
  label: string;
  allowedRoles: readonly StaffRole[];
  category: "setup" | "configuration" | "knowledge" | "support" | "staff";
}

export interface DashboardSectionVisibilityInput {
  role: StaffRole;
  readinessComplete: boolean;
}

export type StaffManagementAction = "invite" | "revoke" | "list";

export type AuditScope =
  | "setup"
  | "auth"
  | "staff"
  | "document"
  | "provider"
  | "widget"
  | "ticket"
  | "gap";
export type AuditActorType = "manager" | "agent" | "visitor" | "system";
export type AuditEntityType =
  | "setup"
  | "provider_config"
  | "smtp_config"
  | "widget_config"
  | "document"
  | "conversation"
  | "internal_source"
  | "documentation_gap"
  | "ticket"
  | "staff_user"
  | "auth_session";
export type AuditOutcome = "success" | "denied" | "failed";
export type AuditSource = "dashboard" | "widget" | "api" | "worker" | "system";
export type AuditAction =
  | "setup.update"
  | "auth.login"
  | "auth.logout"
  | "staff.invite"
  | "staff.revoke"
  | "staff.list"
  | "document.upload"
  | "document.delete"
  | "provider.update"
  | "smtp.update"
  | "widget.update"
  | "ticket.create"
  | "ticket.update"
  | "gap.link"
  | "gap.update";

export type AuditMetadataValue = string | number | boolean | null;

export interface AuditEventInput {
  eventId: string;
  occurredAt: string;
  scope: AuditScope;
  actorType: AuditActorType;
  actorId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  outcome: AuditOutcome;
  requestId: string | null;
  source: AuditSource;
  metadataRedacted: Record<string, AuditMetadataValue>;
}

export interface AuditEventDraft extends AuditEventInput {
  schemaVersion: 1;
}

export const DASHBOARD_SECTION_REGISTRY = [
  section("setup", "Setup", ["manager"], "setup"),
  section("openai_config", "OpenAI config", ["manager"], "configuration"),
  section("smtp_config", "SMTP config", ["manager"], "configuration"),
  section("widget_config", "Widget config", ["manager"], "configuration"),
  section("markdown_documents", "Markdown documents", ["manager"], "knowledge"),
  section("ai_conversations", "AI conversations", ["manager", "agent"], "support"),
  section("internal_sources", "Internal sources", ["manager", "agent"], "knowledge"),
  section("documentation_gaps", "Documentation gaps", ["manager", "agent"], "knowledge"),
  section("tickets", "Tickets", ["manager", "agent"], "support"),
  section("staff_users", "Staff/users management", ["manager"], "staff")
] as const satisfies readonly DashboardSectionDefinition[];

const auditActionContracts = {
  "setup.update": { scope: "setup", entityType: "setup" },
  "auth.login": { scope: "auth", entityType: "auth_session" },
  "auth.logout": { scope: "auth", entityType: "auth_session" },
  "staff.invite": { scope: "staff", entityType: "staff_user" },
  "staff.revoke": { scope: "staff", entityType: "staff_user" },
  "staff.list": { scope: "staff", entityType: "staff_user" },
  "document.upload": { scope: "document", entityType: "document" },
  "document.delete": { scope: "document", entityType: "document" },
  "provider.update": { scope: "provider", entityType: "provider_config" },
  "smtp.update": { scope: "provider", entityType: "smtp_config" },
  "widget.update": { scope: "widget", entityType: "widget_config" },
  "ticket.create": { scope: "ticket", entityType: "ticket" },
  "ticket.update": { scope: "ticket", entityType: "ticket" },
  "gap.link": { scope: "gap", entityType: "documentation_gap" },
  "gap.update": { scope: "gap", entityType: "documentation_gap" }
} as const satisfies Record<AuditAction, { scope: AuditScope; entityType: AuditEntityType }>;

const privacySafeMetadataNames = new Set([
  "action",
  "category",
  "count",
  "invitationDelivery",
  "reason",
  "relatedDocumentId",
  "status",
  "targetRole"
]);

export function filterVisibleDashboardSections(
  input: DashboardSectionVisibilityInput
): DashboardSectionDefinition[] {
  return DASHBOARD_SECTION_REGISTRY.filter((section) => section.allowedRoles.includes(input.role));
}

export function isStaffManagementActionAllowed(
  role: StaffRole,
  action: StaffManagementAction
): boolean {
  void action;

  return role === "manager";
}

export function createAuditEventDraft(input: AuditEventInput): AuditEventDraft {
  assertRequired(input.eventId, "event id");
  assertRequired(input.occurredAt, "occurred at");
  assertAuditActionContract(input);
  assertPrivacySafeMetadata(input.metadataRedacted);

  return { ...input, schemaVersion: 1 };
}

function section(
  id: DashboardSectionId,
  label: string,
  allowedRoles: readonly StaffRole[],
  category: DashboardSectionDefinition["category"]
): DashboardSectionDefinition {
  return { id, label, allowedRoles, category };
}

function assertRequired(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }
}

function assertPrivacySafeMetadata(metadata: Record<string, AuditMetadataValue>): void {
  const unsafeKey = Object.keys(metadata).find((key) => !privacySafeMetadataNames.has(key));

  if (unsafeKey) {
    throw new Error(`audit metadata must be privacy-safe: ${unsafeKey}`);
  }
}

function assertAuditActionContract(input: AuditEventInput): void {
  const contract = auditActionContracts[input.action];

  if (input.scope !== contract.scope) {
    throw new Error(`audit action scope mismatch: ${input.action} requires ${contract.scope}`);
  }

  if (input.entityType !== contract.entityType) {
    throw new Error(
      `audit action entity mismatch: ${input.action} requires ${contract.entityType}`
    );
  }
}
