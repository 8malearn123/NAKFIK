import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Check, PenLine, X } from "lucide-react";
import { OrnamentBorder } from "@/components/design/Ornaments";
import BrandMark from "@/components/BrandMark";
import { cn } from "@/lib/utils";
import type { Occasion } from "@/i18n/pages/landing";
import { DEMO_TALLY, OCCASION_STYLES, type InvitationDemo, type OccasionStyle } from "./invitationDemo";

// البطاقة الحية في واجهة الصفحة الرئيسية: الزائر يكتب اسم ضيفه على البطاقة،
// يبدّل نوع المناسبة، ثم يجرّب رد الضيف (سأحضر ← رمز الدخول) كما في صفحة الدعوة الفعلية.
// المقاسات داخل البطاقة بوحدة cqw لتتناسب مع عرض البطاقة في أي شاشة.

const CARD_SHADOW =
  "0 1px 2px rgb(42 26 48 / 0.12), 0 14px 28px -10px rgb(42 26 48 / 0.32), 0 40px 70px -30px rgb(42 26 48 / 0.45)";
const HIDDEN_FACE: CSSProperties = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };

const surface = (s: OccasionStyle): CSSProperties => ({
  background: `linear-gradient(160deg, ${s.theme}, ${s.deep})`,
  boxShadow: CARD_SHADOW,
  containerType: "inline-size",
});

// الإطار المزدوج نفسه في تخطيط "framed" بقوالب الدعوات
const Frame = ({ accent }: { accent: string }) => (
  <>
    <div className="pointer-events-none absolute inset-[3.5cqw] rounded-[3cqw] border" style={{ borderColor: `${accent}aa` }} />
    <div className="pointer-events-none absolute inset-[5.6cqw] rounded-[2.2cqw] border" style={{ borderColor: `${accent}55` }} />
  </>
);

type CardProps = { occasion: Occasion; style: OccasionStyle; name: ReactNode; className?: string };

export const InvitationCard = ({ occasion, style, name, className }: CardProps) => (
  <div className={cn("relative aspect-[3/4] w-full overflow-hidden rounded-[5.9%/4.4%] text-white", className)} style={surface(style)}>
    <OrnamentBorder style={style.ornament} color={style.accent} />
    <Frame accent={style.accent} />
    <div className="relative z-10 flex h-full flex-col items-center justify-center px-[11cqw] text-center">
      <p className="text-[3.9cqw] leading-relaxed" style={{ color: style.accent }}>{occasion.lead}</p>
      <div className="my-[1.6cqw] w-full">{name}</div>
      <p className="text-[3.9cqw] leading-relaxed text-white/80">{occasion.connector}</p>
      <h3 className="mt-[1cqw] text-[9cqw] font-bold leading-snug" style={{ fontFamily: style.headingFont }}>
        {occasion.title}
      </h3>
      <span className="my-[4.5cqw] h-px w-[16cqw]" style={{ background: style.accent }} />
      <p className="text-[3.9cqw] leading-relaxed text-white/85">{occasion.message}</p>
      <div className="mt-[4.5cqw] text-[3.5cqw] leading-[1.8] text-white/70">
        <p>{occasion.date}</p>
        <p>{occasion.time}</p>
        <p>{occasion.venue}</p>
      </div>
    </div>
  </div>
);

const BackCard = ({ style }: { style: OccasionStyle }) => (
  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[5.9%/4.4%]" style={surface(style)}>
    <OrnamentBorder style={style.ornament} color={style.accent} />
    <Frame accent={style.accent} />
  </div>
);

// حجم خط الاسم يصغر مع الأسماء الطويلة حتى يبقى على سطر واحد — والحروف اللاتينية أعرض من العربية
const nameSize = (name: string) => {
  const length = [...name].length;
  const steps = /[A-Za-z]/.test(name) ? [9, 7.4, 5.8, 4] : [10, 10, 8.4, 7];
  return `${steps[length > 20 ? 3 : length > 14 ? 2 : length > 10 ? 1 : 0]}cqw`;
};

const DottedLine = ({ accent }: { accent: string }) => (
  <span
    aria-hidden
    className="absolute inset-x-[2cqw] bottom-0 border-b-2 border-dotted opacity-60 transition-opacity group-focus-within:border-solid group-focus-within:opacity-100"
    style={{ borderColor: accent }}
  />
);

// الاسم مكتوباً على البطاقة بلا تحرير (للخاتمة)
export const CardName = ({ name, accent }: { name: string; accent: string }) => (
  <p className="relative whitespace-nowrap px-[7cqw] pb-[1cqw] font-ruqaa font-bold leading-[1.55]" style={{ fontSize: nameSize(name), color: accent }}>
    {name}
    <DottedLine accent={accent} />
  </p>
);

