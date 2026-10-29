// شعار نكفيك: خمس بتلات على شكل حرف النون، في كل بتلة سلسلة نقاط.
// مُعاد رسمه بالقياس من ملف الهوية (src/assets/brand/logo-icon.jpg) ليبقى حاداً بأي مقاس.
// tone="light" للخلفيات الداكنة: البتلات بالأبيض والنقاط الملونة كما هي.
// شاشة الإقلاع في index.html تحمل نسخة ثابتة من هذا الرسم، فعدّلهما معاً.

const PETAL = "M-42 127V71.28A42 42 0 0 1 42 71.28V127L17 112.19V52.65A17 17 0 0 0-17 52.65V112.19Z";
const ROTATIONS = [0, 72, 144, 216, 288];

type Props = {
  className?: string;
  tone?: "color" | "light";
};

const BrandMark = ({ className, tone = "color" }: Props) => {
  const ink = tone === "light" ? "#FFFFFF" : "#492C5A";
  return (
    <svg viewBox="-140 -128 280 274" className={className} aria-hidden="true" focusable="false">
      {ROTATIONS.map((deg) => (
        <g key={deg} transform={`rotate(${deg})`} fill={ink}>
          <path d={PETAL} />
          <path d="M0 71.87V133.83" stroke={ink} strokeWidth="4.5" />
          <circle cy="71.87" r="11.65" fill="#A03C4A" />
          <circle cy="102.85" r="11.65" fill="#CC8E3D" />
          <circle cy="133.83" r="11.65" />
        </g>
      ))}
    </svg>
  );
};

export default BrandMark;
