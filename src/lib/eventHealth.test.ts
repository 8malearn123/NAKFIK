import { describe, expect, it } from "vitest";
import { computeEventHealth } from "./eventHealth";

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
