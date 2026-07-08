// توليد ملف تقويم بصيغة ICS العالمية — يفتح في تقويم الجهاز مباشرة
// (تقويم آيفون/أندرويد، Google Calendar، Outlook، Apple Calendar...).

export interface CalendarEvent {
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end?: Date | null;
}

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000; // ساعتان افتراضياً

// صيغة التاريخ في ICS بالتوقيت العالمي: 20260401T130000Z
const toIcsDate = (d: Date): string =>
  d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// تهريب المحارف الخاصة في نصوص ICS
const escapeIcsText = (text: string): string =>
  text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export const buildIcs = (event: CalendarEvent): string => {
  const start = event.start;
  const end = event.end ?? new Date(start.getTime() + DEFAULT_DURATION_MS);
  const uid = `${toIcsDate(start)}-${Math.abs(
    [...event.title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7),
  )}@nakfik`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nakfeek Ticket//AR",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(start)}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${escapeIcsText(event.description)}`] : []),
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
};

export const downloadIcs = (event: CalendarEvent): void => {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60) || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
