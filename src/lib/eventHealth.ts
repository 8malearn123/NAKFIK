// حساب "صحة الفعالية" — درجة من 100 لكل فعالية بناءً على:
// نسبة بيع التذاكر، نسبة تأكيد الحضور، اكتمال البيانات، الإلغاءات، والتقييمات إن وجدت.

export interface EventHealthInput {
  description: string | null;
  coverImage: string | null;
  hasLocation: boolean; // موقع محدد أو فعالية أونلاين
  ticketsCount: number;
  isPublished: boolean;
  capacity: number | null;
  attendees: number;
  totalRegs: number;
  confirmed: number; // مؤكد أو مسجَّل حضوره
  cancelled: number;
  avgRating: number | null; // 1..5 أو null إن لا تقييمات
}

export type HealthLevel = "excellent" | "good" | "poor";

export interface EventHealth {
  score: number; // 0..100
  level: HealthLevel;
  suggestions: string[];
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export const computeEventHealth = (i: EventHealthInput): EventHealth => {
  // نسبة بيع التذاكر (المقاعد المشغولة من السعة)
  const salesRatio = i.capacity && i.capacity > 0
    ? clamp01(i.attendees / i.capacity)
    : i.attendees > 0 ? 0.7 : 0.2; // بلا سعة محددة: وجود مسجلين مؤشر جيد

  // نسبة تأكيد الحضور من إجمالي التسجيلات
  const confirmRatio = i.totalRegs > 0 ? clamp01(i.confirmed / i.totalRegs) : 0;

  // اكتمال بيانات الفعالية (5 عناصر)
  const completenessChecks = [
    !!i.description && i.description.trim().length >= 30,
    !!i.coverImage,
    i.hasLocation,
    i.ticketsCount > 0,
    i.isPublished,
  ];
  const completeness = completenessChecks.filter(Boolean).length / completenessChecks.length;

  // الإلغاءات: كل ما زادت نسبتها انخفضت الدرجة
  const cancelRate = i.totalRegs > 0 ? clamp01(i.cancelled / i.totalRegs) : 0;
  const cancelScore = clamp01(1 - cancelRate * 2); // 50% إلغاءات فأكثر = صفر

  // التقييمات إن وجدت
  const ratingScore = i.avgRating != null ? clamp01(i.avgRating / 5) : null;

  const parts: Array<[number, number]> = [
    [salesRatio, 30],
    [confirmRatio, 25],
    [completeness, 25],
    [cancelScore, 10],
  ];
  if (ratingScore != null) parts.push([ratingScore, 10]);

  const totalWeight = parts.reduce((s, [, w]) => s + w, 0);
  const raw = parts.reduce((s, [v, w]) => s + v * w, 0);
  const score = Math.round((raw / totalWeight) * 100);

  const level: HealthLevel = score >= 75 ? "excellent" : score >= 50 ? "good" : "poor";

  const suggestions: string[] = [];
  if (i.capacity && salesRatio >= 0.9) suggestions.push("يمكن زيادة عدد المقاعد");
  if (salesRatio < 0.3) suggestions.push("ننصح بمشاركة رابط الفعالية وإرسال تذكير للمدعوين");
  if (i.totalRegs > 0 && confirmRatio < 0.5) suggestions.push("ننصح بإرسال تذكير للمدعوين لتأكيد حضورهم");
  if (completeness < 1) suggestions.push("أكمل بيانات الفعالية (الوصف، صورة الغلاف، الموقع، التذاكر)");
  if (cancelRate >= 0.2) suggestions.push("راجع أسباب الإلغاءات — قد يفيد تعديل الموعد أو التفاصيل");

  return { score, level, suggestions: suggestions.slice(0, 2) };
};

export const healthMeta: Record<HealthLevel, { label: string; text: string; bg: string; bar: string }> = {
  excellent: { label: "ممتاز", text: "text-green-700", bg: "bg-green-500/10", bar: "bg-green-500" },
  good:      { label: "جيد", text: "text-amber-700", bg: "bg-amber-500/10", bar: "bg-amber-500" },
  poor:      { label: "يحتاج تحسين", text: "text-destructive", bg: "bg-destructive/10", bar: "bg-destructive" },
};
