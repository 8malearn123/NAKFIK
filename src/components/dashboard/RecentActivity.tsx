import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CalendarPlus,
  Pencil,
  Send,
  Ticket,
  UserCheck,
} from "lucide-react";
import EmptyState from "@/components/app/EmptyState";
import Panel from "@/components/app/Panel";
import { Button } from "@/components/ui/button";
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

const typeMeta: Record<ActivityType, { icon: typeof Activity; title: string }> = {
  create: { icon: CalendarPlus, title: "إنشاء فعالية جديدة" },
  update: { icon: Pencil, title: "تحديث فعالية" },
  ticket: { icon: Ticket, title: "تسجيل جديد" },
  checkin: { icon: UserCheck, title: "تسجيل حضور" },
  invite: { icon: Send, title: "دعوة خاصة" },
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
    <Panel title="آخر الأنشطة">
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />)}
        </div>
      ) : items.length > 0 ? (
        <div className="divide-y divide-border">
          {items.map((item, i) => {
            const meta = typeMeta[item.type];
            return (
              <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
                  <meta.icon className="h-[17px] w-[17px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-[22px]">{meta.title}</p>
                  <p className="truncate text-xs leading-[18px] text-muted-foreground">{item.desc}</p>
                </div>
                <span className="flex-none text-xs leading-[18px] text-muted-foreground">{formatRelativeTime(item.time, now)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Activity}
          title="لا توجد أنشطة بعد"
          action={<Button asChild size="sm"><Link to="/dashboard/events/create">إنشاء فعالية</Link></Button>}
        />
      )}
    </Panel>
  );
};

export default RecentActivity;
