import {
  createStaffInvitation,
  isActionAllowed,
  resolveSetupState,
  type FoundationAction,
  type SetupState,
  type StaffRole,
  type TicketStatus
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
    table("widgets", ["id", "installation_id", "allowed_domains", "snippet_copied", "updated_at"]),
    table("documents", [
      "id",
      "installation_id",
      "filename",
      "content_hash",
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
export type DocumentStatus = "pending" | "indexed" | "failed" | "deleted";
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
  updatedAt: string;
}

export interface DocumentRecord extends ScopedRecord {
  filename: string;
  contentHash: string;
  status: DocumentStatus;
  createdAt: string;
}

export interface DocumentChunkRecord extends ScopedRecord {
  documentId: string;
  ordinal: number;
  contentHash: string;
  text: string;
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
  documentationGaps: DocumentationGapRecord;
  tickets: TicketRecord;
  auditEvents: AuditEventRecord;
}

export type RuntimeCollectionName = keyof RuntimeRecords;

export interface RuntimeRepository {
  upsertInstallation(record: InstallationRecord): Promise<void>;
  insertFirstStaffUser(record: StaffUserRecord): Promise<void>;
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

  authorizeAction(input: AuthorizeRuntimeActionInput): RuntimeActionAuthorization {
    return { authorized: isActionAllowed(input.role, input.action) };
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

  async upsertScoped<K extends ScopedCollectionName>(
    collection: K,
    record: RuntimeRecords[K]
  ): Promise<void> {
    assertRequired(record.id, "record id");
    assertRequired(record.installationId, "installation id");

    this.#assertInstallationExists(record.installationId);

    this.#collections[collection].set(scopedRecordKey(record), structuredClone(record));
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
