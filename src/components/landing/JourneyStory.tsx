import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import {
  AnimatePresence,
  motion,
  transform,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Check, ChevronLeft, ChevronRight, MessageCircle, Mic } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { cn } from "@/lib/utils";
import { CardName, EntryCard, InvitationCard } from "./LiveInvitation";
import SectionHeader from "./SectionHeader";
import { DEMO_TALLY, fillTemplate, type InvitationDemo } from "./invitationDemo";

// قصة الدعوة بالتمرير: مشهد مثبّت تتحرك فيه بطاقة واحدة مع نزول الزائر —
// تصغر وتدخل جوال الضيف رسالةً على واتساب، ثم تصير صفحة الدعوة فيضغط «سأحضر» ويصل الرد للمضيف،
// ثم تنقلب إلى رمز الدخول ويُمسح عند البوابة. النص بجانب المشهد يتبدل مع كل مرحلة.

type Props = { demo: InvitationDemo };
type Slot = { dx: number; dy: number; s: number };

const STEP_COLORS = ["bg-brand-brick", "bg-brand-gold", "bg-brand-teal", "bg-brand-purple"];
const EASE = [0.22, 1, 0.36, 1] as const;
const HIDDEN_FACE: CSSProperties = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };

// مواضع البطاقة على شريط التمرير (0 → 1): الكبيرة ← فقاعة واتساب ← صفحة الدعوة ← رمز الدخول
const KEYS = [0, 0.19, 0.29, 0.46, 0.55, 0.7, 0.79, 1];
const SLOT_AT_KEY = [0, 0, 1, 1, 2, 2, 3, 3];

// موضع العنصر داخل المشهد حسب التخطيط فقط — لا تؤثر فيه حركات الجوال الجارية
const layoutBox = (el: HTMLElement, root: HTMLElement) => {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
};

const Progress = ({ chapter, fill, rtl }: { chapter: number; fill: MotionValue<number>; rtl: boolean }) => (
  <div className="relative mt-6 flex w-44 items-center justify-between lg:mt-8 lg:w-56">
    <span className="absolute inset-x-1 top-[calc(50%-1.5px)] h-[3px] rounded-full bg-primary/10" />
    <motion.span
      className="absolute inset-x-1 top-[calc(50%-1.5px)] h-[3px] rounded-full bg-primary/40"
      style={{ scaleX: fill, originX: rtl ? 1 : 0 }}
    />
    {STEP_COLORS.map((color, i) => (
      <span
        key={color}
        className={cn(
          "relative h-3.5 w-3.5 rounded-full ring-4 ring-card transition-all duration-300",
          i <= chapter ? color : "bg-[hsl(271_15%_88%)]",
          i === chapter && "scale-[1.35]",
        )}
      />
    ))}
  </div>
);

