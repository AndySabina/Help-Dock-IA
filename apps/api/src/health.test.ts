import { describe, expect, it } from "vitest";
import { createHealthPayload } from "./health.ts";

describe("api health payload", () => {
  it("returns an ok shell status", () => {
    expect(createHealthPayload()).toEqual({ service: "api", status: "ok" });
  });
});
