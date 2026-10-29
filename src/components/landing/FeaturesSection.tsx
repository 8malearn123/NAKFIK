import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { motion, useInView, useMotionTemplate, useMotionValue, useReducedMotion } from "framer-motion";
import { CalendarClock, Check, Minus, Plus, Upload } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { cn } from "@/lib/utils";
import { CountUp } from "./JourneySection";
import SectionHeader, { SECTION_SPACING } from "./SectionHeader";
import { DOOR_PHOTO } from "./photos";
import { DEMO_TALLY, type InvitationDemo } from "./invitationDemo";

// "نكفيك" فعلاً لا اسماً: كل بطاقة تكمّل الجملة بهمّ من هموم المضيف،
// وتعرض جزءاً حقيقياً من المنصة وهو يتولاه (الردود، المرافقون، تغيير الموعد، التذكير، البوابة، القوائم).

type Props = { demo: InvitationDemo };
type VisualProps = { demo: InvitationDemo; live: boolean };

const EASE = [0.22, 1, 0.36, 1] as const;
const TILE_SURFACE =
  "border border-white/[0.08] bg-[linear-gradient(180deg,hsl(271_30%_19%/0.92),hsl(271_32%_14%/0.92))] transition-colors duration-500 hover:border-brand-gold/30";

const useLive = <T extends Element>() => {
  const ref = useRef<T>(null);
  const live = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  return { ref, live };
};

type TileProps = {
  title: string;
  body: string;
  index: number;
  wide?: boolean;
  className?: string;
  children: (live: boolean) => ReactNode;
};

const Tile = ({ title, body, index, wide, className, children }: TileProps) => {
  const { ref, live } = useLive<HTMLLIElement>();
  return (
    <motion.li
      ref={ref}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[1.75rem] p-7 lg:p-8",
        wide && "lg:flex-row lg:items-end lg:gap-10",
        TILE_SURFACE,
        className,
      )}
      initial={{ opacity: 0, y: 28 }}
      animate={live ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: EASE }}
    >
      <div className={cn(wide && "lg:w-[40%] lg:shrink-0 lg:self-start")}>
        <h3 className="font-kufi text-[1.625rem] font-bold leading-snug text-white">{title}</h3>
        <p className="mt-2 max-w-md text-[15px] leading-[1.8] text-white/60">{body}</p>
      </div>
      <div className={cn("relative mt-auto pt-7", wide && "lg:flex-1 lg:pt-0")}>{children(live)}</div>
    </motion.li>
  );
};

