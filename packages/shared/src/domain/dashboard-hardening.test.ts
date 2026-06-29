import { describe, expect, it } from "vitest";
import {
  createAuditEventDraft,
  DASHBOARD_SECTION_REGISTRY,
  filterVisibleDashboardSections,
  isStaffManagementActionAllowed,
  type AuditAction,
  type AuditEntityType,
  type AuditEventInput,
  type AuditMetadataValue,
  type AuditScope,
  type DashboardSectionId,
  type StaffManagementAction
} from "./dashboard-hardening.ts";

describe("dashboard section registry contracts", () => {
  it("declares the v1 dashboard sections without implementing UI surfaces", () => {
    const sectionIds: DashboardSectionId[] = DASHBOARD_SECTION_REGISTRY.map(
      (section) => section.id
    );

    expect(sectionIds).toEqual([
      "setup",
      "openai_config",
      "smtp_config",
      "widget_config",
      "markdown_documents",
      "ai_conversations",
      "internal_sources",
      "documentation_gaps",
      "tickets",
      "staff_users"
    ]);
  });

  it("shows managers every v1 section and agents only operational ticket/gap/source areas", () => {
    expect(filterVisibleDashboardSections({ role: "manager", readinessComplete: true })).toEqual(
      DASHBOARD_SECTION_REGISTRY
    );

    expect(
      filterVisibleDashboardSections({ role: "agent", readinessComplete: true }).map((s) => s.id)
    ).toEqual(["ai_conversations", "internal_sources", "documentation_gaps", "tickets"]);
  });

  it("keeps setup visible to managers until readiness is complete", () => {
    expect(
      filterVisibleDashboardSections({ role: "manager", readinessComplete: false }).map((s) => s.id)
    ).toContain("setup");
    expect(
      filterVisibleDashboardSections({ role: "agent", readinessComplete: false }).map((s) => s.id)
    ).not.toContain("setup");
  });
});

describe("staff management action contracts", () => {
  it("restricts invite, revoke, and list management to managers", () => {
    const actions: StaffManagementAction[] = ["invite", "revoke", "list"];

    expect(actions.every((action) => isStaffManagementActionAllowed("manager", action))).toBe(true);
    expect(actions.some((action) => isStaffManagementActionAllowed("agent", action))).toBe(false);
  });
});

describe("privacy-safe audit event contracts", () => {
  type AuditActionContractCase = readonly [
    scope: AuditScope,
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string | null,
    metadataRedacted: Record<string, AuditMetadataValue>
  ];

  const baseEvent: AuditEventInput = {
    eventId: "evt_123",
    occurredAt: "2026-01-01T09:00:00.000Z",
    scope: "staff",
    actorType: "manager",
    actorId: "user_123",
    action: "staff.invite",
    entityType: "staff_user",
    entityId: "user_agent_1",
    outcome: "success",
    requestId: "req_123",
    source: "dashboard",
    metadataRedacted: { targetRole: "agent", invitationDelivery: "email_link" }
  };

  it.each([
    ["setup", "setup.update", "setup", "setup_1", { status: "complete", reason: "onboarding" }],
    ["auth", "auth.login", "auth_session", "session_1", { status: "success", action: "login" }],
    ["auth", "auth.logout", "auth_session", "session_1", { status: "success", action: "logout" }],
    ["staff", "staff.invite", "staff_user", "user_1", { targetRole: "agent", action: "invite" }],
    ["staff", "staff.revoke", "staff_user", "user_1", { targetRole: "agent", reason: "left_team" }],
    ["staff", "staff.list", "staff_user", null, { count: 2, category: "staff" }],
    ["document", "document.upload", "document", "doc_1", { count: 1, status: "indexed" }],
    ["document", "document.delete", "document", "doc_1", { reason: "obsolete" }],
    ["provider", "provider.update", "provider_config", "provider_1", { status: "ready" }],
    ["provider", "smtp.update", "smtp_config", "smtp_1", { status: "ready" }],
    ["widget", "widget.update", "widget_config", "widget_1", { category: "appearance" }],
    ["ticket", "ticket.create", "ticket", "ticket_1", { status: "open" }],
    ["ticket", "ticket.update", "ticket", "ticket_1", { status: "resolved", reason: "answered" }],
    ["gap", "gap.link", "documentation_gap", "gap_1", { relatedDocumentId: "doc_1" }],
    ["gap", "gap.update", "documentation_gap", "gap_1", { status: "triaged" }]
  ] satisfies readonly AuditActionContractCase[])(
    "creates an append-only audit draft for %s action %s",
    (scope, action, entityType, entityId, metadataRedacted) => {
      const event: AuditEventInput = {
        ...baseEvent,
        scope,
        action,
        entityType,
        entityId,
        metadataRedacted
      };

      expect(createAuditEventDraft(event)).toEqual({
        ...event,
        schemaVersion: 1
      });
    }
  );

  it("rejects audit events whose runtime action family does not match the scope", () => {
    expect(() =>
      createAuditEventDraft({
        ...baseEvent,
        scope: "ticket",
        action: "staff.invite"
      })
    ).toThrow(/scope/i);
  });

  it.each([
    "customerName",
    "phoneNumber",
    "address",
    "ipAddress",
    "email",
    "prompt",
    "message",
    "secret",
    "password",
    "token",
    "hash"
  ])("rejects unsafe audit metadata key %s", (unsafeKey) => {
    expect(() =>
      createAuditEventDraft({
        ...baseEvent,
        metadataRedacted: { [unsafeKey]: "unsafe" }
      })
    ).toThrow(/privacy-safe/i);
  });

  it("preserves allowlisted foundation metadata without requiring persistence or services", () => {
    expect(
      createAuditEventDraft({
        ...baseEvent,
        metadataRedacted: {
          action: "invite",
          category: "staff",
          count: 1,
          reason: "coverage",
          relatedDocumentId: "doc_1",
          status: "success",
          targetRole: "agent"
        }
      }).metadataRedacted
    ).toEqual({
      action: "invite",
      category: "staff",
      count: 1,
      reason: "coverage",
      relatedDocumentId: "doc_1",
      status: "success",
      targetRole: "agent"
    });
  });

  it("rejects metadata outside the foundation-level safe key allowlist", () => {
    expect(() =>
      createAuditEventDraft({
        ...baseEvent,
        metadataRedacted: { visitorNickname: "Sam" }
      })
    ).toThrow(/privacy-safe/i);
  });
});
