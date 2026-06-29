export type OpenAiModelKind = "chat" | "embedding";
export type RuntimeEnvironment = "development" | "test" | "production";

export interface OpenAiModelOption {
  id:
    | "gpt-4.1-mini"
    | "gpt-4.1"
    | "gpt-3.5-turbo"
    | "text-embedding-3-small"
    | "text-embedding-3-large"
    | "text-embedding-ada-002";
  kind: OpenAiModelKind;
  recommended: boolean;
  status: "active" | "deprecated";
  contextWindow?: number;
  dimensions?: number;
  costTier: "low" | "standard";
}

export interface OpenAiConfigInput {
  apiKey: string;
  chatModelId: string;
  embeddingModelId: string;
}

export interface DefaultOpenAiModels {
  chatModelId: string;
  embeddingModelId: string;
}

export interface SmtpConfigInput {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
}

export interface ReadinessInput {
  openAiConfigured: boolean;
  smtpConfigured: boolean;
  hasIndexedDocuments: boolean;
  hasAllowedDomain: boolean;
  widgetSnippetCopied: boolean;
  widgetSmokeTestPassed: boolean;
}

export type ReadinessCheckName =
  | "openAi"
  | "smtp"
  | "documentsIndexed"
  | "allowedDomains"
  | "widgetConfigured"
  | "widgetSmokeTest";

export interface ReadinessChecklist {
  ready: boolean;
  checks: Record<ReadinessCheckName, boolean>;
  missing: ReadinessCheckName[];
}

export type ValidationResult = { ok: true } | { ok: false; issues: string[] };
export type DomainValidationResult =
  | { ok: true; domains: string[] }
  | { ok: false; issues: string[] };

export const ALLOWED_OPENAI_CHAT_MODELS = [
  {
    id: "gpt-4.1-mini",
    kind: "chat",
    recommended: true,
    status: "active",
    contextWindow: 1_000_000,
    costTier: "low"
  },
  {
    id: "gpt-4.1",
    kind: "chat",
    recommended: false,
    status: "active",
    contextWindow: 1_000_000,
    costTier: "standard"
  },
  {
    id: "gpt-3.5-turbo",
    kind: "chat",
    recommended: false,
    status: "deprecated",
    contextWindow: 16_385,
    costTier: "low"
  }
] as const satisfies readonly OpenAiModelOption[];

export const ALLOWED_OPENAI_EMBEDDING_MODELS = [
  {
    id: "text-embedding-3-small",
    kind: "embedding",
    recommended: true,
    status: "active",
    dimensions: 1536,
    costTier: "low"
  },
  {
    id: "text-embedding-3-large",
    kind: "embedding",
    recommended: false,
    status: "active",
    dimensions: 3072,
    costTier: "standard"
  },
  {
    id: "text-embedding-ada-002",
    kind: "embedding",
    recommended: false,
    status: "deprecated",
    dimensions: 1536,
    costTier: "standard"
  }
] as const satisfies readonly OpenAiModelOption[];

export const DEFAULT_OPENAI_MODELS = {
  chatModelId: "gpt-4.1-mini",
  embeddingModelId: "text-embedding-3-small"
} as const satisfies DefaultOpenAiModels;

export const DEFAULT_USAGE_LIMITS = {
  maxQuestionsPerConversation: 30,
  maxResponseTokens: 700,
  workspaceQuestionsPerHour: 600,
  widgetQuestionsPerHour: 120,
  conversationCostCents: 50
} as const;

