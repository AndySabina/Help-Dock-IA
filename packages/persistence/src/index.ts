import {
  chunkMarkdownDocument,
  createDocumentContentMetadata,
  createDocumentDeletionPlan,
  createDocumentIndexingReadinessSignal,
  createReadinessChecklist,
  createStaffInvitation,
  findDuplicateChunks,
  findExactDocumentDuplicate,
  isActionAllowed,
  resolveSetupState,
  type DocumentDeletionPlan,
  type DocumentIndexingReadinessSignal,
  type FoundationAction,
  type OpenAiConfigInput,
  type ReadinessChecklist,
  type RuntimeEnvironment,
  type SetupState,
  type SmtpConfigInput,
  type StaffRole,
  type TicketStatus,
  validateAllowedWidgetDomains,
  validateOpenAiConfig,
  validateSmtpConfig
} from "@helpdock/shared";
import { randomUUID } from "node:crypto";

export const PERSISTENCE_SCHEMA_VERSION = "2026_06_29_0001_runtime_foundation";

export type RuntimeTableName =
  | "installations"
  | "staff_users"
  | "staff_invitations"
  | "providers"
  | "widgets"
  | "documents"
  | "document_chunks"
  | "document_embeddings"
  | "documentation_gaps"
  | "tickets"
  | "audit_events";

export interface RuntimeTableDefinition {
  name: RuntimeTableName;
  columns: readonly string[];
  scope: "installation" | "global";
}

export interface RuntimeMigrationMetadata {
  id: typeof PERSISTENCE_SCHEMA_VERSION;
  description: string;
  tables: readonly RuntimeTableDefinition[];
}

function table(
  name: RuntimeTableName,
  columns: readonly string[],
  scope: RuntimeTableDefinition["scope"] = "installation"
): RuntimeTableDefinition {
  return { name, columns, scope };
}

export const runtimeFoundationMigration: RuntimeMigrationMetadata = {
  id: PERSISTENCE_SCHEMA_VERSION,
  description: "Single-company runtime persistence foundation without live database bindings.",
  tables: [
    table(
      "installations",
      ["id", "workspace_id", "site_id", "widget_id", "company_name", "created_at"],
      "global"
    ),
    table("staff_users", ["id", "installation_id", "email", "role", "status", "created_at"]),
    table("staff_invitations", [
      "id",
      "installation_id",
      "email",
      "role",
      "status",
      "invited_by_id",
      "created_at"
    ]),
    table("providers", ["id", "installation_id", "kind", "configured", "metadata", "updated_at"]),
    table("widgets", [
      "id",
      "installation_id",
      "allowed_domains",
      "snippet_copied",
      "smoke_test_passed",
      "updated_at"
    ]),
    table("documents", [
      "id",
      "installation_id",
      "filename",
      "content_hash",
      "byte_length",
      "status",
      "created_at"
    ]),
    table("document_chunks", [
      "id",
      "installation_id",
      "document_id",
      "ordinal",
      "content_hash",
      "text"
    ]),
    table("document_embeddings", [
      "id",
      "installation_id",
      "document_id",
      "chunk_id",
      "content_hash",
      "model_id",
      "dimensions",
      "vector",
      "created_at"
    ]),
    table("documentation_gaps", [
      "id",
      "installation_id",
      "question",
      "status",
      "linked_document_id",
      "created_at"
    ]),
    table("tickets", [
      "id",
      "installation_id",
      "requester_email",
      "status",
      "conversation_id",
      "created_at"
    ]),
    table("audit_events", [
      "id",
      "installation_id",
      "actor_id",
      "action",
      "target_type",
      "target_id",
      "occurred_at"
    ])
  ]
} as const;

export type StaffUserStatus = "active" | "disabled";
export type InvitationStatus = "pending" | "accepted" | "revoked";
export type ProviderKind = "openai" | "smtp";
export type DocumentStatus = "pending" | "indexing" | "indexed" | "failed" | "deleted";
export type DocumentationGapStatus = "open" | "linked" | "resolved";

export interface InstallationRecord {
  id: string;
  workspaceId: "workspace_default";
  siteId: "site_default";
  widgetId: "widget_default";
  companyName: string;
  createdAt: string;
}

export interface ScopedRecord {
  id: string;
  installationId: string;
}

export interface StaffUserRecord extends ScopedRecord {
  email: string;
  role: StaffRole;
  status: StaffUserStatus;
  createdAt: string;
}

