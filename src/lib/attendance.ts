// حسابات قائمة الحضور: مدة البقاء من وقتي الدخول والخروج.

/** المدة بالمللي ثانية بين الدخول والخروج — null إن تعذر الحساب */
export const computeStay = (entry: string | null, exit: string | null): number | null => {
  if (!entry || !exit) return null;
  const ms = new Date(exit).getTime() - new Date(entry).getTime();
  return ms > 0 ? ms : null;
};

/** تنسيق عربي مختصر للمدة: "٣ س ٢٥ د" / "45 د" / "أقل من دقيقة" */
export const formatDuration = (ms: number): string => {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "أقل من دقيقة";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} د`;
  if (m === 0) return `${h} س`;
  return `${h} س ${m} د`;
};
