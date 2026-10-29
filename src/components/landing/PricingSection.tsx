import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { translateContent } from "@/lib/contentTranslations";
import { PUBLIC_EVENTS_ENABLED } from "@/lib/phase";
import { cn } from "@/lib/utils";
import SectionHeader, { SECTION_SPACING } from "./SectionHeader";

interface Plan {
  id: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
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

// باقات تقديرية تظهر ما دامت قاعدة البيانات لم تُرجع باقات (قبل إضافتها أو عند تعذّر الاتصال)،
// وتحل محلها الباقات الفعلية تلقائياً فور وصولها. ميزاتها مترجمة في contentTranslations.
const ESTIMATED_PLANS: Plan[] = [
  {
    id: "estimate-small",
    name_ar: "مناسبة صغيرة",
    name_en: "Small occasion",
    description_ar: "لمناسبة عائلية أو لقاء خاص بعدد محدود من الضيوف",
    description_en: "For a family occasion or a private gathering with a short guest list",
    price: 199,
    max_events: 1,
    validity_months: 3,
    max_attendees_per_event: 100,
    max_total_attendees: null,
    whatsapp_quota: 100,
    features: ["تصميم بطاقة الدعوة", "رابط خاص لكل ضيف", "تأكيد الحضور والمرافقين", "رمز دخول QR"],
    display_order: 1,
    target_type: "organizer",
  },
  {
    id: "estimate-large",
    name_ar: "مناسبة كبيرة",
    name_en: "Large occasion",
    description_ar: "لحفلات الزفاف والمناسبات الكبيرة بكل تفاصيلها",
    description_en: "For weddings and large occasions, with every detail covered",
    price: 499,
    max_events: 1,
    validity_months: 3,
    max_attendees_per_event: 500,
    max_total_attendees: null,
    whatsapp_quota: 500,
    features: ["كل مميزات المناسبة الصغيرة", "تذكير قبل الموعد", "بوابات دخول وخروج", "تصنيف الضيوف VIP", "تقارير الحضور"],
    display_order: 2,
    target_type: "organizer",
  },
  {
    id: "estimate-organizer",
    name_ar: "باقة المنظّم",
    name_en: "Organizer",
    description_ar: "لمن ينظّم مناسبات متكررة طوال العام",
    description_en: "For organizers running occasions all year round",
    price: 1499,
    max_events: 10,
    validity_months: 12,
    max_attendees_per_event: 1000,
    max_total_attendees: null,
    whatsapp_quota: 5000,
    features: ["كل مميزات المناسبة الكبيرة", "فريق عمل بصلاحيات", "قوائم ضيوف محفوظة", "تصدير التقارير", "دعم أولوية"],
    display_order: 3,
    target_type: "organizer",
  },
];

// العدد مع معدوده بقواعد العربية: واحد، مثنى، جمع (3-10)، مفرد منصوب (11-99)، مفرد (المئات فأكثر)
type ArabicNoun = { one: string; two: string; few: string; many: string; hundreds: string };
// صيغة المعدود وحده بعد رقم مكتوب (للأرقام الكبيرة في بطاقة الباقة)
const wordAr = (n: number, noun: ArabicNoun) => {
  const tail = n % 100;
  return tail >= 3 && tail <= 10 ? noun.few : tail >= 11 ? noun.many : noun.hundreds;
};
const countAr = (n: number, noun: ArabicNoun) => {
  if (n === 1) return noun.one;
  if (n === 2) return noun.two;
  return `${n.toLocaleString("en-US")} ${wordAr(n, noun)}`;
};
type EnglishNoun = { one: string; many: string };
const countEn = (n: number, noun: EnglishNoun) => `${n.toLocaleString("en-US")} ${n === 1 ? noun.one : noun.many}`;

const MONTH: ArabicNoun = { one: "شهر واحد", two: "شهرين", few: "أشهر", many: "شهراً", hundreds: "شهر" };
const MESSAGE: ArabicNoun = { one: "رسالة واحدة", two: "رسالتين", few: "رسائل", many: "رسالة", hundreds: "رسالة" };
// المرحلة الأولى دعوات خاصة: "مناسبة" و"ضيف"، وعند فتح الفعاليات العامة: "فعالية" و"مسجل"
const EVENT: ArabicNoun = PUBLIC_EVENTS_ENABLED
  ? { one: "فعالية واحدة", two: "فعاليتين", few: "فعاليات", many: "فعالية", hundreds: "فعالية" }
  : { one: "مناسبة واحدة", two: "مناسبتين", few: "مناسبات", many: "مناسبة", hundreds: "مناسبة" };
const PERSON: ArabicNoun = PUBLIC_EVENTS_ENABLED
  ? { one: "مسجل واحد", two: "مسجلَين", few: "مسجلين", many: "مسجلاً", hundreds: "مسجل" }
  : { one: "ضيف واحد", two: "ضيفين", few: "ضيوف", many: "ضيفاً", hundreds: "ضيف" };
const EVENT_EN: EnglishNoun = PUBLIC_EVENTS_ENABLED ? { one: "event", many: "events" } : { one: "occasion", many: "occasions" };
const PERSON_EN: EnglishNoun = PUBLIC_EVENTS_ENABLED ? { one: "attendee", many: "attendees" } : { one: "guest", many: "guests" };
const MONTH_EN: EnglishNoun = { one: "month", many: "months" };
const MESSAGE_EN: EnglishNoun = { one: "WhatsApp message", many: "WhatsApp messages" };

type Spec = { value: string; label: string };

const PricingSection = () => {
  const { t, lang } = useLanguage();
  const [plans, setPlans] = useState<Plan[]>(ESTIMATED_PLANS);
  const [estimated, setEstimated] = useState(true);
  const [tab, setTab] = useState<"organizer" | "venue_owner">("organizer");
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
        if (!data?.length) return;
        setPlans(
          data.map((p) => ({
            ...p,
            price: Number(p.price ?? p.price_per_event ?? p.price_monthly ?? 0),
            validity_months: p.validity_months || 1,
            display_order: p.display_order ?? 0,
            features: Array.isArray(p.features) ? (p.features as string[]) : [],
          }))
        );
        setEstimated(false);
      });
  }, []);

  const visiblePlans = plans.filter((p) => p.target_type === tab);
  const hasVenuePlans = plans.some((p) => p.target_type === "venue_owner");
  const popularIdx = visiblePlans.length > 1 ? Math.floor(visiblePlans.length / 2) : -1;

  // ما تشمله الباقة بجملة واحدة، وأهم رقمين فيها بخط كبير للمقارنة السريعة
  const describe = (plan: Plan) => {
    const events =
      plan.max_events != null
        ? isAr
          ? countAr(plan.max_events, EVENT)
          : countEn(plan.max_events, EVENT_EN)
        : isAr
          ? `${EVENT.few} غير محدودة`
          : `Unlimited ${EVENT_EN.many}`;
    const months = isAr ? countAr(plan.validity_months, MONTH) : countEn(plan.validity_months, MONTH_EN);
    const summary = isAr ? `${events} صالحة لمدة ${months}` : `${events}, valid for ${months}`;

    const guests = plan.max_attendees_per_event ?? plan.max_total_attendees;
    const perEvent = plan.max_attendees_per_event != null;
    const specs: Spec[] = [
      {
        value: guests != null ? guests.toLocaleString("en-US") : isAr ? "بلا حد" : "No limit",
        label: isAr
          ? `${guests != null ? wordAr(guests, PERSON) : PERSON.few} ${perEvent ? (PUBLIC_EVENTS_ENABLED ? "لكل فعالية" : "لكل مناسبة") : "إجمالاً"}`
          : `${guests === 1 ? PERSON_EN.one : PERSON_EN.many} ${perEvent ? `per ${EVENT_EN.one}` : "in total"}`,
      },
    ];
    if (plan.whatsapp_quota) {
      specs.push({
        value: plan.whatsapp_quota.toLocaleString("en-US"),
        label: isAr ? `${wordAr(plan.whatsapp_quota, MESSAGE)} واتساب` : plan.whatsapp_quota === 1 ? MESSAGE_EN.one : MESSAGE_EN.many,
      });
    }
    return { summary, specs };
  };

  return (
    <section id="pricing" className={`relative scroll-mt-16 ${SECTION_SPACING}`}>
      <div className="container relative mx-auto px-4">
        <SectionHeader title={t("pricingSection.title")} lede={t("pricingSection.subtitle")} />

        {hasVenuePlans && (
          <div className="mb-12 flex">
            <div className="inline-flex items-center rounded-full border border-border/60 bg-card p-1 shadow-sm">
              {(["organizer", "venue_owner"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn(
                    "h-10 rounded-full px-5 font-cairo text-sm font-semibold transition-colors",
                    tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {key === "organizer" ? (isAr ? "للمنظّمين" : "For Organizers") : isAr ? "لأصحاب الأماكن" : "For Venues"}
                </button>
              ))}
            </div>
          </div>
        )}

        {visiblePlans.length === 0 ? (
          <p className="py-12 text-center font-cairo text-muted-foreground">{isAr ? "لا توجد باقات متاحة حالياً" : "No plans available"}</p>
        ) : (
          <div className="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))] lg:gap-7">
            {visiblePlans.map((plan, i) => {
              const featured = i === popularIdx;
              const name = (isAr ? plan.name_ar : plan.name_en) || plan.name_ar;
              const desc = isAr ? plan.description_ar : plan.description_en || plan.description_ar;
              const { summary, specs } = describe(plan);
              return (
                <article
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-[1.75rem] p-7 transition-shadow duration-300 lg:p-8",
                    featured
                      ? "bg-night-raised text-white shadow-[0_34px_70px_-30px_hsl(271_35%_18%/0.8)] lg:-my-5 lg:py-[3.25rem]"
                      : "border border-border/70 bg-card text-foreground shadow-[0_1px_2px_rgb(42_26_48/0.04)] hover:shadow-[0_24px_50px_-30px_rgb(42_26_48/0.35)]",
                  )}
                >
                  {featured && (
                    <span className="absolute -top-3.5 start-7 inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-3.5 py-1 text-xs font-bold text-white shadow-md lg:start-8">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      {t("pricingSection.mostPopular")}
                    </span>
                  )}

                  <h3 className="font-kufi text-[1.625rem] font-bold leading-tight">{name}</h3>
                  {desc && (
                    <p className={cn("mt-2 min-h-[2.75rem] text-sm leading-relaxed", featured ? "text-white/65" : "text-muted-foreground")}>{desc}</p>
                  )}

                  <p className="mt-4 flex items-baseline gap-2">
                    <span className="font-kufi text-[3.4rem] font-bold leading-none">
                      {plan.price === 0 ? (isAr ? "مجاناً" : "Free") : plan.price.toLocaleString("en-US")}
                    </span>
                    {plan.price > 0 && <span className={cn("text-base", featured ? "text-white/60" : "text-muted-foreground")}>{currency}</span>}
                  </p>
                  <p className={cn("mt-3 text-sm", featured ? "text-white/70" : "text-foreground/60")}>{summary}</p>

                  <dl className="mt-7 grid grid-cols-2 gap-3">
                    {specs.map((spec) => (
                      <div key={spec.label} className={cn("flex flex-col-reverse rounded-2xl px-4 py-3.5", featured ? "bg-white/[0.08]" : "bg-muted/70")}>
                        <dt className={cn("mt-1.5 text-xs leading-snug", featured ? "text-white/60" : "text-muted-foreground")}>{spec.label}</dt>
                        <dd className="font-kufi text-2xl font-bold leading-none">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>

                  {plan.features.length > 0 && (
                    <ul className={cn("mt-7 flex-1 space-y-3 border-t pt-7 text-sm", featured ? "border-white/15" : "border-border/70")}>
                      {plan.features.map((feature, fi) => (
                        <li key={fi} className={cn("flex items-start gap-2.5", featured ? "text-white/85" : "text-foreground/80")}>
                          <Check className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-brand-gold" : "text-teal")} aria-hidden />
                          <span>{translateContent(feature, lang)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button
                    asChild
                    size="lg"
                    variant={featured ? "default" : "outline"}
                    className={cn(
                      "mt-8 w-full rounded-full",
                      featured ? "bg-white text-primary shadow-none hover:bg-white/90" : "border-primary/25 bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
                    )}
                  >
                    <Link to="/register">
                      {plan.price === 0 ? (isAr ? "ابدأ مجاناً" : "Start free") : isAr ? "اختر هذه الباقة" : "Choose this plan"}
                    </Link>
                  </Button>
                </article>
              );
            })}
          </div>
        )}

        {estimated && visiblePlans.length > 0 && (
          <p className="mt-12 text-sm text-muted-foreground">
            {isAr ? "الأسعار تقديرية وقد تتغير عند الإطلاق." : "Prices are indicative and may change at launch."}
          </p>
        )}
      </div>
    </section>
  );
};

export default PricingSection;
