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
        // حاوية استعلام: أحجام النصوص تتناسب مع عرض البطاقة الفعلي (cqw)
        containerType: "inline-size",
      }}
    >
      {/* الصورة بأبعادها الطبيعية كاملة — بلا قصّ ولا نسبة مفروضة */}
      <img
        src={templateUrl}
        alt=""
        className="block w-full h-auto select-none"
        draggable={false}
      />
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
              // الحجم بوحدة cqw = يتمدد وينكمش مع عرض البطاقة نفسها (المرجع 480px)
              fontSize: `clamp(9px, ${(f.fontSize / 4.8).toFixed(2)}cqw, ${Math.round(f.fontSize * 1.5)}px)`,
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
