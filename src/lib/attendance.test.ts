import { describe, expect, it } from "vitest";
import { computeStay, formatDuration } from "./attendance";

describe("attendance", () => {
  it("computes stay between entry and exit", () => {
    expect(computeStay("2026-08-02T10:00:00Z", "2026-08-02T13:25:00Z")).toBe(12300000);
  });
  it("returns null for missing or inverted times", () => {
    expect(computeStay(null, "2026-08-02T13:00:00Z")).toBeNull();
    expect(computeStay("2026-08-02T14:00:00Z", "2026-08-02T13:00:00Z")).toBeNull();
  });
  it("formats durations in Arabic", () => {
    expect(formatDuration(30000)).toBe("أقل من دقيقة");
    expect(formatDuration(45 * 60000)).toBe("45 د");
    expect(formatDuration(3 * 3600000)).toBe("3 س");
    expect(formatDuration(3 * 3600000 + 25 * 60000)).toBe("3 س 25 د");
  });
});
