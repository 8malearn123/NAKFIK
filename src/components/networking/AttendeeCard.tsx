import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface AttendeeCardData {
  full_name?: string | null;
  avatar_url?: string | null;
  job_title?: string | null;
  company?: string | null;
  tier?: string | null;
  tier_label?: string | null;
  tags?: string[];
  qr_value?: string | null;
  qr_label?: string | null;
  // customization
  logo_url?: string | null;          // org / personal logo on the card
  ring_color?: string | null;        // around avatar
  bg_from?: string | null;           // gradient start
  bg_to?: string | null;             // gradient end
}

const TAG_COLORS = ["#F4C95D", "#7DD3C0", "#F08C7D", "#C4A5E0", "#FFB4A2"];

const AttendeeCard = forwardRef<HTMLDivElement, { data: AttendeeCardData; className?: string }>(
  ({ data, className = "" }, ref) => {
    const { t, dir } = useLanguage();
    const initial = (data.full_name || t("pgProfile.card.initialFallback")).trim().charAt(0);
    const tier = (data.tier_label || data.tier || "GUEST").toUpperCase();
    const subtitle = [data.job_title, data.company].filter(Boolean).join(" · ");
    const ring = data.ring_color || "#CC8E3D";
    const bgFrom = data.bg_from || "#2b1342";
    const bgTo = data.bg_to || "#7a2855";

    return (
      <div
        ref={ref}
        dir={dir}
        className={`relative w-[340px] rounded-[32px] overflow-hidden text-white font-cairo ${className}`}
        style={{
          background:
            `radial-gradient(120% 80% at 0% 0%, ${bgFrom}cc 0%, transparent 55%),` +
            `radial-gradient(110% 90% at 100% 100%, ${bgTo}cc 0%, transparent 55%),` +
            `linear-gradient(155deg, ${bgFrom} 0%, ${bgTo} 100%)`,
          boxShadow: "0 30px 70px rgba(20, 8, 30, 0.55), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      >
        {/* dotted texture */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* corner ring-color glow */}
        <div
          className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 100% 0%, ${ring}66 0%, transparent 60%)`,
          }}
        />

        {/* Top: organization logo + tier */}
        <div className="relative flex items-center justify-between px-6 pt-5 min-h-[44px]">
          {data.logo_url ? (
            <div className="h-9 max-w-[110px] bg-white/95 rounded-lg px-2 py-1 flex items-center justify-center shadow">
              <img src={data.logo_url} alt="logo" className="max-h-7 max-w-full object-contain" />
            </div>
          ) : (
            <span />
          )}
          <div
            className="inline-flex items-center gap-1.5"
            style={{
              background: "rgba(255,255,255,0.12)",
              border: `1px solid ${ring}88`,
              borderRadius: 999,
              padding: "5px 14px",
              backdropFilter: "blur(6px)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: ring }} />
            <span className="text-[11px] font-bold tracking-[3px]">{tier}</span>
          </div>
        </div>

        {/* Avatar with thicker, color-customizable ring */}
        <div className="relative flex flex-col items-center pt-6 pb-2">
          <div
            className="relative rounded-full p-[6px]"
            style={{
              background: `conic-gradient(from 140deg, ${ring} 0deg, #ffffff66 90deg, ${ring} 180deg, ${ring}55 270deg, ${ring} 360deg)`,
              boxShadow: `0 14px 36px ${ring}55, 0 0 0 2px ${ring}33`,
            }}
          >
            <div
              className="w-[150px] h-[150px] rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)", border: `4px solid ${bgFrom}` }}
            >
              {data.avatar_url ? (
                <img
                  src={data.avatar_url}
                  alt={data.full_name || ""}
                  className="w-full h-full object-cover object-center block"
                  draggable={false}
                />
              ) : (
                <span className="text-6xl font-bold text-white/90">{initial}</span>
              )}
            </div>
          </div>
        </div>

        {/* Name & subtitle */}
        <div className="relative px-6 mt-3 text-center">
          <h3 className="text-[22px] font-bold leading-tight">{data.full_name || "—"}</h3>
          {subtitle && (
            <p className="text-[12px] text-white/85 mt-1 font-semibold tracking-wide">{subtitle}</p>
          )}
        </div>

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="relative px-5 mt-4 flex flex-wrap gap-1.5 justify-center">
            {data.tags.slice(0, 5).map((t, i) => (
              <div
                key={t + i}
                className="px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: TAG_COLORS[i % TAG_COLORS.length] }}
                />
                {t}
              </div>
            ))}
          </div>
        )}

        <div className="relative mx-6 mt-5 mb-4 border-t border-dashed border-white/20" />

        {/* QR */}
        <div className="relative mx-6 mb-6 rounded-2xl bg-white/95 p-3 flex items-center gap-3">
          <div className="bg-white rounded-xl p-1.5 flex-shrink-0">
            {data.qr_value ? (
              <QRCodeSVG value={data.qr_value} size={84} level="M" fgColor={bgFrom} />
            ) : (
              <div className="w-[84px] h-[84px] flex items-center justify-center text-[10px] text-muted-foreground text-center px-1">
                {t("pgProfile.card.saveYourProfile")}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-start">
            <p className="text-[11px] font-bold leading-tight" style={{ color: bgFrom }}>
              {data.qr_label || t("pgProfile.card.scanToConnect")}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
              {t("pgProfile.card.myDigitalCard")}
            </p>
            <div className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold" style={{ color: ring }}>
              <span className="w-1 h-1 rounded-full" style={{ background: ring }} />
              NAKFEEK · TICKET
            </div>
          </div>
        </div>
      </div>
    );
  }
);

AttendeeCard.displayName = "AttendeeCard";
export default AttendeeCard;
