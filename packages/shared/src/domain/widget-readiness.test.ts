import { describe, expect, it } from "vitest";
import {
  WIDGET_CONVERSATION_TTL_MS,
  WIDGET_DESIGN_METADATA,
  authorizeWidgetSessionRequest,
  createConversationSessionSnapshot,
  createWidgetReadinessState,
  evaluateConversationSessionTtl,
  generateWidgetEmbedSnippet,
  validateWidgetInstallation
} from "./widget-readiness.ts";

describe("widget embed and readiness contracts", () => {
  it("generates the one-line fixed widget embed snippet with only src and widget id", () => {
    expect(
      generateWidgetEmbedSnippet({
        scriptSrc: "https://support.example.com/widget.js",
        widgetId: "widget_123"
      })
    ).toBe(
      '<script src="https://support.example.com/widget.js" data-helpdock-widget-id="widget_123"></script>'
    );

    expect(validateWidgetInstallation(["widget_123"])).toEqual({
      ok: true,
      widgetId: "widget_123"
    });
    expect(validateWidgetInstallation(["widget_123", "widget_456"])).toEqual({
      ok: false,
      issues: ["installation must have exactly one widget"]
    });
    expect(validateWidgetInstallation([""])).toEqual({
      ok: false,
      issues: ["widget id is required"]
    });
    expect(validateWidgetInstallation(["  "])).toEqual({
      ok: false,
      issues: ["widget id is required"]
    });

    expect(
      generateWidgetEmbedSnippet({
        scriptSrc: "https://support.example.com/widget.js?channel=docs&mode=compact",
        widgetId: 'widget_"123'
      })
    ).toBe(
      '<script src="https://support.example.com/widget.js?channel=docs&amp;mode=compact" data-helpdock-widget-id="widget_&quot;123"></script>'
    );
  });

  it("combines provider, SMTP/ticket, documents, domains, and widget config readiness", () => {
    expect(
      createWidgetReadinessState({
        providerReady: true,
        smtpReady: true,
        ticketEscalationReady: false,
        documentsIndexed: true,
        allowedDomainConfigured: true,
        widgetSnippetConfigured: true,
        widgetSmokeTestPassed: true
      })
    ).toEqual({
      ready: false,
      checks: {
        provider: true,
        smtp: true,
        ticketEscalation: false,
        documentsIndexed: true,
        allowedDomains: true,
        widgetConfigured: true,
        widgetSmokeTest: true
      },
      missing: ["ticketEscalation"]
    });
  });

  it("authorizes public session requests only for ready widgets on allowed domains", () => {
    const readiness = createWidgetReadinessState({
      providerReady: true,
      smtpReady: true,
      ticketEscalationReady: true,
      documentsIndexed: true,
      allowedDomainConfigured: true,
      widgetSnippetConfigured: true,
      widgetSmokeTestPassed: true
    });

    expect(
      authorizeWidgetSessionRequest({
        origin: "https://docs.example.com",
        allowedDomains: ["docs.example.com"],
        environment: "production",
        requestedWidgetId: "widget_123",
        installationWidgetId: "widget_123",
        readiness
      })
    ).toEqual({ authorized: true });

    expect(
      authorizeWidgetSessionRequest({
        origin: "https://evil.example.com",
        allowedDomains: ["docs.example.com"],
        environment: "production",
        requestedWidgetId: "widget_123",
        installationWidgetId: "widget_123",
        readiness
      })
    ).toEqual({ authorized: false, reason: "origin_not_allowed" });

    expect(
      authorizeWidgetSessionRequest({
        origin: "http://docs.example.com",
        allowedDomains: ["docs.example.com"],
        environment: "development",
        requestedWidgetId: "widget_123",
        installationWidgetId: "widget_123",
        readiness
      })
    ).toEqual({ authorized: false, reason: "origin_not_allowed" });
  });
});

describe("conversation TTL and fixed widget metadata contracts", () => {
  it("expires reload-restored conversations eight hours from conversation start", () => {
    const startedAt = "2026-01-01T00:00:00.000Z";
    const snapshot = createConversationSessionSnapshot({
      conversationId: "conv_123",
      widgetId: "widget_123",
      startedAt,
      ticketLinked: false
    });

    expect(snapshot).toEqual({
      conversationId: "conv_123",
      widgetId: "widget_123",
      startedAt,
      expiresAt: "2026-01-01T08:00:00.000Z",
      storageKey: "helpdock:widget_123:conversation",
      ticketLinked: false,
      retention: "expire_after_ttl"
    });
    expect(WIDGET_CONVERSATION_TTL_MS).toBe(8 * 60 * 60 * 1000);
    expect(evaluateConversationSessionTtl(snapshot, "2026-01-01T07:59:59.999Z")).toEqual({
      active: true,
      expiresAt: "2026-01-01T08:00:00.000Z",
      retention: "expire_after_ttl"
    });
    expect(evaluateConversationSessionTtl(snapshot, "2026-01-01T08:00:00.000Z")).toEqual({
      active: false,
      reason: "ttl_expired",
      expiresAt: "2026-01-01T08:00:00.000Z",
      retention: "expire_after_ttl"
    });
  });

  it("signals ticket-linked conversation retention without implementing ticket storage", () => {
    const snapshot = createConversationSessionSnapshot({
      conversationId: "conv_123",
      widgetId: "widget_123",
      startedAt: "2026-01-01T00:00:00.000Z",
      ticketLinked: true
    });

    expect(snapshot.retention).toBe("retain_for_ticket_timeline");
    expect(WIDGET_DESIGN_METADATA).toEqual({
      language: "en",
      copyMode: "fixed_english",
      themeCustomization: "not_supported_v1"
    });
  });
});
