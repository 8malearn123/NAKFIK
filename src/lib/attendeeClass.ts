// تصنيف الحاضر داخل الفعالية — يُستنتج من نوع/اسم التذكرة المسجل بها.
// يُستخدم في البطاقات الرقمية وشاشة المسح والتقارير.

export type AttendeeClass = "vvip" | "vip" | "speaker" | "organizer" | "regular";

export interface AttendeeClassMeta {
  label: string;
  cls: string;      // شارة صغيرة
  cardCls: string;  // تلوين بارز داخل البطاقة
}

export const ATTENDEE_CLASS_META: Record<AttendeeClass, AttendeeClassMeta> = {
  vvip:      { label: "VVIP", cls: "bg-[#FDF3E3] text-[#9A5F12] border-transparent", cardCls: "bg-amber-400 text-amber-950" },
  vip:       { label: "VIP", cls: "bg-secondary text-primary border-transparent", cardCls: "bg-purple-300 text-purple-950" },
  speaker:   { label: "متحدث", cls: "bg-[#E8F5EE] text-[#0E7A4F] border-transparent", cardCls: "bg-teal-300 text-teal-950" },
  organizer: { label: "منظم", cls: "bg-[#F1EFF4] text-[#5F5968] border-transparent", cardCls: "bg-blue-300 text-blue-950" },
  regular:   { label: "عادي", cls: "bg-[#F1EFF4] text-[#5F5968] border-transparent", cardCls: "bg-white/80 text-gray-800" },
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
