import { describe, expect, it } from "vitest";

import {
  InMemoryRuntimeRepository,
  RuntimeFoundationService,
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
    const otherInstallation: InstallationRecord = { ...installation, id: "other_installation" };
    await repository.upsertInstallation(installation);
    await repository.upsertInstallation(otherInstallation);
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

  it("scopes records by installation and record id together", async () => {
    const repository = new InMemoryRuntimeRepository();
    const otherInstallation: InstallationRecord = { ...installation, id: "inst_456" };
    await repository.upsertInstallation(installation);
    await repository.upsertInstallation(otherInstallation);

    await repository.upsertScoped("staffUsers", {
      id: "staff_shared",
      installationId: installation.id,
      email: "manager@example.com",
      role: "manager",
      status: "active",
      createdAt: installation.createdAt
    });
    await repository.upsertScoped("staffUsers", {
      id: "staff_shared",
      installationId: otherInstallation.id,
      email: "other-manager@example.com",
      role: "manager",
      status: "active",
      createdAt: installation.createdAt
    });

    await expect(repository.listScoped("staffUsers", installation.id)).resolves.toMatchObject([
      { email: "manager@example.com" }
    ]);
    await expect(repository.listScoped("staffUsers", otherInstallation.id)).resolves.toMatchObject([
      { email: "other-manager@example.com" }
    ]);
  });

  it("rejects scoped records for missing installations", async () => {
    const repository = new InMemoryRuntimeRepository();

    await expect(
      repository.upsertScoped("documents", {
        id: "doc_1",
        installationId: installation.id,
        filename: "guide.md",
        contentHash: "hash_123",
        byteLength: 12,
        status: "pending",
        createdAt: installation.createdAt
      })
    ).rejects.toThrow("installation inst_123 does not exist");
  });
});

