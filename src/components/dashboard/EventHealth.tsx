import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { HeartPulse, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { computeEventHealth, healthMeta, type EventHealth as Health } from "@/lib/eventHealth";
import { getRatingSummary } from "@/lib/ratings";

// بطاقة "صحة الفعالية" — درجة من 100 خاصة بالفعالية المعروضة.
// تُعرض في صفحة تفاصيل الفعالية للمنظّم مالكها فقط.

const EventHealthCard = ({ eventId }: { eventId: string }) => {
  const [health, setHealth] = useState<Health | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: e } = await supabase
        .from("events")
        .select("id, title_ar, status, description_ar, cover_image_url, venue_name, is_online, max_attendees, current_attendees_count, tickets(count)")
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-primary" /> صحة الفعالية
        </h2>
        <span className="text-[11px] text-muted-foreground">درجة من 100 — يراها المنظم فقط</span>
      </div>

      <Link
        to={`/dashboard/events/${eventId}/edit`}
        className="block border rounded-xl p-3 hover:bg-muted/40 transition"
      >
        <div className="flex items-center gap-3">
          {/* الدرجة */}
          <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center flex-shrink-0 ${meta.bg}`}>
            <span className={`text-sm font-extrabold leading-none ${meta.text}`}>{health.score}</span>
            <span className={`text-[8px] font-bold ${meta.text}`}>/100</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm truncate">{title}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.bg} ${meta.text}`}>
                {meta.label}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${meta.bar}`}
                style={{ width: `${health.score}%` }}
              />
            </div>
            {health.suggestions.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-start gap-1">
                <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500" />
                {health.suggestions.join(" · ")}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default EventHealthCard;
