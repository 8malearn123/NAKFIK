// تقييمات الفعاليات — نسخة واجهة أمامية فقط (تخزين محلي في الجهاز).
// عند ربط الواجهة الخلفية لاحقاً يُستبدل هذا الملف بنداءات قاعدة البيانات
// دون تغيير مكونات الواجهة.

export interface EventRating {
  userId: string;
  stars: number; // 1..5
  comment: string;
  updatedAt: string;
}

const storageKey = (eventId: string) => `nakfik:ratings:${eventId}`;

export const getEventRatings = (eventId: string): EventRating[] => {
  try {
    const raw = localStorage.getItem(storageKey(eventId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getUserRating = (eventId: string, userId: string): EventRating | null =>
  getEventRatings(eventId).find((r) => r.userId === userId) ?? null;

// يضيف تقييماً جديداً أو يعدّل تقييم المستخدم السابق (تقييم واحد لكل مستخدم)
export const saveRating = (
  eventId: string,
  userId: string,
  stars: number,
  comment: string,
): EventRating => {
  const clamped = Math.min(5, Math.max(1, Math.round(stars)));
  const ratings = getEventRatings(eventId).filter((r) => r.userId !== userId);
  const entry: EventRating = {
    userId,
    stars: clamped,
    comment: comment.trim(),
    updatedAt: new Date().toISOString(),
  };
  ratings.push(entry);
  try {
    localStorage.setItem(storageKey(eventId), JSON.stringify(ratings));
  } catch {
    // التخزين ممتلئ أو محجوب — نتجاهل بصمت
  }
  return entry;
};

export const getRatingSummary = (eventId: string): { average: number; count: number } => {
  const ratings = getEventRatings(eventId);
  if (ratings.length === 0) return { average: 0, count: 0 };
  const sum = ratings.reduce((s, r) => s + r.stars, 0);
  return { average: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length };
};
