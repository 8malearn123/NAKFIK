// منطق شارات حالة الفعالية — مشترك بين بطاقات الفعاليات وصفحة التفاصيل.
// الأولوية عند التزاحم: نفدت التذاكر > توشك على النفاد > الأكثر رواجاً > جديد.
// تُعرض شارتان كحد أقصى حتى تبقى البطاقة نظيفة.

export type EventBadge = "soldOut" | "almostFull" | "trending" | "new";

export interface BadgeSource {
  created_at?: string | null;
  max_attendees?: number | null;
  current_attendees_count?: number | null;
}

const NEW_WINDOW_DAYS = 7;
const ALMOST_FULL_RATIO = 0.1; // متبقي 10% أو أقل
const TRENDING_FILL_RATIO = 0.5; // امتلأ نصفها فأكثر
const TRENDING_MIN_COUNT = 20; // مع حد أدنى من المسجلين
const TRENDING_ABS_COUNT = 100; // أو عدد كبير مطلقاً بدون حد مقاعد

export const getEventBadges = (e: BadgeSource, now: Date = new Date()): EventBadge[] => {
  const badges: EventBadge[] = [];
  const max = e.max_attendees ?? null;
  const count = e.current_attendees_count ?? 0;
  const remaining = max ? Math.max(0, max - count) : null;

  if (max && remaining !== null) {
    if (remaining <= 0) badges.push("soldOut");
    else if (remaining / max <= ALMOST_FULL_RATIO) badges.push("almostFull");
    else if (count / max >= TRENDING_FILL_RATIO && count >= TRENDING_MIN_COUNT)
      badges.push("trending");
  } else if (count >= TRENDING_ABS_COUNT) {
    badges.push("trending");
  }

  if (e.created_at) {
    const ageMs = now.getTime() - new Date(e.created_at).getTime();
    if (ageMs >= 0 && ageMs <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000) badges.push("new");
  }

  return badges.slice(0, 2);
};

// أنماط الألوان لكل شارة — من ألوان الهوية الحالية
export const badgeStyles: Record<EventBadge, string> = {
  soldOut: "bg-destructive text-destructive-foreground",
  almostFull: "bg-brand-brick text-white",
  trending: "bg-primary text-primary-foreground",
  new: "bg-accent text-accent-foreground",
};
