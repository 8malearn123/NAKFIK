// تنسيق موحد في كل الشاشات: أرقام غربية وتقويم ميلادي بأسماء أشهر عربية.
// لا تستخدم toLocaleDateString("ar-SA") مباشرة، فهي تعطي أرقاماً وتقويماً مختلفين حسب الجهاز.
const LOCALES = { ar: "ar-SA-u-ca-gregory-nu-latn", en: "en-GB" };
type Lang = keyof typeof LOCALES;

const toDate = (value: string | number | Date) => (value instanceof Date ? value : new Date(value));

export const formatDate = (value: string | number | Date, withYear = true, lang: Lang = "ar") =>
  toDate(value).toLocaleDateString(LOCALES[lang], { day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}) });

export const formatDateShort = (value: string | number | Date, lang: Lang = "ar") =>
  toDate(value).toLocaleDateString(LOCALES[lang], { day: "numeric", month: "short" });

export const formatWeekday = (value: string | number | Date, lang: Lang = "ar") =>
  toDate(value).toLocaleDateString(LOCALES[lang], { weekday: "long", day: "numeric", month: "long" });

export const formatTime = (value: string | number | Date, lang: Lang = "ar") =>
  toDate(value).toLocaleTimeString(LOCALES[lang], { hour: "numeric", minute: "2-digit" });

// للسجلات الحية التي تتوالى فيها الأحداث داخل الدقيقة نفسها
export const formatTimeWithSeconds = (value: string | number | Date, lang: Lang = "ar") =>
  toDate(value).toLocaleTimeString(LOCALES[lang], { hour: "numeric", minute: "2-digit", second: "2-digit" });

export const formatDateTime = (value: string | number | Date, lang: Lang = "ar") =>
  `${formatWeekday(value, lang)}${lang === "ar" ? "،" : ","} ${formatTime(value, lang)}`;

export const formatNumber = (value: number) => value.toLocaleString("en-US");

// تبقي الهللات عند وجودها حتى تتطابق المجاميع المحاسبية
export const formatMoney = (value: number) => `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ر.س`;

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

export const formatMonth = (value: string | number | Date, lang: Lang = "ar") => toDate(value).toLocaleDateString(LOCALES[lang], { month: "long" });

// علامة LRM تبقي النسبة بشكل 69% حتى لو جاءت بعد نص عربي في السطر نفسه
export const formatPercent = (value: number) => `‎${value}%`;

// عدد المدعوين بعد فعل، مثل: ذكّر 5 مدعوين، ذكّر 66 مدعواً
export const guestsObject = (count: number) => {
  if (count === 1) return "مدعواً واحداً";
  if (count === 2) return "مدعوَّين";
  if (count >= 3 && count <= 10) return `${count} مدعوين`;
  return `${formatNumber(count)} مدعواً`;
};