export interface StaffInvitationRecord extends ScopedRecord {
  email: string;
  role: StaffRole;
  status: InvitationStatus;
  invitedById: string;
  createdAt: string;
}

export interface ProviderRecord extends ScopedRecord {
  kind: ProviderKind;
  configured: boolean;
  metadata: Record<string, string | number | boolean | null>;
  updatedAt: string;
}

export interface WidgetRecord extends ScopedRecord {
  allowedDomains: string[];
  snippetCopied: boolean;
  smokeTestPassed: boolean;
  updatedAt: string;
}

export interface DocumentRecord extends ScopedRecord {
  filename: string;
  contentHash: string;
  byteLength: number;
  status: DocumentStatus;
  createdAt: string;
}

export interface DocumentChunkRecord extends ScopedRecord {
  documentId: string;
  ordinal: number;
  contentHash: string;
  text: string;
}

export interface DocumentEmbeddingRecord extends ScopedRecord {
  documentId: string;
  chunkId: string;
  contentHash: string;
  modelId: string;
  dimensions: number;
  vector: number[];
  createdAt: string;
}

export interface DocumentationGapRecord extends ScopedRecord {
  question: string;
  status: DocumentationGapStatus;
  linkedDocumentId: string | null;
  createdAt: string;
}

export interface TicketRecord extends ScopedRecord {
  requesterEmail: string;
  status: TicketStatus;
  conversationId: string;
  createdAt: string;
}

export interface AuditEventRecord extends ScopedRecord {
  actorId: string | null;
  action: string;
  targetType: RuntimeTableName;
  targetId: string;
  occurredAt: string;
}

export interface RuntimeRecords {
  installations: InstallationRecord;
  staffUsers: StaffUserRecord;
  staffInvitations: StaffInvitationRecord;
  providers: ProviderRecord;
  widgets: WidgetRecord;
  documents: DocumentRecord;
  documentChunks: DocumentChunkRecord;
  documentEmbeddings: DocumentEmbeddingRecord;
  documentationGaps: DocumentationGapRecord;
  tickets: TicketRecord;
  auditEvents: AuditEventRecord;
}

export type RuntimeCollectionName = keyof RuntimeRecords;

export interface RuntimeRepository {
  upsertInstallation(record: InstallationRecord): Promise<void>;
  insertFirstStaffUser(record: StaffUserRecord): Promise<void>;
  insertMarkdownDocumentUpload(
    input: InsertMarkdownDocumentUploadInput
  ): Promise<InsertMarkdownDocumentUploadResult>;
  upsertDocumentEmbeddingIfDocumentActive(record: DocumentEmbeddingRecord): Promise<boolean>;
  updateDocumentStatusIfActive(
    installationId: string,
    documentId: string,
    status: Exclude<DocumentStatus, "deleted">
  ): Promise<boolean>;
  upsertScoped<K extends Exclude<RuntimeCollectionName, "installations">>(
    collection: K,
    record: RuntimeRecords[K]
  ): Promise<void>;
  listScoped<K extends Exclude<RuntimeCollectionName, "installations">>(
    collection: K,
    installationId: string
  ): Promise<RuntimeRecords[K][]>;
}

export interface RuntimeClock {
  now(): Date;
}

export interface InsertMarkdownDocumentUploadInput {
  installationId: string;
  filename: string;
  content: string;
  contentHash: string;
  byteLength: number;
  createdAt: string;
}

export interface InsertMarkdownDocumentUploadResult {
  document: DocumentRecord;
  chunks: DocumentChunkRecord[];
  duplicate: { exact: true; documentId: string; contentHash: string } | { exact: false };
}

export type RuntimeIdFactory = (scope: "staff" | "invitation") => string;

export interface RuntimeFoundationServiceOptions {
  repository: RuntimeRepository;
  clock?: RuntimeClock;
  createId?: RuntimeIdFactory;
}

export interface BootstrapFirstManagerInput {
  installationId: string;
  email: string;
  managerId?: string;
}

export interface CreateStaffInvitationRecordInput {
  installationId: string;
  invitedById: string;
  email: string;
  role: StaffRole;
  invitationId?: string;
}

export interface UpdateOpenAiProviderInput {
  installationId: string;
  requestedById: string;
  config: OpenAiConfigInput;
}

export interface UpdateSmtpProviderInput {
  installationId: string;
  requestedById: string;
  config: SmtpConfigInput;
}

