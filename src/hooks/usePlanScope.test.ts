import { describe, it, expect } from "vitest";
import { normalizeScope, PLAN_SCOPE_META } from "./usePlanScope";

describe("normalizeScope", () => {
  it("يقبل النطاقات الصحيحة كما هي", () => {
    expect(normalizeScope("private")).toBe("private");
    expect(normalizeScope("public")).toBe("public");
    expect(normalizeScope("both")).toBe("both");
  });

  it("يرجع الباقة الشاملة لأي قيمة غير معروفة أو مفقودة (قبل تنفيذ SQL)", () => {
    expect(normalizeScope(undefined)).toBe("both");
    expect(normalizeScope(null)).toBe("both");
    expect(normalizeScope("")).toBe("both");
    expect(normalizeScope("premium")).toBe("both");
    expect(normalizeScope(123)).toBe("both");
  });

  it("كل نطاق له تسمية ووصف", () => {
    for (const k of ["private", "public", "both"] as const) {
      expect(PLAN_SCOPE_META[k].label).toBeTruthy();
      expect(PLAN_SCOPE_META[k].desc).toBeTruthy();
    }
  });
});
