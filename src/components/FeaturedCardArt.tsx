// عرض البطاقة الخاصة (متحدث/راعي/ضيف شرف...) بحسب طريقة تصميمها:
// - تصميم خاص مرفوع → CustomTemplateRender (الصورة الكاملة + النصوص المثبتة عليها)
// - تصميم نكفيك → بطاقة ملوّنة بالخطوط والإطارات والزخارف المختارة
// - بدون تصميم → الشكل الافتراضي القديم (صورة + اسم + صفة)
import CustomTemplateRender from "@/components/design/CustomTemplateRender";
import { DEFAULT_OVERLAY, type NameOverlay } from "@/components/design/CustomTemplateDesigner";
import { OrnamentBorder, CornerFlourish } from "@/components/design/Ornaments";
import { IdCard } from "lucide-react";

export interface FeaturedCardData {
  name: string;
  role_label: string | null;
  description: string | null;
  image_url: string | null;
  design?: any | null;
  use_custom_template?: boolean | null;
  custom_template_url?: string | null;
  name_overlay?: any | null;
}

const shadeHex = (hex: string, amt: number) => {
  const n = hex.replace("#", "");
  if (n.length !== 6) return hex;
  const c = (i: number) => Math.max(0, Math.min(255, parseInt(n.slice(i, i + 2), 16) + amt));
  return `#${[c(0), c(2), c(4)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

const FeaturedCardArt = ({ card, compact = false }: { card: FeaturedCardData; compact?: boolean }) => {
  // 1) تصميم خاص مرفوع
  if (card.use_custom_template && card.custom_template_url) {
    return (
      <CustomTemplateRender
        templateUrl={card.custom_template_url}
        overlay={(card.name_overlay as NameOverlay) || DEFAULT_OVERLAY}
        guest={{ guest_name: card.name }}
        maxWidth={compact ? 320 : 480}
        className="!shadow-md"
      />
    );
  }

  // 2) تصميم نكفيك (ألوان/خطوط/إطار/زخرفة)
  const d = card.design;
  if (d && (d.theme_color || d.template_key)) {
    const theme = d.theme_color || "#0F1B3D";
    const accent = d.accent_color || "#C9A84C";
    const text = d.text_color || "#FFFFFF";
    const headingFont = d.heading_font || "Cairo";
    const bodyFont = d.body_font || "Cairo";
    const align: string = d.text_align || "center";
    const hs = d.heading_scale ?? 1;
    const bs = d.body_scale ?? 1;
    const sp = d.spacing_scale ?? 1;
    const opacity = d.content_opacity ?? 1;
    const frame = d.frame_style || "none";
    const corner = d.corner_style || "rounded";
    const bgStyle = d.bg_style || "gradient";
    const bgImage = d.background_image_url;
    const isPaper = bgStyle === "paper" && !bgImage;
    const paperBase = d.background_color && d.background_color !== "#FFFFFF" ? d.background_color : "#FAF6EC";

    let background: string;
    if (bgImage) background = `linear-gradient(${theme}cc, ${theme}ee), url(${bgImage}) center/cover`;
    else if (isPaper) background = `repeating-linear-gradient(0deg, transparent, transparent 3px, ${theme}08 3px, ${theme}08 4px), ${paperBase}`;
    else if (bgStyle === "solid") background = theme;
    else if (bgStyle === "pattern") background = `radial-gradient(${accent}2e 1.2px, transparent 1.2px) 0 0 / 16px 16px, linear-gradient(160deg, ${theme}, ${shadeHex(theme, -15)})`;
    else background = `linear-gradient(160deg, ${theme}, ${shadeHex(theme, -15)})`;

    const fg = isPaper ? theme : text;
    const radiusCls = corner === "square" ? "rounded-none" : "rounded-2xl";
    const innerRadius = corner === "square" ? "0" : "0.5rem";
    const itemsCls = align === "right" ? "items-end text-right" : align === "left" ? "items-start text-left" : "items-center text-center";

    const frameLayers =
      frame === "simple" ? (
        <div className="absolute inset-2 border pointer-events-none" style={{ borderColor: accent, borderRadius: innerRadius }} />
      ) : frame === "gold" ? (
        <>
          <div className="absolute inset-2 border-2 pointer-events-none" style={{ borderColor: "#C9A84C", borderRadius: innerRadius }} />
          <div className="absolute inset-3.5 border pointer-events-none" style={{ borderColor: "#E8D48B", borderRadius: innerRadius }} />
        </>
      ) : frame === "silver" ? (
        <>
          <div className="absolute inset-2 border-2 pointer-events-none" style={{ borderColor: "#9BA6B2", borderRadius: innerRadius }} />
          <div className="absolute inset-3.5 border pointer-events-none" style={{ borderColor: "#DDE3EA", borderRadius: innerRadius }} />
        </>
      ) : frame === "luxury" ? (
        <>
          <div className="absolute inset-1 border-2 pointer-events-none" style={{ borderColor: accent, borderRadius: innerRadius }} />
          <div className="absolute inset-2.5 border pointer-events-none" style={{ borderColor: accent + "88", borderRadius: innerRadius }} />
          <div className="absolute inset-4 border pointer-events-none" style={{ borderColor: accent + "44", borderRadius: innerRadius }} />
        </>
      ) : (
        <div className="absolute inset-2.5 border pointer-events-none" style={{ borderColor: accent + "88", borderRadius: innerRadius }} />
      );

    return (
      <div
        dir="rtl"
        className={`relative w-full aspect-[3/4] ${radiusCls} overflow-hidden shadow-md`}
        style={{ background, color: fg, fontFamily: `'${bodyFont}', sans-serif` }}
      >
        <OrnamentBorder style={d.ornament_style || "none"} color={accent} />
        {frameLayers}
        {corner === "ornate" && (
          <>
            <div className="absolute top-1 right-1 pointer-events-none"><CornerFlourish color={accent} /></div>
            <div className="absolute top-1 left-1 pointer-events-none -scale-x-100"><CornerFlourish color={accent} /></div>
            <div className="absolute bottom-1 right-1 pointer-events-none -scale-y-100"><CornerFlourish color={accent} /></div>
            <div className="absolute bottom-1 left-1 pointer-events-none -scale-100"><CornerFlourish color={accent} /></div>
          </>
        )}

        <div
          className={`relative z-10 h-full flex flex-col justify-center ${itemsCls} px-6`}
          style={{ gap: `${0.55 * sp}rem`, opacity }}
        >
          {d.logo_url && (
            <img src={d.logo_url} alt="" className="h-10 object-contain mb-1" style={{ maxWidth: "60%" }} />
          )}
          {card.image_url ? (
            <img
              src={card.image_url}
              alt={card.name}
              className={`${compact ? "w-16 h-16" : "w-24 h-24"} rounded-full object-cover shadow-lg`}
              style={{ border: `3px solid ${accent}` }}
            />
          ) : (
            <div
              className={`${compact ? "w-16 h-16" : "w-24 h-24"} rounded-full flex items-center justify-center`}
              style={{ border: `3px solid ${accent}`, background: accent + "22" }}
            >
              <IdCard className={compact ? "w-6 h-6" : "w-9 h-9"} style={{ color: accent }} />
            </div>
          )}
          <div className="h-px w-12" style={{ background: accent }} />
          <h3
            className="font-bold leading-snug"
            style={{ fontFamily: `'${headingFont}', serif`, fontSize: `${(compact ? 0.95 : 1.15) * hs}rem` }}
          >
            {card.name}
          </h3>
          {card.role_label && (
            <span
              className="text-[11px] font-bold rounded-full px-3 py-1"
              style={{ background: accent, color: isPaper ? "#FFFFFF" : theme }}
            >
              {card.role_label}
            </span>
          )}
          {card.description && !compact && (
            <p className="leading-relaxed opacity-90 line-clamp-4" style={{ fontSize: `${0.72 * bs}rem` }}>
              {card.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 3) الشكل الافتراضي (بدون تصميم)
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-border/50 bg-background">
      {card.image_url ? (
        <img src={card.image_url} alt={card.name} className={`w-full ${compact ? "h-24" : "h-40"} object-cover`} />
      ) : (
        <div className={`w-full ${compact ? "h-24" : "h-40"} bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center`}>
          <IdCard className={`${compact ? "w-6 h-6" : "w-12 h-12"} text-primary/40`} />
        </div>
      )}
      <div className={compact ? "p-2.5" : "p-4 space-y-1.5"}>
        <p className={`font-bold text-foreground truncate ${compact ? "text-xs" : ""}`}>{card.name}</p>
        {card.role_label && (
          <span className={`inline-block mt-1 font-semibold bg-primary/10 text-primary rounded-full px-2 py-0.5 ${compact ? "text-[10px]" : "text-[11px]"}`}>
            {card.role_label}
          </span>
        )}
        {card.description && (
          <p className={`text-muted-foreground line-clamp-2 ${compact ? "text-[11px] mt-1.5" : "text-xs"}`}>{card.description}</p>
        )}
      </div>
    </div>
  );
};

export default FeaturedCardArt;
