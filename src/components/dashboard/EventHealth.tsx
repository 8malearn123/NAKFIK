import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lightbulb, CheckCircle2, XCircle } from "lucide-react";
import Panel from "@/components/app/Panel";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import {
  computeEventHealth, computeEventReadiness, healthMeta, READINESS_THRESHOLD,
  type EventHealth as Health, type EventReadiness, type HealthLevel,
} from "@/lib/eventHealth";
import { formatPercent } from "@/lib/format";
import { getRatingSummary } from "@/lib/ratings";

// بطاقة "صحة الفعالية" — درجة من 100 خاصة بالفعالية المعروضة.
// تُعرض في صفحة تفاصيل الفعالية للمنظّم مالكها فقط.

const LEVEL_STYLES: Record<HealthLevel, { tone: StatusTone; tile: string; bar: string }> = {
  excellent: { tone: "success", tile: "bg-[#E8F5EE] text-[#0E7A4F]", bar: "bg-[#0E7A4F]" },
  good: { tone: "warning", tile: "bg-[#FDF3E3] text-[#9A5F12]", bar: "bg-[#CC8E3D]" },
  poor: { tone: "danger", tile: "bg-[#FBECEA] text-[#B42F24]", bar: "bg-[#C0392B]" },
};

const EventHealthCard = ({ eventId }: { eventId: string }) => {
  const [health, setHealth] = useState<Health | null>(null);
  const [readiness, setReadiness] = useState<EventReadiness | null>(null);
  const [isDraft, setIsDraft] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: e } = await supabase
        .from("events")
        .select("id, title_ar, status, start_date, description_ar, cover_image_url, venue_name, is_online, max_attendees, current_attendees_count, tickets(count)")
        .eq("id", eventId)
        .maybeSingle();
      if (!e) return;

      const { data: regs } = await supabase
        .from("registrations")
        .select("status")
        .eq("event_id", eventId);

      let total = 0, confirmed = 0, cancelled = 0;
      (regs || []).forEach((r: any) => {
        total += 1;
        if (r.status === "confirmed" || r.status === "checked_in") confirmed += 1;
        if (r.status === "cancelled") cancelled += 1;
      });

      const rating = getRatingSummary(eventId);
      setTitle((e as any).title_ar);
      setIsDraft((e as any).status === "draft");
      setReadiness(
        computeEventReadiness({
          title: (e as any).title_ar,
          description: (e as any).description_ar,
          coverImage: (e as any).cover_image_url,
          hasLocation: (e as any).is_online || !!(e as any).venue_name,
          startDate: (e as any).start_date,
          ticketsCount: (e as any).tickets?.[0]?.count || 0,
        })
      );
      setHealth(
        computeEventHealth({
          description: (e as any).description_ar,
          coverImage: (e as any).cover_image_url,
          hasLocation: (e as any).is_online || !!(e as any).venue_name,
          ticketsCount: (e as any).tickets?.[0]?.count || 0,
          isPublished: (e as any).status === "published" || (e as any).status === "approved",
          capacity: (e as any).max_attendees,
          attendees: (e as any).current_attendees_count || 0,
          totalRegs: total,
          confirmed,
          cancelled,
          avgRating: rating.count > 0 ? rating.average : null,
        })
      );
    };
    load();
  }, [eventId]);

  if (!health) return null;
  const meta = healthMeta[health.level];
  const level = LEVEL_STYLES[health.level];

  return (
    <Panel title="صحة الفعالية" description="درجة من 100 — يراها المنظم فقط" bodyClassName="space-y-3">
      <Link
        to={`/dashboard/events/${eventId}/edit`}
        className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted"
      >
        <span className={`grid h-11 w-11 flex-none place-items-center rounded-[10px] text-base font-bold ${level.tile}`}>{health.score}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="min-w-0 truncate text-sm font-semibold leading-[22px]">{title}</span>
            <StatusBadge tone={level.tone} className="ms-auto">{meta.label}</StatusBadge>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EFEDF2]">
            <div className={`h-full rounded-full transition-all ${level.bar}`} style={{ width: `${health.score}%` }} />
          </div>
          {health.suggestions.length > 0 && (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-[18px] text-muted-foreground">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-none text-accent" />
              {health.suggestions.join(" · ")}
            </p>
          )}
        </div>
      </Link>

      {/* قائمة الحقول الإلزامية — تحدد جاهزية الإرسال للمراجعة */}
      {readiness && (
        <div className="rounded-xl bg-muted/50 p-3">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-semibold leading-5">اكتمال البيانات الإلزامية: {formatPercent(readiness.score)}</span>
            {isDraft && (
              <StatusBadge tone={readiness.ready ? "success" : "warning"}>
                {readiness.ready ? "جاهزة للإرسال للمراجعة" : `الإرسال للمراجعة يتطلب ${formatPercent(READINESS_THRESHOLD)}`}
              </StatusBadge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
            {readiness.items.map((item) => (
              <span key={item.key} className="flex min-w-0 items-center gap-1.5 text-xs leading-[18px]">
                {item.done
                  ? <CheckCircle2 className="h-3.5 w-3.5 flex-none text-[#0E7A4F]" />
                  : <XCircle className="h-3.5 w-3.5 flex-none text-[#B42F24]" />}
                <span className={item.done ? "text-muted-foreground" : "font-semibold text-[#B42F24]"}>{item.done ? item.label : item.missingLabel}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
};

export default EventHealthCard;
