import { describe, expect, it } from "vitest";
import { computeEventHealth, computeEventReadiness, READINESS_THRESHOLD } from "./eventHealth";

const base = {
  description: "وصف كافٍ وطويل بما يكفي ليتجاوز حد الثلاثين حرفاً المطلوب",
  coverImage: "https://x/y.jpg",
  hasLocation: true,
  ticketsCount: 2,
  isPublished: true,
  capacity: 100,
  attendees: 80,
  totalRegs: 80,
  confirmed: 70,
  cancelled: 2,
  avgRating: 4.5,
};

describe("computeEventHealth", () => {
  it("gives a strong event an excellent green score", () => {
    const h = computeEventHealth(base);
    expect(h.score).toBeGreaterThanOrEqual(75);
    expect(h.level).toBe("excellent");
  });

  it("flags an empty draft event as poor", () => {
    const h = computeEventHealth({
      description: null,
      coverImage: null,
      hasLocation: false,
      ticketsCount: 0,
      isPublished: false,
      capacity: 100,
      attendees: 0,
      totalRegs: 0,
      confirmed: 0,
      cancelled: 0,
      avgRating: null,
    });
    expect(h.level).toBe("poor");
    expect(h.suggestions.length).toBeGreaterThan(0);
  });

  it("suggests increasing seats when nearly sold out", () => {
    const h = computeEventHealth({ ...base, attendees: 95, totalRegs: 95, confirmed: 90 });
    expect(h.suggestions).toContain("يمكن زيادة عدد المقاعد");
  });

  it("suggests reminders when sales are low", () => {
    const h = computeEventHealth({ ...base, attendees: 10, totalRegs: 10, confirmed: 8 });
    expect(h.suggestions.join(" ")).toContain("تذكير");
  });

  it("penalises heavy cancellations", () => {
    const low = computeEventHealth({ ...base, cancelled: 40 });
    expect(low.score).toBeLessThan(computeEventHealth(base).score);
  });

  it("works without ratings by reweighting", () => {
    const h = computeEventHealth({ ...base, avgRating: null });
    expect(h.score).toBeGreaterThanOrEqual(0);
    expect(h.score).toBeLessThanOrEqual(100);
  });

  it("caps suggestions at two", () => {
    const h = computeEventHealth({
      description: null,
      coverImage: null,
      hasLocation: false,
      ticketsCount: 0,
      isPublished: false,
      capacity: 100,
      attendees: 2,
      totalRegs: 10,
      confirmed: 1,
      cancelled: 5,
      avgRating: null,
    });
    expect(h.suggestions.length).toBeLessThanOrEqual(2);
  });
});

describe("computeEventReadiness", () => {
  const complete = {
    title: "مؤتمر التقنية",
    description: "وصف كافٍ وطويل بما يكفي ليتجاوز حد الثلاثين حرفاً المطلوب",
    coverImage: "https://x/y.jpg",
    hasLocation: true,
    startDate: "2026-09-01T10:00:00Z",
    ticketsCount: 2,
  };

  it("marks a fully complete event as ready (100%)", () => {
    const r = computeEventReadiness(complete);
    expect(r.score).toBe(100);
    expect(r.ready).toBe(true);
    expect(r.missing).toHaveLength(0);
  });

  it("blocks submission below the threshold and lists what is missing", () => {
    const r = computeEventReadiness({
      ...complete,
      coverImage: null,
      ticketsCount: 0,
      description: "قصير",
    });
    expect(r.ready).toBe(false);
    expect(r.score).toBeLessThan(READINESS_THRESHOLD);
    const labels = r.missing.map(m => m.missingLabel).join(" ");
    expect(labels).toContain("صورة الغلاف");
    expect(labels).toContain("التذاكر");
    expect(labels).toContain("الوصف");
  });

  it("one missing item still passes the 80% threshold", () => {
    const r = computeEventReadiness({ ...complete, coverImage: null });
    expect(r.score).toBe(83);
    expect(r.ready).toBe(true);
    expect(r.missing[0].missingLabel).toBe("صورة الغلاف غير مضافة");
  });

  it("treats online events as having a location", () => {
    const r = computeEventReadiness({ ...complete, hasLocation: true });
    expect(r.missing.find(m => m.key === "location")).toBeUndefined();
  });

  it("flags missing date", () => {
    const r = computeEventReadiness({ ...complete, startDate: null });
    expect(r.missing.map(m => m.key)).toContain("date");
  });
});
