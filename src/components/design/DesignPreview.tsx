// Renders a polished invitation/certificate preview in any of the supported layouts.
import { OrnamentBorder, CornerFlourish } from "./Ornaments";
import { QRCodeSVG } from "qrcode.react";

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
};

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

export default function DesignPreview({
  design, title, subtitle, body, footer, guestName, qrValue, mode = "invitation", className = "",
}: Props) {
  const {
    theme_color, accent_color, background_color, text_color,
    heading_font, body_font, layout_style, ornament_style, background_image_url,
  } = design;

  const isCert = mode === "certificate";
  const aspect = isCert ? "aspect-[1.414/1]" : "aspect-[3/4]";

  const surfaceBg = background_image_url
    ? `linear-gradient(${theme_color}cc, ${theme_color}ee), url(${background_image_url}) center/cover`
    : layout_style === "minimal" && !isCert
      ? background_color || "#ffffff"
      : `linear-gradient(160deg, ${theme_color}, ${shade(theme_color, -15)})`;

  const surfaceText = layout_style === "minimal" && !isCert ? (background_color === "#FFFFFF" ? "#1A1A1A" : text_color) : text_color;
  const isLight = surfaceText === "#1A1A1A";
  const subtleAccent = accent_color;

  // Layout: framed — double border
  if (layout_style === "framed") {
    return (
      <div className={`relative ${aspect} w-full rounded-xl overflow-hidden shadow-2xl ${className}`} style={{ background: surfaceBg, color: surfaceText, fontFamily: body_font }}>
        <OrnamentBorder style={ornament_style} color={subtleAccent} />
        <div className="absolute inset-3 border" style={{ borderColor: subtleAccent + "aa" }} />
        <div className="absolute inset-5 border" style={{ borderColor: subtleAccent + "55" }} />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-10">
          {subtitle && <p className="text-xs uppercase tracking-[0.4em] opacity-80 mb-4" style={{ color: subtleAccent }}>{subtitle}</p>}
          <h2 className="text-3xl md:text-4xl leading-tight" style={{ fontFamily: heading_font, fontWeight: 700 }}>{title}</h2>
          <div className="h-px w-24 my-5" style={{ background: subtleAccent }} />
          {guestName && <p className="text-lg mb-3 opacity-95">{guestName}</p>}
          {body && <p className="text-sm leading-relaxed max-w-md opacity-90 whitespace-pre-wrap">{body}</p>}
          {footer && <p className="text-xs mt-6 opacity-70">{footer}</p>}
          {qrValue && (
            <div className="mt-5 bg-white p-2 rounded-md">
              <QRCodeSVG value={qrValue} size={isCert ? 70 : 90} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Layout: split — accent top band
  if (layout_style === "split") {
    return (
      <div className={`relative ${aspect} w-full rounded-xl overflow-hidden shadow-2xl ${className}`} style={{ background: background_color || "#fff", color: "#1A1A1A", fontFamily: body_font }}>
        <div className="absolute inset-x-0 top-0 h-1/3 flex flex-col items-center justify-center text-center px-8" style={{ background: surfaceBg, color: surfaceText }}>
          <OrnamentBorder style={ornament_style} color={subtleAccent} />
          {subtitle && <p className="text-xs uppercase tracking-[0.3em] opacity-90 mb-2" style={{ color: subtleAccent }}>{subtitle}</p>}
          <h2 className="text-2xl md:text-3xl leading-tight relative z-10" style={{ fontFamily: heading_font, fontWeight: 700 }}>{title}</h2>
        </div>
        <div className="absolute inset-x-0 top-1/3 bottom-0 flex flex-col items-center justify-center text-center px-8 pt-4">
          <div className="h-1 w-16 mb-4 rounded" style={{ background: subtleAccent }} />
          {guestName && <p className="text-lg mb-3" style={{ color: theme_color, fontFamily: heading_font, fontWeight: 700 }}>{guestName}</p>}
          {body && <p className="text-sm leading-relaxed max-w-md text-foreground/80 whitespace-pre-wrap">{body}</p>}
          {footer && <p className="text-xs mt-4 text-muted-foreground">{footer}</p>}
          {qrValue && (
            <div className="mt-4 p-2 rounded-md border">
              <QRCodeSVG value={qrValue} size={isCert ? 70 : 90} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Layout: minimal — clean white card
  if (layout_style === "minimal") {
    return (
      <div className={`relative ${aspect} w-full rounded-xl overflow-hidden shadow-2xl border ${className}`} style={{ background: background_color || "#fff", color: "#1A1A1A", fontFamily: body_font, borderColor: subtleAccent + "44" }}>
        <div className="absolute top-0 inset-x-0 h-1" style={{ background: subtleAccent }} />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-10">
          {subtitle && <p className="text-[10px] uppercase tracking-[0.5em] mb-6" style={{ color: theme_color }}>{subtitle}</p>}
          <h2 className="text-3xl md:text-4xl leading-tight" style={{ color: theme_color, fontFamily: heading_font, fontWeight: 700 }}>{title}</h2>
          <div className="h-px w-12 my-5" style={{ background: subtleAccent }} />
          {guestName && <p className="text-lg mb-3" style={{ color: theme_color }}>{guestName}</p>}
          {body && <p className="text-sm leading-relaxed max-w-md text-foreground/70 whitespace-pre-wrap">{body}</p>}
          {footer && <p className="text-xs mt-6 text-muted-foreground">{footer}</p>}
          {qrValue && (
            <div className="mt-5 p-2 rounded-md border">
              <QRCodeSVG value={qrValue} size={isCert ? 70 : 90} />
            </div>
          )}
        </div>
        <div className="absolute bottom-0 inset-x-0 h-1" style={{ background: subtleAccent }} />
      </div>
    );
  }

  // Layout: classic (default) — centered horizontal lines
  return (
    <div className={`relative ${aspect} w-full rounded-xl overflow-hidden shadow-2xl ${className}`} style={{ background: surfaceBg, color: surfaceText, fontFamily: body_font }}>
      <OrnamentBorder style={ornament_style} color={subtleAccent} />
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px w-10" style={{ background: subtleAccent }} />
          {subtitle && <p className="text-xs uppercase tracking-[0.35em]" style={{ color: subtleAccent }}>{subtitle}</p>}
          <div className="h-px w-10" style={{ background: subtleAccent }} />
        </div>
        <h2 className="text-3xl md:text-4xl leading-tight" style={{ fontFamily: heading_font, fontWeight: 700 }}>{title}</h2>
        <div className="h-px w-20 my-5" style={{ background: subtleAccent }} />
        {guestName && <p className="text-lg mb-3 opacity-95">{guestName}</p>}
        {body && <p className="text-sm leading-relaxed max-w-md opacity-90 whitespace-pre-wrap">{body}</p>}
        {footer && <p className="text-xs mt-6 opacity-70">{footer}</p>}
        {qrValue && (
          <div className="mt-5 bg-white p-2 rounded-md">
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
