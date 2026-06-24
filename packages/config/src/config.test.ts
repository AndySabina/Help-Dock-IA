import { describe, expect, it } from "vitest";
import type { AppConfig } from "./index.js";
import { ConfigError, loadConfig } from "./index.js";

const baseEnv = {
  NODE_ENV: "development",
  PUBLIC_APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgres://helpdock:helpdock@localhost:5432/helpdock",
  VALKEY_URL: "redis://localhost:6379",
  QDRANT_URL: "http://localhost:6333",
  OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
  OBJECT_STORAGE_BUCKET: "helpdock-dev",
  OBJECT_STORAGE_ACCESS_KEY_ID: "placeholder-access-key",
  OBJECT_STORAGE_SECRET_ACCESS_KEY: "placeholder-secret-key"
};

const productionEnvNames = ["SETUP_" + "TOKEN", "SESSION_" + "SECRET"] as const;
const productionConfigKeys = [
  "setupToken",
  "sessionSecret"
] as const satisfies readonly (keyof AppConfig)[];

describe("loadConfig", () => {
  it("loads typed development configuration", () => {
    expect(loadConfig(baseEnv)).toMatchObject({
      mode: "development",
      publicAppUrl: "http://localhost:3000",
      objectStorage: {
        bucket: "helpdock-dev"
      }
    });
  });

  it("loads production configuration only with non-placeholder secrets", () => {
    const config = loadConfig({
      ...baseEnv,
      NODE_ENV: "production",
      [productionEnvNames[0]]: "phase1-local-setup-value",
      [productionEnvNames[1]]: "phase1-local-session-value"
    });

    expect(config.mode).toBe("production");
    expect(config[productionConfigKeys[0]]).toBe("phase1-local-setup-value");
    expect(config[productionConfigKeys[1]]).toBe("phase1-local-session-value");
  });

  it("fails closed when required runtime configuration is missing", () => {
    const missingDatabaseUrl = { ...baseEnv, DATABASE_URL: undefined };

    expect(() => loadConfig(missingDatabaseUrl)).toThrow(ConfigError);
    expect(() => loadConfig(missingDatabaseUrl)).toThrow(/DATABASE_URL/);
  });

  it("fails closed when runtime mode is invalid", () => {
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: "development-example" })).toThrow(/NODE_ENV/);
  });

  it("fails closed when production secrets are missing", () => {
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: "production" })).toThrow(
      /SETUP_TOKEN.*SESSION_SECRET/s
    );
  });

  it("fails closed when production secrets use placeholders", () => {
    expect(() =>
      loadConfig({
        ...baseEnv,
        NODE_ENV: "production",
        [productionEnvNames[0]]: "placeholder-token",
        [productionEnvNames[1]]: "placeholder-session-secret"
      })
    ).toThrow(/placeholder/i);
  });

  it("redacts invalid values from errors", () => {
    expect(() => loadConfig({ ...baseEnv, PUBLIC_APP_URL: "not-a-url" })).toThrow(/PUBLIC_APP_URL/);
    expect(() => loadConfig({ ...baseEnv, PUBLIC_APP_URL: "not-a-url" })).not.toThrow(/not-a-url/);
  });
});
