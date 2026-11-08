// مزج ألوان الدعوة (لون المضيف الأساسي والثانوي) لاشتقاق درجات الظرف والخلفية.

const toRgb = (hex: string) => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb: number[]) =>
  `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

/** يمزج لونين: t=0 الأول كما هو، t=1 الثاني كما هو */
export const mix = (a: string, b: string, t: number) => {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};

export const alpha = (hex: string, a: number) => {
  const [r, g, b] = toRgb(hex);
  return `rgb(${r} ${g} ${b} / ${a})`;
};
