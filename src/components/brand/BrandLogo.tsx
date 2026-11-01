import { cn } from "@/lib/utils";
import full from "@/assets/brand/ticket-full.svg";
import fullWhite from "@/assets/brand/ticket-full-white.svg";
import wordmark from "@/assets/brand/ticket-wordmark.svg";
import wordmarkWhite from "@/assets/brand/ticket-wordmark-white.svg";
import mark from "@/assets/brand/ticket-mark.svg";
import markPlain from "@/assets/brand/ticket-mark-plain.svg";

/**
 * شعار Ticket by Nakfeek Commercial — المصدر الوحيد لعرض الشعار في المنصة.
 * - full: الشعار الكامل مع "By Nakfeek Commercial"
 * - wordmark: كلمة ticket فقط (للمساحات الصغيرة كالشريط العلوي)
 * - mark: أيقونة حرف k مع الضربة الذهبية (للأيقونات والقوائم المطوية)
 * tone="white" للخلفيات الداكنة، و"color" للخلفيات الفاتحة.
 */
export type BrandLogoVariant = "full" | "wordmark" | "mark";
export type BrandLogoTone = "color" | "white";

export const brandLogoSrc = {
  full: { color: full, white: fullWhite },
  wordmark: { color: wordmark, white: wordmarkWhite },
  // الأيقونة على خلفية بنفسجية تعمل على الخلفيتين؛ "plain" بدون خلفية
  mark: { color: mark, white: mark },
  markPlain: { color: markPlain, white: markPlain },
} as const;

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  tone?: BrandLogoTone;
  className?: string;
  alt?: string;
}

const BrandLogo = ({ variant = "full", tone = "color", className, alt = "Ticket by Nakfeek" }: BrandLogoProps) => (
  <img
    src={brandLogoSrc[variant][tone]}
    alt={alt}
    draggable={false}
    className={cn("select-none", variant === "mark" ? "aspect-square" : "w-auto", className)}
  />
);

export default BrandLogo;