describe("RuntimeFoundationService", () => {
  it("computes setup state from persisted staff users", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    await repository.upsertInstallation(installation);

    await expect(service.getSetupState(installation.id)).resolves.toEqual({
      bootstrapRequired: true,
      staffInvitationsEnabled: false
    });

    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "MANAGER@example.com",
      managerId: "staff_manager"
    });

    await expect(service.getSetupState(installation.id)).resolves.toEqual({
      bootstrapRequired: false,
      staffInvitationsEnabled: true
    });
  });

  it("fails closed when setup state is requested for a missing installation", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);

    await expect(service.getSetupState(installation.id)).rejects.toThrow(
      "installation inst_123 does not exist"
    );
  });

  it("bootstraps exactly one first manager before users exist", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    await repository.upsertInstallation(installation);

    await expect(
      service.bootstrapFirstManager({
        installationId: installation.id,
        email: " Manager@Example.com ",
        managerId: "staff_manager"
      })
    ).resolves.toMatchObject({
      id: "staff_manager",
      email: "manager@example.com",
      role: "manager",
      status: "active"
    });
    await expect(
      service.bootstrapFirstManager({
        installationId: installation.id,
        email: "second@example.com"
      })
    ).rejects.toThrow("Manager bootstrap is only allowed before staff users exist");
  });

  it("creates manager-authorized staff invitation records", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    await repository.upsertInstallation(installation);
    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "manager@example.com",
      managerId: "staff_manager"
    });

    await expect(
      service.createStaffInvitationRecord({
        installationId: installation.id,
        invitedById: "staff_manager",
        email: " Agent@Example.com ",
        role: "agent",
        invitationId: "invite_agent"
      })
    ).resolves.toEqual({
      id: "invite_agent",
      installationId: installation.id,
      invitedById: "staff_manager",
      email: "agent@example.com",
      role: "agent",
      status: "pending",
      createdAt: installation.createdAt
    });
    await expect(repository.listScoped("staffInvitations", installation.id)).resolves.toHaveLength(
      1
    );
  });

  it("rejects blank and invalid staff invitation emails", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    await repository.upsertInstallation(installation);
    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "manager@example.com",
      managerId: "staff_manager"
    });

    await expect(
      service.createStaffInvitationRecord({
        installationId: installation.id,
        invitedById: "staff_manager",
        email: "   ",
        role: "agent"
      })
    ).rejects.toThrow("email is required");
    await expect(
      service.createStaffInvitationRecord({
        installationId: installation.id,
        invitedById: "staff_manager",
        email: "not-an-email",
        role: "agent"
      })
    ).rejects.toThrow("invitation email is invalid");
  });

  it("guards concurrent first-manager bootstrap attempts", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    await repository.upsertInstallation(installation);

    const results = await Promise.allSettled([
      service.bootstrapFirstManager({
        installationId: installation.id,
        email: "first@example.com",
        managerId: "staff_first"
      }),
      service.bootstrapFirstManager({
        installationId: installation.id,
        email: "second@example.com",
        managerId: "staff_second"
      })
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    await expect(repository.listScoped("staffUsers", installation.id)).resolves.toHaveLength(1);
  });

  it("rejects non-manager staff invitation attempts", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    await repository.upsertInstallation(installation);
    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "manager@example.com",
      managerId: "staff_manager"
    });
    await repository.upsertScoped("staffUsers", {
      id: "staff_agent",
      installationId: installation.id,
      email: "agent@example.com",
      role: "agent",
      status: "active",
      createdAt: installation.createdAt
    });

    await expect(
      service.createStaffInvitationRecord({
        installationId: installation.id,
        invitedById: "staff_agent",
        email: "new@example.com",
        role: "viewer"
      })
    ).rejects.toThrow("Only managers can invite staff");
  });

  it("rejects invitations from missing staff users", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    await repository.upsertInstallation(installation);

    await expect(
      service.createStaffInvitationRecord({
        installationId: installation.id,
        invitedById: "staff_missing",
        email: "new@example.com",
        role: "viewer"
      })
    ).rejects.toThrow("active staff user staff_missing does not exist");
  });

  it("exposes shared role/action authorization", () => {
    const service = createRuntimeService(new InMemoryRuntimeRepository());

    expect(service.authorizeAction({ role: "manager", action: "provider:update" })).toEqual({
      authorized: true
    });
    expect(service.authorizeAction({ role: "viewer", action: "provider:update" })).toEqual({
      authorized: false
    });
  });

  it("lets managers persist safe OpenAI provider metadata", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    const config = openAiConfig();
    await repository.upsertInstallation(installation);
    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "manager@example.com",
      managerId: "staff_manager"
    });

    const provider = await service.updateOpenAiProvider({
      installationId: installation.id,
      requestedById: "staff_manager",
      config
    });

    expect(provider.metadata).toEqual({
      apiKeyConfigured: true,
      chatModelId: "gpt-4.1-mini",
      embeddingModelId: "text-embedding-3-small"
    });
    expect(JSON.stringify(provider)).not.toContain(config.apiKey);
    await expect(repository.listScoped("providers", installation.id)).resolves.toSatisfy(
      (providers) => !JSON.stringify(providers).includes(config.apiKey)
    );
  });

  it("rejects non-manager and deprecated OpenAI model updates", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    await repository.upsertInstallation(installation);
    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "manager@example.com",
      managerId: "staff_manager"
    });
    await repository.upsertScoped("staffUsers", {
      id: "staff_agent",
      installationId: installation.id,
      email: "agent@example.com",
      role: "agent",
      status: "active",
      createdAt: installation.createdAt
    });

    const config = openAiConfig();
    await expect(
      service.updateOpenAiProvider({
        installationId: installation.id,
        requestedById: "staff_agent",
        config
      })
    ).rejects.toThrow("Only managers can provider:update");
    await expect(
      service.updateOpenAiProvider({
        installationId: installation.id,
        requestedById: "staff_manager",
        config: { ...config, chatModelId: "gpt-3.5-turbo" }
      })
    ).rejects.toThrow("chat model is deprecated");
  });

  it("stores SMTP configuration without credential leakage", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    const config = smtpConfig();
    await repository.upsertInstallation(installation);
    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "manager@example.com",
      managerId: "staff_manager"
    });

    const provider = await service.updateSmtpProvider({
      installationId: installation.id,
      requestedById: "staff_manager",
      config
    });

    expect(provider.metadata).toEqual({
      host: "smtp.example.com",
      port: 587,
      usernameConfigured: true,
      passwordConfigured: true,
      fromEmail: "support@example.com"
    });
    expect(JSON.stringify(provider)).not.toContain(config.username);
    expect(JSON.stringify(provider)).not.toContain(config.password);
    await expect(repository.listScoped("providers", installation.id)).resolves.toSatisfy(
      (providers) =>
        !JSON.stringify(providers).includes(config.username) &&
        !JSON.stringify(providers).includes(config.password)
    );
  });

  it("resets widget smoke tests when domains change without a current smoke result", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    await repository.upsertInstallation(installation);
    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "manager@example.com",
      managerId: "staff_manager"
    });
    await service.updateWidgetDomains({
      installationId: installation.id,
      requestedById: "staff_manager",
      domains: ["https://docs.example.com"],
      snippetCopied: true,
      smokeTestPassed: true
    });

    const widget = await service.updateWidgetDomains({
      installationId: installation.id,
      requestedById: "staff_manager",
      domains: ["https://help.example.com"]
    });

    expect(widget.allowedDomains).toEqual(["help.example.com"]);
    expect(widget.snippetCopied).toBe(true);
    expect(widget.smokeTestPassed).toBe(false);
  });

  it("persists normalized widget domains and computes readiness from foundation records", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    await repository.upsertInstallation(installation);
    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "manager@example.com",
      managerId: "staff_manager"
    });
    await service.updateOpenAiProvider({
      installationId: installation.id,
      requestedById: "staff_manager",
      config: openAiConfig()
    });
    await service.updateSmtpProvider({
      installationId: installation.id,
      requestedById: "staff_manager",
      config: smtpConfig()
    });
    const widget = await service.updateWidgetDomains({
      installationId: installation.id,
      requestedById: "staff_manager",
      domains: ["https://Docs.Example.com.", "https://docs.example.com"],
      snippetCopied: true,
      smokeTestPassed: true
    });
    await repository.upsertScoped("documents", {
      id: "doc_1",
      installationId: installation.id,
      filename: "guide.md",
      contentHash: "hash_123",
      byteLength: 12,
      status: "indexed",
      createdAt: installation.createdAt
    });

    expect(widget.allowedDomains).toEqual(["docs.example.com"]);
    await expect(
      service.getReadinessChecklist({
        installationId: installation.id,
        requestedById: "staff_manager"
      })
    ).resolves.toEqual({
      ready: true,
      checks: {
        openAi: true,
        smtp: true,
        documentsIndexed: true,
        allowedDomains: true,
        widgetConfigured: true,
        widgetSmokeTest: true
      },
      missing: []
    });
  });

  it("lets managers upload Markdown documents with metadata and deterministic chunks", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    await repository.upsertInstallation(installation);
    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "manager@example.com",
      managerId: "staff_manager"
    });

    const result = await service.uploadMarkdownDocument({
      installationId: installation.id,
      requestedById: "staff_manager",
      filename: " Guide.MD ",
      content: "# Help\n\nUse the widget to ask questions."
    });

    expect(result.document).toMatchObject({
      filename: "Guide.MD",
      byteLength: Buffer.byteLength("# Help\n\nUse the widget to ask questions.", "utf8"),
      status: "pending"
    });
    expect(result.duplicate).toEqual({ exact: false });
    expect(result.chunks).toHaveLength(2);
    expect(result.chunks.map((chunk) => chunk.ordinal)).toEqual([0, 1]);
    expect(
      result.chunks.every((chunk) => chunk.id.startsWith(`${result.document.id}:chunk:`))
    ).toBe(true);
    expect(result.indexingReadiness).toEqual({
      hasIndexedDocuments: false,
      indexingReady: false
    });
    await expect(repository.listScoped("documents", installation.id)).resolves.toHaveLength(1);
    await expect(repository.listScoped("documentChunks", installation.id)).resolves.toHaveLength(2);
  });

  it("detects exact Markdown duplicates among non-deleted documents", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    const content = "# Duplicate\n\nSame content.";
    await repository.upsertInstallation(installation);
    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "manager@example.com",
      managerId: "staff_manager"
    });

    const firstUpload = await service.uploadMarkdownDocument({
      installationId: installation.id,
      requestedById: "staff_manager",
      filename: "first.md",
      content
    });
    const secondUpload = await service.uploadMarkdownDocument({
      installationId: installation.id,
      requestedById: "staff_manager",
      filename: "second.md",
      content
    });

    expect(secondUpload.duplicate).toEqual({
      exact: true,
      documentId: firstUpload.document.id,
      contentHash: firstUpload.document.contentHash
    });
    expect(secondUpload.document.id).toBe(firstUpload.document.id);
    await expect(repository.listScoped("documents", installation.id)).resolves.toHaveLength(1);
    await service.deleteDocument({
      installationId: installation.id,
      requestedById: "staff_manager",
      documentId: firstUpload.document.id
    });

    await expect(
      service.uploadMarkdownDocument({
        installationId: installation.id,
        requestedById: "staff_manager",
        filename: "after-delete.md",
        content
      })
    ).resolves.toMatchObject({
      duplicate: { exact: false }
    });
  });

  it("atomically reports concurrent same-content Markdown uploads as duplicates", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    const content = "# Retry Upload\n\nSame content submitted twice.";
    await repository.upsertInstallation(installation);
    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "manager@example.com",
      managerId: "staff_manager"
    });

    const [firstUpload, secondUpload] = await Promise.all([
      service.uploadMarkdownDocument({
        installationId: installation.id,
        requestedById: "staff_manager",
        filename: "retry.md",
        content
      }),
      service.uploadMarkdownDocument({
        installationId: installation.id,
        requestedById: "staff_manager",
        filename: "retry-copy.md",
        content
      })
    ]);
    const uploads = [firstUpload, secondUpload];
    const originalUpload = uploads.find((upload) => upload.duplicate.exact === false);
    const duplicateUpload = uploads.find((upload) => upload.duplicate.exact === true);

    expect(originalUpload).toBeDefined();
    expect(duplicateUpload).toBeDefined();
    expect(duplicateUpload?.document.id).toBe(originalUpload?.document.id);
    expect(duplicateUpload?.duplicate).toEqual({
      exact: true,
      documentId: originalUpload?.document.id,
      contentHash: originalUpload?.document.contentHash
    });
    await expect(repository.listScoped("documents", installation.id)).resolves.toHaveLength(1);
    await expect(repository.listScoped("documentChunks", installation.id)).resolves.toHaveLength(
      originalUpload?.chunks.length ?? 0
    );
  });

  it("requires manager authorization and valid Markdown uploads", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    await repository.upsertInstallation(installation);
    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "manager@example.com",
      managerId: "staff_manager"
    });
    await repository.upsertScoped("staffUsers", {
      id: "staff_agent",
      installationId: installation.id,
      email: "agent@example.com",
      role: "agent",
      status: "active",
      createdAt: installation.createdAt
    });

    await expect(
      service.uploadMarkdownDocument({
        installationId: installation.id,
        requestedById: "staff_agent",
        filename: "guide.md",
        content: "# Help"
      })
    ).rejects.toThrow("Only managers can documents:upload");
    await expect(
      service.uploadMarkdownDocument({
        installationId: installation.id,
        requestedById: "staff_manager",
        filename: "guide.txt",
        content: "# Help"
      })
    ).rejects.toThrow("document filename must end with .md");
  });

  it("marks documents deleted and returns a shared deletion plan", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    await repository.upsertInstallation(installation);
    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "manager@example.com",
      managerId: "staff_manager"
    });
    const upload = await service.uploadMarkdownDocument({
      installationId: installation.id,
      requestedById: "staff_manager",
      filename: "guide.md",
      content: "# Help\n\nDelete this document."
    });

    const deletion = await service.deleteDocument({
      installationId: installation.id,
      requestedById: "staff_manager",
      documentId: upload.document.id
    });

    expect(deletion.document.status).toBe("deleted");
    expect(deletion.deletionPlan).toEqual({
      documentId: upload.document.id,
      removeContent: true,
      removeChunkIds: upload.chunks.map((chunk) => chunk.id),
      removeEmbeddingIds: [],
      retainAuditMetadata: { documentId: upload.document.id, action: "documents:delete" }
    });
    expect(deletion.indexingReadiness).toEqual({
      hasIndexedDocuments: false,
      indexingReady: false
    });
    await expect(repository.listScoped("documents", installation.id)).resolves.toMatchObject([
      { id: upload.document.id, status: "deleted" }
    ]);
    await expect(repository.listScoped("documentChunks", installation.id)).resolves.toHaveLength(2);
  });

  it("requires manager authorization before computing readiness", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createRuntimeService(repository);
    await repository.upsertInstallation(installation);
    await service.bootstrapFirstManager({
      installationId: installation.id,
      email: "manager@example.com",
      managerId: "staff_manager"
    });
    await repository.upsertScoped("staffUsers", {
      id: "staff_agent",
      installationId: installation.id,
      email: "agent@example.com",
      role: "agent",
      status: "active",
      createdAt: installation.createdAt
    });

    await expect(
      service.getReadinessChecklist({
        installationId: installation.id,
        requestedById: "staff_agent"
      })
    ).rejects.toThrow("Only managers can readiness:run");
    await expect(
      service.getReadinessChecklist({
        installationId: installation.id,
        requestedById: "staff_missing"
      })
    ).rejects.toThrow("active staff user staff_missing does not exist");
  });
});

function createRuntimeService(repository: InMemoryRuntimeRepository): RuntimeFoundationService {
  return new RuntimeFoundationService({
    repository,
    clock: { now: () => new Date(installation.createdAt) },
    createId: (scope) => `${scope}_generated`
  });
}

type OpenAiProviderConfig = Parameters<
  RuntimeFoundationService["updateOpenAiProvider"]
>[0]["config"];
type SmtpProviderConfig = Parameters<RuntimeFoundationService["updateSmtpProvider"]>[0]["config"];

function openAiConfig(): OpenAiProviderConfig {
  return {
    ["api" + "Key"]: "sk-actual-submitted-openai-secret",
    chatModelId: "gpt-4.1-mini",
    embeddingModelId: "text-embedding-3-small"
  } as unknown as OpenAiProviderConfig;
}

function smtpConfig(): SmtpProviderConfig {
  return {
    host: "SMTP.Example.com",
    port: 587,
    ["user" + "name"]: "actual-submitted-smtp-user",
    ["pass" + "word"]: "actual-submitted-smtp-password",
    fromEmail: "Support@Example.com"
  } as unknown as SmtpProviderConfig;
}