export interface UpdateWidgetDomainsInput {
  installationId: string;
  requestedById: string;
  domains: readonly string[];
  environment?: RuntimeEnvironment;
  snippetCopied?: boolean;
  smokeTestPassed?: boolean;
}

export interface GetReadinessChecklistInput {
  installationId: string;
  requestedById: string;
}

export interface UploadMarkdownDocumentInput {
  installationId: string;
  requestedById: string;
  filename: string;
  content: string;
}

export interface UploadMarkdownDocumentResult {
  document: DocumentRecord;
  chunks: DocumentChunkRecord[];
  duplicate: { exact: true; documentId: string; contentHash: string } | { exact: false };
  duplicateChunkGroups: ReturnType<typeof findDuplicateChunks>;
  indexingReadiness: DocumentIndexingReadinessSignal;
}

export interface DeleteDocumentInput {
  installationId: string;
  requestedById: string;
  documentId: string;
}

export interface DeleteDocumentResult {
  document: DocumentRecord;
  deletionPlan: DocumentDeletionPlan;
  indexingReadiness: DocumentIndexingReadinessSignal;
}

export interface PrepareDocumentEmbeddingJobsInput extends GetReadinessChecklistInput {
  limit?: number;
}

export interface DocumentEmbeddingJob {
  id: string;
  installationId: string;
  documentId: string;
  chunkId: string;
  contentHash: string;
  text: string;
}

export interface AuthorizeRuntimeActionInput {
  role: StaffRole;
  action: FoundationAction;
}

export interface RuntimeActionAuthorization {
  authorized: boolean;
}

const systemClock: RuntimeClock = {
  now: () => new Date()
};

export class RuntimeFoundationService {
  readonly #repository: RuntimeRepository;
  readonly #clock: RuntimeClock;
  readonly #createId: RuntimeIdFactory;

  constructor(options: RuntimeFoundationServiceOptions) {
    this.#repository = options.repository;
    this.#clock = options.clock ?? systemClock;
    this.#createId = options.createId ?? createRuntimeId;
  }

  async getSetupState(installationId: string): Promise<SetupState> {
    const users = await this.#repository.listScoped("staffUsers", installationId);

    return resolveSetupState({ userCount: users.length });
  }

  async bootstrapFirstManager(input: BootstrapFirstManagerInput): Promise<StaffUserRecord> {
    const setupState = await this.getSetupState(input.installationId);

    if (!setupState.bootstrapRequired) {
      throw new Error("Manager bootstrap is only allowed before staff users exist");
    }

    const manager: StaffUserRecord = {
      id: input.managerId ?? this.#createId("staff"),
      installationId: input.installationId,
      email: normalizeEmail(input.email),
      role: "manager",
      status: "active",
      createdAt: this.#clock.now().toISOString()
    };

    await this.#repository.insertFirstStaffUser(manager);

    return manager;
  }

  async createStaffInvitationRecord(
    input: CreateStaffInvitationRecordInput
  ): Promise<StaffInvitationRecord> {
    const inviter = await this.#findActiveStaffUser(input.installationId, input.invitedById);
    const draft = createStaffInvitation({
      invitedByRole: inviter.role,
      email: normalizeInvitationEmail(input.email),
      role: input.role
    });
    const invitation: StaffInvitationRecord = {
      id: input.invitationId ?? this.#createId("invitation"),
      installationId: input.installationId,
      invitedById: input.invitedById,
      email: draft.email,
      role: draft.role,
      status: draft.status,
      createdAt: this.#clock.now().toISOString()
    };

    await this.#repository.upsertScoped("staffInvitations", invitation);

    return invitation;
  }

  async updateOpenAiProvider(input: UpdateOpenAiProviderInput): Promise<ProviderRecord> {
    await this.#assertAuthorizedStaff(input.installationId, input.requestedById, "provider:update");

    const validation = validateOpenAiConfig(input.config);
    if (!validation.ok) {
      throw new Error(validation.issues.join("; "));
    }

    const provider: ProviderRecord = {
      id: "provider_openai",
      installationId: input.installationId,
      kind: "openai",
      configured: true,
      metadata: {
        apiKeyConfigured: true,
        chatModelId: input.config.chatModelId,
        embeddingModelId: input.config.embeddingModelId
      },
      updatedAt: this.#clock.now().toISOString()
    };

    await this.#repository.upsertScoped("providers", provider);

    return provider;
  }

