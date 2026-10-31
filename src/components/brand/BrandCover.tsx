import { cn } from "@/lib/utils";
import BrandLogo from "./BrandLogo";

/** غلاف افتراضي بهوية Ticket — يُستخدم عند غياب صورة غلاف للفعالية أو الدعوة. */
const BrandCover = ({ className }: { className?: string }) => (
  <div className={cn("relative w-full h-full overflow-hidden gradient-hero", className)}>
    <div className="absolute inset-0 bg-brand-pattern opacity-60" />
    <div className="brand-slash absolute -top-6 -left-10 w-[70%] h-6 opacity-80" />
    <div className="absolute inset-0 flex items-center justify-center">
      <BrandLogo tone="white" className="h-20 sm:h-24 opacity-95" />
    </div>
  </div>
);

export default BrandCover;
