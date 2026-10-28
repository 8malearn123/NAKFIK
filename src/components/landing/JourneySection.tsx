import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { Check, CheckCheck, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import JourneyStory from "./JourneyStory";
import SectionHeader, { SECTION_SPACING } from "./SectionHeader";
import { DEMO_TALLY, OCCASION_STYLES, fillTemplate, type InvitationDemo } from "./invitationDemo";

// رحلة الدعوة بخطواتها الأربع، وكل خطوة تعرض ما يحدث فعلاً في المنصة
// لنفس الضيف الذي كتب الزائر اسمه على بطاقة الواجهة. الحركة تبدأ حين يصل الزائر للقسم:
// الرسالة تُكتب ثم تُقرأ، الأرقام تُعد، والبوابة تؤكد الدخول.

// ألوان نقاط سلسلة الشعار بالترتيب
const STEP_COLORS = ["bg-brand-brick", "bg-brand-gold", "bg-brand-teal", "bg-brand-purple"];
const EASE = [0.22, 1, 0.36, 1] as const;

type Props = { demo: InvitationDemo };
type ArtifactProps = Props & { live: boolean };

// عدّاد يصعد إلى القيمة عند ظهوره، ويتحرك بنعومة إذا تغيرت القيمة بعدها
export const CountUp = ({ value, live }: { value: number; live: boolean }) => {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    if (!live) return;
    if (reduce) {
      current.current = value;
      setShown(value);
      return;
    }
    const controls = animate(current.current, value, {
      duration: 1.2,
      ease: EASE,
      onUpdate: (v) => {
        current.current = v;
        setShown(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, live, reduce]);
  return <>{shown}</>;
};

const DesignArtifact = ({ demo, live }: ArtifactProps) => {
  const { copy, occasion, setOccasion } = demo;
  return (
    <div className="grid grid-cols-6 gap-2 md:grid-cols-3 md:gap-3" role="group" aria-label={copy.journey.templatesLabel}>
      {copy.occasions.map((o, i) => {
        const s = OCCASION_STYLES[o.key];
        const active = o.key === occasion.key;
        return (
          <motion.button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => setOccasion(o.key)}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={live ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.45, delay: 0.15 + i * 0.07, ease: EASE }}
            className={cn(
              "group relative aspect-[3/4] overflow-hidden rounded-lg transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:-translate-y-0.5",
            )}
            style={{ background: `linear-gradient(160deg, ${s.theme}, ${s.deep})` }}
          >
            <span className="absolute inset-1.5 rounded-[5px] border" style={{ borderColor: `${s.accent}88` }} />
            <span className="absolute inset-x-3 top-[38%] h-1 rounded-full" style={{ background: s.accent }} />
            <span className="absolute inset-x-4 top-[50%] h-0.5 rounded-full bg-white/60" />
            <span className="absolute inset-x-5 top-[58%] h-0.5 rounded-full bg-white/35" />
            <span className="sr-only">{o.label}</span>
          </motion.button>
        );
      })}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={live ? { opacity: 1, scale: 1 } : undefined}
        transition={{ duration: 0.45, delay: 0.15 + copy.occasions.length * 0.07, ease: EASE }}
        className="flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-primary/25 text-center text-[11px] font-semibold leading-tight text-primary/70"
      >
        <Upload className="h-4 w-4" aria-hidden />
        {copy.journey.uploadOwn}
      </motion.div>
    </div>
  );
};

const SendArtifact = ({ demo, live }: ArtifactProps) => {
  const reduce = useReducedMotion();
  const { copy, occasion, hasName, guestName } = demo;
  const j = copy.journey;
  // مراحل الرسالة: تُكتب ← تُرسل ← تُقرأ (العلامتان تصبحان زرقاوين)
  const [stage, setStage] = useState<"typing" | "sent" | "read">(reduce ? "read" : "typing");
  useEffect(() => {
    if (!live || reduce) return;
    const sent = setTimeout(() => setStage("sent"), 1100);
    const read = setTimeout(() => setStage("read"), 2300);
    return () => {
      clearTimeout(sent);
      clearTimeout(read);
    };
  }, [live, reduce]);

  const body = fillTemplate(j.message, {
    name: guestName,
    title: occasion.shareTitle,
    by: occasion.business ? j.byBusiness : j.byPersonal,
    host: occasion.host,
    date: occasion.date,
    time: occasion.time,
  });
  // مثل الرسالة التلقائية الفعلية: سطر الترحيب يظهر فقط إذا كان للضيف اسم
  const text = hasName ? body : body.split("\n").slice(1).join("\n");
  return (
    <div className="flex min-h-[15rem] flex-col justify-end rounded-2xl bg-[#EFEAE2] p-3">
      {stage === "typing" ? (
        <div className="ms-auto flex w-fit items-center gap-1 rounded-xl rounded-se-none bg-[#D9FDD3] px-3.5 py-3 shadow-sm" aria-hidden>
          {[0, 1, 2].map((d) => (
            <motion.span
              key={d}
              className="h-1.5 w-1.5 rounded-full bg-[#667781]"
              animate={live ? { opacity: [0.3, 1, 0.3], y: [0, -2, 0] } : undefined}
              transition={{ duration: 0.9, delay: d * 0.15, repeat: Infinity }}
            />
          ))}
        </div>
      ) : (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="ms-auto max-w-[95%] rounded-xl rounded-se-none bg-[#D9FDD3] px-3 pb-1.5 pt-2.5 text-[13px] leading-6 text-[#111B21] shadow-sm"
        >
          <p className="whitespace-pre-line">{text}</p>
          <p className="mt-2">
            {j.linkLabel}:{" "}
            <span dir="ltr" className="text-[#027EB5] underline">
              {window.location.host}/invite/7f3c…
            </span>
          </p>
          <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-[#667781]">
            {j.sentAt}
            <CheckCheck
              className={cn("h-3.5 w-3.5 transition-colors duration-500", stage === "read" ? "text-[#53BDEB]" : "text-[#8696A0]")}
              aria-hidden
            />
          </p>
        </motion.div>
      )}
    </div>
  );
};

const TrackArtifact = ({ demo, live }: ArtifactProps) => {
  const { copy, rsvp, guestName } = demo;
  const j = copy.journey;
  const answered = rsvp !== "pending";
  const tally = [
    { label: j.tally.confirmed, value: DEMO_TALLY.confirmed + (rsvp === "confirmed" ? 1 : 0), cls: "text-teal" },
    { label: j.tally.waiting, value: DEMO_TALLY.waiting - (answered ? 1 : 0), cls: "text-accent" },
    { label: j.tally.declined, value: DEMO_TALLY.declined + (rsvp === "declined" ? 1 : 0), cls: "text-destructive" },
  ];
  const statusCls = {
    confirmed: "bg-teal/10 text-teal",
    opened: "bg-accent/15 text-[hsl(34_58%_36%)]",
    sent: "bg-muted text-muted-foreground",
    declined: "bg-destructive/10 text-destructive",
  };
  const mine = rsvp === "confirmed" ? "confirmed" : rsvp === "declined" ? "declined" : "opened";
  const rows: { name: string; status: keyof typeof statusCls; extra?: string; mine?: boolean }[] = [
    { name: guestName, status: mine, mine: true },
    { name: j.guests[0], status: "confirmed", extra: `+2 ${j.companion}` },
    { name: j.guests[1], status: "sent" },
    { name: j.guests[2], status: "declined" },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <dl className="grid grid-cols-3 divide-x divide-border/70 border-b border-border/70 rtl:divide-x-reverse">
        {tally.map((t) => (
          <div key={t.label} className="px-2 py-3 text-center">
            <dt className="text-[11px] text-muted-foreground">{t.label}</dt>
            <dd className={cn("font-kufi text-xl font-bold tabular-nums", t.cls)}>
              <CountUp value={t.value} live={live} />
            </dd>
          </div>
        ))}
      </dl>
      <ul className="divide-y divide-border/60">
        {rows.map((r, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={live ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1, ease: EASE }}
            className={cn("flex items-center justify-between gap-2 px-3 py-2.5 text-[13px]", r.mine && "bg-accent/[0.07]")}
          >
            <span className="truncate font-semibold text-foreground">{r.name}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              {r.extra && <span className="text-[11px] text-muted-foreground">{r.extra}</span>}
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", statusCls[r.status])}>
                {j.status[r.status]}
              </span>
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
};

const WelcomeArtifact = ({ demo, live }: ArtifactProps) => {
  const { copy, rsvp, guestName, occasion } = demo;
  const j = copy.journey;
  // من اعتذر لا يُمسح رمزه — يظهر بدلاً منه ضيف آخر مؤكد
  const scanned = rsvp === "declined" ? j.guests[0] : guestName;
  return (
    <div className="overflow-hidden rounded-2xl bg-night-raised text-white shadow-sm">
      <div className="flex items-center justify-between px-4 pt-3.5 text-xs text-white/60">
        <span>{j.gate}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 font-bold text-white/80">{j.entry}</span>
      </div>
      <div className="flex flex-col items-center px-4 pb-5 pt-4 text-center">
        <span className="relative flex h-12 w-12 items-center justify-center">
          {/* نبضة ضوء لحظة المسح */}
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-brand-teal"
            initial={{ opacity: 0, scale: 1 }}
            animate={live ? { opacity: [0, 0.55, 0], scale: [1, 1, 2.1] } : undefined}
            transition={{ duration: 1.1, delay: 0.75, ease: "easeOut" }}
          />
          <motion.span
            className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal"
            initial={{ scale: 0 }}
            animate={live ? { scale: 1 } : undefined}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.6 }}
          >
            <Check className="h-6 w-6" aria-hidden />
          </motion.span>
        </span>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={live ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.45, delay: 0.95, ease: EASE }}
        >
          <p className="mt-2.5 text-sm font-bold text-[hsl(172_60%_62%)]">{j.checkedIn}</p>
          <p className="mt-1 font-ruqaa text-2xl font-bold leading-snug">{scanned}</p>
          <p className="text-xs text-white/55">
            {occasion.shareTitle} — {j.scannedAt}
          </p>
        </motion.div>
      </div>
      {rsvp !== "declined" && (
        <p className="border-t border-white/10 px-4 py-2.5 text-[12px] text-brand-gold">
          {j.guests[0]}: {j.already}
        </p>
      )}
    </div>
  );
};

const ARTIFACTS = [DesignArtifact, SendArtifact, TrackArtifact, WelcomeArtifact];

// كل خطوة تبدأ حركتها حين تظهر هي على الشاشة (على الجوال تتتابع مع التمرير)
const Step = ({ demo, index }: Props & { index: number }) => {
  const ref = useRef<HTMLLIElement>(null);
  const live = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const step = demo.copy.journey.steps[index];
  const Artifact = ARTIFACTS[index];
  return (
    <motion.li
      ref={ref}
      className="relative flex flex-col"
      initial={{ opacity: 0, y: 28 }}
      animate={live ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, delay: index * 0.14, ease: EASE }}
    >
      <div className="flex w-fit items-center gap-3 bg-card pe-4">
        <span
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ring-[6px] ring-card",
            STEP_COLORS[index],
          )}
        >
          {index + 1}
        </span>
        <h3 className="font-kufi text-2xl font-bold text-foreground">{step.title}</h3>
      </div>
      <p className="mt-4 min-h-[5.25rem] text-[15px] leading-[1.85] text-foreground/70">{step.body}</p>
      <div className="mt-6">
        <Artifact demo={demo} live={live} />
      </div>
    </motion.li>
  );
};