  async updateSmtpProvider(input: UpdateSmtpProviderInput): Promise<ProviderRecord> {
    await this.#assertAuthorizedStaff(input.installationId, input.requestedById, "provider:update");

    const validation = validateSmtpConfig(input.config);
    if (!validation.ok) {
      throw new Error(validation.issues.join("; "));
    }

    const provider: ProviderRecord = {
      id: "provider_smtp",
      installationId: input.installationId,
      kind: "smtp",
      configured: true,
      metadata: {
        host: input.config.host.trim().toLowerCase(),
        port: input.config.port,
        usernameConfigured: input.config.username.trim().length > 0,
        passwordConfigured: true,
        fromEmail: input.config.fromEmail.trim().toLowerCase()
      },
      updatedAt: this.#clock.now().toISOString()
    };

    await this.#repository.upsertScoped("providers", provider);

    return provider;
  }

  async updateWidgetDomains(input: UpdateWidgetDomainsInput): Promise<WidgetRecord> {
    await this.#assertAuthorizedStaff(input.installationId, input.requestedById, "domains:update");

    const validation = validateAllowedWidgetDomains(
      input.domains,
      input.environment ?? "production"
    );
    if (!validation.ok) {
      throw new Error(validation.issues.join("; "));
    }

    const [existing] = await this.#repository.listScoped("widgets", input.installationId);
    const widget: WidgetRecord = {
      id: existing?.id ?? "widget_default",
      installationId: input.installationId,
      allowedDomains: validation.domains,
      snippetCopied: input.snippetCopied ?? existing?.snippetCopied ?? false,
      smokeTestPassed: input.smokeTestPassed ?? false,
      updatedAt: this.#clock.now().toISOString()
    };

    await this.#repository.upsertScoped("widgets", widget);

    return widget;
  }

  async getReadinessChecklist(input: GetReadinessChecklistInput): Promise<ReadinessChecklist> {
    await this.#assertAuthorizedStaff(input.installationId, input.requestedById, "readiness:run");

    const [providers, widgets, documents] = await Promise.all([
      this.#repository.listScoped("providers", input.installationId),
      this.#repository.listScoped("widgets", input.installationId),
      this.#repository.listScoped("documents", input.installationId)
    ]);
    const openAiProvider = providers.find((provider) => provider.kind === "openai");
    const smtpProvider = providers.find((provider) => provider.kind === "smtp");
    const [widget] = widgets;

    return createReadinessChecklist({
      openAiConfigured: openAiProvider?.configured ?? false,
      smtpConfigured: smtpProvider?.configured ?? false,
      hasIndexedDocuments: documents.some((document) => document.status === "indexed"),
      hasAllowedDomain: (widget?.allowedDomains.length ?? 0) > 0,
      widgetSnippetCopied: widget?.snippetCopied ?? false,
      widgetSmokeTestPassed: widget?.smokeTestPassed ?? false
    });
  }

  async uploadMarkdownDocument(
    input: UploadMarkdownDocumentInput
  ): Promise<UploadMarkdownDocumentResult> {
    await this.#assertAuthorizedStaff(
      input.installationId,
      input.requestedById,
      "documents:upload"
    );