function hasValue(value: string): boolean {
  return value.trim().length > 0;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function collectResult(issues: string[]): ValidationResult {
  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

function normalizeHostnameForLoopbackCheck(hostname: string): string {
  const normalized = normalizeAllowedHostname(hostname);
  return normalized.startsWith("[") && normalized.endsWith("]")
    ? normalized.slice(1, -1)
    : normalized;
}

function normalizeAllowedHostname(hostname: string): string {
  const normalized = hostname.toLowerCase();
  return normalized.startsWith("[") && normalized.endsWith("]")
    ? normalized
    : normalized.replace(/\.+$/, "");
}

function isIpv4LoopbackHost(hostname: string): boolean {
  const octets = hostname.split(".");

  if (octets.length !== 4 || octets[0] !== "127") {
    return false;
  }

  return octets.every((octet) => {
    if (!/^\d{1,3}$/.test(octet)) {
      return false;
    }

    const value = Number(octet);
    return value >= 0 && value <= 255;
  });
}

function isIpv4MappedIpv6LoopbackHost(hostname: string): boolean {
  const mappedPrefix = "::ffff:";

  if (!hostname.startsWith(mappedPrefix)) {
    return false;
  }

  const mappedAddress = hostname.slice(mappedPrefix.length);

  if (isIpv4LoopbackHost(mappedAddress)) {
    return true;
  }

  const parts = mappedAddress.split(":");

  if (parts.length !== 2 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) {
    return false;
  }

  const [highPart, lowPart] = parts as [string, string];
  const highBits = Number.parseInt(highPart, 16);
  const lowBits = Number.parseInt(lowPart, 16);

  return highBits >= 0x7f00 && highBits <= 0x7fff && lowBits >= 0 && lowBits <= 0xffff;
}

function isDevelopmentHost(hostname: string): boolean {
  const normalizedHostname = normalizeHostnameForLoopbackCheck(hostname);
  return (
    normalizedHostname === "localhost" ||
    normalizedHostname === "::1" ||
    isIpv4LoopbackHost(normalizedHostname) ||
    isIpv4MappedIpv6LoopbackHost(normalizedHostname)
  );
}

export function validateOpenAiConfig(input: OpenAiConfigInput): ValidationResult {
  const issues: string[] = [];
  const chatModel = ALLOWED_OPENAI_CHAT_MODELS.find((model) => model.id === input.chatModelId);
  const embeddingModel = ALLOWED_OPENAI_EMBEDDING_MODELS.find(
    (model) => model.id === input.embeddingModelId
  );

  if (!hasValue(input.apiKey)) {
    issues.push("OpenAI API key is required");
  }

  if (!chatModel) {
    issues.push("chat model must be selected from the curated allowlist");
  } else if (chatModel.status === "deprecated") {
    issues.push("chat model is deprecated");
  }

  if (!embeddingModel) {
    issues.push("embedding model must be selected from the curated allowlist");
  } else if (embeddingModel.status === "deprecated") {
    issues.push("embedding model is deprecated");
  }

  return collectResult(issues);
}

export function validateSmtpConfig(input: SmtpConfigInput): ValidationResult {
  const issues: string[] = [];

  if (!hasValue(input.host)) {
    issues.push("SMTP host is required");
  }

  if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) {
    issues.push("SMTP port must be between 1 and 65535");
  }

  if (!hasValue(input.username)) {
    issues.push("SMTP username is required");
  }

  if (!hasValue(input.password)) {
    issues.push("SMTP password is required");
  }

  if (!isValidEmail(input.fromEmail)) {
    issues.push("SMTP from email must be valid");
  }

  return collectResult(issues);
}

export function validateAllowedWidgetDomains(
  domains: readonly string[],
  environment: RuntimeEnvironment = "production"
): DomainValidationResult {
  const issues: string[] = [];
  const normalizedDomains: string[] = [];

  for (const domain of domains) {
    let url: URL;
    try {
      url = new URL(domain);
    } catch {
      issues.push("allowed domain must be a valid URL");
      continue;
    }

    const hostname = normalizeAllowedHostname(url.hostname);
    const isLocalhostOrLoopback = isDevelopmentHost(hostname);
    const isDevelopmentHttpOrigin =
      environment === "development" && url.protocol === "http:" && isLocalhostOrLoopback;

    if (url.protocol !== "https:" && !isDevelopmentHttpOrigin) {
      issues.push("allowed domain must use HTTPS outside development");
    }

    if (environment !== "development" && url.protocol === "https:" && isLocalhostOrLoopback) {
      issues.push("allowed domain must not target localhost or loopback outside development");
    }

    if (hostname.includes("*")) {
      issues.push("allowed domain must not contain wildcards");
      continue;
    }

    normalizedDomains.push(hostname);
  }

  return issues.length === 0
    ? { ok: true, domains: [...new Set(normalizedDomains)] }
    : { ok: false, issues };
}

export function isAllowedWidgetDomain(
  origin: string,
  allowedDomains: readonly string[],
  environment: RuntimeEnvironment
): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  const hostname = normalizeAllowedHostname(url.hostname);

  if (environment !== "development" && isDevelopmentHost(hostname)) {
    return false;
  }

  if (
    url.protocol !== "https:" &&
    !(environment === "development" && url.protocol === "http:" && isDevelopmentHost(hostname))
  ) {
    return false;
  }

  return allowedDomains.includes(hostname);
}

export function createReadinessChecklist(input: ReadinessInput): ReadinessChecklist {
  const checks: ReadinessChecklist["checks"] = {
    openAi: input.openAiConfigured,
    smtp: input.smtpConfigured,
    documentsIndexed: input.hasIndexedDocuments,
    allowedDomains: input.hasAllowedDomain,
    widgetConfigured: input.widgetSnippetCopied,
    widgetSmokeTest: input.widgetSmokeTestPassed
  };
  const missing = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name as ReadinessCheckName);

  return {
    ready: missing.length === 0,
    checks,
    missing
  };
}
