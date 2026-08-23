import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PricingPage from "@/components/billing/PricingPage";
import SubscriptionUsageCard from "@/components/dashboard/SubscriptionUsageCard";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanScope, PLAN_SCOPE_META, type PlanScope } from "@/hooks/usePlanScope";
import { PUBLIC_EVENTS_ENABLED } from "@/lib/phase";
import { Mail, Calendar, Sparkles, Check } from "lucide-react";

const SCOPE_ICONS: Record<PlanScope, typeof Mail> = { private: Mail, public: Calendar, both: Sparkles };

const OrganizerSubscription = () => {
  const { user, organization, refreshProfile } = useAuth();
  const { scope } = usePlanScope();
  const [activating, setActivating] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [switching, setSwitching] = useState(false);

  // تغيير نطاق الباقة — يتحكم مباشرة بالميزات الظاهرة في الحساب
  const switchScope = async (next: PlanScope) => {
    if (!organization || next === scope) return;
    setSwitching(true);
    const { error } = await supabase
      .from("organizations")
      .update({ plan_scope: next } as any)
      .eq("id", organization.id);
    setSwitching(false);
    if (error) {
      toast.error("تعذّر تغيير الباقة — شغّل ملف nakfik_plan_scope.sql في Supabase أولاً");
      return;
    }
    toast.success(`تم التحويل إلى ${PLAN_SCOPE_META[next].label} ✅`);
    await refreshProfile();
  };

  const handleSelect = async (planId: string) => {
    if (!user) {
      toast.error("يرجى تسجيل الدخول");
      return;
    }
    setActivating(planId);
    try {
      // Cancel any existing active subscription for this user
      await supabase
        .from("account_subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("account_id", user.id)
        .eq("status", "active");

      // Trigger will auto-fill events_quota + expires_at from the plan
      const { error } = await supabase.from("account_subscriptions").insert({
        account_id: user.id,
        account_type: "organizer",
        plan_id: planId,
        status: "active",
        billing_cycle: "per_event",
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } as any);

      if (error) throw error;
      toast.success("تم تفعيل الباقة بنجاح! 🎉");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "تعذّر تفعيل الباقة");
    } finally {
      setActivating(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="font-bold text-2xl text-foreground">باقات الاشتراك</h1>
          <p className="text-muted-foreground text-sm mt-1">
            اختر الباقة المناسبة — كل باقة تحتوي على عدد محدد من الفعاليات وصلاحية زمنية
          </p>
        </div>

        {/* المرحلة الأولى: باقة الدعوات الخاصة فقط — لا تُعرض خيارات الفعاليات العامة */}
        {!PUBLIC_EVENTS_ENABLED && (
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <h2 className="font-bold text-foreground mb-1">نوع الباقة</h2>
            <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 flex items-start gap-3">
              <Mail className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">{PLAN_SCOPE_META.private.label}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{PLAN_SCOPE_META.private.desc}</p>
              </div>
              <span className="mr-auto text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2.5 py-1 flex-shrink-0">باقتك الحالية</span>
            </div>
          </div>
        )}

        {/* نوع الباقة — يحدد الميزات الظاهرة في الحساب (دعوات خاصة / فعاليات عامة / شاملة) */}
        {PUBLIC_EVENTS_ENABLED && (
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <h2 className="font-bold text-foreground mb-1">نوع الباقة</h2>
          <p className="text-xs text-muted-foreground mb-4">
            يحدد الميزات والصفحات الظاهرة في حسابك — الصفحات خارج باقتك تُخفى بالكامل
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {(Object.keys(PLAN_SCOPE_META) as PlanScope[]).map((k) => {
              const Icon = SCOPE_ICONS[k];
              const active = scope === k;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={switching}
                  onClick={() => switchScope(k)}
                  className={`relative rounded-xl border-2 p-4 text-start transition-all ${
                    active ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
                  } ${switching ? "opacity-60" : ""}`}
                >
                  {active && (
                    <span className="absolute top-2 start-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                  <Icon className={`w-6 h-6 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="font-bold text-sm">{PLAN_SCOPE_META[k].label}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{PLAN_SCOPE_META[k].desc}</p>
                  {active && <p className="text-[10px] font-bold text-primary mt-2">باقتك الحالية</p>}
                </button>
              );
            })}
          </div>
        </div>
        )}

        <div key={refreshKey}>
          <SubscriptionUsageCard />
        </div>

        <PricingPage targetType="organizer" onSelectPlan={handleSelect} />
      </div>
    </DashboardLayout>
  );
};

export default OrganizerSubscription;
