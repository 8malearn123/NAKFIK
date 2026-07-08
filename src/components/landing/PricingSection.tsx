import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Calendar, Users, ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { translateContent } from "@/lib/contentTranslations";

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
  display_order: number;
  target_type: string;
}

const PricingSection = () => {
  const { t, lang } = useLanguage();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"organizer" | "venue_owner">("organizer");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAr = lang === "ar";
  const currency = isAr ? "ر.س" : "SAR";

  useEffect(() => {
    supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("target_type")
      .order("display_order")
      .then(({ data }) => {
        setPlans(
          (data || []).map((p: any) => ({
            ...p,
            price: Number(p.price ?? p.price_per_event ?? p.price_monthly ?? 0),
            validity_months: p.validity_months || 1,
            features: Array.isArray(p.features) ? p.features : [],
          }))
        );
        setLoading(false);
      });
  }, []);

  const visiblePlans = plans.filter(p => p.target_type === tab);
  const hasVenuePlans = plans.some(p => p.target_type === "venue_owner");

  const scroll = (dir: "next" | "prev") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 340;
    // RTL inversion handled by browser when dir="rtl"
    el.scrollBy({ left: dir === "next" ? amount : -amount, behavior: "smooth" });
  };

  const popularIdx = visiblePlans.length > 1 ? Math.floor(visiblePlans.length / 2) : -1;

  return (
    <section id="pricing" className="py-28 bg-muted/30 relative overflow-hidden">
      <div className="absolute top-20 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-72 h-72 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <span className="inline-block bg-accent/10 text-accent rounded-full px-4 py-1.5 text-sm font-cairo font-semibold mb-4">{t("pricingSection.badge")}</span>
          <h2 className="font-cairo font-bold text-3xl md:text-4xl text-foreground mb-4">{t("pricingSection.title")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto font-cairo">{t("pricingSection.subtitle")}</p>
        </motion.div>

        {!loading && hasVenuePlans && (
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center bg-card border border-border/60 rounded-full p-1 shadow-sm">
              <button
                onClick={() => setTab("organizer")}
                className={`px-5 h-10 rounded-full text-sm font-cairo font-semibold transition-colors ${
                  tab === "organizer" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isAr ? "للمنظّمين" : "For Organizers"}
              </button>
              <button
                onClick={() => setTab("venue_owner")}
                className={`px-5 h-10 rounded-full text-sm font-cairo font-semibold transition-colors ${
                  tab === "venue_owner" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isAr ? "لأصحاب الأماكن" : "For Venues"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : visiblePlans.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground font-cairo">
            {isAr ? "لا توجد باقات متاحة حالياً" : "No plans available"}
          </div>
        ) : (
          <div className="relative max-w-6xl mx-auto">
            {/* Nav buttons */}
            {visiblePlans.length > 3 && (
              <>
                <button
                  onClick={() => scroll("prev")}
                  aria-label="prev"
                  className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background border border-border shadow-md items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scroll("next")}
                  aria-label="next"
                  className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background border border-border shadow-md items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </>
            )}

            <div
              ref={scrollRef}
              dir={isAr ? "rtl" : "ltr"}
              className="overflow-x-auto scroll-smooth snap-x snap-mandatory pb-6 -mx-4 px-4 [scrollbar-width:thin]"
            >
              <div className="flex gap-6 items-stretch">
                {visiblePlans.map((plan, i) => {
                  const isPopular = i === popularIdx;
                  const name = (isAr ? plan.name_ar : plan.name_en) || plan.name_ar;
                  const desc = isAr ? plan.description_ar : plan.description_ar;

                  const limits: { icon: typeof Calendar; label: string }[] = [];
                  limits.push({
                    icon: Calendar,
                    label: plan.max_events != null
                      ? (isAr ? `${plan.max_events} فعالية` : `${plan.max_events} event(s)`)
                      : (isAr ? "فعاليات غير محدودة" : "Unlimited events"),
                  });
                  limits.push({
                    icon: Calendar,
                    label: isAr
                      ? `صالحة لمدة ${plan.validity_months} شهر`
                      : `Valid for ${plan.validity_months} month(s)`,
                  });
                  if (plan.max_attendees_per_event != null) {
                    limits.push({
                      icon: Users,
                      label: isAr
                        ? `${plan.max_attendees_per_event} مسجل لكل فعالية`
                        : `${plan.max_attendees_per_event} attendees/event`,
                    });
                  }
                  if (plan.max_total_attendees != null) {
                    limits.push({
                      icon: Users,
                      label: isAr
                        ? `${plan.max_total_attendees} إجمالي الحضور`
                        : `${plan.max_total_attendees} total attendees`,
                    });
                  }
                  if (plan.whatsapp_quota) {
                    limits.push({
                      icon: Check,
                      label: isAr
                        ? `${plan.whatsapp_quota} رسالة واتساب`
                        : `${plan.whatsapp_quota} WhatsApp msgs`,
                    });
                  }

                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.4 }}
                      className={`relative bg-card rounded-2xl border-2 transition-all duration-300 overflow-hidden flex-shrink-0 w-[300px] snap-start flex flex-col ${
                        isPopular
                          ? "border-primary shadow-2xl"
                          : "border-border/50 hover:border-primary/30 hover:shadow-lg"
                      }`}
                    >
                      {isPopular && (
                        <div className="gradient-primary py-2 text-center">
                          <span className="text-primary-foreground text-xs font-cairo font-bold flex items-center justify-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            {t("pricingSection.mostPopular")}
                          </span>
                        </div>
                      )}
                      <div className="p-7 flex flex-col flex-1">
                        <div className="mb-5">
                          <h3 className="font-cairo font-bold text-xl text-foreground mb-1">{name}</h3>
                          {desc && <p className="text-muted-foreground text-sm font-cairo line-clamp-2">{desc}</p>}
                        </div>
                        <div className="mb-2">
                          <span className="font-cairo font-extrabold text-5xl text-foreground">
                            {plan.price === 0 ? (isAr ? "مجاناً" : "Free") : plan.price.toLocaleString()}
                          </span>
                          {plan.price > 0 && <span className="text-muted-foreground font-cairo ms-1 text-sm">{currency}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground font-cairo mb-6">
                          {plan.max_events != null
                            ? isAr
                              ? `لـ ${plan.max_events} فعالية • ${plan.validity_months} شهر`
                              : `For ${plan.max_events} event(s) • ${plan.validity_months} mo`
                            : isAr
                            ? `صالحة لمدة ${plan.validity_months} شهر`
                            : `${plan.validity_months} month(s)`}
                        </p>
                        <ul className="space-y-2.5 mb-6 flex-1">
                          {limits.map((l, li) => (
                            <li key={`l${li}`} className="flex items-start gap-2.5 text-sm font-cairo text-foreground/80">
                              <l.icon className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                              <span>{l.label}</span>
                            </li>
                          ))}
                          {plan.features.map((f, fi) => (
                            <li key={`f${fi}`} className="flex items-start gap-2.5 text-sm font-cairo text-foreground/80">
                              <Check className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                              <span>{translateContent(f, lang)}</span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          variant={isPopular ? "default" : "outline"}
                          className="w-full rounded-full"
                          size="lg"
                          asChild
                        >
                          <Link to="/register">
                            {plan.price === 0 ? (isAr ? "ابدأ مجاناً" : "Start Free") : isAr ? "اشترك الآن" : "Subscribe"}
                          </Link>
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {visiblePlans.length > 3 && (
              <p className="text-center text-xs text-muted-foreground font-cairo mt-2 md:hidden">
                {isAr ? "← اسحب لاستعراض المزيد →" : "← Swipe to see more →"}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;
