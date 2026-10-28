import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// رأس موحّد لأقسام الصفحة الرئيسية: العنوان في بداية السطر والوصف في نهايته على الشاشات العريضة،
// فيمتد كل رأس على عرض الصفحة بدل أن يثقل جهة ويترك الأخرى فارغة، وبنفس المقاسات والمسافات في كل قسم.

// المسافة الرأسية الموحدة لكل قسم
export const SECTION_SPACING = "py-20 lg:py-28";

type Props = {
  title: ReactNode;
  lede?: ReactNode;
  tone?: "light" | "dark";
  // كلمة واحدة كبيرة بالذهبي (قسم «نكفيك»)
  display?: boolean;
  className?: string;
};

const SectionHeader = ({ title, lede, tone = "light", display, className }: Props) => (
  <motion.div
    className={cn("mb-12 flex flex-col gap-4 lg:mb-16 lg:flex-row lg:items-end lg:justify-between lg:gap-16", className)}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
  >
    <h2
      className={cn(
        "min-w-0 font-kufi font-bold",
        display
          ? "bg-gradient-to-b from-[#EBC88A] via-[#CC8E3D] to-[#A8702C] bg-clip-text pb-2 text-[clamp(4.5rem,9vw,8.5rem)] leading-none text-transparent"
          : cn("text-[clamp(2.25rem,4.4vw,3.6rem)] leading-[1.2]", tone === "dark" ? "text-white" : "text-primary"),
      )}
    >
      {title}
    </h2>
    {lede && (
      <p
        className={cn(
          "max-w-md text-lg leading-[1.85] lg:shrink-0",
          display ? "lg:pb-5" : "lg:pb-2",
          tone === "dark" ? "text-white/65" : "text-foreground/70",
        )}
      >
        {lede}
      </p>
    )}
  </motion.div>
);

export default SectionHeader;
