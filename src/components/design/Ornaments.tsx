// Decorative SVG ornaments used as background patterns or corner accents.
import React from "react";

type Props = { color: string; opacity?: number };

export function OrnamentBorder({
  style,
  color,
  className = "",
}: {
  style: string;
  color: string;
  className?: string;
}) {
  if (style === "none") return null;
  const common = "absolute inset-0 pointer-events-none";
  switch (style) {
    case "islamic":
      return (
        <svg className={`${common} ${className}`} viewBox="0 0 400 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`isl-${color.replace("#","")}`} x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M18 2 L22 12 L32 8 L26 18 L32 28 L22 24 L18 34 L14 24 L4 28 L10 18 L4 8 L14 12 Z" fill="none" stroke={color} strokeWidth="0.7" opacity="0.4" />
              <circle cx="18" cy="18" r="3.5" fill="none" stroke={color} strokeWidth="0.5" opacity="0.35" />
            </pattern>
          </defs>
          <rect width="400" height="46" fill={`url(#isl-${color.replace("#","")})`} />
          <rect y="554" width="400" height="46" fill={`url(#isl-${color.replace("#","")})`} />
        </svg>
      );
    case "arabesque":
      return (
        <svg className={`${common} ${className}`} viewBox="0 0 400 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`arab-${color.replace("#","")}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M20 0 L40 20 L20 40 L0 20 Z M20 8 L32 20 L20 32 L8 20 Z" fill="none" stroke={color} strokeWidth="0.6" opacity="0.35" />
            </pattern>
          </defs>
          <rect width="400" height="40" fill={`url(#arab-${color.replace("#","")})`} />
          <rect y="560" width="400" height="40" fill={`url(#arab-${color.replace("#","")})`} />
        </svg>
      );
    case "floral":
      return (
        <svg className={`${common} ${className}`} viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" stroke={color} strokeWidth="1.2" opacity="0.55" strokeLinecap="round">
            <path d="M20 30 Q40 10 60 30 T100 30" />
            <circle cx="30" cy="30" r="3" fill={color} />
            <circle cx="70" cy="30" r="3" fill={color} />
            <path d="M300 30 Q320 10 340 30 T380 30" />
            <circle cx="310" cy="30" r="3" fill={color} />
            <circle cx="370" cy="30" r="3" fill={color} />
            <path d="M20 570 Q40 590 60 570 T100 570" />
            <path d="M300 570 Q320 590 340 570 T380 570" />
          </g>
        </svg>
      );
    case "geometric":
      return (
        <svg className={`${common} ${className}`} viewBox="0 0 400 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`geo-${color.replace("#","")}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 10 L10 0 L20 10 L10 20 Z" fill="none" stroke={color} strokeWidth="0.5" opacity="0.4" />
            </pattern>
          </defs>
          <rect width="400" height="30" fill={`url(#geo-${color.replace("#","")})`} />
          <rect y="570" width="400" height="30" fill={`url(#geo-${color.replace("#","")})`} />
        </svg>
      );
    case "art-deco":
      return (
        <svg className={`${common} ${className}`} viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">
          <g stroke={color} fill="none" strokeWidth="1.2" opacity="0.7">
            <path d="M20 20 L100 20 M380 20 L300 20" />
            <path d="M30 30 L90 30 M370 30 L310 30" />
            <path d="M60 14 L60 26" />
            <path d="M340 14 L340 26" />
            <path d="M200 20 L194 14 L188 20 L194 26 Z" fill={color} />
            <path d="M200 20 L206 14 L212 20 L206 26 Z" fill={color} />
            <path d="M20 580 L100 580 M380 580 L300 580" />
            <path d="M30 570 L90 570 M370 570 L310 570" />
            <path d="M200 580 L194 574 L188 580 L194 586 Z" fill={color} />
            <path d="M200 580 L206 574 L212 580 L206 586 Z" fill={color} />
          </g>
        </svg>
      );
    case "waves":
      return (
        <svg className={`${common} ${className}`} viewBox="0 0 400 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" stroke={color} strokeWidth="1" opacity="0.5">
            <path d="M0 25 Q50 10 100 25 T200 25 T300 25 T400 25" />
            <path d="M0 35 Q50 20 100 35 T200 35 T300 35 T400 35" />
            <path d="M0 575 Q50 560 100 575 T200 575 T300 575 T400 575" />
            <path d="M0 585 Q50 570 100 585 T200 585 T300 585 T400 585" />
          </g>
        </svg>
      );
    default:
      return null;
  }
}

export function CornerFlourish({ color }: Props) {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" className="absolute" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke={color} strokeWidth="1.2" opacity="0.8">
        <path d="M5 5 L25 5 M5 5 L5 25" />
        <path d="M5 15 Q15 15 15 5" />
      </g>
    </svg>
  );
}
