import { describe, expect, it } from "vitest";

import {
  InMemoryRuntimeRepository,
  runtimeFoundationMigration,
  type InstallationRecord,
  type RuntimeTableName
} from "./index.ts";

const installation: InstallationRecord = {
  id: "inst_123",
  workspaceId: "workspace_default",
  siteId: "site_default",
  widgetId: "widget_default",
  companyName: "Example Company",
  createdAt: "2026-06-29T00:00:00.000Z"
};

describe("runtimeFoundationMigration", () => {
  it("declares the v1 tables required by the shared-domain runtime", () => {
    const tableNames = runtimeFoundationMigration.tables.map((table) => table.name);

    expect(tableNames).toEqual<RuntimeTableName[]>([
      "installations",
      "staff_users",
      "staff_invitations",
      "providers",
      "widgets",
      "documents",
      "document_chunks",
      "documentation_gaps",
      "tickets",
      "audit_events"
    ]);
    expect(runtimeFoundationMigration.tables.every((table) => table.columns.includes("id"))).toBe(
      true
    );
  });
});

describe("InMemoryRuntimeRepository", () => {
  it("stores scoped runtime records behind installation boundaries", async () => {
    const repository = new InMemoryRuntimeRepository();
    await repository.upsertInstallation(installation);
    await repository.upsertScoped("staffUsers", {
      id: "staff_1",
      installationId: installation.id,
      email: "manager@example.com",
      role: "manager",
      status: "active",
      createdAt: installation.createdAt
    });
    await repository.upsertScoped("tickets", {
      id: "ticket_1",
      installationId: installation.id,
      requesterEmail: "visitor@example.com",
      status: "open",
      conversationId: "conversation_1",
      createdAt: installation.createdAt
    });

    await expect(repository.listScoped("staffUsers", installation.id)).resolves.toHaveLength(1);
    await expect(repository.listScoped("tickets", "other_installation")).resolves.toEqual([]);
  });

  it("rejects scoped records for missing installations", async () => {
    const repository = new InMemoryRuntimeRepository();

    await expect(
      repository.upsertScoped("documents", {
        id: "doc_1",
        installationId: installation.id,
        filename: "guide.md",
        contentHash: "hash_123",
        status: "pending",
        createdAt: installation.createdAt
      })
    ).rejects.toThrow("installation inst_123 does not exist");
  });
});
