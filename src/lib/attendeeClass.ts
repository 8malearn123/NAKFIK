// تصنيف الحاضر داخل الفعالية — يُستنتج من نوع/اسم التذكرة المسجل بها.
// يُستخدم في البطاقات الرقمية وشاشة المسح والتقارير.

export type AttendeeClass = "vvip" | "vip" | "speaker" | "organizer" | "regular";

export interface AttendeeClassMeta {
  label: string;
  cls: string;      // شارة صغيرة
  cardCls: string;  // تلوين بارز داخل البطاقة
}

export const ATTENDEE_CLASS_META: Record<AttendeeClass, AttendeeClassMeta> = {
  vvip:      { label: "VVIP", cls: "bg-amber-500/15 text-amber-700 border-amber-400/60", cardCls: "bg-amber-400 text-amber-950" },
  vip:       { label: "VIP", cls: "bg-primary/10 text-primary border-primary/40", cardCls: "bg-purple-300 text-purple-950" },
  speaker:   { label: "متحدث", cls: "bg-teal/10 text-teal-700 border-teal/40", cardCls: "bg-teal-300 text-teal-950" },
  organizer: { label: "منظم", cls: "bg-blue-500/10 text-blue-700 border-blue-400/50", cardCls: "bg-blue-300 text-blue-950" },
  regular:   { label: "عادي", cls: "bg-muted text-muted-foreground border-border", cardCls: "bg-white/80 text-gray-800" },
};

export const classifyAttendee = (
  nameAr?: string | null,
  nameEn?: string | null,
  type?: string | null
): AttendeeClass => {
  const n = `${nameAr || ""} ${nameEn || ""}`.toUpperCase();
  if (n.includes("VVIP")) return "vvip";
  if (n.includes("متحدث") || n.includes("SPEAKER")) return "speaker";
  if (n.includes("منظم") || n.includes("ORGANIZER") || n.includes("STAFF")) return "organizer";
  if (type === "vip" || n.includes("VIP")) return "vip";
  return "regular";
};
