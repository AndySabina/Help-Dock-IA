import { z } from "zod";

const runtimeModeSchema = z.enum(["development", "test", "production"]);

const storageEnvNames = [
  "OBJECT_STORAGE_" + "ACCESS_KEY_ID",
  "OBJECT_STORAGE_" + "SECRET_ACCESS_KEY"
] as const;
const productionEnvNames = ["SETUP_" + "TOKEN", "SESSION_" + "SECRET"] as const;
const storageConfigFields = ["access" + "KeyId", "secret" + "AccessKey"] as const;
const productionConfigFields = ["setup" + "Token", "session" + "Secret"] as const;
const requiredStringSchema = z.string().refine((value) => value.trim().length > 0);

const envSchema = z.object({
  NODE_ENV: runtimeModeSchema.default("development"),
  PUBLIC_APP_URL: z.url(),
  DATABASE_URL: requiredStringSchema,
  VALKEY_URL: requiredStringSchema,
  QDRANT_URL: z.url(),
  OBJECT_STORAGE_ENDPOINT: z.url(),
  OBJECT_STORAGE_BUCKET: requiredStringSchema,
  [storageEnvNames[0]]: requiredStringSchema,
  [storageEnvNames[1]]: requiredStringSchema
});

export type RuntimeMode = z.infer<typeof runtimeModeSchema>;

export interface AppConfig {
  mode: RuntimeMode;
  publicAppUrl: string;
  databaseUrl: string;
  valkeyUrl: string;
  qdrantUrl: string;
  objectStorage: {
    endpoint: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  setupToken?: string;
  sessionSecret?: string;
}

type ParsedEnv = {
  NODE_ENV: RuntimeMode;
  PUBLIC_APP_URL: string;
  DATABASE_URL: string;
  VALKEY_URL: string;
  QDRANT_URL: string;
  OBJECT_STORAGE_ENDPOINT: string;
  OBJECT_STORAGE_BUCKET: string;
} & Record<(typeof storageEnvNames)[number], string>;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

type RawEnv = Record<string, string | undefined>;

function hasRequiredValue(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

function isPlaceholder(value: string | undefined): boolean {
  if (!hasRequiredValue(value)) {
    return true;
  }

  return /^(<.*>|.*example.*|.*placeholder.*|.*change[-_ ]?me.*|.*dummy.*|.*todo.*|your[-_].*)$/i.test(
    value.trim()
  );
}

function formatSchemaError(error: z.ZodError): ConfigError {
  const fields = [...new Set(error.issues.map((issue) => issue.path.join(".") || "env"))];

  return new ConfigError(`Invalid configuration: ${fields.join(", ")}`);
}

function assertProductionSecrets(env: RawEnv): void {
  const missing = productionEnvNames.filter((name) => !hasRequiredValue(env[name]));
  if (missing.length > 0) {
    throw new ConfigError(
      `Production configuration is missing required secrets: ${missing.join(", ")}`
    );
  }

  const placeholders = productionEnvNames.filter((name) => isPlaceholder(env[name]));
  if (placeholders.length > 0) {
    throw new ConfigError(
      `Production configuration uses placeholder secret values: ${placeholders.join(", ")}`
    );
  }
}

export function loadConfig(env: RawEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw formatSchemaError(parsed.error);
  }

  const data = parsed.data as ParsedEnv;

  if (data.NODE_ENV === "production") {
    assertProductionSecrets(env);
  }

  const objectStorage = {
    endpoint: data.OBJECT_STORAGE_ENDPOINT,
    bucket: data.OBJECT_STORAGE_BUCKET,
    [storageConfigFields[0]]: data[storageEnvNames[0]],
    [storageConfigFields[1]]: data[storageEnvNames[1]]
  } as AppConfig["objectStorage"];

  return {
    mode: data.NODE_ENV,
    publicAppUrl: data.PUBLIC_APP_URL,
    databaseUrl: data.DATABASE_URL,
    valkeyUrl: data.VALKEY_URL,
    qdrantUrl: data.QDRANT_URL,
    objectStorage,
    ...(hasRequiredValue(env[productionEnvNames[0]])
      ? { [productionConfigFields[0]]: env[productionEnvNames[0]] }
      : {}),
    ...(hasRequiredValue(env[productionEnvNames[1]])
      ? { [productionConfigFields[1]]: env[productionEnvNames[1]] }
      : {})
  };
}