// سطر الاسم المنقّط: حقل كتابة حقيقي، يُكتب فيه الاسم الافتراضي بحركة حبر عند أول تحميل فقط
type NameFieldProps = { demo: InvitationDemo; rtl: boolean; focusable: boolean; writeIn: boolean };

const NameField = ({ demo, rtl, focusable, writeIn }: NameFieldProps) => {
  const { nameValue, setName, style, copy } = demo;
  return (
    <label className="group relative block cursor-text">
      <span className="sr-only">{copy.hero.nameLabel}</span>
      <motion.input
        value={nameValue}
        onChange={(e) => setName(e.target.value)}
        maxLength={28}
        placeholder={copy.hero.nameLabel}
        autoComplete="off"
        spellCheck={false}
        tabIndex={focusable ? 0 : -1}
        className="relative z-10 block w-full bg-transparent px-[7cqw] pb-[1cqw] text-center font-ruqaa font-bold leading-[1.55] outline-none placeholder:text-white/35"
        style={{ fontSize: nameSize(nameValue), color: style.accent }}
        initial={writeIn ? { clipPath: rtl ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" } : false}
        animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
        transition={{ delay: 0.6, duration: 1.5, ease: [0.65, 0, 0.35, 1] }}
      />
      <DottedLine accent={style.accent} />
      <PenLine
        aria-hidden
        className="absolute bottom-[2.4cqw] end-[1.5cqw] h-[4.6cqw] w-[4.6cqw] opacity-70"
        style={{ color: style.accent }}
      />
    </label>
  );
};

// وجه رمز الدخول — overlay يُرسم فوق مربع الرمز نفسه (خط المسح وعلامة الدخول في قصة التمرير)
export const EntryCard = ({ demo, overlay }: { demo: InvitationDemo; overlay?: ReactNode }) => {
  const { style, copy, guestName, occasion } = demo;
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[5.9%/4.4%] text-white" style={surface(style)}>
      <Frame accent={style.accent} />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-[11cqw] text-center">
        <p className="text-[3.9cqw]" style={{ color: style.accent }}>{copy.hero.entryCode}</p>
        <div className="relative mt-[3.5cqw] overflow-hidden rounded-[4cqw] bg-white p-[3.5cqw]">
          <QRCodeSVG value={`${window.location.origin}/`} fgColor={style.deep} style={{ width: "38cqw", height: "38cqw" }} />
          {overlay}
        </div>
        <p className="mt-[5cqw] whitespace-nowrap font-ruqaa font-bold leading-tight" style={{ fontSize: nameSize(guestName) }}>
          {guestName}
        </p>
        <p className="mt-[2cqw] text-[3.6cqw] text-white/75">{occasion.shareTitle}</p>
        <p className="mt-[6cqw] text-[3.5cqw] text-white/65">{copy.hero.showAtDoor}</p>
      </div>
    </div>
  );
};

const LiveInvitation = ({ demo }: { demo: InvitationDemo }) => {
  const reduce = useReducedMotion();
  const { lang, copy, occasion, style, rsvp, setRsvp, setOccasion, guestName } = demo;
  const rtl = lang === "ar";
  const flipped = rsvp === "confirmed";
  // حركة كتابة الاسم تظهر عند تحميل الصفحة فقط، لا عند تبديل المناسبة
  const writeIn = useRef(!reduce);
  useEffect(() => {
    writeIn.current = false;
  }, []);

  // ميلان البطاقة مع المؤشر ولمعة ضوء تتبعه — على الأجهزة ذات المؤشر الدقيق فقط
  const canTilt = !reduce && typeof window.matchMedia === "function" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const springy = { stiffness: 140, damping: 16, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), springy);
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), springy);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgb(255 255 255 / 0.55), transparent 55%)`;
  const [hovering, setHovering] = useState(false);
  const track = (e: PointerEvent<HTMLDivElement>) => {
    if (!canTilt) return;
    const box = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - box.left) / box.width);
    py.set((e.clientY - box.top) / box.height);
    setHovering(true);
  };
  const settle = () => {
    px.set(0.5);
    py.set(0.5);
    setHovering(false);
  };

  const list = copy.occasions;
  const at = list.findIndex((o) => o.key === occasion.key);
  const next = list[(at + 1) % list.length];
  const prev = list[(at - 1 + list.length) % list.length];
  // البطاقة التالية في ترتيب القراءة تظهر جهة نهاية السطر
  const side = rtl ? -1 : 1;
  const fan = [
    { o: prev, x: -17 * side, r: -6 * side },
    { o: next, x: 17 * side, r: 6 * side },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[32rem]">
      {/* على الشاشات العريضة تتقلص البطاقة مع ارتفاع الشاشة حتى تظهر هي وأزرار الرد في الشاشة الأولى */}
      <div
        className="relative mx-auto w-[min(100%,23rem)] lg:w-[min(100%,23rem,max(17rem,calc((100svh_-_15rem)*0.75)))]"
        style={{ perspective: 1600 }}
        onPointerMove={track}
        onPointerLeave={settle}
      >
        {/* ضوء دافئ يتنفس خلف البطاقات */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-[22%] bg-[radial-gradient(closest-side,hsl(34_58%_52%/0.5),hsl(351_27%_51%/0.2)_55%,transparent)] blur-2xl"
          animate={reduce ? undefined : { opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div className="relative" style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
          {fan.map(({ o, x, r }, i) => (
            <motion.div
              key={`${o.key}-${x}`}
              aria-hidden
              onClick={() => setOccasion(o.key)}
              className="absolute inset-0 cursor-pointer"
              initial={reduce ? false : { x: "0%", rotate: 0, scale: 0.9 }}
              animate={{ x: `${x}%`, rotate: r, scale: 0.9, y: reduce ? 0 : [0, -8, 0] }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
                y: { duration: 5 + i * 1.5, delay: 0.8, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <BackCard style={OCCASION_STYLES[o.key]} />
            </motion.div>
          ))}

          <motion.div
            key={occasion.key}
            className="relative"
            style={{ transformStyle: "preserve-3d" }}
            initial={reduce ? false : { opacity: 0, y: 14, rotate: -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="relative"
              style={{ transformStyle: "preserve-3d" }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 110, damping: 17 }}
            >
              <div className="relative" style={HIDDEN_FACE} aria-hidden={flipped}>
                <InvitationCard occasion={occasion} style={style} name={<NameField demo={demo} rtl={rtl} focusable={!flipped} writeIn={writeIn.current} />} />
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-20 rounded-[5.9%/4.4%] mix-blend-soft-light transition-opacity duration-500"
                  style={{ backgroundImage: glare, opacity: hovering ? 1 : 0 }}
                />
              </div>
              <div className="absolute inset-0" style={{ ...HIDDEN_FACE, transform: "rotateY(180deg)" }} aria-hidden={!flipped}>
                <EntryCard demo={demo} />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {rsvp !== "pending" && (
            <motion.div
              key={rsvp}
              initial={reduce ? false : { opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ delay: reduce ? 0 : 0.35, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -top-6 end-3 z-30 w-56 rounded-2xl border border-border/60 bg-card p-3.5 text-start shadow-xl sm:-end-16"
            >
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <BrandMark className="h-3.5 w-3.5" />
                {copy.hero.hostNotice}
              </p>
              <p className="mt-1 truncate text-sm font-bold text-foreground">{guestName}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    flipped ? "bg-teal/10 text-teal" : "bg-destructive/10 text-destructive",
                  )}
                >
                  {flipped ? copy.hero.hostConfirmed : copy.hero.hostDeclined}
                </span>
                {flipped && (
                  <span className="text-xs text-muted-foreground">
                    <b className="text-base text-foreground">{DEMO_TALLY.confirmed + 1}</b> {copy.hero.confirmedCount}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        aria-live="polite"
        className="relative mx-auto mt-5 flex min-h-[6.5rem] w-[min(100%,23.5rem)] flex-col justify-center rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-lg"
      >
        {rsvp === "pending" ? (
          <>
            <p className="text-center text-sm font-bold" style={{ color: style.theme }}>{copy.hero.ask}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRsvp("confirmed")}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                style={{ background: style.theme }}
              >
                <Check className="h-4 w-4" aria-hidden />
                {copy.hero.yes}
              </button>
              <button
                type="button"
                onClick={() => setRsvp("declined")}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-bold text-foreground/80 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4" aria-hidden />
                {copy.hero.no}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold",
                flipped ? "bg-teal/10 text-teal" : "bg-muted text-foreground/70",
              )}
            >
              <Check className="h-4 w-4" aria-hidden />
              {flipped ? copy.hero.confirmed : copy.hero.declined}
            </span>
            <button
              type="button"
              onClick={() => setRsvp("pending")}
              className="rounded text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copy.hero.change}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveInvitation;