// خط المسح ثم علامة الدخول — تُرسم فوق مربع الرمز داخل وجه البطاقة الخلفي
const Scanner = ({ active, done }: { active: boolean; done: boolean }) => (
  <>
    {active && !done && (
      <motion.span
        className="absolute inset-x-0 h-[1.2cqw] bg-[linear-gradient(90deg,transparent,#15867C,transparent)] shadow-[0_0_12px_#15867C]"
        initial={{ top: "4%" }}
        animate={{ top: ["4%", "94%", "4%"] }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
    )}
    <AnimatePresence>
      {done && (
        <motion.span
          className="absolute inset-0 flex items-center justify-center bg-white/75"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.span
            className="flex h-[16cqw] w-[16cqw] items-center justify-center rounded-full bg-brand-teal text-white shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 15 }}
          >
            <Check className="h-[9cqw] w-[9cqw]" />
          </motion.span>
        </motion.span>
      )}
    </AnimatePresence>
  </>
);

type ScreenProps = { demo: InvitationDemo; slotRef: RefObject<HTMLDivElement> };

const StatusBar = ({ dark }: { dark?: boolean }) => (
  <div
    dir="ltr"
    className={cn(
      "flex h-[11cqw] shrink-0 items-end justify-between px-[8cqw] pb-[1.4cqw] text-[3.2cqw] font-semibold",
      dark ? "text-white" : "text-[#111B21]",
    )}
  >
    <span>9:41</span>
    <span className="flex items-end gap-[0.8cqw]">
      {[1.6, 2.2, 2.8].map((h) => (
        <span key={h} className="w-[0.9cqw] rounded-full bg-current" style={{ height: `${h}cqw` }} />
      ))}
      <span className="ms-[1cqw] h-[2.6cqw] w-[5.4cqw] rounded-[0.8cqw] border border-current p-[0.35cqw]">
        <span className="block h-full w-3/4 rounded-[0.4cqw] bg-current" />
      </span>
    </span>
  </div>
);

// شاشة واتساب: رسالة الدعوة الواردة، وصورتها مكان البطاقة المتحركة
const ChatScreen = ({ demo, slotRef, banner }: ScreenProps & { banner: boolean }) => {
  const { copy, occasion, guestName, hasName, lang } = demo;
  const j = copy.journey;
  const Back = lang === "ar" ? ChevronRight : ChevronLeft;
  const message = fillTemplate(j.message, {
    name: guestName,
    title: occasion.shareTitle,
    by: occasion.business ? j.byBusiness : j.byPersonal,
    host: occasion.host,
    date: occasion.date,
    time: occasion.time,
  });
  const text = hasName ? message : message.split("\n").slice(1).join("\n");
  return (
    <div className="relative flex h-full flex-col bg-[#EFEAE2] text-[#111B21]">
      <div className="bg-white">
        <StatusBar />
        <div className="flex h-[13cqw] items-center gap-[2.5cqw] border-b border-black/5 px-[4cqw]">
          <Back className="h-[5cqw] w-[5cqw] shrink-0 text-[#54656F]" />
          <span className="flex h-[9cqw] w-[9cqw] shrink-0 items-center justify-center rounded-full bg-[#F4EFF5]">
            <BrandMark className="h-[6cqw] w-[6cqw]" />
          </span>
          <span className="min-w-0 truncate text-[3.7cqw] font-bold">{occasion.host}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-[2.5cqw] p-[3.5cqw]">
        <span className="mx-auto rounded-[2cqw] bg-white/85 px-[3cqw] py-[0.8cqw] text-[2.7cqw] text-[#54656F] shadow-sm">{j.today}</span>
        <div className="w-[66cqw] self-start rounded-[3cqw] rounded-ss-none bg-white p-[1.8cqw] shadow-sm">
          <div ref={slotRef} className="aspect-[3/4] w-full rounded-[2cqw] bg-[#F0EBF3]" />
          <p className="mt-[1.8cqw] line-clamp-3 whitespace-pre-line px-[0.8cqw] text-[3.1cqw] leading-[1.5]">{text}</p>
          <p dir="ltr" className="truncate px-[0.8cqw] text-end text-[3.1cqw] text-[#027EB5] underline">
            {window.location.host}/invite/7f3c…
          </p>
          <p className="mt-[0.6cqw] px-[0.8cqw] text-end text-[2.5cqw] text-[#667781]">{j.sentAt}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-[2cqw] px-[3cqw] pb-[5cqw] pt-[1.5cqw]">
        <span className="flex h-[10cqw] flex-1 items-center rounded-full bg-white px-[4cqw] text-[3.2cqw] text-[#8696A0]">
          {j.typeMessage}
        </span>
        <span className="flex h-[10cqw] w-[10cqw] items-center justify-center rounded-full bg-[#00A884] text-white">
          <Mic className="h-[4.6cqw] w-[4.6cqw]" />
        </span>
      </div>
      {/* إشعار وصول الرسالة ينزل من أعلى الشاشة */}
      <AnimatePresence>
        {banner && (
          <motion.div
            className="absolute inset-x-[3cqw] top-[11cqw] z-30 flex items-center gap-[2.5cqw] rounded-[4cqw] bg-white/95 p-[2.5cqw] shadow-lg backdrop-blur"
            initial={{ y: "-140%" }}
            animate={{ y: 0 }}
            exit={{ y: "-140%" }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <span className="flex h-[8cqw] w-[8cqw] shrink-0 items-center justify-center rounded-[2.2cqw] bg-[#25D366] text-white">
              <MessageCircle className="h-[5cqw] w-[5cqw]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[3cqw] font-bold">{occasion.host}</span>
              <span className="block truncate text-[2.8cqw] text-[#54656F]">{text.split("\n").slice(-2).join(" ")}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// صفحة الدعوة كما يراها الضيف (بخلفيتها الفعلية في PrivateInvitation): البطاقة في الأعلى وزر «سأحضر» يُضغط
const PageScreen = ({ demo, slotRef, chapter, pressed }: ScreenProps & { chapter: number; pressed: boolean }) => {
  const { copy, style } = demo;
  const { hero } = copy;
  return (
    <div className="flex h-full flex-col items-center" style={{ background: `linear-gradient(135deg, ${style.theme}, ${style.accent})` }}>
      <div className="w-full">
        <StatusBar dark />
      </div>
      <div ref={slotRef} className="mt-[3cqw] aspect-[3/4] w-[72cqw]" />
      <div className="mt-[4cqw] w-[84cqw] rounded-[4cqw] bg-white p-[4cqw] text-center">
        {pressed ? (
          <motion.div
            className="flex flex-col items-center gap-[1.6cqw] py-[1.4cqw]"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <span className="flex h-[10cqw] w-[10cqw] items-center justify-center rounded-full bg-teal text-white">
              <Check className="h-[6cqw] w-[6cqw]" />
            </span>
            <span className="text-[3.6cqw] font-bold text-teal">{hero.confirmed}</span>
          </motion.div>
        ) : (
          <>
            <p className="text-[3.6cqw] font-bold" style={{ color: style.theme }}>
              {hero.ask}
            </p>
            <div className="mt-[3cqw] grid grid-cols-2 gap-[2cqw]">
              <span
                className="relative flex h-[10cqw] items-center justify-center overflow-hidden rounded-[2.5cqw] text-[3.3cqw] font-bold text-white"
                style={{ background: style.theme }}
              >
                {hero.yes}
                {/* لمسة إصبع على الزر قبل الرد */}
                {chapter === 2 && (
                  <motion.span
                    className="absolute h-[9cqw] w-[9cqw] rounded-full bg-white/50"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.6], opacity: [0.8, 0] }}
                    transition={{ duration: 0.6, delay: 0.35 }}
                  />
                )}
              </span>
              <span className="flex h-[10cqw] items-center justify-center rounded-[2.5cqw] border border-black/10 text-[3.3cqw] font-bold text-black/70">
                {hero.no}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// شاشة رمز الدخول عند البوابة
const TicketScreen = ({ demo, slotRef, scanned }: ScreenProps & { scanned: boolean }) => {
  const j = demo.copy.journey;
  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-[#0E0B12] pb-[4cqw] text-white">
      <div className="absolute inset-x-0 top-0">
        <StatusBar dark />
      </div>
      <p className="text-[3.2cqw] text-white/60">{j.gate}</p>
      <div ref={slotRef} className="mt-[3cqw] aspect-[3/4] w-[80cqw]" />
      <p className="mt-[5cqw] flex items-center gap-[1.6cqw] text-[3.6cqw] font-bold">
        {scanned ? (
          <>
            <Check className="h-[4.6cqw] w-[4.6cqw] text-[hsl(172_60%_62%)]" />
            <span className="text-[hsl(172_60%_62%)]">{j.checkedIn}</span>
          </>
        ) : (
          <span className="text-white/60">{j.scanning}</span>
        )}
      </p>
    </div>
  );
};

const JourneyStory = ({ demo }: Props) => {
  const { copy, lang, occasion, style, guestName } = demo;
  const j = copy.journey;
  const rtl = lang === "ar";

  // مسار التمرير الذي يُثبَّت فيه المشهد (بعد رأس القسم)
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const homeRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  // الفرق بين موضع البطاقة الكبيرة وكل موضع تنتقل إليه داخل الجوال
  const slots = useRef<Slot[]>(Array.from({ length: 4 }, () => ({ dx: 0, dy: 0, s: 1 })));
  const [home, setHome] = useState<{ left: number; top: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const els = [homeRef.current, chatRef.current, pageRef.current, ticketRef.current];
      if (els.some((el) => !el)) return;
      const boxes = els.map((el) => layoutBox(el as HTMLElement, stage));
      const base = boxes[0];
      slots.current = boxes.map((b) => ({
        dx: b.x + b.w / 2 - (base.x + base.w / 2),
        dy: b.y + b.h / 2 - (base.y + base.h / 2),
        s: b.w / base.w,
      }));
      setHome({ left: base.x, top: base.y, width: base.w });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const { scrollYProgress: p } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  // كل القيم تُحسب بدوال لا بمصفوفات: framer-motion ينقل تحويلات المصفوفات إلى ViewTimeline الأصلي في المتصفح،
  // وهذا يقيس التقدم في القسم المثبت بشكل مختلف فتخرج الشفافية عن تزامنها مع البطاقة.
  const between = (input: number[], output: number[]) => (v: number) => transform(v, input, output);
  const along = (key: keyof Slot) => (v: number) =>
    transform(v, KEYS, SLOT_AT_KEY.map((i) => slots.current[i][key]));
  const cardX = useTransform(p, along("dx"));
  const cardY = useTransform(p, along("dy"));
  const cardScale = useTransform(p, along("s"));
  const cardTilt = useTransform(p, between([0, 0.19, 0.29], rtl ? [4, 4, 0] : [-4, -4, 0]));
  const cardFlip = useTransform(p, between([0.71, 0.8], [0, 180]));
  const phoneOpacity = useTransform(p, between([0.16, 0.24], [0, 1]));
  const phoneY = useTransform(p, between([0.16, 0.27], [48, 0]));
  const phoneScale = useTransform(p, between([0.16, 0.27], [0.92, 1]));
  const chatOpacity = useTransform(p, between([0.21, 0.26, 0.47, 0.51], [0, 1, 1, 0]));
  const pageOpacity = useTransform(p, between([0.47, 0.51, 0.71, 0.75], [0, 1, 1, 0]));
  const ticketOpacity = useTransform(p, between([0.71, 0.75], [0, 1]));
  const progressFill = useTransform(p, between([0.02, 0.9], [0, 1]));

  const [chapter, setChapter] = useState(0);
  useMotionValueEvent(p, "change", (v) => {
    const next = Math.min(3, Math.max(0, Math.floor(v * 4)));
    setChapter((current) => (current === next ? current : next));
  });

  // لحظات صغيرة تتكرر كلما وصل الزائر لمرحلتها: وصول الرسالة، الضغط على «سأحضر»، مسح الرمز
  const [banner, setBanner] = useState(false);
  useEffect(() => {
    if (chapter !== 1) {
      setBanner(false);
      return;
    }
    setBanner(true);
    const timer = setTimeout(() => setBanner(false), 2600);
    return () => clearTimeout(timer);
  }, [chapter]);

  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    if (chapter < 2) {
      setPressed(false);
      return;
    }
    const timer = setTimeout(() => setPressed(true), chapter === 2 ? 950 : 0);
    return () => clearTimeout(timer);
  }, [chapter]);

  const [scanned, setScanned] = useState(false);
  useEffect(() => {
    if (chapter < 3) {
      setScanned(false);
      return;
    }
    const timer = setTimeout(() => setScanned(true), 1300);
    return () => clearTimeout(timer);
  }, [chapter]);

  const { hero } = copy;

  return (
    <section id="how" className="relative scroll-mt-16 bg-card pt-20 lg:pt-28">
      <div className="container mx-auto px-4">
        <SectionHeader title={j.title} lede={fillTemplate(j.lede, { name: guestName })} className="mb-0 lg:mb-0" />
      </div>
      <ol className="sr-only">
        {j.steps.map((step) => (
          <li key={step.title}>
            {step.title}: {step.body}
          </li>
        ))}
      </ol>

      {/* يبدأ المسار تحت الرأس مباشرة: المشهد المثبت له حشوة علوية للشريط، فيتداخل معها بدل فراغ كبير */}
      <div ref={trackRef} className="relative h-[400vh] lg:-mt-10">
        <div className="sticky top-0 flex h-screen flex-col overflow-hidden pt-16 supports-[height:100svh]:h-[100svh]">
          <div className="container mx-auto grid flex-1 content-center items-center gap-6 px-4 py-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
            <div aria-hidden>
              <Progress chapter={chapter} fill={progressFill} rtl={rtl} />
              <div className="relative mt-5 min-h-[8.5rem] lg:mt-10 lg:min-h-[15rem]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={chapter}
                    initial={{ opacity: 0, y: 26 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    <h3 className="font-kufi text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-[1.1] text-primary">
                      {j.steps[chapter].title}
                    </h3>
                    <p className="mt-3 max-w-md text-[15px] leading-[1.85] text-foreground/70 lg:mt-6 lg:text-lg">
                      {j.steps[chapter].body}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div
              ref={stageRef}
              aria-hidden
              className="relative mx-auto aspect-[4/5] w-[min(100%,calc((100svh_-_22rem)*0.8))] lg:w-[min(100%,34rem,calc((100svh_-_9rem)*0.8))]"
            >
              <div className="pointer-events-none absolute inset-[4%] rounded-full bg-[radial-gradient(closest-side,hsl(34_58%_52%/0.22),transparent)] blur-2xl" />
              {/* موضع البطاقة الكبيرة في بداية القصة */}
              <div ref={homeRef} className="absolute left-[19%] top-[16.9%] aspect-[3/4] w-[62%]" />

              <motion.div
                className="absolute left-[24%] top-[5%] aspect-[9/19.5] w-[52%]"
                style={{ opacity: phoneOpacity, y: phoneY, scale: phoneScale, containerType: "inline-size" }}
              >
                <div className="relative h-full w-full rounded-[15cqw] bg-[#15101A] p-[3.2cqw] shadow-[0_40px_80px_-30px_rgb(42_26_48/0.65)] ring-1 ring-white/10">
                  <div className="relative h-full w-full overflow-hidden rounded-[12cqw] bg-white">
                    <span className="absolute left-1/2 top-[2.4cqw] z-40 h-[7cqw] w-[28cqw] -translate-x-1/2 rounded-full bg-[#15101A]" />
                    <motion.div className="absolute inset-0" style={{ opacity: chatOpacity }}>
                      <ChatScreen demo={demo} slotRef={chatRef} banner={banner} />
                    </motion.div>
                    <motion.div className="absolute inset-0" style={{ opacity: pageOpacity }}>
                      <PageScreen demo={demo} slotRef={pageRef} chapter={chapter} pressed={pressed} />
                    </motion.div>
                    <motion.div className="absolute inset-0" style={{ opacity: ticketOpacity }}>
                      <TicketScreen demo={demo} slotRef={ticketRef} scanned={scanned} />
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              {/* البطاقة نفسها تنتقل بين المواضع مع التمرير، وتنقلب في النهاية إلى رمز الدخول */}
              {home && (
                <motion.div
                  className="absolute z-30"
                  style={{
                    left: home.left,
                    top: home.top,
                    width: home.width,
                    x: cardX,
                    y: cardY,
                    scale: cardScale,
                    rotate: cardTilt,
                    perspective: 1600,
                  }}
                >
                  <motion.div className="relative" style={{ rotateY: cardFlip, transformStyle: "preserve-3d" }}>
                    <div style={HIDDEN_FACE}>
                      <InvitationCard occasion={occasion} style={style} name={<CardName name={guestName} accent={style.accent} />} />
                    </div>
                    <div className="absolute inset-0" style={{ ...HIDDEN_FACE, transform: "rotateY(180deg)" }}>
                      <EntryCard demo={demo} overlay={<Scanner active={chapter === 3} done={scanned} />} />
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* الرد يصل للمضيف لحظة الضغط */}
              <AnimatePresence>
                {pressed && chapter === 2 && (
                  <motion.div
                    className="absolute -end-[3%] top-[9%] z-40 w-[48%] rounded-2xl border border-border/60 bg-card p-3 text-start shadow-xl"
                    initial={{ opacity: 0, y: -12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: 0.35, duration: 0.35, ease: EASE }}
                  >
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <BrandMark className="h-3.5 w-3.5" />
                      {hero.hostNotice}
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-foreground">{guestName}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-teal/10 px-2.5 py-0.5 text-xs font-bold text-teal">{hero.hostConfirmed}</span>
                      <span className="text-xs text-muted-foreground">
                        <b className="text-base text-foreground">{DEMO_TALLY.confirmed + 1}</b> {hero.confirmedCount}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JourneyStory;