// حلقة الردود: مؤكد/بانتظار/اعتذر تُرسم عند ظهورها
const RepliesVisual = ({ demo, live }: VisualProps) => {
  const { copy } = demo;
  const j = copy.journey;
  const parts = [
    { label: j.tally.confirmed, value: DEMO_TALLY.confirmed + 1, color: "#15867C" },
    { label: j.tally.waiting, value: DEMO_TALLY.waiting - 1, color: "#CC8E3D" },
    { label: j.tally.declined, value: DEMO_TALLY.declined, color: "#A03C4A" },
  ];
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const gap = 0.012;
  let start = 0;
  return (
    <div className="flex items-center gap-7 sm:gap-9">
      <div className="relative h-36 w-36 shrink-0 sm:h-40 sm:w-40">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="11" />
          {parts.map((p, i) => {
            const share = p.value / total;
            const from = start;
            start += share;
            return (
              <motion.circle
                key={p.label}
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={p.color}
                strokeWidth="11"
                strokeLinecap="round"
                initial={{ pathLength: 0, pathOffset: from }}
                animate={live ? { pathLength: Math.max(share - gap, 0.01), pathOffset: from } : undefined}
                transition={{ duration: 1.1, delay: 0.25 + i * 0.25, ease: EASE }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-kufi text-3xl font-bold leading-none text-white tabular-nums">
            <CountUp value={total} live={live} />
          </span>
          <span className="mt-1 text-xs text-white/55">{copy.covered.ui.invited}</span>
        </div>
      </div>
      <dl className="flex-1 space-y-3">
        {parts.map((p) => (
          <div key={p.label} className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
            <dt className="flex items-center gap-2.5 text-sm text-white/70">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
              {p.label}
            </dt>
            <dd className="font-kufi text-xl font-bold text-white tabular-nums">
              <CountUp value={p.value} live={live} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

// المرافقون: عدّاد يعمل فعلاً حتى الحد الأقصى
const CompanionsVisual = ({ demo }: VisualProps) => {
  const ui = demo.copy.covered.ui;
  const [count, setCount] = useState(2);
  const initial = [...demo.guestName.trim()][0] ?? "؟";
  return (
    <div className="rounded-2xl bg-white/[0.06] p-4">
      <p className="text-xs text-white/60">{ui.companions}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex -space-x-2 rtl:space-x-reverse">
          <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-brand-gold font-bold text-white ring-[3px] ring-[hsl(271_31%_17%)]">
            {initial}
          </span>
          {Array.from({ length: count }, (_, i) => (
            <motion.span
              key={i}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(351_27%_51%)] text-white ring-[3px] ring-[hsl(271_31%_17%)]"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 20 }}
            >
              <Plus className="h-4 w-4" aria-hidden />
            </motion.span>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/10 p-1">
          <button
            type="button"
            aria-label={ui.decrease}
            onClick={() => setCount((c) => Math.max(0, c - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-5 text-center font-kufi text-xl font-bold text-white tabular-nums" aria-live="polite">
            {count}
          </span>
          <button
            type="button"
            aria-label={ui.increase}
            onClick={() => setCount((c) => Math.min(3, c + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// تغيير الموعد: نفس التنبيه الذي يظهر في دعوة كل ضيف
const ScheduleVisual = ({ demo, live }: VisualProps) => {
  const ui = demo.copy.covered.ui;
  return (
    <div className="rounded-2xl border border-amber-200/25 bg-amber-200/[0.08] p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-amber-200">
        <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
        {ui.changeAlert}
      </p>
      <p className="relative mt-3 w-fit text-xs text-white/40">
        {ui.oldDate}
        <motion.span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-px bg-white/50"
          style={{ originX: demo.lang === "ar" ? 1 : 0 }}
          initial={{ scaleX: 0 }}
          animate={live ? { scaleX: 1 } : undefined}
          transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
        />
      </p>
      <motion.p
        className="mt-1.5 text-sm font-semibold text-white"
        initial={{ opacity: 0, y: 6 }}
        animate={live ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.45, delay: 0.95, ease: EASE }}
      >
        {ui.newDate}
      </motion.p>
    </div>
  );
};

// التذكير: إشعار على جوال الضيف، وتوقيته يختاره المضيف
const ReminderVisual = ({ demo, live }: VisualProps) => {
  const ui = demo.copy.covered.ui;
  return (
    <div className="space-y-3">
      <motion.div
        className="rounded-2xl bg-white/95 p-3.5 text-[#1C1420] shadow-[0_16px_30px_-16px_rgb(0_0_0/0.6)]"
        initial={{ opacity: 0, y: -14 }}
        animate={live ? { opacity: 1, y: 0 } : undefined}
        transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.3 }}
      >
        <p className="flex items-center gap-2 text-[11px] text-black/50">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#F4EFF5]">
            <BrandMark className="h-3.5 w-3.5" />
          </span>
          {ui.appName}
          <span className="ms-auto">{ui.now}</span>
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed">{ui.reminder}</p>
      </motion.div>
      <div className="flex flex-wrap gap-2">
        {ui.reminderTimes.map((time, i) => (
          <span
            key={time}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              i === 1 ? "bg-brand-gold text-white" : "bg-white/10 text-white/70",
            )}
          >
            {time}
          </span>
        ))}
      </div>
    </div>
  );
};

// القوائم المحفوظة وتصنيف الضيوف
const ListsVisual = ({ demo }: VisualProps) => {
  const { copy, guestName } = demo;
  const ui = copy.covered.ui;
  const guests = copy.journey.guests;
  const tierCls = {
    vvip: "bg-brand-gold/20 text-[#EBC88A]",
    vip: "bg-[hsl(271_60%_70%/0.18)] text-[hsl(271_70%_85%)]",
    regular: "bg-white/10 text-white/60",
  };
  const rows: { name: string; tier: keyof typeof tierCls }[] = [
    { name: guestName, tier: "vvip" },
    { name: guests[0], tier: "vip" },
    { name: guests[1], tier: "regular" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl bg-white/[0.06]">
        {rows.map((row, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="truncate font-semibold text-white/90">{row.name}</span>
            <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold", tierCls[row.tier])}>
              {ui.tiers[row.tier]}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col rounded-2xl bg-white/[0.06] p-4">
        <p className="text-xs text-white/55">{ui.savedLists}</p>
        {ui.lists.map((list) => (
          <p key={list.name} className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span className="text-white/90">{list.name}</span>
            <span className="text-xs text-white/45">{list.count}</span>
          </p>
        ))}
        <span className="mt-auto pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-primary">
            <Upload className="h-3.5 w-3.5" aria-hidden />
            {ui.importCsv}
          </span>
        </span>
      </div>
    </div>
  );
};

// البوابة: صورة حقيقية لمدخل، وفوقها لحظة تسجيل دخول الضيف
const DoorTile = ({ demo, title, body, index }: { demo: InvitationDemo; title: string; body: string; index: number }) => {
  const { ref, live } = useLive<HTMLLIElement>();
  const { copy, guestName } = demo;
  const j = copy.journey;
  return (
    <motion.li
      ref={ref}
      className={cn("group relative flex min-h-[30rem] flex-col justify-end overflow-hidden rounded-[1.75rem] p-7 lg:row-span-2 lg:p-8", TILE_SURFACE)}
      initial={{ opacity: 0, y: 28 }}
      animate={live ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: EASE }}
    >
      <img
        src={DOOR_PHOTO}
        alt={copy.covered.ui.doorAlt}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/50 via-45% to-night/5" />
      <motion.div
        className="absolute inset-x-5 top-5 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md lg:inset-x-6 lg:top-6"
        initial={{ opacity: 0, y: -12 }}
        animate={live ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.5, delay: 0.55, ease: EASE }}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-teal text-white">
          <Check className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-white">{guestName}</span>
          <span className="block text-xs text-[hsl(172_60%_70%)]">
            {j.checkedIn} — {j.gate}
          </span>
        </span>
        <span className="shrink-0 text-xs text-white/60">{j.scannedAt}</span>
      </motion.div>
      <div className="relative">
        <h3 className="font-kufi text-[1.625rem] font-bold leading-snug text-white">{title}</h3>
        <p className="mt-2 max-w-sm text-[15px] leading-[1.8] text-white/70">{body}</p>
      </div>
    </motion.li>
  );
};

const FeaturesSection = ({ demo }: Props) => {
  const { word, subtitle, items } = demo.copy.covered;
  const [replies, companions, schedule, reminders, door, lists] = items;
  const reduce = useReducedMotion();
  const x = useMotionValue(-999);
  const y = useMotionValue(-999);
  const light = useMotionTemplate`radial-gradient(560px circle at ${x}px ${y}px, hsl(34 58% 52% / 0.14), transparent 65%)`;
  const follow = (e: PointerEvent<HTMLElement>) => {
    if (reduce) return;
    const box = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - box.left);
    y.set(e.clientY - box.top);
  };
  const fade = () => {
    x.set(-999);
    y.set(-999);
  };

  return (
    <section
      id="features"
      className={`relative scroll-mt-16 overflow-hidden bg-night text-white ${SECTION_SPACING}`}
      onPointerMove={follow}
      onPointerLeave={fade}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: light }} />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 start-[-8%] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(closest-side,hsl(34_58%_52%/0.13),transparent)]"
      />

      <div className="container relative mx-auto px-4">
        <SectionHeader title={word} lede={subtitle} tone="dark" display />

        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Tile title={replies.title} body={replies.body} index={0} wide className="md:col-span-2">
            {(live) => <RepliesVisual demo={demo} live={live} />}
          </Tile>
          <DoorTile demo={demo} title={door.title} body={door.body} index={1} />
          <Tile title={companions.title} body={companions.body} index={2}>
            {(live) => <CompanionsVisual demo={demo} live={live} />}
          </Tile>
          <Tile title={schedule.title} body={schedule.body} index={3}>
            {(live) => <ScheduleVisual demo={demo} live={live} />}
          </Tile>
          <Tile title={reminders.title} body={reminders.body} index={4}>
            {(live) => <ReminderVisual demo={demo} live={live} />}
          </Tile>
          <Tile title={lists.title} body={lists.body} index={5} wide className="md:col-span-2">
            {(live) => <ListsVisual demo={demo} live={live} />}
          </Tile>
        </ul>
      </div>
    </section>
  );
};

export default FeaturesSection;
