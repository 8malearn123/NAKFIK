import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "primary";

const TONES: Record<StatusTone, string> = {
  success: "bg-[#E8F5EE] text-[#0E7A4F]",
  warning: "bg-[#FDF3E3] text-[#9A5F12]",
  danger: "bg-[#FBECEA] text-[#B42F24]",
  neutral: "bg-[#F1EFF4] text-[#5F5968]",
  primary: "bg-secondary text-primary",
};

interface StatusBadgeProps {
  tone?: StatusTone;
  className?: string;
  children: React.ReactNode;
}

const StatusBadge = ({ tone = "neutral", className, children }: StatusBadgeProps) => (
  <span className={cn("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold", TONES[tone], className)}>
    <i className="h-1.5 w-1.5 rounded-full bg-current" />
    {children}
  </span>
);

export default StatusBadge;
