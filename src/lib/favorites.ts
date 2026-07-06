// قائمة المفضلة محفوظة محلياً في جهاز المستخدم، مفصولة لكل حساب.
// لا تتطلب أي تغيير على قاعدة البيانات.

const storageKey = (userId?: string) => `nakfik:favorites:${userId ?? "guest"}`;

export const getFavoriteEventIds = (userId?: string): string[] => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const isEventFavorite = (eventId: string, userId?: string): boolean =>
  getFavoriteEventIds(userId).includes(eventId);

// يبدّل حالة المفضلة ويعيد الحالة الجديدة (true = صارت مفضلة)
export const toggleEventFavorite = (eventId: string, userId?: string): boolean => {
  const ids = getFavoriteEventIds(userId);
  const index = ids.indexOf(eventId);
  const nowFavorite = index === -1;
  if (nowFavorite) ids.push(eventId);
  else ids.splice(index, 1);
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(ids));
  } catch {
    // مساحة التخزين ممتلئة أو محجوبة — نتجاهل بصمت
  }
  return nowFavorite;
};
