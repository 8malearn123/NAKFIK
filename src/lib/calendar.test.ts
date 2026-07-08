import { describe, expect, it } from "vitest";
import { buildIcs } from "./calendar";

describe("توليد ملف التقويم ICS", () => {
  const base = {
    title: "مؤتمر التقنية",
    start: new Date("2026-04-01T13:00:00Z"),
  };

  it("يبني ملفاً صالحاً بالحقول الأساسية", () => {
    const ics = buildIcs(base);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:مؤتمر التقنية");
    expect(ics).toContain("DTSTART:20260401T130000Z");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("يفترض مدة ساعتين عند غياب وقت النهاية", () => {
    expect(buildIcs(base)).toContain("DTEND:20260401T150000Z");
  });

  it("يستخدم وقت النهاية عند توفره", () => {
    const ics = buildIcs({ ...base, end: new Date("2026-04-01T18:30:00Z") });
    expect(ics).toContain("DTEND:20260401T183000Z");
  });

  it("يهرّب المحارف الخاصة والأسطر", () => {
    const ics = buildIcs({
      ...base,
      description: "سطر أول\nسطر ثانٍ; مع فاصلة, هنا",
      location: "الرياض, السعودية",
    });
    expect(ics).toContain("DESCRIPTION:سطر أول\\nسطر ثانٍ\\; مع فاصلة\\, هنا");
    expect(ics).toContain("LOCATION:الرياض\\, السعودية");
  });
});
