import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PricingPage from "@/components/billing/PricingPage";
import SubscriptionUsageCard from "@/components/dashboard/SubscriptionUsageCard";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const OrganizerSubscription = () => {
  const { user } = useAuth();
  const [activating, setActivating] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

        <div key={refreshKey}>
          <SubscriptionUsageCard />
        </div>

        <PricingPage targetType="organizer" onSelectPlan={handleSelect} />
      </div>
    </DashboardLayout>
  );
};

export default OrganizerSubscription;
