import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

// وجهان للبطاقة: الدعوة في الأمام ورمز الدخول في الخلف. الوجه الأمامي يحدد المقاس.

const HIDDEN_FACE: CSSProperties = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };

export default function CardFlip({ flipped, front, back }: { flipped: boolean; front: ReactNode; back: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <div style={{ perspective: 1600 }}>
      <motion.div
        className="relative"
        style={{ transformStyle: "preserve-3d" }}
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 110, damping: 17 }}
      >
        <div className="relative" style={HIDDEN_FACE} aria-hidden={flipped || undefined}>
          {front}
        </div>
        <div className="absolute inset-0" style={{ ...HIDDEN_FACE, transform: "rotateY(180deg)" }} aria-hidden={!flipped || undefined}>
          {back}
        </div>
      </motion.div>
    </div>
  );
}
