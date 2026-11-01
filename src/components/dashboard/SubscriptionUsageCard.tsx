import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { daysLeftLabel, formatDate, formatNumber } from "@/lib/format";

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

// عدد الفعاليات المتبقية بصياغة عربية صحيحة
const remainingLabel = (n: number) => {
  if (n === 1) return "فعالية واحدة متبقية";
  if (n === 2) return "فعاليتان متبقيتان";
  if (n >= 3 && n <= 10) return `${n} فعاليات متبقية`;
  return `${formatNumber(n)} فعالية متبقية`;
};

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
    return <div className="h-40 animate-pulse rounded-2xl bg-card shadow-soft" />;
  }

  if (!sub) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-6 shadow-soft">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold leading-6">لا يوجد اشتراك نشط</h3>
          <p className="text-[13px] leading-5 text-muted-foreground">اشترك في باقة لتتمكن من إنشاء فعاليات</p>
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
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

  const barTone = pct >= 90 ? "bg-[#C0392B]" : pct >= 70 ? "bg-[#CC8E3D]" : "bg-primary";
  const expirySoon = daysLeft !== null && daysLeft <= 7;

  return (
    <div className="rounded-2xl bg-card p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <span className={`grid h-9 w-9 flex-none place-items-center rounded-[10px] ${warning ? "bg-[#FBECEA] text-[#B42F24]" : "bg-secondary text-primary"}`}>
          {warning ? <AlertTriangle className="h-[18px] w-[18px]" /> : <Sparkles className="h-[18px] w-[18px]" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold leading-6">{plan?.name_ar || "باقتك"}</h3>
          <p className="text-[13px] leading-5 text-muted-foreground">
            {isExpired ? "انتهت الصلاحية" : `${remainingLabel(remaining)} من ${formatNumber(quota)}`}
          </p>
        </div>
        <Button asChild size="sm" variant={warning ? "default" : "outline"} className="flex-none">
          <Link to="/dashboard/subscription">{warning ? "ترقية" : "إدارة"}</Link>
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs leading-[18px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              الفعاليات المستخدمة
            </span>
            <span className="font-semibold">{formatNumber(used)} من {quota ? formatNumber(quota) : "∞"}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#EFEDF2]">
            <div className={`h-full rounded-full ${barTone}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {expiresAt && (
          <div className="flex items-center justify-between gap-3 text-xs leading-[18px]">
            <span className="flex flex-none items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              تنتهي في
            </span>
            <span className={`text-end font-semibold ${isExpired ? "text-[#B42F24]" : expirySoon ? "text-[#9A5F12]" : ""}`}>
              {formatDate(expiresAt)}
              {!isExpired && daysLeft !== null && `، ${daysLeftLabel(sub.expires_at as string)}`}
            </span>
          </div>
        )}

        {isExhausted && !isExpired && (
          <p className="text-xs font-semibold leading-[18px] text-[#B42F24]">
            لقد استنفدت رصيدك من الفعاليات. يرجى الترقية لإنشاء فعاليات جديدة.
          </p>
        )}
      </div>
    </div>
  );
};

export default SubscriptionUsageCard;
