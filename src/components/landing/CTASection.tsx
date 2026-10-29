import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CardName, InvitationCard } from "./LiveInvitation";
import { SECTION_SPACING } from "./SectionHeader";
import { CLOSING_PHOTO } from "./photos";
import type { InvitationDemo } from "./invitationDemo";

// الخاتمة: نفس البطاقة التي كتب الزائر اسم ضيفه عليها في الأعلى، جاهزة للإرسال،
// فوق صورة قاعة بثرياتها معتّمة حتى يُقرأ النص، وتذوب في التذييل بنفس اللون الداكن.

type Props = { demo: InvitationDemo };

// الصورة تذوب أسفل القسم بقناع شفافية (لا بطبقة فوقها) حتى لا يظهر صفها الأخير خطاً فوق التذييل
const FADE_INTO_FOOTER = {
  maskImage: "linear-gradient(to bottom, #000 55%, transparent)",
  WebkitMaskImage: "linear-gradient(to bottom, #000 55%, transparent)",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
};

const TITLE_SIZE = {
  ar: "text-[clamp(2.4rem,4.8vw,4.4rem)]",
  en: "text-[clamp(2.2rem,3.7vw,3.5rem)]",
};

const CTASection = ({ demo }: Props) => {
  const reduce = useReducedMotion();
  const { copy, occasion, style, guestName } = demo;
  const closing = copy.closing;
  const [before, after] = closing.title.split("{name}");

  return (
    <section className={`relative overflow-hidden bg-night text-white ${SECTION_SPACING}`}>
      <img src={CLOSING_PHOTO} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70" style={FADE_INTO_FOOTER} />
      <div aria-hidden className="absolute inset-0 from-night/95 via-night/70 via-45% to-night/35 ltr:bg-gradient-to-r rtl:bg-gradient-to-l" />
      {/* على الشاشات الضيقة يمتد النص على كامل العرض فيحتاج تعتيماً متساوياً */}
      <div aria-hidden className="absolute inset-0 bg-night/50 lg:hidden" />
      <div className="container relative mx-auto grid items-center gap-16 px-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className={`font-kufi ${TITLE_SIZE[demo.lang]} font-bold leading-[1.25]`}>
            {before}
            <span className="font-ruqaa text-brand-gold">{guestName}</span>
            {after}
            <span className="block text-white/45">{closing.subtitle}</span>
          </h2>
          <p className="mt-7 max-w-xl text-lg leading-[1.9] text-white/75">{closing.body}</p>
          <Button
            asChild
            size="xl"
            className="mt-10 rounded-full bg-white px-9 text-primary shadow-[0_14px_40px_-14px_hsl(34_58%_52%/0.8)] hover:bg-white/90"
          >
            <Link to="/register">{closing.cta}</Link>
          </Button>
        </motion.div>
        <motion.div
          className="mx-auto w-full max-w-[17.5rem]"
          aria-hidden
          initial={{ opacity: 0, y: 40, rotate: 0 }}
          whileInView={{ opacity: 1, y: 0, rotate: demo.lang === "ar" ? 4 : -4 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* تطفو البطاقة ببطء تحت ضوء الثريات */}
          <motion.div
            animate={reduce ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="drop-shadow-[0_30px_45px_rgb(0_0_0/0.45)]"
          >
            <InvitationCard occasion={occasion} style={style} name={<CardName name={guestName} accent={style.accent} />} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
