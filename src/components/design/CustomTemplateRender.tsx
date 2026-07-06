import { toFields, type NameOverlay } from "./CustomTemplateDesigner";

interface GuestData {
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
}

interface Props {
  templateUrl: string;
  overlay: NameOverlay;
  guest: GuestData;
  className?: string;
  maxWidth?: number;
}

export default function CustomTemplateRender({
  templateUrl, overlay, guest, className = "", maxWidth = 480,
}: Props) {
  const fields = toFields(overlay);
  const valueOf = (f: ReturnType<typeof toFields>[number]): string => {
    if (f.field === "static") return f.staticText || "";
    return (guest[f.field] as string) || "";
  };

  return (
    <div
      className={`relative w-full mx-auto rounded-2xl overflow-hidden shadow-2xl ${className}`}
      style={{
        maxWidth,
        aspectRatio: "9 / 16",
        backgroundImage: `url(${templateUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {fields.map((f) => {
        const v = valueOf(f);
        if (!v && !f.prefix && !f.suffix) return null;
        return (
          <div
            key={f.id}
            className="absolute pointer-events-none"
            style={{
              left: `${f.xPct}%`,
              top: `${f.yPct}%`,
              width: `${f.widthPct}%`,
              transform: "translate(-50%, -50%)",
              textAlign: f.textAlign,
              color: f.color,
              fontFamily: `'${f.fontFamily}', serif`,
              fontSize: `clamp(12px, ${f.fontSize / 10}vw, ${f.fontSize}px)`,
              fontWeight: f.fontWeight,
              letterSpacing: `${f.letterSpacing}px`,
              lineHeight: 1.25,
              textShadow: f.shadow
                ? "0 2px 12px rgba(0,0,0,0.55), 0 0 4px rgba(0,0,0,0.4)"
                : "none",
              direction: "rtl",
            }}
          >
            {f.prefix && <span>{f.prefix} </span>}
            {v}
            {f.suffix && <span> {f.suffix}</span>}
          </div>
        );
      })}
    </div>
  );
}
