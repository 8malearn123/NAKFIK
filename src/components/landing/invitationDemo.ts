import { useState } from "react";
import { landingDict } from "@/i18n/pages/landing";

// حالة الدعوة التجريبية في الصفحة الرئيسية: الاسم الذي يكتبه الزائر والمناسبة وردّ الضيف
// تنتقل بين الأقسام (البطاقة ← رسالة واتساب ← قائمة الردود ← البوابة ← الخاتمة).

export type Rsvp = "pending" | "confirmed" | "declined";

export type OccasionStyle = {
  theme: string;
  // نهاية التدرج: نفس معادلة shade(theme, -15) في DesignPreview
  deep: string;
  accent: string;
  headingFont: string;
  ornament: string;
};

// ألوان وخطوط القوالب الافتراضية لكل نوع مناسبة في لوحة الدعوات
export const OCCASION_STYLES: Record<string, OccasionStyle> = {
  wedding: { theme: "#7B2C50", deep: "#55062A", accent: "#D4A574", headingFont: "Amiri", ornament: "floral" },
  milka: { theme: "#9B5C8F", deep: "#753669", accent: "#E8C5D0", headingFont: "Amiri", ornament: "arabesque" },
  graduation: { theme: "#1E3A5F", deep: "#001439", accent: "#C9A84C", headingFont: "Cairo", ornament: "art-deco" },
  opening: { theme: "#A03C4A", deep: "#7A1624", accent: "#CC8E3D", headingFont: "Cairo", ornament: "geometric" },
  forum: { theme: "#0F1B3D", deep: "#000017", accent: "#C9A84C", headingFont: "Cairo", ornament: "art-deco" },
};

// أرقام الردود التجريبية قبل رد الضيف الذي كتب الزائر اسمه (وهو من ضمن "بانتظار")
export const DEMO_TALLY = { confirmed: 148, waiting: 37, declined: 12 };

// يستبدل {key} في نصوص القاموس بقيمها
export const fillTemplate = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");

export function useInvitationDemo(lang: "ar" | "en") {
  const copy = landingDict[lang];
  const [occasionKey, setOccasionKey] = useState("wedding");
  // null = الاسم الافتراضي حسب اللغة، وأي نص (حتى الفارغ) = ما كتبه الزائر
  const [typedName, setTypedName] = useState<string | null>(null);
  const [rsvp, setRsvp] = useState<Rsvp>("pending");

  const occasion = copy.occasions.find((o) => o.key === occasionKey) ?? copy.occasions[0];
  const nameValue = typedName ?? copy.defaultGuest;
  const hasName = nameValue.trim().length > 0;

  return {
    lang,
    copy,
    occasion,
    style: OCCASION_STYLES[occasion.key],
    nameValue,
    hasName,
    guestName: hasName ? nameValue.trim() : copy.guestFallback,
    setName: setTypedName,
    rsvp,
    setRsvp,
    setOccasion: (key: string) => {
      setOccasionKey(key);
      setRsvp("pending");
    },
  };
}

export type InvitationDemo = ReturnType<typeof useInvitationDemo>;
