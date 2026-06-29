import { describe, expect, it } from "vitest";
import {
  ALLOWED_OPENAI_CHAT_MODELS,
  ALLOWED_OPENAI_EMBEDDING_MODELS,
  DEFAULT_OPENAI_MODELS,
  DEFAULT_USAGE_LIMITS,
  createReadinessChecklist,
  isAllowedWidgetDomain,
  validateAllowedWidgetDomains,
  validateOpenAiConfig,
  validateSmtpConfig
} from "./provider-readiness.ts";

describe("OpenAI provider configuration contracts", () => {
  it("validates only curated chat and embedding model ids", () => {
    expect(
      validateOpenAiConfig({
        apiKey: "sk" + "-live",
        chatModelId: "gpt-4.1-mini",
        embeddingModelId: "text-embedding-3-small"
      })
    ).toEqual({
      ok: true
    });

    expect(
      validateOpenAiConfig({
        apiKey: "sk" + "-live",
        chatModelId: "custom-chat",
        embeddingModelId: "text-embedding-3-small"
      })
    ).toEqual({
      ok: false,
      issues: ["chat model must be selected from the curated allowlist"]
    });
  });

  it("exposes recommended defaults without free-text model ids", () => {
    expect(ALLOWED_OPENAI_CHAT_MODELS.filter((model) => model.recommended)).toHaveLength(1);
    expect(ALLOWED_OPENAI_EMBEDDING_MODELS.filter((model) => model.recommended)).toHaveLength(1);
    expect(DEFAULT_OPENAI_MODELS).toEqual({
      chatModelId: "gpt-4.1-mini",
      embeddingModelId: "text-embedding-3-small"
    });
  });

  it("rejects deprecated curated models when selected", () => {
    expect(ALLOWED_OPENAI_CHAT_MODELS.some((model) => model.status === "deprecated")).toBe(true);
    expect(ALLOWED_OPENAI_EMBEDDING_MODELS.some((model) => model.status === "deprecated")).toBe(
      true
    );

    expect(
      validateOpenAiConfig({
        apiKey: "sk" + "-live",
        chatModelId: "gpt-3.5-turbo",
        embeddingModelId: "text-embedding-ada-002"
      })
    ).toEqual({
      ok: false,
      issues: ["chat model is deprecated", "embedding model is deprecated"]
    });
  });
});