    const metadata = createDocumentContentMetadata({
      filename: input.filename,
      content: input.content
    });
    const { document, chunks, duplicate } = await this.#repository.insertMarkdownDocumentUpload({
      installationId: input.installationId,
      filename: metadata.filename,
      content: input.content,
      contentHash: metadata.contentHash,
      byteLength: metadata.byteLength,
      createdAt: this.#clock.now().toISOString()
    });

    return {
      document,
      chunks,
      duplicate,
      duplicateChunkGroups: findDuplicateChunks(chunks),
      indexingReadiness: await this.getDocumentIndexingReadinessSignal(input)
    };
  }

  async deleteDocument(input: DeleteDocumentInput): Promise<DeleteDocumentResult> {
    const manager = await this.#assertAuthorizedStaff(
      input.installationId,
      input.requestedById,
      "documents:delete"
    );
    const documents = await this.#repository.listScoped("documents", input.installationId);
    const document = documents.find((candidate) => candidate.id === input.documentId);

    if (!document || document.status === "deleted") {
      throw new Error(`document ${input.documentId} does not exist`);
    }

    const chunks = (
      await this.#repository.listScoped("documentChunks", input.installationId)
    ).filter((chunk) => chunk.documentId === input.documentId);
    const deletionPlan = createDocumentDeletionPlan({
      documentId: input.documentId,
      chunks: chunks.map((chunk) => ({ id: chunk.id, documentId: chunk.documentId })),
      embeddings: (await this.#repository.listScoped("documentEmbeddings", input.installationId))
        .filter((embedding) => embedding.documentId === input.documentId)
        .map((embedding) => ({ id: embedding.id, documentId: embedding.documentId })),
      requestedByRole: manager.role
    });
    const deletedDocument: DocumentRecord = { ...document, status: "deleted" };

    await this.#repository.upsertScoped("documents", deletedDocument);

    return {
      document: deletedDocument,
      deletionPlan,
      indexingReadiness: await this.getDocumentIndexingReadinessSignal(input)
    };
  }

  async getDocumentIndexingReadinessSignal(
    input: GetReadinessChecklistInput
  ): Promise<DocumentIndexingReadinessSignal> {
    await this.#assertAuthorizedStaff(input.installationId, input.requestedById, "readiness:run");

    const documents = (await this.#repository.listScoped("documents", input.installationId)).filter(
      (document) => document.status !== "deleted"
    );

    return createDocumentIndexingReadinessSignal({
      indexedDocumentCount: documents.filter((document) => document.status === "indexed").length,
      pendingDocumentCount: documents.filter(
        (document) => document.status === "pending" || document.status === "indexing"
      ).length,
      failedDocumentCount: documents.filter((document) => document.status === "failed").length
    });
  }

  async prepareDocumentEmbeddingJobs(
    input: PrepareDocumentEmbeddingJobsInput
  ): Promise<DocumentEmbeddingJob[]> {
    await this.#assertAuthorizedStaff(input.installationId, input.requestedById, "readiness:run");
    const limit = input.limit ?? Number.POSITIVE_INFINITY;

    if (limit !== Number.POSITIVE_INFINITY && (!Number.isSafeInteger(limit) || limit < 1)) {
      throw new Error("embedding job limit must be a positive integer");
    }

    const documents = await this.#repository.listScoped("documents", input.installationId);
    const embeddableDocuments = documents
      .filter(
        (document) =>
          document.status === "pending" ||
          document.status === "indexing" ||
          document.status === "failed"
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const chunks = await this.#repository.listScoped("documentChunks", input.installationId);
    const embeddedChunkKeys = new Set(
      (await this.#repository.listScoped("documentEmbeddings", input.installationId)).map(
        (embedding) => `${embedding.chunkId}:${embedding.contentHash}`
      )
    );
    const jobs: DocumentEmbeddingJob[] = [];

    for (const document of embeddableDocuments) {
      const documentJobs = chunks
        .filter(
          (chunk) =>
            chunk.documentId === document.id &&
            !embeddedChunkKeys.has(`${chunk.id}:${chunk.contentHash}`)
        )
        .sort((left, right) => left.ordinal - right.ordinal)
        .map((chunk) => ({
          id: `${chunk.id}:embedding-job`,
          installationId: chunk.installationId,
          documentId: document.id,
          chunkId: chunk.id,
          contentHash: chunk.contentHash,
          text: chunk.text
        }));

      for (const job of documentJobs) {
        if (jobs.length >= limit) {
          break;
        }
        jobs.push(job);
      }

      if (jobs.length >= limit) {
        break;
      }
    }

    const selectedDocumentIds = new Set(jobs.map((job) => job.documentId));
    const claimedDocumentIds = new Set<string>();

    for (const document of embeddableDocuments) {
      if (
        selectedDocumentIds.has(document.id) &&
        (await this.#repository.updateDocumentStatusIfActive(
          input.installationId,
          document.id,
          "indexing"
        ))
      ) {
        claimedDocumentIds.add(document.id);
      }
    }

    const fullyEmbeddedDocumentIds = new Set(
      embeddableDocuments
        .filter((document) => !selectedDocumentIds.has(document.id))
        .filter((document) => {
          const documentChunks = chunks.filter((chunk) => chunk.documentId === document.id);

          return documentChunks.every((chunk) =>
            embeddedChunkKeys.has(`${chunk.id}:${chunk.contentHash}`)
          );
        })
        .map((document) => document.id)
    );

    if (fullyEmbeddedDocumentIds.size > 0) {
      await this.#settleEmbeddedDocumentStatuses(input.installationId, fullyEmbeddedDocumentIds);
    }

    return jobs.filter((job) => claimedDocumentIds.has(job.documentId));
  }

  authorizeAction(input: AuthorizeRuntimeActionInput): RuntimeActionAuthorization {
    return { authorized: isActionAllowed(input.role, input.action) };
  }

  async #settleEmbeddedDocumentStatuses(
    installationId: string,
    documentIds: ReadonlySet<string>
  ): Promise<void> {
    const documents = await this.#repository.listScoped("documents", installationId);
    const chunks = await this.#repository.listScoped("documentChunks", installationId);
    const embeddings = await this.#repository.listScoped("documentEmbeddings", installationId);

    for (const document of documents) {
      if (!documentIds.has(document.id) || document.status === "deleted") {
        continue;
      }

      const documentChunks = chunks.filter((chunk) => chunk.documentId === document.id);
      const embeddedChunkKeys = new Set(
        embeddings
          .filter((embedding) => embedding.documentId === document.id)
          .map((embedding) => `${embedding.chunkId}:${embedding.contentHash}`)
      );
      const nextStatus = documentChunks.every((chunk) =>
        embeddedChunkKeys.has(`${chunk.id}:${chunk.contentHash}`)
      )
        ? "indexed"
        : "pending";

      await this.#repository.updateDocumentStatusIfActive(installationId, document.id, nextStatus);
    }
  }

  async #assertAuthorizedStaff(
    installationId: string,
    staffUserId: string,
    action: FoundationAction
  ): Promise<StaffUserRecord> {
    const staffUser = await this.#findActiveStaffUser(installationId, staffUserId);

    if (!this.authorizeAction({ role: staffUser.role, action }).authorized) {
      throw new Error(`Only managers can ${action}`);
    }

    return staffUser;
  }

  async #findActiveStaffUser(
    installationId: string,
    staffUserId: string
  ): Promise<StaffUserRecord> {
    const staffUsers = await this.#repository.listScoped("staffUsers", installationId);
    const staffUser = staffUsers.find(
      (user) => user.id === staffUserId && user.status === "active"
    );

    if (!staffUser) {
      throw new Error(`active staff user ${staffUserId} does not exist`);
    }

    return staffUser;
  }
}

