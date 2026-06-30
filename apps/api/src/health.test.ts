import { describe, expect, it } from "vitest";
import { createHealthPayload } from "./health.ts";

const runtime = {
  config: {
    mode: "test",
    publicAppUrl: "http://localhost:3000",
    databaseUrl: "postgres://user:pass@localhost:5432/helpdock",
    valkeyUrl: "redis://localhost:6379",
    qdrantUrl: "http://localhost:6333",
    objectStorage: {
      endpoint: "http://localhost:9000",
      bucket: "helpdock",
      accessKeyId: "example-access-key-id",
      secretAccessKey: "example-secret-access-key"
    }
  }
} as const;

describe("api health payload", () => {
  it("reports config-backed runtime readiness without connecting dependencies", () => {
    expect(createHealthPayload(runtime)).toEqual({
      service: "api",
      status: "ok",
      runtime: {
        mode: "test",
        config: "loaded"
      },
      checks: {
        database: "configured",
        valkey: "configured",
        qdrant: "configured",
        objectStorage: "configured"
      }
    });
  });
});
