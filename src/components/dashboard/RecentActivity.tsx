import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarPlus,
  Pencil,
  Send,
  Ticket,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { formatRelativeTime } from "@/lib/relativeTime";

// قسم "آخر الأنشطة" — مبني من سجلات النظام الفعلية (قراءة فقط):
// إنشاء/تحديث الفعاليات، التسجيلات، الحضور، والدعوات الخاصة.

type ActivityType = "create" | "update" | "ticket" | "checkin" | "invite";

interface ActivityItem {
  type: ActivityType;
  time: Date;
  desc: string;
}

const typeMeta: Record<ActivityType, { icon: typeof Activity; color: string; title: string }> = {
  create: { icon: CalendarPlus, color: "bg-primary/10 text-primary", title: "إنشاء فعالية جديدة" },
  update: { icon: Pencil, color: "bg-brand-brick/10 text-brand-brick", title: "تحديث فعالية" },
  ticket: { icon: Ticket, color: "bg-accent/10 text-accent", title: "تسجيل جديد" },
  checkin: { icon: UserCheck, color: "bg-teal/10 text-teal", title: "تسجيل حضور" },
  invite: { icon: Send, color: "bg-primary/10 text-primary", title: "دعوة خاصة" },
};

const RecentActivity = () => {
  const { effectiveOrganization: organization } = useEffectiveUser();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      const [evtsRes, regsRes, invsRes] = await Promise.all([
        supabase
          .from("events")
          .select("title_ar, created_at, updated_at")
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("registrations")
          .select("created_at, checked_in_at, events!inner(title_ar, organization_id)")
          .eq("events.organization_id", organization.id)
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("private_invitations" as any)
          .select("title, created_at")
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const acts: ActivityItem[] = [];

      (evtsRes.data || []).forEach((e: any) => {
        if (e.created_at)
          acts.push({ type: "create", time: new Date(e.created_at), desc: e.title_ar });
        // نعتبره تحديثاً فقط إذا اختلف عن وقت الإنشاء بأكثر من دقيقة
        if (
          e.updated_at &&
          e.created_at &&
          new Date(e.updated_at).getTime() - new Date(e.created_at).getTime() > 60_000
        )
          acts.push({ type: "update", time: new Date(e.updated_at), desc: e.title_ar });
      });

      (regsRes.data || []).forEach((r: any) => {
        const title = r.events?.title_ar || "";
        if (r.created_at)
          acts.push({ type: "ticket", time: new Date(r.created_at), desc: title });
        if (r.checked_in_at)
          acts.push({ type: "checkin", time: new Date(r.checked_in_at), desc: title });
      });

      (invsRes.data || []).forEach((inv: any) => {
        if (inv.created_at)
          acts.push({ type: "invite", time: new Date(inv.created_at), desc: inv.title || "" });
      });

      acts.sort((a, b) => b.time.getTime() - a.time.getTime());
      setItems(acts.slice(0, 8));
      setLoading(false);
    };
    load();
  }, [organization]);

  const now = new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card rounded-2xl p-5 border border-border/50"
    >
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-foreground">آخر الأنشطة</h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-muted/50 rounded-xl h-14" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, i) => {
            const meta = typeMeta[item.type];
            return (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-lg ${meta.color} flex items-center justify-center flex-shrink-0`}
                >
                  <meta.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground">{meta.title}</h4>
                  <p className="text-muted-foreground text-xs truncate">{item.desc}</p>
                </div>
                <span className="text-muted-foreground text-[10px] whitespace-nowrap mt-1">
                  {formatRelativeTime(item.time, now)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">لا توجد أنشطة بعد</p>
        </div>
      )}
    </motion.div>
  );
};

export default RecentActivity;
