// قائمة الانتظار — نسخة واجهة أمامية فقط (تخزين محلي في الجهاز).
// عند ربط الواجهة الخلفية لاحقاً يُستبدل هذا الملف بنداءات قاعدة البيانات
// دون تغيير أي شيء في مكونات الواجهة.

const storageKey = (userId?: string) => `nakfik:waitlist:${userId ?? "guest"}`;

export const getWaitlistEventIds = (userId?: string): string[] => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const isOnWaitlist = (eventId: string, userId?: string): boolean =>
  getWaitlistEventIds(userId).includes(eventId);

// يبدّل حالة الانضمام ويعيد الحالة الجديدة (true = انضم)
export const toggleWaitlist = (eventId: string, userId?: string): boolean => {
  const ids = getWaitlistEventIds(userId);
  const index = ids.indexOf(eventId);
  const joined = index === -1;
  if (joined) ids.push(eventId);
  else ids.splice(index, 1);
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(ids));
  } catch {
    // التخزين ممتلئ أو محجوب — نتجاهل بصمت
  }
  return joined;
};
