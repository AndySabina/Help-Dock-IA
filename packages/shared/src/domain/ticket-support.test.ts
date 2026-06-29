import { describe, expect, it } from "vitest";
import {
  buildEmailReplyLinkTokenDraft,
  calculateTicketAttentionScore,
  createEscalationTicketDraft,
  createTicketTimelineEvent,
  listVisibleSharedTicketIds,
  type TicketStatus
} from "./ticket-support.ts";

describe("ticket escalation intake contracts", () => {
  it("creates a ticket draft from unresolved widget answer context", () => {
    expect(
      createEscalationTicketDraft({
        name: " Ada Lovelace ",
        email: "ADA@Example.COM ",
        needsDescription: "Need help connecting SSO.",
        originalQuestion: "Do you support SAML?",
        conversationId: "conv_123",
        widgetId: "widget_default",
        unresolvedInteractionId: "answer_456",
        documentationGapIds: ["gap_saml"],
        createdAt: "2026-01-01T09:00:00.000Z"
      })
    ).toEqual({
      requester: {
        name: "Ada Lovelace",
        email: "ada@example.com"
      },
      description: "Need help connecting SSO.",
      originalQuestion: "Do you support SAML?",
      status: "open",
      context: {
        conversationId: "conv_123",
        widgetId: "widget_default",
        unresolvedInteractionId: "answer_456",
        documentationGapIds: ["gap_saml"]
      },
      createdAt: "2026-01-01T09:00:00.000Z"
    });
  });

  it("rejects incomplete escalation contact details before ticket creation", () => {
    expect(() =>
      createEscalationTicketDraft({
        name: " ",
        email: "visitor@example.com",
        needsDescription: "Please contact me.",
        originalQuestion: "Unknown policy?",
        conversationId: "conv_123",
        widgetId: "widget_default",
        unresolvedInteractionId: "answer_456",
        documentationGapIds: [],
        createdAt: "2026-01-01T09:00:00.000Z"
      })
    ).toThrow(/name/i);
  });

  it("declares the v1 ticket statuses without pending aliases", () => {
    const statuses: TicketStatus[] = ["open", "waiting_on_customer", "waiting_on_staff", "closed"];

    expect(statuses).toEqual(["open", "waiting_on_customer", "waiting_on_staff", "closed"]);
  });
});

describe("ticket timeline and shared queue contracts", () => {
  it("links escalation ticket creation to the opening timeline event", () => {
    const ticket = createEscalationTicketDraft({
      name: "Ada Lovelace",
      email: "ADA@Example.COM",
      needsDescription: "Need help connecting SSO.",
      originalQuestion: "Do you support SAML?",
      conversationId: "conv_123",
      widgetId: "widget_default",
      unresolvedInteractionId: "answer_456",
      documentationGapIds: ["gap_saml"],
      createdAt: "2026-01-01T09:00:00.000Z"
    });

    expect(
      createTicketTimelineEvent({
        ticketId: "ticket_123",
        actor: { type: "visitor", visitorEmail: ticket.requester.email },
        occurredAt: ticket.createdAt,
        action: "ticket_opened",
        details: {
          conversationId: ticket.context.conversationId,
          widgetId: ticket.context.widgetId,
          unresolvedInteractionId: ticket.context.unresolvedInteractionId,
          documentationGapId: ticket.context.documentationGapIds[0] ?? null
        }
      })
    ).toEqual({
      ticketId: "ticket_123",
      actor: { type: "visitor", visitorEmail: "ada@example.com" },
      occurredAt: "2026-01-01T09:00:00.000Z",
      action: "ticket_opened",
      details: {
        conversationId: "conv_123",
        widgetId: "widget_default",
        unresolvedInteractionId: "answer_456",
        documentationGapId: "gap_saml"
      }
    });
  });

  it("records customer and staff timeline events with actor traceability", () => {
    expect(
      createTicketTimelineEvent({
        ticketId: "ticket_123",
        actor: { type: "agent", staffUserId: "user_agent_1" },
        occurredAt: "2026-01-01T10:00:00.000Z",
        action: "status_changed",
        details: { from: "open", to: "waiting_on_customer" }
      })
    ).toEqual({
      ticketId: "ticket_123",
      actor: { type: "agent", staffUserId: "user_agent_1" },
      occurredAt: "2026-01-01T10:00:00.000Z",
      action: "status_changed",
      details: { from: "open", to: "waiting_on_customer" }
    });

    expect(() =>
      createTicketTimelineEvent({
        ticketId: "ticket_123",
        actor: { type: "manager" },
        occurredAt: "2026-01-01T10:00:00.000Z",
        action: "message_added",
        details: { messageId: "msg_1" }
      })
    ).toThrow(/staff user/i);
  });

  it("makes all active tickets visible to agents and managers while excluding closed tickets", () => {
    const queue = [
      { ticketId: "ticket_open", status: "open" as const },
      { ticketId: "ticket_customer", status: "waiting_on_customer" as const },
      { ticketId: "ticket_staff", status: "waiting_on_staff" as const },
      { ticketId: "ticket_closed", status: "closed" as const }
    ];

    expect(listVisibleSharedTicketIds({ viewerRole: "agent", queue })).toEqual([
      "ticket_open",
      "ticket_customer",
      "ticket_staff"
    ]);
    expect(listVisibleSharedTicketIds({ viewerRole: "manager", queue })).toEqual([
      "ticket_open",
      "ticket_customer",
      "ticket_staff"
    ]);
    expect(listVisibleSharedTicketIds({ viewerRole: "viewer", queue })).toEqual([]);
  });
});

