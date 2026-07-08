import { describe, expect, it } from "vitest";
import { translateContent } from "./contentTranslations";

describe("ترجمة محتوى قاعدة البيانات", () => {
  it("يترجم النصوص المعروفة عند العرض بالإنجليزية", () => {
    expect(translateContent("فعاليات غير محدودة", "en")).toBe("Unlimited events");
    expect(translateContent("تذكرة ذهبية", "en")).toBe("Gold Ticket");
    expect(translateContent(" دعم أولوية ", "en")).toBe("Priority support");
  });

  it("يعيد النص كما هو بالعربية", () => {
    expect(translateContent("فعاليات غير محدودة", "ar")).toBe("فعاليات غير محدودة");
  });

  it("يعيد النص غير المعروف كما هو", () => {
    expect(translateContent("ميزة خاصة جداً", "en")).toBe("ميزة خاصة جداً");
    expect(translateContent("", "en")).toBe("");
  });
});
