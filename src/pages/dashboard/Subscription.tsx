import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PricingPage from "@/components/billing/PricingPage";
import SubscriptionUsageCard from "@/components/dashboard/SubscriptionUsageCard";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge from "@/components/app/StatusBadge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanScope, PLAN_SCOPE_META, type PlanScope } from "@/hooks/usePlanScope";
import { PUBLIC_EVENTS_ENABLED } from "@/lib/phase";
import { cn } from "@/lib/utils";
import { Mail, Calendar, Sparkles } from "lucide-react";

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
    toast.success(`تم التحويل إلى ${PLAN_SCOPE_META[next].label}`);
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
      toast.success("تم تفعيل الباقة بنجاح!");
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
      <div className="space-y-6">
        <PageHeader
          title="باقات الاشتراك"
          description="اختر الباقة المناسبة — كل باقة تحتوي على عدد محدد من الفعاليات وصلاحية زمنية"
        />

        {/* المرحلة الأولى: باقة الدعوات الخاصة فقط — لا تُعرض خيارات الفعاليات العامة */}
        {!PUBLIC_EVENTS_ENABLED && (
          <Panel title="نوع الباقة">
            <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
                <Mail className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold leading-6">{PLAN_SCOPE_META.private.label}</p>
                  <StatusBadge tone="primary">باقتك الحالية</StatusBadge>
                </div>
                <p className="mt-0.5 text-xs leading-[18px] text-muted-foreground">{PLAN_SCOPE_META.private.desc}</p>
              </div>
            </div>
          </Panel>
        )}

        {/* نوع الباقة — يحدد الميزات الظاهرة في الحساب (دعوات خاصة / فعاليات عامة / شاملة) */}
        {PUBLIC_EVENTS_ENABLED && (
          <Panel title="نوع الباقة" description="يحدد الميزات والصفحات الظاهرة في حسابك — الصفحات خارج باقتك تُخفى بالكامل">
            <div className="grid gap-3 lg:grid-cols-3">
              {(Object.keys(PLAN_SCOPE_META) as PlanScope[]).map((k) => {
                const Icon = SCOPE_ICONS[k];
                const active = scope === k;
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={switching}
                    aria-pressed={active}
                    onClick={() => switchScope(k)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl p-4 text-start transition-colors disabled:opacity-60",
                      active ? "bg-secondary ring-2 ring-primary" : "bg-muted/50 hover:bg-muted",
                    )}
                  >
                    <span className={cn("grid h-9 w-9 flex-none place-items-center rounded-[10px] text-primary", active ? "bg-card" : "bg-secondary")}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold leading-6">{PLAN_SCOPE_META[k].label}</span>
                        {active && <StatusBadge tone="primary" className="bg-card">باقتك الحالية</StatusBadge>}
                      </span>
                      <span className="mt-0.5 block text-xs leading-[18px] text-muted-foreground">{PLAN_SCOPE_META[k].desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>
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
