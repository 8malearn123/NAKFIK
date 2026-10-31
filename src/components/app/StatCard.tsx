import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon?: LucideIcon;
  // نص المقارنة مثل +12%، ويُعرض مع اتجاهه
  delta?: string;
  deltaDown?: boolean;
  // الانخفاض قد يكون جيداً، مثل عدد المعتذرين
  deltaGood?: boolean;
  note?: string;
  className?: string;
}

const StatCard = ({ label, value, unit, icon: Icon, delta, deltaDown, deltaGood, note, className }: StatCardProps) => {
  const good = deltaGood ?? !deltaDown;
  const Trend = deltaDown ? TrendingDown : TrendingUp;
  return (
    <div className={cn("flex min-w-0 flex-col gap-2.5 rounded-2xl bg-card px-6 py-[22px] shadow-soft", className)}>
      <div className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
        <span className="truncate">{label}</span>
        {Icon && (
          <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="truncate text-[32px] font-bold leading-10">{value}</span>
        {unit && <span className="text-sm font-semibold text-muted-foreground">{unit}</span>}
      </div>
      {(delta || note) && (
        <div className="flex items-center gap-2 text-xs leading-[18px] text-muted-foreground">
          {delta && (
            <span
              className={cn(
                "inline-flex h-[22px] items-center gap-1 rounded-full px-2 font-semibold",
                good ? "bg-[#E8F5EE] text-[#0E7A4F]" : "bg-[#FBECEA] text-[#B42F24]",
              )}
            >
              <Trend className="h-3 w-3" strokeWidth={2.4} />
              <bdi dir="ltr">{delta}</bdi>
            </span>
          )}
          {note && <span className="truncate">{note}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
