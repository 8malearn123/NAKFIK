import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PUBLIC_EVENTS_ENABLED } from "@/lib/phase";
import LiveInvitation from "./LiveInvitation";
import { HERO_PHOTO } from "./photos";
import type { InvitationDemo } from "./invitationDemo";

type Props = { demo: InvitationDemo };

// الجملة الإنجليزية أطول من العربية فتحتاج مقاساً أصغر لتبقى في ثلاثة أسطر
const TITLE_SIZE = {
  ar: "text-[clamp(2.9rem,6.2vw,5.6rem)]",
  en: "text-[clamp(2.6rem,4.6vw,4.4rem)]",
};

// الصورة تتلاشى بقناع شفافية لا بطبقات ملونة فوقها، وكل اتجاه في طبقة مستقلة.
// no-repeat ضروري: عرض الصورة بكسور البكسل يكرر القناع في آخر نصف بكسل فيظهر خط على الحافة.
const mask = (gradient: string): CSSProperties => ({
  maskImage: gradient,
  WebkitMaskImage: gradient,
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
});
const FADE_ENDS = mask("linear-gradient(to bottom, transparent, #000 14%, #000 80%, transparent)");

// صورة القاعة خلف البطاقة، معتّمة قليلاً حتى تبرز البطاقة
const HeroPhoto = ({ className, sideFade }: { className: string; sideFade?: CSSProperties }) => (
  <div aria-hidden className={`pointer-events-none ${className}`} style={sideFade}>
    <div className="absolute inset-0" style={FADE_ENDS}>
      <img src={HERO_PHOTO} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-night/40" />
    </div>
  </div>
);

const HeroSection = ({ demo }: Props) => {
  const { hero } = demo.copy;
  // على الشاشات العريضة تذوب الصورة جهة النص
  const towardText = mask(`linear-gradient(to ${demo.lang === "ar" ? "right" : "left"}, #000 38%, transparent 96%)`);

  return (
    // يملأ الشاشة الأولى بالضبط على الشاشات العريضة، فتظهر البطاقة وأزرار الرد معاً
    <section className="relative overflow-hidden pb-20 pt-28 lg:flex lg:min-h-[100svh] lg:items-center lg:pb-6 lg:pt-[5.5rem]">
      <HeroPhoto className="absolute inset-y-0 end-0 hidden w-[57%] lg:block" sideFade={towardText} />
      <div className="container relative mx-auto grid items-center gap-16 px-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
        <div className="max-w-[36rem]">
          <h1 className={`font-kufi ${TITLE_SIZE[demo.lang]} font-bold leading-[1.12] text-primary`}>
            {hero.title}
          </h1>
          <p className="mt-8 max-w-[33rem] text-lg leading-[1.9] text-foreground/70">{hero.lede}</p>
          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Button
              asChild
              size="xl"
              className="rounded-full px-9 shadow-[0_12px_30px_-12px_hsl(271_35%_26%/0.7)] transition-shadow hover:shadow-[0_16px_40px_-12px_hsl(34_58%_52%/0.75)]"
            >
              <Link to="/register">{hero.primary}</Link>
            </Button>
            {PUBLIC_EVENTS_ENABLED ? (
              <Link to="/events" className="text-base font-semibold text-primary underline-offset-8 hover:underline">
                {hero.browse}
              </Link>
            ) : (
              <a href="#how" className="text-base font-semibold text-primary underline-offset-8 hover:underline">
                {hero.secondary}
              </a>
            )}
          </div>
        </div>

        <div className="relative">
          <HeroPhoto className="absolute -inset-x-4 -inset-y-10 lg:hidden" />
          <LiveInvitation demo={demo} />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
