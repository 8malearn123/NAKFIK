import { beforeEach, describe, expect, it } from "vitest";
import { getWaitlistEventIds, isOnWaitlist, toggleWaitlist } from "./waitlist";

describe("قائمة الانتظار (واجهة أمامية)", () => {
  beforeEach(() => localStorage.clear());

  it("تبدأ فارغة", () => {
    expect(getWaitlistEventIds("u1")).toEqual([]);
    expect(isOnWaitlist("e1", "u1")).toBe(false);
  });

  it("الانضمام ثم المغادرة بالتبديل", () => {
    expect(toggleWaitlist("e1", "u1")).toBe(true);
    expect(isOnWaitlist("e1", "u1")).toBe(true);
    expect(toggleWaitlist("e1", "u1")).toBe(false);
    expect(isOnWaitlist("e1", "u1")).toBe(false);
  });

  it("مفصولة لكل مستخدم وتدعم الزائر", () => {
    toggleWaitlist("e1", "u1");
    expect(isOnWaitlist("e1", "u2")).toBe(false);
    toggleWaitlist("e2");
    expect(isOnWaitlist("e2")).toBe(true);
  });

  it("تتحمل بيانات تالفة في التخزين", () => {
    localStorage.setItem("nakfik:waitlist:u1", "{broken");
    expect(getWaitlistEventIds("u1")).toEqual([]);
  });
});
