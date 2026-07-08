import { describe, expect, it } from "vitest";
import { getEventBadges } from "./eventBadges";

const NOW = new Date("2026-07-08T12:00:00Z");

describe("شارات الفعاليات", () => {
  it("نفدت التذاكر عند امتلاء المقاعد", () => {
    expect(getEventBadges({ max_attendees: 100, current_attendees_count: 100 }, NOW)).toEqual(["soldOut"]);
    expect(getEventBadges({ max_attendees: 100, current_attendees_count: 150 }, NOW)).toEqual(["soldOut"]);
  });

  it("توشك على النفاد عند تبقي 10% أو أقل", () => {
    expect(getEventBadges({ max_attendees: 100, current_attendees_count: 90 }, NOW)).toEqual(["almostFull"]);
    expect(getEventBadges({ max_attendees: 100, current_attendees_count: 95 }, NOW)).toEqual(["almostFull"]);
  });

  it("الأكثر رواجاً عند امتلاء النصف مع 20 مسجلاً فأكثر", () => {
    expect(getEventBadges({ max_attendees: 100, current_attendees_count: 50 }, NOW)).toEqual(["trending"]);
    expect(getEventBadges({ max_attendees: 20, current_attendees_count: 10 }, NOW)).toEqual([]);
  });

  it("الأكثر رواجاً بدون حد مقاعد عند 100 مسجل", () => {
    expect(getEventBadges({ max_attendees: null, current_attendees_count: 150 }, NOW)).toEqual(["trending"]);
    expect(getEventBadges({ max_attendees: null, current_attendees_count: 50 }, NOW)).toEqual([]);
  });

  it("جديد خلال 7 أيام من الإنشاء", () => {
    expect(getEventBadges({ created_at: "2026-07-05T00:00:00Z" }, NOW)).toEqual(["new"]);
    expect(getEventBadges({ created_at: "2026-06-01T00:00:00Z" }, NOW)).toEqual([]);
  });

  it("شارتان كحد أقصى بالأولوية الصحيحة", () => {
    const result = getEventBadges(
      { max_attendees: 100, current_attendees_count: 100, created_at: "2026-07-07T00:00:00Z" },
      NOW,
    );
    expect(result).toEqual(["soldOut", "new"]);
  });

  it("بدون بيانات لا شارات", () => {
    expect(getEventBadges({}, NOW)).toEqual([]);
  });
});
