// تنسيق وقت النشاط بصيغة قريبة من المستخدم:
// "منذ لحظات"، "منذ 5 دقائق"، "اليوم الساعة 3:30 م"، "أمس الساعة ..."، أو التاريخ.

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const minutesLabel = (m: number): string => {
  if (m === 1) return "منذ دقيقة";
  if (m === 2) return "منذ دقيقتين";
  if (m <= 10) return `منذ ${m} دقائق`;
  return `منذ ${m} دقيقة`;
};

const hoursLabel = (h: number): string => {
  if (h === 1) return "منذ ساعة";
  if (h === 2) return "منذ ساعتين";
  if (h <= 10) return `منذ ${h} ساعات`;
  return `منذ ${h} ساعة`;
};

export const formatRelativeTime = (date: Date, now: Date = new Date()): string => {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "منذ لحظات";
  if (diffMin < 60) return minutesLabel(diffMin);

  const time = date.toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" });
  if (sameDay(date, now)) {
    const diffH = Math.floor(diffMin / 60);
    if (diffH <= 5) return hoursLabel(diffH);
    return `اليوم الساعة ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return `أمس الساعة ${time}`;

  return date.toLocaleDateString("ar-SA", { month: "long", day: "numeric" }) + ` الساعة ${time}`;
};
