// تنسيق موحد في كل الشاشات: أرقام غربية وتقويم ميلادي بأسماء أشهر عربية.
// لا تستخدم toLocaleDateString("ar-SA") مباشرة، فهي تعطي أرقاماً وتقويماً مختلفين حسب الجهاز.
const LOCALE = "ar-SA-u-ca-gregory-nu-latn";

const toDate = (value: string | number | Date) => (value instanceof Date ? value : new Date(value));

export const formatDate = (value: string | number | Date, withYear = true) =>
  toDate(value).toLocaleDateString(LOCALE, { day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}) });

export const formatDateShort = (value: string | number | Date) =>
  toDate(value).toLocaleDateString(LOCALE, { day: "numeric", month: "short" });

export const formatWeekday = (value: string | number | Date) =>
  toDate(value).toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" });

export const formatTime = (value: string | number | Date) =>
  toDate(value).toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });

export const formatDateTime = (value: string | number | Date) =>
  `${formatWeekday(value)}، ${formatTime(value)}`;

export const formatNumber = (value: number) => value.toLocaleString("en-US");

export const formatMoney = (value: number) => `${formatNumber(Math.round(value))} ر.س`;

export const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

// الأيام المتبقية بصياغة عربية صحيحة، مثل: بعد 3 أيام، بعد 17 يوماً، اليوم
export const daysLeftLabel = (value: string | number | Date) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = toDate(value);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - start.getTime()) / 86400000);
  if (days === 0) return "اليوم";
  if (days === 1) return "غداً";
  if (days === 2) return "بعد يومين";
  if (days === -1) return "أمس";
  if (days < 0) return "انتهت";
  if (days <= 10) return `بعد ${days} أيام`;
  return `بعد ${days} يوماً`;
};

export const formatMonth = (value: string | number | Date) => toDate(value).toLocaleDateString(LOCALE, { month: "long" });
