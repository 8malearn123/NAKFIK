import { formatNumber, percent } from "@/lib/format";

interface RsvpBarProps {
  confirmed: number;
  declined: number;
  total: number;
}

/** شريط الردود: الأغمق للمؤكدين والأفتح للمعتذرين، والباقي بانتظار الرد */
const RsvpBar = ({ confirmed, declined, total }: RsvpBarProps) => {
  const replied = confirmed + declined;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 whitespace-nowrap text-xs leading-[18px] text-muted-foreground">
        <span>
          <b className="text-sm font-bold leading-5 text-foreground">{formatNumber(replied)}</b> من {formatNumber(total)} ردوا
        </span>
        <span>{percent(replied, total)}%</span>
      </div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-[#EFEDF2]">
        <i className="block h-full rounded-s-full bg-primary" style={{ width: `${percent(confirmed, total)}%` }} />
        <i className="block h-full bg-[#C9B7D4]" style={{ width: `${percent(declined, total)}%` }} />
      </div>
    </div>
  );
};

export default RsvpBar;
