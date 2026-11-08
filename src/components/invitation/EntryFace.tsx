import { QRCodeSVG } from "qrcode.react";
import { useElementSize } from "@/hooks/useElementSize";
import { alpha, mix } from "./colors";

// ظهر بطاقة الدعوة: رمز الدخول الذي يُمسح عند الباب، بألوان الدعوة نفسها.
// المقاسات بوحدات الحاوية (cqw/cqh) لتناسب أي مقاس بطاقة. والتصاميم المرفوعة العريضة
// تُعرض أفقياً (الرمز بجانب الاسم) حتى يبقى الرمز كبيراً بما يكفي للمسح.

type Props = {
  theme: string;
  accent: string;
  guestName: string;
  title: string;
  qrValue: string;
  companions: number;
  /** وقت الدخول إن استُخدمت الدعوة */
  checkedInAt?: string | null;
};

const fit = (w: number, h: number) => `min(${w}cqw, ${h}cqh)`;

const companionsLabel = (n: number) => (n === 1 ? "ومعه مرافق واحد" : n === 2 ? "ومعه مرافقان" : n <= 10 ? `ومعه ${n} مرافقين` : `ومعه ${n} مرافقاً`);

export default function EntryFace({ theme, accent, guestName, title, qrValue, companions, checkedInAt }: Props) {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const wide = width > 0 && width > height * 1.05;
  const long = [...guestName].length;
  const nameSize = wide
    ? fit(long > 14 ? 4.4 : 5.4, long > 14 ? 9 : 11)
    : long > 20 ? fit(5.6, 4.2) : long > 14 ? fit(6.6, 5) : fit(8, 6);
  const status = checkedInAt ? `استُخدمت الدعوة للدخول ${checkedInAt}` : "يرجى إبراز هذا الرمز عند الباب";

  const qr = (size: string) => (
    <div className="flex-none bg-white" style={{ padding: wide ? fit(2.4, 4.6) : fit(3.2, 2.4), borderRadius: wide ? fit(2.4, 4.6) : fit(4, 3) }}>
      <QRCodeSVG value={qrValue} level="M" fgColor={mix(theme, "#000000", 0.55)} style={{ display: "block", width: size, height: size }} />
    </div>
  );

  return (
    <div
      ref={ref}
      className="relative h-full w-full overflow-hidden rounded-xl text-white shadow-2xl"
      style={{ background: `linear-gradient(160deg, ${theme}, ${mix(theme, "#000000", 0.28)})`, containerType: "size" }}
    >
      <div className="pointer-events-none absolute inset-[min(3.5cqw,6cqh)] rounded-[2.4cqw] border" style={{ borderColor: alpha(accent, 0.65) }} />
      <div className="pointer-events-none absolute inset-[min(5.4cqw,9cqh)] rounded-[1.8cqw] border" style={{ borderColor: alpha(accent, 0.3) }} />

      {wide ? (
        <div className="relative z-10 flex h-full items-center justify-center gap-[6cqw] px-[9cqw]">
          {qr(fit(38, 64))}
          <div className="min-w-0 text-start">
            <p style={{ color: accent, fontSize: fit(2.8, 6) }}>رمز الدخول</p>
            <p className="font-ruqaa font-bold leading-tight" style={{ fontSize: nameSize, marginTop: fit(1.4, 3) }}>
              {guestName}
            </p>
            <p className="text-white/75" style={{ fontSize: fit(2.6, 5.4), marginTop: fit(1, 2) }}>
              {title}
              {companions > 0 && <span className="block">{companionsLabel(companions)}</span>}
            </p>
            <p className="text-white/65" style={{ fontSize: fit(2.4, 5), marginTop: fit(2.4, 5) }}>{status}</p>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-[10cqw] text-center">
          <p style={{ color: accent, fontSize: fit(3.9, 2.9) }}>رمز الدخول</p>
          <div style={{ marginTop: fit(3.5, 2.6) }}>{qr(fit(46, 38))}</div>
          <p className="font-ruqaa font-bold leading-tight" style={{ fontSize: nameSize, marginTop: fit(5, 3.8) }}>
            {guestName}
          </p>
          <p className="text-white/75" style={{ fontSize: fit(3.6, 2.7), marginTop: fit(1.6, 1.2) }}>
            {title}
            {companions > 0 && <span className="block">{companionsLabel(companions)}</span>}
          </p>
          <p className="text-white/65" style={{ fontSize: fit(3.4, 2.6), marginTop: fit(5, 3.8) }}>{status}</p>
        </div>
      )}
    </div>
  );
}
