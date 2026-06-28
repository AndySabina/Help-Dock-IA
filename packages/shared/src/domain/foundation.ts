export type StaffRole = "manager" | "agent" | "viewer";

export type FoundationAction =
  | "setup:update"
  | "provider:update"
  | "domains:update"
  | "documents:upload"
  | "documents:delete"
  | "readiness:run"
  | "staff:invite"
  | "tickets:manage"
  | "gaps:view"
  | "gaps:link"
  | "gaps:resolve";

export interface SingleCompanyScope {
  installationId: string;
  workspaceId: "workspace_default";
  siteId: "site_default";
  widgetId: "widget_default";
}

export interface SetupStateInput {
  userCount: number;
}

export interface SetupState {
  bootstrapRequired: boolean;
  staffInvitationsEnabled: boolean;
}

export interface StaffInvitationInput {
  invitedByRole: StaffRole;
  email: string;
  role: StaffRole;
}

export interface StaffInvitationDraft {
  email: string;
  role: StaffRole;
  status: "pending";
}

const rolePolicies: Record<StaffRole, readonly FoundationAction[]> = {
  manager: [
    "setup:update",
    "provider:update",
    "domains:update",
    "documents:upload",
    "documents:delete",
    "readiness:run",
    "staff:invite",
    "tickets:manage",
    "gaps:view",
    "gaps:link",
    "gaps:resolve"
  ],
  agent: ["tickets:manage", "gaps:view", "gaps:link"],
  viewer: ["gaps:view"]
};

export function createSingleCompanyScope(installationId: string): SingleCompanyScope {
  if (installationId.trim().length === 0) {
    throw new Error("installation id is required");
  }

  return {
    installationId,
    workspaceId: "workspace_default",
    siteId: "site_default",
    widgetId: "widget_default"
  };
}

export function resolveSetupState(input: SetupStateInput): SetupState {
  const bootstrapRequired = input.userCount === 0;

  return {
    bootstrapRequired,
    staffInvitationsEnabled: !bootstrapRequired
  };
}

export function isActionAllowed(role: StaffRole, action: FoundationAction): boolean {
  return rolePolicies[role].includes(action);
}

export function canInviteStaff(role: StaffRole): boolean {
  return isActionAllowed(role, "staff:invite");
}

export function createStaffInvitation(input: StaffInvitationInput): StaffInvitationDraft {
  if (!canInviteStaff(input.invitedByRole)) {
    throw new Error("Only managers can invite staff");
  }

  return {
    email: input.email.trim().toLowerCase(),
    role: input.role,
    status: "pending"
  };
}
