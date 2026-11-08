import { useId } from "react";
import { BRAND_PETAL } from "@/components/BrandMark";
import { mix } from "./colors";

// ختم الشمع: قرص شمع غير منتظم الحواف، في وسطه شعار نكفيك أو علامة تأكيد محفورة.
// half="a" | "b" يرسم نصف الختم فقط (خط كسر متعرج) لحركة فك الختم.

const blob = (() => {
  const pts: string[] = [];
  const n = 90;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 45 + 1.7 * Math.sin(7 * a) + 1.1 * Math.sin(13 * a + 0.7) + 0.9 * Math.sin(3 * a + 2.1);
    pts.push(`${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
})();

// خط الكسر من أعلى الختم إلى أسفله
const CRACK = "3,-60 -2,-38 4,-21 -3,-6 3,9 -2,24 2,40 -1,60";
const HALF_A = `-60,-60 ${CRACK} -60,60`;
const HALF_B = `60,-60 ${CRACK} 60,60`;

type Props = {
  color: string;
  emblem?: "brand" | "check";
  half?: "a" | "b";
  className?: string;
};

const WaxSeal = ({ color, emblem = "brand", half, className }: Props) => {
  const uid = useId().replace(/:/g, "");
  const light = mix(color, "#FFFFFF", 0.28);
  const dark = mix(color, "#000000", 0.35);
  const deep = mix(color, "#000000", 0.5);
  const rim = mix(color, "#FFFFFF", 0.42);

  const mark = (fill: string, dx = 0, dy = 0, opacity = 1) =>
    emblem === "brand" ? (
      <g transform={`translate(${dx} ${dy}) scale(0.155)`} fill={fill} opacity={opacity}>
        {[0, 72, 144, 216, 288].map((deg) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <path d={BRAND_PETAL} />
            <circle cy="71.87" r="11.65" />
            <circle cy="102.85" r="11.65" />
            <circle cy="133.83" r="11.65" />
          </g>
        ))}
      </g>
    ) : (
      <path
        d="M-13 1 L-4 10 L14 -9"
        transform={`translate(${dx} ${dy})`}
        fill="none"
        stroke={fill}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
    );

  return (
    <svg viewBox="-50 -50 100 100" className={className} aria-hidden style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`${uid}-wax`} cx="36%" cy="30%" r="78%">
          <stop offset="0" stopColor={light} />
          <stop offset="0.5" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <radialGradient id={`${uid}-disc`} cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor={mix(color, "#000000", 0.06)} />
          <stop offset="1" stopColor={mix(color, "#000000", 0.2)} />
        </radialGradient>
        {half && (
          <clipPath id={`${uid}-half`}>
            <polygon points={half === "a" ? HALF_A : HALF_B} />
          </clipPath>
        )}
      </defs>
      <g clipPath={half ? `url(#${uid}-half)` : undefined}>
        <path d={blob} fill={`url(#${uid}-wax)`} />
        {/* القرص المضغوط وحافته */}
        <circle r="31.5" fill={`url(#${uid}-disc)`} />
        <circle r="32" fill="none" stroke={deep} strokeOpacity="0.45" strokeWidth="1.6" transform="translate(-0.6 -0.7)" />
        <circle r="32" fill="none" stroke={rim} strokeOpacity="0.4" strokeWidth="1.1" transform="translate(0.7 0.8)" />
        {/* الشعار محفور: إضاءة على الحافة السفلى ثم الحفر نفسه */}
        {mark(rim, 0.8, 0.9, 0.45)}
        {mark(deep, 0, 0, 0.7)}
        {/* لمعة الشمع */}
        <ellipse cx="-17" cy="-23" rx="14" ry="6" transform="rotate(-32 -17 -23)" fill="#FFFFFF" opacity="0.14" />
      </g>
    </svg>
  );
};

export default WaxSeal;
