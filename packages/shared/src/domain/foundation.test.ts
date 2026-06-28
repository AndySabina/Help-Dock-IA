import { describe, expect, it } from "vitest";
import {
  canInviteStaff,
  createStaffInvitation,
  createSingleCompanyScope,
  type FoundationAction,
  isActionAllowed,
  resolveSetupState
} from "./foundation.ts";

describe("single-company foundation scope", () => {
  it("creates exactly one workspace, site, and widget for an installation", () => {
    expect(createSingleCompanyScope("install_helpdock")).toEqual({
      installationId: "install_helpdock",
      workspaceId: "workspace_default",
      siteId: "site_default",
      widgetId: "widget_default"
    });
  });

  it("rejects blank installation identifiers before creating default scope ids", () => {
    expect(() => createSingleCompanyScope("   ")).toThrow(/installation id/i);
  });
});

describe("setup and staff invitation scaffolding", () => {
  it("requires first-manager bootstrap when no users exist", () => {
    expect(resolveSetupState({ userCount: 0 })).toEqual({
      bootstrapRequired: true,
      staffInvitationsEnabled: false
    });
  });

  it("enables manager-controlled staff invitations after bootstrap", () => {
    expect(resolveSetupState({ userCount: 1 })).toEqual({
      bootstrapRequired: false,
      staffInvitationsEnabled: true
    });

    expect(canInviteStaff("manager")).toBe(true);
    expect(canInviteStaff("agent")).toBe(false);
  });

  it("scaffolds manager-created agent invitations without leaking secrets", () => {
    expect(
      createStaffInvitation({
        invitedByRole: "manager",
        email: "Agent@Example.COM ",
        role: "agent"
      })
    ).toEqual({ email: "agent@example.com", role: "agent", status: "pending" });
  });

  it("blocks agents from creating staff invitations", () => {
    expect(() =>
      createStaffInvitation({ invitedByRole: "agent", email: "new@example.com", role: "agent" })
    ).toThrow(/manager/i);
  });
});

describe("RBAC foundation policies", () => {
  it("declares gap linking as a foundation action", () => {
    const action: FoundationAction = "gaps:link";

    expect(action).toBe("gaps:link");
  });

  it("allows managers to administer setup, provider, readiness, docs, and staff", () => {
    expect(isActionAllowed("manager", "setup:update")).toBe(true);
    expect(isActionAllowed("manager", "provider:update")).toBe(true);
    expect(isActionAllowed("manager", "readiness:run")).toBe(true);
    expect(isActionAllowed("manager", "documents:delete")).toBe(true);
    expect(isActionAllowed("manager", "staff:invite")).toBe(true);
    expect(isActionAllowed("manager", "gaps:link")).toBe(true);
  });

  it("blocks agents from document changes and gap resolution while allowing ticket work and gap linking", () => {
    expect(isActionAllowed("agent", "documents:upload")).toBe(false);
    expect(isActionAllowed("agent", "documents:delete")).toBe(false);
    expect(isActionAllowed("agent", "tickets:manage")).toBe(true);
    expect(isActionAllowed("agent", "gaps:view")).toBe(true);
    expect(isActionAllowed("agent", "gaps:link")).toBe(true);
    expect(isActionAllowed("agent", "gaps:resolve")).toBe(false);
  });

  it("blocks viewers from linking gaps", () => {
    expect(isActionAllowed("viewer", "gaps:view")).toBe(true);
    expect(isActionAllowed("viewer", "gaps:link")).toBe(false);
  });
});
