import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { HeartPulse, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { computeEventHealth, healthMeta, type EventHealth as Health } from "@/lib/eventHealth";
import { getRatingSummary } from "@/lib/ratings";

// بطاقة "صحة الفعالية" — درجة من 100 لكل فعالية من بيانات المنظّم الفعلية.

interface Row {
  id: string;
  title: string;
  health: Health;
}

const EventHealthCard = () => {
  const { userId } = useEffectiveUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data: orgs } = await supabase
        .from("organizations").select("id").eq("owner_id", userId).limit(1);
      const org = orgs?.[0];
      if (!org) { setLoading(false); return; }

      const { data: events } = await supabase
        .from("events")
        .select("id, title_ar, status, description_ar, cover_image_url, venue_name, is_online, max_attendees, current_attendees_count, start_date, tickets(count)")
        .eq("organization_id", org.id)
        .in("status", ["draft", "pending_review", "approved", "published"])
        .order("start_date", { ascending: true })
        .limit(6);

      const evts = events || [];
      if (!evts.length) { setLoading(false); return; }

      const { data: regs } = await supabase
        .from("registrations")
        .select("event_id, status")
        .in("event_id", evts.map((e: any) => e.id));

      const byEvent: Record<string, { total: number; confirmed: number; cancelled: number }> = {};
      (regs || []).forEach((r: any) => {
        const b = (byEvent[r.event_id] ||= { total: 0, confirmed: 0, cancelled: 0 });
        b.total += 1;
        if (r.status === "confirmed" || r.status === "checked_in") b.confirmed += 1;
        if (r.status === "cancelled") b.cancelled += 1;
      });

      setRows(
        evts.map((e: any) => {
          const stats = byEvent[e.id] || { total: 0, confirmed: 0, cancelled: 0 };
          const rating = getRatingSummary(e.id);
          return {
            id: e.id,
            title: e.title_ar,
            health: computeEventHealth({
              description: e.description_ar,
              coverImage: e.cover_image_url,
              hasLocation: e.is_online || !!e.venue_name,
              ticketsCount: e.tickets?.[0]?.count || 0,
              isPublished: e.status === "published" || e.status === "approved",
              capacity: e.max_attendees,
              attendees: e.current_attendees_count || 0,
              totalRegs: stats.total,
              confirmed: stats.confirmed,
              cancelled: stats.cancelled,
              avgRating: rating.count > 0 ? rating.average : null,
            }),
          };
        })
      );
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading || rows.length === 0) return null;

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
        <span className="text-[11px] text-muted-foreground">درجة من 100 لكل فعالية</span>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const meta = healthMeta[r.health.level];
          return (
            <Link
              key={r.id}
              to={`/dashboard/events/${r.id}/edit`}
              className="block border rounded-xl p-3 hover:bg-muted/40 transition"
            >
              <div className="flex items-center gap-3">
                {/* الدرجة */}
                <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center flex-shrink-0 ${meta.bg}`}>
                  <span className={`text-sm font-extrabold leading-none ${meta.text}`}>{r.health.score}</span>
                  <span className={`text-[8px] font-bold ${meta.text}`}>/100</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm truncate">{r.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.bg} ${meta.text}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${meta.bar}`}
                      style={{ width: `${r.health.score}%` }}
                    />
                  </div>
                  {r.health.suggestions.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 flex items-start gap-1">
                      <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500" />
                      {r.health.suggestions.join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
};

export default EventHealthCard;
