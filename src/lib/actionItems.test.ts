import { describe, expect, it } from "vitest";
import { deriveActionItems } from "./actionItems";

const NOW = new Date("2026-07-08T12:00:00");

const base = { id: "e1", title_ar: "فعالية", start_date: "2026-09-01T12:00:00" };

describe("الإجراءات المطلوبة", () => {
  it("فعالية بانتظار المراجعة", () => {
    const items = deriveActionItems([{ ...base, status: "pending_review" }], NOW);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("pendingReview");
  });

  it("مسودة لم تُنشر", () => {
    expect(deriveActionItems([{ ...base, status: "draft" }], NOW)[0].type).toBe("draft");
  });

  it("فعالية منشورة اقترب موعدها", () => {
    const items = deriveActionItems(
      [{ ...base, status: "published", start_date: "2026-07-10T12:00:00" }],
      NOW,
    );
    expect(items[0].type).toBe("startingSoon");
    expect(items[0].detail).toBe("خلال 2 أيام");
  });

  it("امتلاء عالٍ للمقاعد", () => {
    const items = deriveActionItems(
      [{ ...base, status: "published", max_attendees: 100, current_attendees_count: 85 }],
      NOW,
    );
    expect(items[0].type).toBe("almostFull");
    expect(items[0].detail).toBe("85%");
  });

  it("نفدت التذاكر", () => {
    const items = deriveActionItems(
      [{ ...base, status: "published", max_attendees: 100, current_attendees_count: 100 }],
      NOW,
    );
    expect(items[0].type).toBe("soldOut");
  });

  it("الفعالية المنتهية أو البعيدة بلا إجراءات", () => {
    expect(
      deriveActionItems(
        [
          { ...base, status: "published", start_date: "2026-07-01T12:00:00" }, // ماضية
          { ...base, id: "e2", status: "published", start_date: "2026-12-01T12:00:00" }, // بعيدة
        ],
        NOW,
      ),
    ).toHaveLength(0);
  });

  it("الترتيب حسب الأولوية", () => {
    const items = deriveActionItems(
      [
        { ...base, id: "a", status: "published", start_date: "2026-07-09T12:00:00" },
        { ...base, id: "b", status: "draft" },
        { ...base, id: "c", status: "pending_review" },
      ],
      NOW,
    );
    expect(items.map((i) => i.type)).toEqual(["pendingReview", "draft", "startingSoon"]);
  });
});
