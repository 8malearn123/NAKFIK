import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileEdit,
  Flame,
  Hourglass,
} from "lucide-react";
import EmptyState from "@/components/app/EmptyState";
import Panel from "@/components/app/Panel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { deriveActionItems, type ActionItem, type ActionType } from "@/lib/actionItems";

// قسم "الإجراءات المطلوبة" — مستنتج من بيانات فعاليات المنظّم الفعلية.

const typeMeta: Record<
  ActionType,
  { icon: typeof ClipboardList; color: string; title: string; desc: (i: ActionItem) => string; link: (i: ActionItem) => string; cta: string }
> = {
  pendingReview: {
    icon: Hourglass,
    color: "bg-[#FDF3E3] text-[#9A5F12]",
    title: "فعالية بانتظار المراجعة",
    desc: (i) => `«${i.eventTitle}» قيد مراجعة فريق نكفيك`,
    link: () => "/dashboard/events",
    cta: "عرض الفعاليات",
  },
  draft: {
    icon: FileEdit,
    color: "bg-[#F1EFF4] text-[#5F5968]",
    title: "مسودة لم تُنشر",
    desc: (i) => `«${i.eventTitle}» ما زالت مسودة — أكملها وانشرها`,
    link: (i) => `/dashboard/events/${i.eventId}/edit`,
    cta: "إكمال الفعالية",
  },
  startingSoon: {
    icon: Clock3,
    color: "bg-secondary text-primary",
    title: "فعالية اقترب موعدها",
    desc: (i) => `«${i.eventTitle}» تبدأ ${i.detail} — جهّز قوائم الضيوف ونقاط الدخول`,
    link: (i) => `/dashboard/events/${i.eventId}/guests`,
    cta: "تجهيز الضيوف",
  },
  almostFull: {
    icon: Flame,
    color: "bg-[#FDF3E3] text-[#9A5F12]",
    title: "المقاعد توشك على الامتلاء",
    desc: (i) => `«${i.eventTitle}» وصلت إلى ${i.detail} من سعتها`,
    link: (i) => `/dashboard/events/${i.eventId}/edit`,
    cta: "مراجعة السعة",
  },
  soldOut: {
    icon: AlertTriangle,
    color: "bg-[#FBECEA] text-[#B42F24]",
    title: "نفدت التذاكر",
    desc: (i) => `«${i.eventTitle}» اكتملت مقاعدها — فكّر بزيادة السعة`,
    link: (i) => `/dashboard/events/${i.eventId}/edit`,
    cta: "زيادة المقاعد",
  },
};

const ActionItems = () => {
  const { effectiveOrganization: organization } = useEffectiveUser();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title_ar, status, start_date, max_attendees, current_attendees_count")
        .eq("organization_id", organization.id)
        .order("start_date", { ascending: true })
        .limit(30);
      setItems(deriveActionItems((data || []) as any));
      setLoading(false);
    };
    load();
  }, [organization]);

  return (
    <Panel
      title="الإجراءات المطلوبة"
      actions={
        !loading && items.length > 0 ? (
          <span className="grid h-6 min-w-[24px] flex-none place-items-center rounded-full bg-[#FDF3E3] px-1.5 text-xs font-semibold text-[#9A5F12]">{items.length}</span>
        ) : undefined
      }
    >
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />)}
        </div>
      ) : items.length > 0 ? (
        <div className="divide-y divide-border">
          {items.map((item, i) => {
            const meta = typeMeta[item.type];
            return (
              <div key={`${item.type}-${item.eventId}-${i}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className={`grid h-9 w-9 flex-none place-items-center rounded-[10px] ${meta.color}`}>
                  <meta.icon className="h-[17px] w-[17px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-[22px]">{meta.title}</p>
                  <p className="text-xs leading-[18px] text-muted-foreground sm:truncate">{meta.desc(item)}</p>
                </div>
                <Button asChild variant="outline" size="sm" className="flex-none">
                  <Link to={meta.link(item)}>{meta.cta}</Link>
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title="لا توجد إجراءات مطلوبة حالياً"
          description="كل شيء تحت السيطرة"
          action={<Button asChild variant="outline" size="sm"><Link to="/dashboard/events">عرض الفعاليات</Link></Button>}
        />
      )}
    </Panel>
  );
};

export default ActionItems;