// العرض الثابت للخطوات الأربع: لمن فعّل "تقليل الحركة" أو شاشته أقصر من أن تتسع لمشهد التمرير
const JourneyGrid = ({ demo }: Props) => {
  const j = demo.copy.journey;
  const steps = useRef<HTMLOListElement>(null);
  const lineLive = useInView(steps, { once: true, margin: "0px 0px -15% 0px" });

  return (
    <section id="how" className={`scroll-mt-16 bg-card ${SECTION_SPACING}`}>
      <div className="container mx-auto px-4">
        <SectionHeader title={j.title} lede={fillTemplate(j.lede, { name: demo.guestName })} />

        <ol ref={steps} className="relative grid gap-x-8 gap-y-14 md:grid-cols-2 xl:grid-cols-4">
          {/* خط السلسلة الذي يربط نقاط الخطوات كما في الشعار — يُرسم من بداية السطر */}
          <motion.span
            aria-hidden
            className="absolute inset-x-4 top-[14.5px] hidden h-[3px] rounded-full bg-primary/10 xl:block"
            style={{ originX: demo.lang === "ar" ? 1 : 0 }}
            initial={{ scaleX: 0 }}
            animate={lineLive ? { scaleX: 1 } : undefined}
            transition={{ duration: 1.4, ease: EASE }}
          />
          {j.steps.map((step, i) => (
            <Step key={step.title} demo={demo} index={i} />
          ))}
        </ol>
      </div>
    </section>
  );
};

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() => typeof window.matchMedia === "function" && window.matchMedia(query).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
};

// قصة التمرير هي العرض الأساسي، والخطوات الثابتة بديلها
const JourneySection = ({ demo }: Props) => {
  const reduce = useReducedMotion();
  const tallEnough = useMediaQuery("(min-height: 560px)");
  return !reduce && tallEnough ? <JourneyStory demo={demo} /> : <JourneyGrid demo={demo} />;
};

export default JourneySection;