describe("ticket attention score contracts", () => {
  it("scores urgent tickets from waiting time, user reply, unresolved AI, gaps, and no staff reply", () => {
    expect(
      calculateTicketAttentionScore({
        status: "waiting_on_staff",
        createdAt: "2026-01-01T08:00:00.000Z",
        now: "2026-01-01T14:30:00.000Z",
        waitingOnStaffSince: "2026-01-01T10:00:00.000Z",
        unreadCustomerMessages: 2,
        unresolvedInteractions: 1,
        linkedOpenDocumentationGaps: 1,
        hasStaffReply: false
      })
    ).toEqual({
      score: 100,
      factors: [
        { name: "status_base", points: 40 },
        { name: "waiting_on_staff_time", points: 9 },
        { name: "user_reply", points: 20 },
        { name: "unresolved_interactions", points: 15 },
        { name: "open_documentation_gaps", points: 10 },
        { name: "no_staff_reply", points: 15 }
      ]
    });
  });

  it("represents waiting-on-customer tickets through status base without an extra penalty factor", () => {
    expect(
      calculateTicketAttentionScore({
        status: "waiting_on_customer",
        createdAt: "2026-01-01T08:00:00.000Z",
        now: "2026-01-01T20:00:00.000Z",
        waitingOnStaffSince: null,
        unreadCustomerMessages: 0,
        unresolvedInteractions: 2,
        linkedOpenDocumentationGaps: 1,
        hasStaffReply: true
      })
    ).toEqual({
      score: 45,
      factors: [
        { name: "status_base", points: 5 },
        { name: "user_reply", points: 0 },
        { name: "unresolved_interactions", points: 30 },
        { name: "open_documentation_gaps", points: 10 }
      ]
    });

    expect(
      calculateTicketAttentionScore({
        status: "waiting_on_customer",
        createdAt: "2026-01-01T08:00:00.000Z",
        now: "2026-01-01T20:00:00.000Z",
        waitingOnStaffSince: null,
        unreadCustomerMessages: 0,
        unresolvedInteractions: 0,
        linkedOpenDocumentationGaps: 0,
        hasStaffReply: true
      })
    ).toEqual({
      score: 5,
      factors: [
        { name: "status_base", points: 5 },
        { name: "user_reply", points: 0 },
        { name: "unresolved_interactions", points: 0 },
        { name: "open_documentation_gaps", points: 0 }
      ]
    });

    expect(
      calculateTicketAttentionScore({
        status: "waiting_on_customer",
        createdAt: "2026-01-01T08:00:00.000Z",
        now: "2026-01-01T20:00:00.000Z",
        waitingOnStaffSince: null,
        unreadCustomerMessages: 0,
        unresolvedInteractions: 0,
        linkedOpenDocumentationGaps: 0,
        hasStaffReply: true
      }).factors.map((factor) => factor.name)
    ).not.toContain("waiting_on_customer_penalty");
  });

  it("excludes closed tickets from active attention", () => {
    expect(
      calculateTicketAttentionScore({
        status: "closed",
        createdAt: "2026-01-01T08:00:00.000Z",
        now: "2026-01-01T20:00:00.000Z",
        waitingOnStaffSince: "2026-01-01T09:00:00.000Z",
        unreadCustomerMessages: 5,
        unresolvedInteractions: 5,
        linkedOpenDocumentationGaps: 5,
        hasStaffReply: false
      })
    ).toEqual({ score: 0, factors: [{ name: "closed", points: 0 }] });
  });
});

describe("email reply link contracts", () => {
  it("builds outbound-only customer reply link token metadata without inbound parsing", () => {
    expect(
      buildEmailReplyLinkTokenDraft({
        ticketId: "ticket_123",
        customerEmail: "Ada@Example.COM ",
        issuedAt: "2026-01-01T10:00:00.000Z",
        expiresAt: "2026-01-02T10:00:00.000Z",
        conversationId: "conv_123"
      })
    ).toEqual({
      purpose: "customer_ticket_reply",
      delivery: "outbound_email_reply_link",
      rawInboundEmailParsing: "deferred_v1",
      ticketId: "ticket_123",
      customerEmail: "ada@example.com",
      issuedAt: "2026-01-01T10:00:00.000Z",
      expiresAt: "2026-01-02T10:00:00.000Z",
      conversationId: "conv_123",
      allowedAction: "append_customer_message"
    });
  });
});