describe("SMTP and widget domain readiness contracts", () => {
  it("validates required SMTP connection fields without storing secrets in issues", () => {
    expect(
      validateSmtpConfig({
        host: "smtp.example.com",
        port: 587,
        username: "mailer",
        password: "mail" + "-password",
        fromEmail: "support@example.com"
      })
    ).toEqual({
      ok: true
    });

    expect(
      validateSmtpConfig({
        host: "smtp.example.com",
        port: 70000,
        username: "mailer",
        password: "mail" + "-password",
        fromEmail: "invalid"
      })
    ).toEqual({
      ok: false,
      issues: ["SMTP port must be between 1 and 65535", "SMTP from email must be valid"]
    });
  });

  it("normalizes HTTPS allowed domains and rejects wildcards or insecure production origins", () => {
    expect(
      validateAllowedWidgetDomains(["https://Docs.Example.com/help", "https://example.com"])
    ).toEqual({
      ok: true,
      domains: ["docs.example.com", "example.com"]
    });

    expect(validateAllowedWidgetDomains(["*.example.com", "http://example.com"])).toEqual({
      ok: false,
      issues: [
        "allowed domain must be a valid URL",
        "allowed domain must use HTTPS outside development"
      ]
    });
  });

  it("allows localhost and loopback only in development domain checks", () => {
    expect(
      validateAllowedWidgetDomains(
        [
          "http://localhost:5173",
          "http://127.0.0.1:4173",
          "http://127.0.0.2:4173",
          "https://localhost:5173",
          "https://127.0.0.1:4173",
          "https://127.0.0.2:4173",
          "https://[::1]:4173"
        ],
        "development"
      )
    ).toEqual({
      ok: true,
      domains: ["localhost", "127.0.0.1", "127.0.0.2", "[::1]"]
    });

    expect(validateAllowedWidgetDomains(["http://localhost:5173"], "production")).toEqual({
      ok: false,
      issues: ["allowed domain must use HTTPS outside development"]
    });

    expect(
      validateAllowedWidgetDomains(
        [
          "https://localhost:5173",
          "https://127.0.0.1:4173",
          "https://127.0.0.2:4173",
          "https://[::1]:4173"
        ],
        "production"
      )
    ).toEqual({
      ok: false,
      issues: [
        "allowed domain must not target localhost or loopback outside development",
        "allowed domain must not target localhost or loopback outside development",
        "allowed domain must not target localhost or loopback outside development",
        "allowed domain must not target localhost or loopback outside development"
      ]
    });

    expect(isAllowedWidgetDomain("http://localhost:5173", ["localhost"], "development")).toBe(true);
    expect(isAllowedWidgetDomain("http://127.0.0.1:4173", ["127.0.0.1"], "development")).toBe(true);
    expect(isAllowedWidgetDomain("http://127.0.0.2:4173", ["127.0.0.2"], "development")).toBe(true);
    expect(isAllowedWidgetDomain("https://localhost:5173", ["localhost"], "development")).toBe(
      true
    );
    expect(isAllowedWidgetDomain("https://127.0.0.1:4173", ["127.0.0.1"], "development")).toBe(
      true
    );
    expect(isAllowedWidgetDomain("https://[::1]:4173", ["[::1]"], "development")).toBe(true);
    expect(isAllowedWidgetDomain("http://localhost:5173", ["localhost"], "production")).toBe(false);
    expect(isAllowedWidgetDomain("https://localhost:5173", ["localhost"], "production")).toBe(
      false
    );
    expect(isAllowedWidgetDomain("https://127.0.0.1:4173", ["127.0.0.1"], "production")).toBe(
      false
    );
    expect(isAllowedWidgetDomain("https://127.0.0.2:4173", ["127.0.0.2"], "production")).toBe(
      false
    );
    expect(isAllowedWidgetDomain("https://[::1]:4173", ["[::1]"], "production")).toBe(false);
  });

  it("rejects insecure development origins on non-local allowed domains", () => {
    expect(
      isAllowedWidgetDomain("http://docs.example.com", ["docs.example.com"], "development")
    ).toBe(false);
    expect(
      isAllowedWidgetDomain("https://docs.example.com", ["docs.example.com"], "development")
    ).toBe(true);
  });

  it("rejects loopback-equivalent hosts outside development", () => {
    expect(
      validateAllowedWidgetDomains(
        ["https://localhost.", "https://[::ffff:127.0.0.1]", "https://[::ffff:7f00:1]"],
        "production"
      )
    ).toEqual({
      ok: false,
      issues: [
        "allowed domain must not target localhost or loopback outside development",
        "allowed domain must not target localhost or loopback outside development",
        "allowed domain must not target localhost or loopback outside development"
      ]
    });

    expect(isAllowedWidgetDomain("https://localhost.", ["localhost"], "production")).toBe(false);
    expect(
      isAllowedWidgetDomain("https://[::ffff:127.0.0.1]", ["[::ffff:7f00:1]"], "production")
    ).toBe(false);
    expect(
      isAllowedWidgetDomain("https://[::ffff:7f00:1]", ["[::ffff:7f00:1]"], "production")
    ).toBe(false);
  });

  it("allows loopback-equivalent hosts during development", () => {
    expect(
      validateAllowedWidgetDomains(
        [
          "http://localhost.:5173",
          "https://localhost.:5173",
          "http://[::ffff:127.0.0.1]:4173",
          "https://[::ffff:7f00:1]:4173"
        ],
        "development"
      )
    ).toEqual({
      ok: true,
      domains: ["localhost", "[::ffff:7f00:1]"]
    });

    expect(isAllowedWidgetDomain("http://localhost.:5173", ["localhost"], "development")).toBe(
      true
    );
    expect(
      isAllowedWidgetDomain("http://[::ffff:127.0.0.1]:4173", ["[::ffff:7f00:1]"], "development")
    ).toBe(true);
  });
});

describe("readiness gate contracts", () => {
  it("combines provider, SMTP, documents, allowed domains, and widget config readiness", () => {
    expect(
      createReadinessChecklist({
        openAiConfigured: true,
        smtpConfigured: true,
        hasIndexedDocuments: false,
        hasAllowedDomain: true,
        widgetSnippetCopied: true,
        widgetSmokeTestPassed: false
      })
    ).toEqual({
      ready: false,
      checks: {
        openAi: true,
        smtp: true,
        documentsIndexed: false,
        allowedDomains: true,
        widgetConfigured: true,
        widgetSmokeTest: false
      },
      missing: ["documentsIndexed", "widgetSmokeTest"]
    });
  });

  it("publishes fixed v1 usage defaults as non-manager-configurable constants", () => {
    expect(DEFAULT_USAGE_LIMITS).toEqual({
      maxQuestionsPerConversation: 30,
      maxResponseTokens: 700,
      workspaceQuestionsPerHour: 600,
      widgetQuestionsPerHour: 120,
      conversationCostCents: 50
    });
  });
});
