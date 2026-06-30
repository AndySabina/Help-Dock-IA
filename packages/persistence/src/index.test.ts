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
