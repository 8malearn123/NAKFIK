import { beforeEach, describe, expect, it } from "vitest";
import { getRatingSummary, getUserRating, saveRating } from "./ratings";

describe("تقييمات الفعاليات (واجهة أمامية)", () => {
  beforeEach(() => localStorage.clear());

  it("يحفظ تقييماً جديداً ويقرأه", () => {
    saveRating("e1", "u1", 4, "رائعة");
    expect(getUserRating("e1", "u1")).toMatchObject({ stars: 4, comment: "رائعة" });
  });

  it("تقييم واحد لكل مستخدم — الحفظ الثاني يعدّل الأول", () => {
    saveRating("e1", "u1", 5, "ممتازة");
    saveRating("e1", "u1", 3, "تعديل رأيي");
    expect(getRatingSummary("e1").count).toBe(1);
    expect(getUserRating("e1", "u1")).toMatchObject({ stars: 3, comment: "تعديل رأيي" });
  });

  it("يحسب المتوسط والعدد لعدة مقيمين", () => {
    saveRating("e1", "u1", 5, "");
    saveRating("e1", "u2", 4, "");
    saveRating("e1", "u3", 3, "");
    expect(getRatingSummary("e1")).toEqual({ average: 4, count: 3 });
  });

  it("يقيّد النجوم بين 1 و5", () => {
    saveRating("e1", "u1", 9, "");
    expect(getUserRating("e1", "u1")?.stars).toBe(5);
    saveRating("e1", "u1", 0, "");
    expect(getUserRating("e1", "u1")?.stars).toBe(1);
  });

  it("بدون تقييمات: متوسط صفر وعدد صفر", () => {
    expect(getRatingSummary("empty")).toEqual({ average: 0, count: 0 });
  });
});
