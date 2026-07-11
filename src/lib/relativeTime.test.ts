import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relativeTime";

const NOW = new Date("2026-07-08T15:00:00");

const minsAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

describe("تنسيق الوقت النسبي", () => {
  it("لحظات ودقائق", () => {
    expect(formatRelativeTime(minsAgo(0), NOW)).toBe("منذ لحظات");
    expect(formatRelativeTime(minsAgo(1), NOW)).toBe("منذ دقيقة");
    expect(formatRelativeTime(minsAgo(2), NOW)).toBe("منذ دقيقتين");
    expect(formatRelativeTime(minsAgo(5), NOW)).toBe("منذ 5 دقائق");
    expect(formatRelativeTime(minsAgo(45), NOW)).toBe("منذ 45 دقيقة");
  });

  it("ساعات اليوم نفسه", () => {
    expect(formatRelativeTime(minsAgo(60), NOW)).toBe("منذ ساعة");
    expect(formatRelativeTime(minsAgo(125), NOW)).toBe("منذ ساعتين");
    expect(formatRelativeTime(minsAgo(3 * 60), NOW)).toBe("منذ 3 ساعات");
  });

  it("وقت أبكر من اليوم نفسه بصيغة الساعة", () => {
    const morning = new Date("2026-07-08T08:30:00");
    expect(formatRelativeTime(morning, NOW)).toContain("اليوم الساعة");
  });

  it("أمس", () => {
    const y = new Date("2026-07-07T20:15:00");
    expect(formatRelativeTime(y, NOW)).toContain("أمس الساعة");
  });

  it("تاريخ أقدم", () => {
    const old = new Date("2026-07-01T10:00:00");
    expect(formatRelativeTime(old, NOW)).toContain("الساعة");
    expect(formatRelativeTime(old, NOW)).not.toContain("اليوم");
  });
});
