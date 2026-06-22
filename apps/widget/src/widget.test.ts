import { describe, expect, it } from "vitest";
import { createWidgetPlaceholder } from "./widget.ts";

describe("widget placeholder", () => {
  it("identifies the public widget shell", () => {
    expect(createWidgetPlaceholder()).toMatchObject({ service: "widget", status: "ok" });
  });
});
