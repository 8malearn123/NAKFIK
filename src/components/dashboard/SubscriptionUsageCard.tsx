import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, AlertTriangle, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";

interface SubRow {
  id: string;
  status: string;
  events_quota: number;
  events_used: number;
  expires_at: string | null;
  current_period_end: string;
  plan_id: string;
}

interface PlanRow {
  name_ar: string;
  max_events: number | null;
  validity_months: number;
}

const SubscriptionUsageCard = () => {
  const { effectiveUserId } = useEffectiveUser();
  const [sub, setSub] = useState<SubRow | null>(null);
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveUserId) return;
    (async () => {
      setLoading(true);
      const { data: subData } = await supabase
        .from("account_subscriptions")
        .select("id, status, events_quota, events_used, expires_at, current_period_end, plan_id")
        .eq("account_id", effectiveUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subData) {
        setSub(subData as SubRow);
        const { data: planData } = await supabase
          .from("subscription_plans")
          .select("name_ar, max_events, validity_months")
          .eq("id", subData.plan_id)
          .maybeSingle();
        setPlan(planData as PlanRow | null);
      }
      setLoading(false);
    })();
  }, [effectiveUserId]);

  if (loading) {
    return <div className="bg-card rounded-2xl p-5 border border-border/50 animate-pulse h-40" />;
  }

  if (!sub) {
    return (
      <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-5 border border-primary/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">لا يوجد اشتراك نشط</h3>
            <p className="text-muted-foreground text-xs">اشترك في باقة لتتمكن من إنشاء فعاليات</p>
          </div>
        </div>
        <Button asChild className="rounded-full w-full sm:w-auto" size="sm">
          <Link to="/dashboard/subscription">عرض الباقات</Link>
        </Button>
      </div>
    );
  }

  const quota = sub.events_quota || plan?.max_events || 0;
  const used = sub.events_used || 0;
  const remaining = Math.max(0, quota - used);
  const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;

  const expiresAt = sub.expires_at ? new Date(sub.expires_at) : null;
  const now = new Date();
  const isExpired = sub.status === "expired" || (expiresAt && expiresAt <= now);
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isExhausted = quota > 0 && remaining === 0;
  const warning = isExpired || isExhausted || (daysLeft !== null && daysLeft <= 7);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-5 border ${warning ? "border-destructive/30 bg-destructive/5" : "border-border/50 bg-card"}`}
    >
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${warning ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}>
            {warning ? <AlertTriangle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-foreground truncate">{plan?.name_ar || "باقتك"}</h3>
            <p className="text-muted-foreground text-xs">
              {isExpired ? "انتهت الصلاحية" : `${remaining} فعالية متبقية من ${quota}`}
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant={warning ? "default" : "outline"} className="rounded-full flex-shrink-0">
          <Link to="/dashboard/subscription">{warning ? "ترقية" : "إدارة"}</Link>
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              الفعاليات المستخدمة
            </span>
            <span className="font-semibold text-foreground">{used} / {quota || "∞"}</span>
          </div>
          <Progress value={pct} className={`h-2 ${pct >= 90 ? "[&>div]:bg-destructive" : pct >= 70 ? "[&>div]:bg-amber-500" : ""}`} />
        </div>

        {expiresAt && (
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              تنتهي في
            </span>
            <span className={`font-semibold ${isExpired ? "text-destructive" : daysLeft !== null && daysLeft <= 7 ? "text-amber-600" : "text-foreground"}`}>
              {expiresAt.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
              {!isExpired && daysLeft !== null && ` (${daysLeft} يوم)`}
            </span>
          </div>
        )}

        {isExhausted && !isExpired && (
          <p className="text-destructive text-xs font-semibold pt-1">
            لقد استنفدت رصيدك من الفعاليات. يرجى الترقية لإنشاء فعاليات جديدة.
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default SubscriptionUsageCard;
