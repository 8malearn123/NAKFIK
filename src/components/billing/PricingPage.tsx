import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/app/EmptyState";
import StatusBadge from "@/components/app/StatusBadge";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Check, Calendar, CreditCard, Users } from "lucide-react";

interface Plan {
  id: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  price: number;
  max_events: number | null;
  validity_months: number;
  max_attendees_per_event: number | null;
  max_total_attendees: number | null;
  whatsapp_quota: number | null;
  features: string[];
  badge_color: string | null;
  display_order: number;
}

interface PricingPageProps {
  targetType: "organizer";
  currentPlanId?: string;
  onSelectPlan?: (planId: string) => void;
}

// الأعداد بصياغة عربية صحيحة، مثل: 3 فعاليات، 50 فعالية، 12 شهراً
const eventsLabel = (n: number) => {
  if (n === 1) return "فعالية واحدة";
  if (n === 2) return "فعاليتين";
  return n <= 10 ? `${n} فعاليات` : `${formatNumber(n)} فعالية`;
};
const monthsLabel = (n: number) => {
  if (n === 1) return "شهر واحد";
  if (n === 2) return "شهرين";
  return n <= 10 ? `${n} أشهر` : `${formatNumber(n)} شهراً`;
};

const PricingPage = ({ targetType, currentPlanId, onSelectPlan }: PricingPageProps) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("subscription_plans").select("*")
      .eq("target_type", targetType).eq("is_active", true).order("display_order")
      .then(({ data }) => {
        setPlans((data || []).map((p: any) => ({
          ...p,
          price: p.price ?? p.price_per_event ?? 0,
          validity_months: p.validity_months || 1,
          features: Array.isArray(p.features) ? p.features : [],
        })));
        setLoading(false);
      });
  }, [targetType]);

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2">
        {[1, 2].map((i) => <div key={i} className="h-96 animate-pulse rounded-2xl bg-card shadow-soft" />)}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-2xl bg-card shadow-soft">
        <EmptyState icon={CreditCard} title="لا توجد خطط متاحة حالياً" />
      </div>
    );
  }

  // popular = middle plan based on display order
  const popularIdx = Math.floor(plans.length / 2);

  return (
    <div className={cn("grid gap-6 sm:grid-cols-2", plans.length === 3 && "xl:grid-cols-3", plans.length >= 4 && "xl:grid-cols-4")}>
      {plans.map((plan, i) => {
        const isCurrent = plan.id === currentPlanId;
        const isPopular = i === popularIdx && plans.length > 1;

        const limits: { icon: typeof Calendar; label: string }[] = [];
        limits.push({ icon: Calendar, label: plan.max_events != null ? eventsLabel(plan.max_events) : "فعاليات غير محدودة" });
        limits.push({ icon: Calendar, label: `صالحة لمدة ${monthsLabel(plan.validity_months)}` });
        if (plan.max_attendees_per_event != null) limits.push({ icon: Users, label: `${formatNumber(plan.max_attendees_per_event)} مسجل لكل فعالية` });
        if (plan.max_total_attendees != null) limits.push({ icon: Users, label: `${formatNumber(plan.max_total_attendees)} إجمالي الحضور` });
        if (plan.whatsapp_quota) limits.push({ icon: Check, label: `${formatNumber(plan.whatsapp_quota)} رسالة واتساب` });

        return (
          <div key={plan.id} className="flex min-w-0 flex-col rounded-2xl bg-card p-6 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 text-[15px] font-bold leading-6">{plan.name_ar}</h3>
              {isPopular && <StatusBadge tone="primary">الأكثر شيوعاً</StatusBadge>}
            </div>
            {plan.description_ar && <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-muted-foreground">{plan.description_ar}</p>}

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-[32px] font-bold leading-10">{plan.price === 0 ? "مجاناً" : formatNumber(Number(plan.price))}</span>
              {plan.price > 0 && <span className="text-sm font-semibold text-muted-foreground">ر.س</span>}
            </div>
            <p className="mt-0.5 text-xs leading-[18px] text-muted-foreground">
              {plan.max_events != null
                ? `لـ ${eventsLabel(plan.max_events)}، ${monthsLabel(plan.validity_months)}`
                : monthsLabel(plan.validity_months)}
            </p>

            <ul className="mb-6 mt-5 flex-1 space-y-2.5 border-t border-border pt-5">
              {limits.map((l, li) => (
                <li key={`l${li}`} className="flex items-start gap-2.5 text-sm">
                  <l.icon className="mt-0.5 h-4 w-4 flex-none text-primary" />
                  <span>{l.label}</span>
                </li>
              ))}
              {plan.features.map((f, fi) => (
                <li key={`f${fi}`} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {isCurrent ? (
              <Button disabled className="w-full" variant="outline">الخطة الحالية</Button>
            ) : (
              <Button className="w-full" variant={isPopular ? "default" : "soft"} onClick={() => onSelectPlan?.(plan.id)}>
                {plan.price === 0 ? "ابدأ مجاناً" : "اشترك الآن"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PricingPage;
