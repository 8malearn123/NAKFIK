import { useRef, type ReactNode } from "react";
import { motion, useAnimate, useReducedMotion } from "framer-motion";
import { useElementSize } from "@/hooks/useElementSize";
import { cn } from "@/lib/utils";
import WaxSeal from "./WaxSeal";
import { alpha, mix } from "./colors";

// الظرف المختوم: الدعوة تصل للضيف في ظرف مكتوب عليه اسمه ومختوم بالشمع.
// يضغط الختم فينكسر نصفين، ينفتح اللسان، تخرج البطاقة ويبتعد الظرف.
// يلف أي بطاقة (قالب جاهز أو تصميم مرفوع بأي مقاس): مقاساته تُحسب من مقاس البطاقة نفسها.

export type EnvelopePhase = "sealed" | "opening" | "open";

type Pt = [number, number];

// نقطة على الضلع من a باتجاه b بمسافة d — لتدوير رؤوس المثلثات
const toward = (a: Pt, b: Pt, d: number): Pt => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [a[0] + ((b[0] - a[0]) / len) * d, a[1] + ((b[1] - a[1]) / len) * d];
};
const pt = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
/** ضلعا مثلث برأس مدوّر: من left عبر الرأس apex إلى right */
const roundedApex = (left: Pt, apex: Pt, right: Pt, r: number) =>
  `L${pt(toward(apex, left, r))} Q${pt(apex)} ${pt(toward(apex, right, r))} L${pt(right)}`;

// حجم اسم الضيف على الظرف يصغر مع الأسماء الطويلة حتى يبقى على سطر واحد
const nameSize = (name: string) => {
  const length = [...name].length;
  const steps = /[A-Za-z]/.test(name) ? [7.4, 6, 4.8, 3.4] : [8.2, 8.2, 6.9, 5.7];
  return `${steps[length > 20 ? 3 : length > 14 ? 2 : length > 10 ? 1 : 0]}cqw`;
};

const PAPER = { top: "#F8F2E7", bottom: "#EFE5D4", flapTop: "#FDFAF4", flapTip: "#F1E7D6", fold: "#FCF8F0", foldEnd: "#F2E9DA" };
const INSET = 12; // هامش الظرف حول البطاقة

type Props = {
  phase: EnvelopePhase;
  onPhaseChange: (phase: EnvelopePhase) => void;
  guestName: string;
  /** لون المضيف الأساسي: للختم والبطانة واسم الضيف */
  theme: string;
  /** اللون الثانوي: لزخرفة البطانة */
  accent: string;
  /** البطاقة نفسها */
  children: ReactNode;
};