type ScopedCollectionName = Exclude<RuntimeCollectionName, "installations">;

export class InMemoryRuntimeRepository implements RuntimeRepository {
  readonly #installations = new Map<string, InstallationRecord>();
  readonly #collections: { [K in ScopedCollectionName]: Map<string, RuntimeRecords[K]> } = {
    staffUsers: new Map(),
    staffInvitations: new Map(),
    providers: new Map(),
    widgets: new Map(),
    documents: new Map(),
    documentChunks: new Map(),
    documentEmbeddings: new Map(),
    documentationGaps: new Map(),
    tickets: new Map(),
    auditEvents: new Map()
  };

  async upsertInstallation(record: InstallationRecord): Promise<void> {
    assertRequired(record.id, "installation id");
    this.#installations.set(record.id, structuredClone(record));
  }

  async insertFirstStaffUser(record: StaffUserRecord): Promise<void> {
    assertRequired(record.id, "record id");
    assertRequired(record.installationId, "installation id");
    this.#assertInstallationExists(record.installationId);

    const hasStaffUsers = [...this.#collections.staffUsers.values()].some(
      (staffUser) => staffUser.installationId === record.installationId
    );

    if (hasStaffUsers) {
      throw new Error("Manager bootstrap is only allowed before staff users exist");
    }

    this.#collections.staffUsers.set(scopedRecordKey(record), structuredClone(record));
  }

  async insertMarkdownDocumentUpload(
    input: InsertMarkdownDocumentUploadInput
  ): Promise<InsertMarkdownDocumentUploadResult> {
    assertRequired(input.installationId, "installation id");
    this.#assertInstallationExists(input.installationId);

    const existingDocuments = [...this.#collections.documents.values()].filter(
      (document) => document.installationId === input.installationId
    );
    const duplicate = findExactDocumentDuplicate(
      input.contentHash,
      existingDocuments
        .filter((document) => document.status !== "deleted")
        .map((document) => ({
          documentId: document.id,
          contentHash: document.contentHash
        }))
    );

    if (duplicate.duplicate === true) {
      const document = existingDocuments.find((candidate) => candidate.id === duplicate.documentId);

      if (!document) {
        throw new Error(`document ${duplicate.documentId} does not exist`);
      }

      const chunks = [...this.#collections.documentChunks.values()].filter(
        (chunk) => chunk.installationId === input.installationId && chunk.documentId === document.id
      );

      return {
        document: structuredClone(document),
        chunks: chunks.map((chunk) => structuredClone(chunk)),
        duplicate: {
          exact: true,
          documentId: duplicate.documentId,
          contentHash: duplicate.contentHash
        }
      };
    }

    const documentId = createDocumentId(input.contentHash, existingDocuments.length);
    const document: DocumentRecord = {
      id: documentId,
      installationId: input.installationId,
      filename: input.filename,
      contentHash: input.contentHash,
      byteLength: input.byteLength,
      status: "pending",
      createdAt: input.createdAt
    };
    const chunks: DocumentChunkRecord[] = chunkMarkdownDocument({
      documentId,
      content: input.content
    }).map((chunk) => ({
      id: chunk.id,
      installationId: input.installationId,
      documentId: chunk.documentId,
      ordinal: chunk.ordinal,
      contentHash: chunk.contentHash,
      text: chunk.text
    }));

    this.#collections.documents.set(scopedRecordKey(document), structuredClone(document));
    for (const chunk of chunks) {
      this.#collections.documentChunks.set(scopedRecordKey(chunk), structuredClone(chunk));
    }

    return {
      document: structuredClone(document),
      chunks: chunks.map((chunk) => structuredClone(chunk)),
      duplicate: { exact: false }
    };
  }

  async upsertScoped<K extends ScopedCollectionName>(
    collection: K,
    record: RuntimeRecords[K]
  ): Promise<void> {
    assertRequired(record.id, "record id");
    assertRequired(record.installationId, "installation id");

    this.#assertInstallationExists(record.installationId);

    this.#collections[collection].set(scopedRecordKey(record), structuredClone(record));
  }

  async upsertDocumentEmbeddingIfDocumentActive(record: DocumentEmbeddingRecord): Promise<boolean> {
    assertRequired(record.id, "record id");
    assertRequired(record.installationId, "installation id");

    this.#assertInstallationExists(record.installationId);

    const document = this.#collections.documents.get(
      `${record.installationId}:${record.documentId}`
    );

    if (!document || document.status === "deleted") {
      return false;
    }

    this.#collections.documentEmbeddings.set(scopedRecordKey(record), structuredClone(record));
    return true;
  }

  async updateDocumentStatusIfActive(
    installationId: string,
    documentId: string,
    status: Exclude<DocumentStatus, "deleted">
  ): Promise<boolean> {
    assertRequired(installationId, "installation id");
    assertRequired(documentId, "document id");

    this.#assertInstallationExists(installationId);

    const key = `${installationId}:${documentId}`;
    const document = this.#collections.documents.get(key);

    if (
      !document ||
      document.status === "deleted" ||
      !canTransitionDocumentStatus(document.status, status)
    ) {
      return false;
    }

    this.#collections.documents.set(key, structuredClone({ ...document, status }));
    return true;
  }

  async listScoped<K extends ScopedCollectionName>(
    collection: K,
    installationId: string
  ): Promise<RuntimeRecords[K][]> {
    assertRequired(installationId, "installation id");
    this.#assertInstallationExists(installationId);

    return [...this.#collections[collection].values()]
      .filter((record) => record.installationId === installationId)
      .map((record) => structuredClone(record));
  }

  #assertInstallationExists(installationId: string): void {
    if (!this.#installations.has(installationId)) {
      throw new Error(`installation ${installationId} does not exist`);
    }
  }
}

function scopedRecordKey(record: ScopedRecord): string {
  return `${record.installationId}:${record.id}`;
}

function assertRequired(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();

  if (normalized.length === 0) {
    throw new Error("email is required");
  }

  return normalized;
}

function normalizeInvitationEmail(email: string): string {
  const normalized = normalizeEmail(email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("invitation email is invalid");
  }

  return normalized;
}

function createRuntimeId(scope: "staff" | "invitation"): string {
  return `${scope}_${randomUUID()}`;
}

function createDocumentId(contentHash: string, existingDocumentCount: number): string {
  return `doc_${contentHash.slice(0, 12)}_${existingDocumentCount + 1}`;
}

function canTransitionDocumentStatus(
  currentStatus: DocumentStatus,
  nextStatus: Exclude<DocumentStatus, "deleted">
): boolean {
  return currentStatus !== "indexed" || nextStatus === "indexed";
}
