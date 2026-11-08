import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

// كتابة الاسم بالحبر: يبقى مخفياً حتى play ثم يظهر من اليمين إلى اليسار كأنه يُكتب.
// الهوامش السالبة في القص تترك مساحة لذيول الحروف المزخرفة.

type Props = { play: boolean; as?: "p" | "span"; className?: string; style?: CSSProperties; children: ReactNode };

const HIDDEN = "inset(-30% -10% -30% 110%)";
const SHOWN = "inset(-30% -10% -30% -10%)";

export default function InkReveal({ play, as = "p", className, style, children }: Props) {
  const reduce = useReducedMotion();
  const Tag = as === "span" ? motion.span : motion.p;
  return (
    <Tag
      className={className}
      style={style}
      initial={reduce ? false : { clipPath: HIDDEN }}
      animate={play || reduce ? { clipPath: SHOWN } : undefined}
      transition={{ delay: 0.15, duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
    >
      {children}
    </Tag>
  );
}