export default function SealedEnvelope({ phase, onPhaseChange, guestName, theme, accent, children }: Props) {
  const reduce = useReducedMotion();
  const [slotRef, { width: cardW, height: cardH }] = useElementSize<HTMLDivElement>();
  const [scope, animate] = useAnimate();
  const flapRef = useRef<HTMLDivElement>(null);

  const sealed = phase !== "open";
  // الصورة المرفوعة لا يُعرف ارتفاعها قبل تحميلها — لا يُرسم الظرف قبل ذلك
  const ready = cardW > 0 && cardH > 40;
  const W = cardW + INSET * 2;
  const H = cardH + INSET * 2 + 2;
  const vY = H * 0.4; // عمق فتحة الظرف
  const tipY = H * 0.45; // رأس اللسان، وعليه الختم
  const foldY = H * 0.53; // رأس اللسان السفلي
  const sealSize = Math.round(Math.min(W * 0.21, 84));
  const deep = mix(theme, "#000000", 0.32);

  const open = async () => {
    if (phase !== "sealed" || !ready || !flapRef.current) return;
    onPhaseChange("opening");
    if (reduce) {
      onPhaseChange("open");
      return;
    }
    const rise = cardH * 0.54;
    // 1) ضغطة على الختم ثم انكساره نصفين
    await animate("[data-seal-body]", { scale: 0.88 }, { duration: 0.12, ease: "easeOut" });
    animate("[data-seal-whole]", { opacity: 0 }, { duration: 0 });
    animate("[data-seal-half]", { opacity: 1 }, { duration: 0 });
    animate("[data-seal-ring]", { opacity: 0 }, { duration: 0.15 });
    animate("[data-seal-half='a']", { x: -sealSize * 0.28, y: sealSize * 0.55, rotate: -28, opacity: 0 }, { duration: 0.6, ease: [0.4, 0, 0.7, 1] });
    animate("[data-seal-half='b']", { x: sealSize * 0.28, y: sealSize * 0.62, rotate: 26, opacity: 0 }, { duration: 0.6, ease: [0.4, 0, 0.7, 1] });
    animate("[data-flap-shadow]", { opacity: 0 }, { duration: 0.25 });
    // 2) اللسان ينفتح للأعلى، وبعد منتصف الطريق يصير خلف البطاقة
    await animate(flapRef.current, { rotateX: 90 }, { duration: 0.3, ease: [0.55, 0, 0.9, 0.55], delay: 0.1 });
    flapRef.current.style.zIndex = "1";
    await animate(flapRef.current, { rotateX: 180 }, { duration: 0.42, ease: [0.15, 0.45, 0.3, 1] });
    // 3) البطاقة تخرج من الظرف
    animate("[data-env]", { y: rise * 0.6 }, { duration: 0.85, ease: [0.22, 1, 0.36, 1] });
    await animate("[data-card]", { y: -rise * 0.4 }, { duration: 0.85, ease: [0.22, 1, 0.36, 1] });
    // 4) الظرف ينسحب للأسفل والبطاقة تستقر مكانها.
    // الشفافية على الأوجه فقط: لو طُبقت على اللسان نفسه لتسطّح ثلاثي الأبعاد وظهر وجهه الخارجي
    animate("[data-env]", { y: rise * 0.6 + H * 0.9 }, { duration: 0.6, ease: [0.5, 0, 0.75, 0] });
    animate("[data-fade]", { opacity: 0 }, { duration: 0.45, ease: "easeIn" });
    await animate("[data-card]", { y: 0 }, { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.08 });
    onPhaseChange("open");
  };

  // ===== أشكال الظرف =====
  const pocket = `M0 7 Q0 0 7 0 L${W / 2} ${vY} L${W - 7} 0 Q${W} 0 ${W} 7 L${W} ${H - 9} Q${W} ${H} ${W - 9} ${H} L9 ${H} Q0 ${H} 0 ${H - 9} Z`;
  const fold = `M0 ${H - 9} ${roundedApex([0, H - 9], [W / 2, foldY], [W, H - 9], 30)} Q${W} ${H} ${W - 9} ${H} L9 ${H} Q0 ${H} 0 ${H - 9} Z`;
  const flap = `M0 0 L${W} 0 ${roundedApex([W, 0], [W / 2, tipY], [0, 0], 26)} Z`;

  const lining = (id: string) => (
    <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse">
      <rect width="18" height="18" fill={deep} />
      <path d="M9 1 L17 9 L9 17 L1 9 Z" fill="none" stroke={accent} strokeOpacity="0.38" strokeWidth="0.8" />
      <circle cx="9" cy="9" r="1.1" fill={accent} fillOpacity="0.5" />
    </pattern>
  );

  const box = { left: -INSET, top: -INSET, width: W, height: H };

  return (
    <div ref={slotRef} className="relative">
      <motion.div
        ref={scope}
        className="relative"
        style={{ perspective: 1400 }}
        initial={sealed && !reduce ? { opacity: 0, y: 26 } : false}
        animate={!sealed || ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 26 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      >
        {sealed && ready && (
          <>
            {/* بطانة الظرف من الداخل + ظله */}
            <div
              data-env
              data-fade
              className="absolute overflow-hidden rounded-[9px]"
              style={{
                ...box,
                zIndex: 0,
                boxShadow: "0 1px 2px rgb(60 28 40 / .08), 0 18px 36px -14px rgb(60 28 40 / .3), 0 44px 80px -40px rgb(60 28 40 / .4)",
              }}
            >
              <svg width={W} height={H} aria-hidden>
                <defs>{lining("nk-lining-back")}</defs>
                <rect width={W} height={H} fill="url(#nk-lining-back)" />
              </svg>
            </div>

            {/* لسان الظرف: الوجه الخارجي ورقي، والداخلي بالبطانة */}
            <div
              ref={flapRef}
              data-env
              className="absolute"
              style={{ ...box, height: tipY, zIndex: 5, transformOrigin: "50% 0", transformStyle: "preserve-3d" }}
            >
              <svg data-fade width={W} height={tipY} className="absolute inset-0 overflow-visible" style={{ backfaceVisibility: "hidden" }} aria-hidden>
                <defs>
                  <linearGradient id="nk-flap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={PAPER.flapTop} />
                    <stop offset="1" stopColor={PAPER.flapTip} />
                  </linearGradient>
                  <filter id="nk-grain" x="0" y="0" width="100%" height="100%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.24  0 0 0 0 0.14  0.11 0 0 0 0" />
                  </filter>
                  <clipPath id="nk-flap-clip"><path d={flap} /></clipPath>
                </defs>
                <path d={flap} fill="url(#nk-flap)" />
                <rect width={W} height={tipY} filter="url(#nk-grain)" clipPath="url(#nk-flap-clip)" />
                <path d={flap} fill="none" stroke="#B89B78" strokeOpacity="0.25" strokeWidth="0.8" />
              </svg>
              <svg
                data-fade
                width={W}
                height={tipY}
                className="absolute inset-0 overflow-visible"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                aria-hidden
              >
                <defs>{lining("nk-lining-flap")}</defs>
                <path d={flap} fill="url(#nk-lining-flap)" />
              </svg>
            </div>
          </>
        )}

        {/* البطاقة: داخل الظرف حتى يُفتح، ثم في مكانها */}
        <div data-card className="relative" style={{ zIndex: 2 }} aria-hidden={sealed || undefined}>
          {children}
        </div>

        {sealed && ready && (
          <>
            {/* جيب الظرف: الجناحان واللسان السفلي، وعليه اسم الضيف */}
            <div data-env data-fade className="absolute" style={{ ...box, zIndex: 4, containerType: "inline-size" }}>
              <svg width={W} height={H} className="absolute inset-0 overflow-visible" aria-hidden>
                <defs>
                  <linearGradient id="nk-pocket" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={PAPER.top} />
                    <stop offset="1" stopColor={PAPER.bottom} />
                  </linearGradient>
                  <linearGradient id="nk-fold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={PAPER.fold} />
                    <stop offset="1" stopColor={PAPER.foldEnd} />
                  </linearGradient>
                  <filter id="nk-soft" x="-10%" y="-30%" width="120%" height="160%">
                    <feGaussianBlur stdDeviation="3.2" />
                  </filter>
                  <clipPath id="nk-pocket-clip"><path d={pocket} /></clipPath>
                </defs>
                <path d={pocket} fill="url(#nk-pocket)" />
                {/* ظل اللسان السفلي على الجناحين */}
                <path d={fold} fill="#6B4A2A" opacity="0.13" filter="url(#nk-soft)" transform="translate(0 -2.5)" clipPath="url(#nk-pocket-clip)" />
                <path d={fold} fill="url(#nk-fold)" />
                <rect width={W} height={H} filter="url(#nk-grain)" clipPath="url(#nk-pocket-clip)" />
                <path d={fold} fill="none" stroke="#B89B78" strokeOpacity="0.22" strokeWidth="0.8" />
                {/* ظل اللسان العلوي المغلق */}
                <path data-flap-shadow d={flap} fill="#5A3A1E" opacity="0.2" filter="url(#nk-soft)" transform="translate(0 3.5)" />
              </svg>
              <div className="absolute inset-x-0 px-4 text-center" style={{ top: H * 0.66 }}>
                <p className="text-[12px] tracking-wide" style={{ color: alpha(theme, 0.62) }}>إلى</p>
                <p className="mt-0.5 whitespace-nowrap font-ruqaa font-bold leading-[1.5]" style={{ color: theme, fontSize: nameSize(guestName) }}>
                  {guestName}
                </p>
                <span className="mx-auto mt-2 block h-px w-12" style={{ background: alpha(accent, 0.9) }} />
              </div>
            </div>

            {/* الظرف كله قابل للضغط — الختم هو الإشارة فقط */}
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              onClick={open}
              className="absolute cursor-pointer bg-transparent"
              style={{ ...box, zIndex: 6 }}
            />

            {/* الختم: يُضغط فينكسر نصفين */}
            <button
              type="button"
              onClick={open}
              disabled={phase !== "sealed"}
              aria-label="فك الختم وافتح الدعوة"
              className={cn("absolute rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4")}
              style={{ left: -INSET + W / 2 - sealSize / 2, top: -INSET + tipY - sealSize * 0.56, width: sealSize, height: sealSize, zIndex: 6 }}
            >
              <motion.span
                data-seal-ring
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: `0 0 0 2px ${alpha(theme, 0.35)}` }}
                animate={reduce ? undefined : { scale: [1, 1.55], opacity: [0.7, 0] }}
                transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut", delay: 1.2, repeatDelay: 0.5 }}
              />
              <span data-seal-body className="absolute inset-0 block" style={{ filter: "drop-shadow(0 2px 2.5px rgb(50 12 26 / .4))" }}>
                <span data-seal-whole className="absolute inset-0">
                  <WaxSeal color={theme} className="block h-full w-full" />
                </span>
                <span data-seal-half="a" className="absolute inset-0 opacity-0">
                  <WaxSeal color={theme} half="a" className="block h-full w-full" />
                </span>
                <span data-seal-half="b" className="absolute inset-0 opacity-0">
                  <WaxSeal color={theme} half="b" className="block h-full w-full" />
                </span>
              </span>
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
