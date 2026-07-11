import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
    color: "bg-amber-100 text-amber-700",
    title: "فعالية بانتظار المراجعة",
    desc: (i) => `«${i.eventTitle}» قيد مراجعة فريق نكفيك`,
    link: () => "/dashboard/events",
    cta: "عرض الفعاليات",
  },
  draft: {
    icon: FileEdit,
    color: "bg-muted text-muted-foreground",
    title: "مسودة لم تُنشر",
    desc: (i) => `«${i.eventTitle}» ما زالت مسودة — أكملها وانشرها`,
    link: (i) => `/dashboard/events/${i.eventId}/edit`,
    cta: "إكمال الفعالية",
  },
  startingSoon: {
    icon: Clock3,
    color: "bg-primary/10 text-primary",
    title: "فعالية اقترب موعدها",
    desc: (i) => `«${i.eventTitle}» تبدأ ${i.detail} — جهّز قوائم الضيوف ونقاط الدخول`,
    link: (i) => `/dashboard/events/${i.eventId}/guests`,
    cta: "تجهيز الضيوف",
  },
  almostFull: {
    icon: Flame,
    color: "bg-brand-brick/10 text-brand-brick",
    title: "المقاعد توشك على الامتلاء",
    desc: (i) => `«${i.eventTitle}» وصلت إلى ${i.detail} من سعتها`,
    link: (i) => `/dashboard/events/${i.eventId}/edit`,
    cta: "مراجعة السعة",
  },
  soldOut: {
    icon: AlertTriangle,
    color: "bg-destructive/10 text-destructive",
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-card rounded-2xl p-5 border border-border/50"
    >
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-foreground">الإجراءات المطلوبة</h3>
        {!loading && items.length > 0 && (
          <span className="text-[10px] font-bold bg-brand-brick/10 text-brand-brick rounded-full px-2 py-0.5">
            {items.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-muted/50 rounded-xl h-14" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, i) => {
            const meta = typeMeta[item.type];
            return (
              <div
                key={`${item.type}-${item.eventId}-${i}`}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-lg ${meta.color} flex items-center justify-center flex-shrink-0`}
                >
                  <meta.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground">{meta.title}</h4>
                  <p className="text-muted-foreground text-xs truncate">{meta.desc(item)}</p>
                </div>
                <Link
                  to={meta.link(item)}
                  className="text-primary text-xs font-bold hover:underline whitespace-nowrap mt-1.5"
                >
                  {meta.cta} ←
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <CheckCircle2 className="w-10 h-10 text-teal/40 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">لا توجد إجراءات مطلوبة حالياً — كل شيء تحت السيطرة 👌</p>
        </div>
      )}
    </motion.div>
  );
};

export default ActionItems;
