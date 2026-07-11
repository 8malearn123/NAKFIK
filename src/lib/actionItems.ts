// استنتاج "الإجراءات المطلوبة" للمنظّم من بيانات فعالياته الفعلية.

export interface ActionSourceEvent {
  id: string;
  title_ar: string;
  status: string;
  start_date: string;
  max_attendees?: number | null;
  current_attendees_count?: number | null;
}

export type ActionType = "pendingReview" | "draft" | "startingSoon" | "almostFull" | "soldOut";

export interface ActionItem {
  type: ActionType;
  eventId: string;
  eventTitle: string;
  detail?: string;
}

const SOON_DAYS = 7;
const ALMOST_FULL_RATIO = 0.8;

export const deriveActionItems = (
  events: ActionSourceEvent[],
  now: Date = new Date(),
): ActionItem[] => {
  const items: ActionItem[] = [];

  for (const e of events) {
    if (e.status === "pending_review") {
      items.push({ type: "pendingReview", eventId: e.id, eventTitle: e.title_ar });
      continue;
    }
    if (e.status === "draft") {
      items.push({ type: "draft", eventId: e.id, eventTitle: e.title_ar });
      continue;
    }
    if (e.status !== "published" && e.status !== "approved") continue;

    const start = new Date(e.start_date);
    const daysLeft = Math.ceil((start.getTime() - now.getTime()) / 86_400_000);

    const max = e.max_attendees ?? null;
    const count = e.current_attendees_count ?? 0;
    if (max && count >= max) {
      items.push({ type: "soldOut", eventId: e.id, eventTitle: e.title_ar });
    } else if (max && count / max >= ALMOST_FULL_RATIO) {
      items.push({
        type: "almostFull",
        eventId: e.id,
        eventTitle: e.title_ar,
        detail: `${Math.round((count / max) * 100)}%`,
      });
    }

    if (daysLeft >= 0 && daysLeft <= SOON_DAYS) {
      items.push({
        type: "startingSoon",
        eventId: e.id,
        eventTitle: e.title_ar,
        detail: daysLeft === 0 ? "اليوم" : daysLeft === 1 ? "غداً" : `خلال ${daysLeft} أيام`,
      });
    }
  }

  // الأهم أولاً
  const priority: Record<ActionType, number> = {
    pendingReview: 0,
    draft: 1,
    soldOut: 2,
    almostFull: 3,
    startingSoon: 4,
  };
  return items.sort((a, b) => priority[a.type] - priority[b.type]).slice(0, 6);
};
