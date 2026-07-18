// Renders a polished invitation/certificate preview in any of the supported layouts.
// يدعم خيارات التخصيص المتقدم: الإطارات، الزوايا، أنماط الخلفية، الأحجام،
// المحاذاة، المسافات، الشفافية، والشعار — بمعاينة مباشرة.
import type { CSSProperties, ReactNode } from "react";
import { OrnamentBorder, CornerFlourish } from "./Ornaments";
import { QRCodeSVG } from "qrcode.react";
import { DEFAULT_EXTRAS, type DesignExtras } from "./templates";

export type DesignValue = {
  theme_color: string;
  accent_color: string;
  background_color?: string;
  text_color: string;
  heading_font: string;
  body_font: string;
  layout_style: string;
  ornament_style: string;
  background_image_url?: string | null;
} & DesignExtras;

type Props = {
  design: DesignValue;
  title: string;
  subtitle?: string;
  body?: string;
  footer?: string;
  guestName?: string;
  qrValue?: string;
  mode?: "invitation" | "certificate";
  className?: string;
};

const GOLD = ["#C9A84C", "#E8D48B"];
const SILVER = ["#9BA6B2", "#DDE3EA"];

export default function DesignPreview({
  design, title, subtitle, body, footer, guestName, qrValue, mode = "invitation", className = "",
}: Props) {
  const {
    theme_color, accent_color, background_color, text_color,
    heading_font, body_font, layout_style, ornament_style, background_image_url,
  } = design;

  const x = { ...DEFAULT_EXTRAS, ...Object.fromEntries(Object.entries(design).filter(([, v]) => v !== undefined && v !== null)) } as Required<DesignExtras>;

  const isCert = mode === "certificate";
  const aspect = isCert ? "aspect-[1.414/1]" : "aspect-[3/4]";
  const isPaper = x.bg_style === "paper" && !background_image_url;
  const isMinimalLight = layout_style === "minimal" && !isCert;

  // ===== الخلفية حسب النمط =====
  const paperBase = background_color && background_color !== "#FFFFFF" ? background_color : "#FAF6EC";
  let surfaceBg: string;
  if (background_image_url) {
    surfaceBg = `linear-gradient(${theme_color}cc, ${theme_color}ee), url(${background_image_url}) center/cover`;
  } else if (isPaper) {
    surfaceBg = `repeating-linear-gradient(0deg, transparent, transparent 3px, ${theme_color}08 3px, ${theme_color}08 4px), repeating-linear-gradient(90deg, transparent, transparent 3px, ${theme_color}06 3px, ${theme_color}06 4px), ${paperBase}`;
  } else if (isMinimalLight) {
    surfaceBg = background_color || "#ffffff";
  } else if (x.bg_style === "solid") {
    surfaceBg = theme_color;
  } else if (x.bg_style === "pattern") {
    surfaceBg = `radial-gradient(${accent_color}2e 1.2px, transparent 1.2px) 0 0 / 16px 16px, linear-gradient(160deg, ${theme_color}, ${shade(theme_color, -15)})`;
  } else {
    surfaceBg = `linear-gradient(160deg, ${theme_color}, ${shade(theme_color, -15)})`;
  }

  const surfaceText = isPaper
    ? theme_color
    : isMinimalLight
      ? (background_color === "#FFFFFF" ? "#1A1A1A" : text_color)
      : text_color;
  const subtleAccent = accent_color;

  // ===== الزوايا =====
  const radiusCls = x.corner_style === "square" ? "rounded-none" : "rounded-xl";
  const innerRadius = x.corner_style === "square" ? "0" : "0.5rem";

  // ===== الأحجام والمسافات والمحاذاة =====
  const sp = x.spacing_scale;
  const alignItems = x.text_align === "center" ? "center" : x.text_align === "right" ? "flex-start" : "flex-end";
  const contentStyle: CSSProperties = {
    textAlign: x.text_align,
    alignItems,
    gap: `${0.65 * sp}rem`,
    padding: `${2.4 * sp}rem`,
    opacity: x.content_opacity,
  };
  const headingStyle: CSSProperties = {
    fontFamily: heading_font,
    fontWeight: 700,
    fontSize: `${2.1 * x.heading_scale}rem`,
    lineHeight: 1.25,
  };
  const bodyStyle: CSSProperties = {
    fontSize: `${0.875 * x.body_scale}rem`,
    lineHeight: 1.75,
  };
  const guestStyle: CSSProperties = { fontSize: `${1.1 * x.body_scale}rem` };

  // ===== طبقات الإطار =====
  const frameLayers = (() => {
    const layers: ReactNode[] = [];
    const mk = (inset: string, color: string, width = "1px", key = "") => (
      <div key={key || inset + color} className="absolute pointer-events-none" style={{ inset, border: `${width} solid ${color}`, borderRadius: innerRadius }} />
    );
    if (x.frame_style === "simple") layers.push(mk("0.8rem", subtleAccent + "cc"));
    if (x.frame_style === "gold") {
      layers.push(mk("0.7rem", GOLD[0], "2px", "g1"));
      layers.push(mk("1.05rem", GOLD[1] + "99", "1px", "g2"));
    }
    if (x.frame_style === "silver") {
      layers.push(mk("0.7rem", SILVER[0], "2px", "s1"));
      layers.push(mk("1.05rem", SILVER[1] + "aa", "1px", "s2"));
    }
    if (x.frame_style === "luxury") {
      layers.push(mk("0.55rem", subtleAccent, "2px", "l1"));
      layers.push(mk("0.95rem", subtleAccent + "77", "1px", "l2"));
      layers.push(mk("1.2rem", subtleAccent + "44", "1px", "l3"));
    }
    return layers;
  })();

  // ===== زوايا مزخرفة =====
  const ornateCorners = x.corner_style === "ornate" ? (
    <>
      <div className="absolute top-1 right-1 pointer-events-none"><CornerFlourish color={subtleAccent} /></div>
      <div className="absolute top-1 left-1 pointer-events-none -scale-x-100"><CornerFlourish color={subtleAccent} /></div>
      <div className="absolute bottom-1 right-1 pointer-events-none -scale-y-100"><CornerFlourish color={subtleAccent} /></div>
      <div className="absolute bottom-1 left-1 pointer-events-none -scale-100"><CornerFlourish color={subtleAccent} /></div>
    </>
  ) : null;

  const logoEl = x.logo_url ? (
    <img src={x.logo_url} alt="logo" className="h-14 max-w-[45%] object-contain" style={{ marginBottom: `${0.35 * sp}rem` }} />
  ) : null;

  // المحتوى المشترك لكل التخطيطات
  const inner = (opts: { titleColor?: string; bodyMuted?: boolean; divider?: boolean } = {}) => (
    <>
      {logoEl}
      {subtitle && (
        <p className="text-xs uppercase tracking-[0.35em] opacity-85" style={{ color: subtleAccent }}>{subtitle}</p>
      )}
      <h2 style={{ ...headingStyle, color: opts.titleColor }}>{title}</h2>
      {opts.divider !== false && <div className="h-px w-20" style={{ background: subtleAccent }} />}
      {guestName && <p className="opacity-95" style={{ ...guestStyle, color: opts.titleColor }}>{guestName}</p>}
      {body && <p className={`max-w-md whitespace-pre-wrap ${opts.bodyMuted ? "text-foreground/75" : "opacity-90"}`} style={bodyStyle}>{body}</p>}
      {footer && <p className="text-xs opacity-70" style={{ marginTop: `${0.6 * sp}rem` }}>{footer}</p>}
      {qrValue && (
        <div className="bg-white p-2 rounded-md border" style={{ marginTop: `${0.5 * sp}rem` }}>
          <QRCodeSVG value={qrValue} size={isCert ? 70 : 90} />
        </div>
      )}
    </>
  );

  // ===== التخطيطات =====

  if (layout_style === "framed") {
    return (
      <div className={`relative ${aspect} w-full ${radiusCls} overflow-hidden shadow-2xl ${className}`} style={{ background: surfaceBg, color: surfaceText, fontFamily: body_font }}>
        <OrnamentBorder style={ornament_style} color={subtleAccent} />
        {x.frame_style === "none" ? (
          <>
            <div className="absolute inset-3 border pointer-events-none" style={{ borderColor: subtleAccent + "aa", borderRadius: innerRadius }} />
            <div className="absolute inset-5 border pointer-events-none" style={{ borderColor: subtleAccent + "55", borderRadius: innerRadius }} />
          </>
        ) : frameLayers}
        {ornateCorners}
        <div className="relative z-10 h-full flex flex-col justify-center" style={contentStyle}>
          {inner()}
        </div>
      </div>
    );
  }

  if (layout_style === "split") {
    return (
      <div className={`relative ${aspect} w-full ${radiusCls} overflow-hidden shadow-2xl ${className}`} style={{ background: isPaper ? surfaceBg : background_color || "#fff", color: "#1A1A1A", fontFamily: body_font }}>
        <div className="absolute inset-x-0 top-0 h-1/3 flex flex-col items-center justify-center text-center px-8" style={{ background: surfaceBg, color: surfaceText }}>
          <OrnamentBorder style={ornament_style} color={subtleAccent} />
          {logoEl}
          {subtitle && <p className="text-xs uppercase tracking-[0.3em] opacity-90 mb-2" style={{ color: subtleAccent }}>{subtitle}</p>}
          <h2 className="relative z-10" style={headingStyle}>{title}</h2>
        </div>
        {frameLayers}
        {ornateCorners}
        <div className="absolute inset-x-0 top-1/3 bottom-0 flex flex-col justify-center" style={{ ...contentStyle, opacity: x.content_opacity }}>
          <div className="h-1 w-16 rounded" style={{ background: subtleAccent }} />
          {guestName && <p style={{ ...guestStyle, color: theme_color, fontFamily: heading_font, fontWeight: 700 }}>{guestName}</p>}
          {body && <p className="max-w-md text-foreground/80 whitespace-pre-wrap" style={bodyStyle}>{body}</p>}
          {footer && <p className="text-xs text-muted-foreground">{footer}</p>}
          {qrValue && (
            <div className="p-2 rounded-md border bg-white">
              <QRCodeSVG value={qrValue} size={isCert ? 70 : 90} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (layout_style === "minimal") {
    return (
      <div className={`relative ${aspect} w-full ${radiusCls} overflow-hidden shadow-2xl border ${className}`} style={{ background: surfaceBg, color: isPaper ? theme_color : "#1A1A1A", fontFamily: body_font, borderColor: subtleAccent + "44" }}>
        <div className="absolute top-0 inset-x-0 h-1" style={{ background: subtleAccent }} />
        {frameLayers}
        {ornateCorners}
        <div className="relative h-full flex flex-col justify-center" style={contentStyle}>
          {inner({ titleColor: theme_color, bodyMuted: true })}
        </div>
        <div className="absolute bottom-0 inset-x-0 h-1" style={{ background: subtleAccent }} />
      </div>
    );
  }

  // classic (default)
  return (
    <div className={`relative ${aspect} w-full ${radiusCls} overflow-hidden shadow-2xl ${className}`} style={{ background: surfaceBg, color: surfaceText, fontFamily: body_font }}>
      <OrnamentBorder style={ornament_style} color={subtleAccent} />
      {frameLayers}
      {ornateCorners}
      <div className="relative z-10 h-full flex flex-col justify-center" style={contentStyle}>
        {logoEl}
        <div className="flex items-center gap-3" style={{ alignSelf: alignItems === "center" ? "center" : undefined }}>
          <div className="h-px w-10" style={{ background: subtleAccent }} />
          {subtitle && <p className="text-xs uppercase tracking-[0.35em]" style={{ color: subtleAccent }}>{subtitle}</p>}
          <div className="h-px w-10" style={{ background: subtleAccent }} />
        </div>
        <h2 style={headingStyle}>{title}</h2>
        <div className="h-px w-20" style={{ background: subtleAccent }} />
        {guestName && <p className="opacity-95" style={guestStyle}>{guestName}</p>}
        {body && <p className="max-w-md opacity-90 whitespace-pre-wrap" style={bodyStyle}>{body}</p>}
        {footer && <p className="text-xs opacity-70" style={{ marginTop: `${0.6 * sp}rem` }}>{footer}</p>}
        {qrValue && (
          <div className="bg-white p-2 rounded-md" style={{ marginTop: `${0.5 * sp}rem` }}>
            <QRCodeSVG value={qrValue} size={isCert ? 70 : 90} />
          </div>
        )}
      </div>
    </div>
  );
}

function shade(hex: string, percent: number) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round(255 * percent / 100)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100)));
  const b = Math.max(0, Math.min(255, (num & 0xff) + Math.round(255 * percent / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
