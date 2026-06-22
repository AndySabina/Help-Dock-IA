import { describe, expect, it } from "vitest";
import { createAdminShell } from "./shell.ts";

describe("admin shell", () => {
  it("renders the placeholder title", () => {
    expect(createAdminShell()).toContain("HelpDock Admin");
  });
});
