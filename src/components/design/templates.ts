// Curated professional design templates
export type DesignTemplate = {
  key: string;
  label: string;
  category: "elegant" | "modern" | "classic" | "playful" | "luxury";
  theme_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  heading_font: string;
  body_font: string;
  layout_style: "classic" | "framed" | "split" | "minimal" | "portrait";
  ornament_style: "none" | "arabesque" | "floral" | "geometric" | "art-deco" | "waves";
};

export const TEMPLATES: DesignTemplate[] = [
  { key: "classic-gold",    label: "كلاسيكي ذهبي",   category: "classic", theme_color: "#0F1B3D", accent_color: "#C9A84C", background_color: "#FAF6EC", text_color: "#FFFFFF", heading_font: "Amiri",   body_font: "Cairo",   layout_style: "framed",  ornament_style: "art-deco" },
  { key: "rose-blush",      label: "وردي بلاش",      category: "elegant", theme_color: "#7B2C50", accent_color: "#E8C5D0", background_color: "#FFF5F7", text_color: "#FFFFFF", heading_font: "Amiri",   body_font: "Tajawal", layout_style: "classic", ornament_style: "floral" },
  { key: "royal-purple",    label: "أرجواني ملكي",   category: "luxury",  theme_color: "#492C5A", accent_color: "#CC8E3D", background_color: "#F4EFF5", text_color: "#FFFFFF", heading_font: "Amiri",   body_font: "Cairo",   layout_style: "framed",  ornament_style: "arabesque" },
  { key: "emerald-prestige",label: "زمرّدي فاخر",    category: "luxury",  theme_color: "#064E3B", accent_color: "#C9A84C", background_color: "#F1F8F5", text_color: "#FFFFFF", heading_font: "Amiri",   body_font: "Cairo",   layout_style: "classic", ornament_style: "art-deco" },
  { key: "desert-sand",     label: "صحراوي دافئ",    category: "elegant", theme_color: "#A03C4A", accent_color: "#E8B84A", background_color: "#FBF4E8", text_color: "#FFFFFF", heading_font: "Amiri",   body_font: "Cairo",   layout_style: "split",   ornament_style: "geometric" },
  { key: "midnight-luxe",   label: "ليلي ذهبي",      category: "luxury",  theme_color: "#0D0D0D", accent_color: "#C9A84C", background_color: "#1A1A1A", text_color: "#FFFFFF", heading_font: "Amiri",   body_font: "Cairo",   layout_style: "framed",  ornament_style: "art-deco" },
  { key: "ocean-fresh",     label: "محيطي منعش",     category: "modern",  theme_color: "#006962", accent_color: "#7DD3FC", background_color: "#F0FBFA", text_color: "#FFFFFF", heading_font: "Cairo",   body_font: "Cairo",   layout_style: "minimal", ornament_style: "waves" },
  { key: "minimal-mono",    label: "أحادي بسيط",     category: "modern",  theme_color: "#1A1A1A", accent_color: "#A03C4A", background_color: "#FFFFFF", text_color: "#1A1A1A", heading_font: "Cairo",   body_font: "Cairo",   layout_style: "minimal", ornament_style: "none" },
  { key: "floral-spring",   label: "ربيعي زهري",     category: "playful", theme_color: "#7D9B76", accent_color: "#E88AAB", background_color: "#F8FAF1", text_color: "#FFFFFF", heading_font: "Amiri",   body_font: "Tajawal", layout_style: "classic", ornament_style: "floral" },
  { key: "modern-bold",     label: "عصري جريء",      category: "modern",  theme_color: "#E94560", accent_color: "#FFD93D", background_color: "#FFF8E7", text_color: "#FFFFFF", heading_font: "Tajawal", body_font: "Tajawal", layout_style: "split",   ornament_style: "geometric" },
  { key: "navy-executive",  label: "بحري تنفيذي",    category: "classic", theme_color: "#1E3A5F", accent_color: "#C9A84C", background_color: "#F4F7FB", text_color: "#FFFFFF", heading_font: "Cairo",   body_font: "Cairo",   layout_style: "framed",  ornament_style: "art-deco" },
  { key: "saffron-gold",    label: "زعفراني ذهبي",   category: "elegant", theme_color: "#8B4513", accent_color: "#FFB74D", background_color: "#FFF8F0", text_color: "#FFFFFF", heading_font: "Amiri",   body_font: "Cairo",   layout_style: "classic", ornament_style: "arabesque" },
];

export const FONTS = [
  { value: "Cairo",            label: "Cairo (عصري)" },
  { value: "Tajawal",          label: "Tajawal (نظيف)" },
  { value: "Amiri",            label: "Amiri (نسخ كلاسيكي)" },
  { value: "Reem Kufi",        label: "Reem Kufi (كوفي)" },
  { value: "Scheherazade New", label: "Scheherazade (تقليدي)" },
  { value: "Aref Ruqaa",       label: "Aref Ruqaa (رقعة)" },
];

export const LAYOUTS = [
  { key: "classic",  label: "كلاسيكي",       desc: "نص في الوسط وخطوط أفقية" },
  { key: "framed",   label: "إطار مزدوج",   desc: "حدود مزدوجة فاخرة" },
  { key: "split",    label: "شريط علوي",    desc: "شريط لون + محتوى أسفل" },
  { key: "minimal",  label: "أنيق بسيط",    desc: "مساحات بيضاء واسعة" },
] as const;

export const ORNAMENTS = [
  { key: "none",      label: "بدون" },
  { key: "arabesque", label: "أرابيسك" },
  { key: "floral",    label: "زهري" },
  { key: "geometric", label: "هندسي" },
  { key: "art-deco",  label: "آرت ديكو" },
  { key: "waves",     label: "أمواج" },
] as const;
