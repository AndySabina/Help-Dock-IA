import { describe, expect, it } from "vitest";
import { loadConfig } from "./index.js";

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
        SETUP_TOKEN: "placeholder-token",
        SESSION_SECRET: "placeholder-session-secret"
      })
    ).toThrow(/placeholder/i);
  });

  it("redacts invalid values from errors", () => {
    expect(() => loadConfig({ ...baseEnv, PUBLIC_APP_URL: "not-a-url" })).toThrow(/PUBLIC_APP_URL/);
    expect(() => loadConfig({ ...baseEnv, PUBLIC_APP_URL: "not-a-url" })).not.toThrow(/not-a-url/);
  });
});
