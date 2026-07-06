import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Calendar, Users } from "lucide-react";

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

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  if (plans.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">لا توجد خطط متاحة حالياً</div>;
  }

  // popular = middle plan based on display order
  const popularIdx = Math.floor(plans.length / 2);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-4 -mx-4 px-4 scroll-smooth snap-x snap-mandatory">
        <div className="flex gap-4 min-w-min">
          {plans.map((plan, i) => {
            const isCurrent = plan.id === currentPlanId;
            const isPopular = i === popularIdx && plans.length > 1;

            const limits: { icon: typeof Calendar; label: string }[] = [];
            limits.push({ icon: Calendar, label: plan.max_events != null ? `${plan.max_events} فعالية` : "فعاليات غير محدودة" });
            limits.push({ icon: Calendar, label: `صالحة لمدة ${plan.validity_months} شهر` });
            if (plan.max_attendees_per_event != null) limits.push({ icon: Users, label: `${plan.max_attendees_per_event} مسجل لكل فعالية` });
            if (plan.max_total_attendees != null) limits.push({ icon: Users, label: `${plan.max_total_attendees} إجمالي الحضور` });
            if (plan.whatsapp_quota) limits.push({ icon: Check, label: `${plan.whatsapp_quota} رسالة واتساب` });

            return (
              <div key={plan.id} className={`relative bg-card rounded-2xl border-2 p-6 transition-all flex-shrink-0 w-[300px] snap-start flex flex-col ${
                isPopular ? "border-primary shadow-lg" : "border-border/50"
              } ${isCurrent ? "ring-2 ring-teal" : ""}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-[10px]">
                      <Star className="w-3 h-3 ml-1" /> الأكثر شيوعاً
                    </Badge>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="font-bold text-lg text-foreground">{plan.name_ar}</h3>
                  {plan.description_ar && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.description_ar}</p>}
                </div>

                <div className="mb-2">
                  <span className="text-3xl font-bold text-foreground">{plan.price === 0 ? "مجاناً" : Number(plan.price).toLocaleString()}</span>
                  {plan.price > 0 && <span className="text-sm text-muted-foreground mr-1">ر.س</span>}
                </div>
                <div className="mb-6 text-xs text-muted-foreground">
                  {plan.max_events != null
                    ? `لـ ${plan.max_events} ${plan.max_events === 1 ? "فعالية" : "فعاليات"} • ${plan.validity_months} شهر`
                    : `${plan.validity_months} شهر`}
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {limits.map((l, li) => (
                    <li key={`l${li}`} className="flex items-start gap-2 text-sm text-foreground">
                      <l.icon className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                      <span>{l.label}</span>
                    </li>
                  ))}
                  {plan.features.map((f, fi) => (
                    <li key={`f${fi}`} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button disabled className="w-full rounded-xl" variant="outline">الخطة الحالية</Button>
                ) : (
                  <Button className={`w-full rounded-xl ${isPopular ? "bg-primary hover:bg-primary/90" : "bg-teal hover:bg-teal/90 text-teal-foreground"}`}
                    onClick={() => onSelectPlan?.(plan.id)}>
                    {plan.price === 0 ? "ابدأ مجاناً" : "اشترك الآن"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {plans.length > 3 && (
        <p className="text-center text-xs text-muted-foreground">← اسحب لاستعراض المزيد من الخطط →</p>
      )}
    </div>
  );
};

export default PricingPage;
