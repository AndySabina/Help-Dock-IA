import type { StaffRole } from "./foundation.ts";

export type TicketStatus = "open" | "waiting_on_customer" | "waiting_on_staff" | "closed";

export interface TicketEscalationInput {
  name: string;
  email: string;
  needsDescription: string;
  originalQuestion: string;
  conversationId: string;
  widgetId: string;
  unresolvedInteractionId: string;
  documentationGapIds: readonly string[];
  createdAt: string;
}

export interface EscalationTicketDraft {
  requester: {
    name: string;
    email: string;
  };
  description: string;
  originalQuestion: string;
  status: "open";
  context: {
    conversationId: string;
    widgetId: string;
    unresolvedInteractionId: string;
    documentationGapIds: string[];
  };
  createdAt: string;
}

export type TicketTimelineActor =
  | { type: "visitor"; visitorEmail: string }
  | { type: "agent"; staffUserId?: string }
  | { type: "manager"; staffUserId?: string }
  | { type: "system" };

export type TicketTimelineAction =
  | "ticket_opened"
  | "message_added"
  | "status_changed"
  | "documentation_gap_linked"
  | "conversation_linked"
  | "email_reply_link_sent";

export type TicketTimelineDetails = Record<string, string | number | boolean | null>;

export interface TicketTimelineEventInput {
  ticketId: string;
  actor: TicketTimelineActor;
  occurredAt: string;
  action: TicketTimelineAction;
  details: TicketTimelineDetails;
}

export type TicketTimelineEvent = TicketTimelineEventInput;

export interface SharedTicketQueueItem {
  ticketId: string;
  status: TicketStatus;
}

export interface SharedTicketVisibilityInput {
  viewerRole: StaffRole;
  queue: readonly SharedTicketQueueItem[];
}

export type TicketAttentionFactorName =
  | "status_base"
  | "waiting_on_staff_time"
  | "user_reply"
  | "unresolved_interactions"
  | "open_documentation_gaps"
  | "no_staff_reply"
  | "closed";

export interface TicketAttentionFactor {
  name: TicketAttentionFactorName;
  points: number;
}

export interface TicketAttentionScoreInput {
  status: TicketStatus;
  createdAt: string;
  now: string;
  waitingOnStaffSince: string | null;
  unreadCustomerMessages: number;
  unresolvedInteractions: number;
  linkedOpenDocumentationGaps: number;
  hasStaffReply: boolean;
}

export interface TicketAttentionScore {
  score: number;
  factors: TicketAttentionFactor[];
}

export interface EmailReplyLinkTokenInput {
  ticketId: string;
  customerEmail: string;
  issuedAt: string;
  expiresAt: string;
  conversationId: string;
}

export interface EmailReplyLinkTokenDraft {
  purpose: "customer_ticket_reply";
  delivery: "outbound_email_reply_link";
  rawInboundEmailParsing: "deferred_v1";
  ticketId: string;
  customerEmail: string;
  issuedAt: string;
  expiresAt: string;
  conversationId: string;
  allowedAction: "append_customer_message";
}

const statusBasePoints: Record<TicketStatus, number> = {
  open: 45,
  waiting_on_staff: 40,
  waiting_on_customer: 5,
  closed: 0
};

const MAX_SCORE = 100;
const WAITING_ON_STAFF_POINT_CAP = 25;

export function createEscalationTicketDraft(input: TicketEscalationInput): EscalationTicketDraft {
  const name = requiredTrimmedValue(input.name, "name");
  const email = normalizeRequiredEmail(input.email);
  const description = requiredTrimmedValue(input.needsDescription, "needs description");
  const originalQuestion = requiredTrimmedValue(input.originalQuestion, "original question");

  return {
    requester: { name, email },
    description,
    originalQuestion,
    status: "open",
    context: {
      conversationId: requiredTrimmedValue(input.conversationId, "conversation id"),
      widgetId: requiredTrimmedValue(input.widgetId, "widget id"),
      unresolvedInteractionId: requiredTrimmedValue(
        input.unresolvedInteractionId,
        "unresolved interaction id"
      ),
      documentationGapIds: input.documentationGapIds.map((gapId) =>
        requiredTrimmedValue(gapId, "documentation gap id")
      )
    },
    createdAt: input.createdAt
  };
}

export function createTicketTimelineEvent(input: TicketTimelineEventInput): TicketTimelineEvent {
  if (
    (input.actor.type === "agent" || input.actor.type === "manager") &&
    !input.actor.staffUserId
  ) {
    throw new Error("staff user id is required for staff timeline actions");
  }

  return input;
}

export function listVisibleSharedTicketIds(input: SharedTicketVisibilityInput): string[] {
  if (input.viewerRole !== "agent" && input.viewerRole !== "manager") {
    return [];
  }

  return input.queue.filter((item) => item.status !== "closed").map((item) => item.ticketId);
}

export function calculateTicketAttentionScore(
  input: TicketAttentionScoreInput
): TicketAttentionScore {
  if (input.status === "closed") {
    return { score: 0, factors: [{ name: "closed", points: 0 }] };
  }

  const factors: TicketAttentionFactor[] = [
    { name: "status_base", points: statusBasePoints[input.status] }
  ];

  const waitingOnStaffHours = input.waitingOnStaffSince
    ? elapsedHours(input.waitingOnStaffSince, input.now)
    : 0;
  const waitingOnStaffPoints = Math.min(
    WAITING_ON_STAFF_POINT_CAP,
    Math.round(waitingOnStaffHours * 2)
  );

  if (waitingOnStaffPoints > 0) {
    factors.push({ name: "waiting_on_staff_time", points: waitingOnStaffPoints });
  }

  factors.push(
    { name: "user_reply", points: input.unreadCustomerMessages * 10 },
    { name: "unresolved_interactions", points: input.unresolvedInteractions * 15 },
    { name: "open_documentation_gaps", points: input.linkedOpenDocumentationGaps * 10 }
  );

  if (!input.hasStaffReply) {
    factors.push({ name: "no_staff_reply", points: 15 });
  }

  return {
    score: clampScore(factors.reduce((total, factor) => total + factor.points, 0)),
    factors
  };
}

export function buildEmailReplyLinkTokenDraft(
  input: EmailReplyLinkTokenInput
): EmailReplyLinkTokenDraft {
  return {
    purpose: "customer_ticket_reply",
    delivery: "outbound_email_reply_link",
    rawInboundEmailParsing: "deferred_v1",
    ticketId: requiredTrimmedValue(input.ticketId, "ticket id"),
    customerEmail: normalizeRequiredEmail(input.customerEmail),
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    conversationId: requiredTrimmedValue(input.conversationId, "conversation id"),
    allowedAction: "append_customer_message"
  };
}

function requiredTrimmedValue(value: string, label: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error(`${label} is required`);
  }

  return trimmed;
}

function normalizeRequiredEmail(value: string): string {
  const email = requiredTrimmedValue(value, "email").toLowerCase();

  if (!email.includes("@")) {
    throw new Error("email must include @");
  }

  return email;
}

function elapsedHours(start: string, end: string): number {
  return Math.max(0, (Date.parse(end) - Date.parse(start)) / (60 * 60 * 1000));
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(MAX_SCORE, score));
}
