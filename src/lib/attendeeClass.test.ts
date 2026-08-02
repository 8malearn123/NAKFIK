import { describe, expect, it } from "vitest";
import { classifyAttendee } from "./attendeeClass";

describe("classifyAttendee", () => {
  it("detects VVIP before VIP", () => {
    expect(classifyAttendee("تذكرة VVIP", null, "vip")).toBe("vvip");
  });
  it("detects VIP by type or name", () => {
    expect(classifyAttendee("تذكرة", null, "vip")).toBe("vip");
    expect(classifyAttendee(null, "VIP Pass", "paid")).toBe("vip");
  });
  it("detects speaker and organizer in Arabic and English", () => {
    expect(classifyAttendee("تذكرة متحدث", null, "free")).toBe("speaker");
    expect(classifyAttendee(null, "Speaker", "paid")).toBe("speaker");
    expect(classifyAttendee("فريق المنظمين", null, "free")).toBe("organizer");
  });
  it("falls back to regular", () => {
    expect(classifyAttendee("تذكرة عادية", null, "paid")).toBe("regular");
    expect(classifyAttendee(null, null, null)).toBe("regular");
  });
});
