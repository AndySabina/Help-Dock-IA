import { describe, expect, it } from "vitest";
import { createWorkerStatus } from "./worker.js";

describe("worker placeholder", () => {
  it("boots as an idle worker shell", () => {
    expect(createWorkerStatus()).toEqual({ service: "worker", status: "ok", mode: "idle" });
  });
});
