import { formatNumber } from "@/lib/format";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: Segment[];
  center: string;
  centerLabel: string;
}

/** حلقة التوزيع مع مفتاح جانبي؛ لا تُعكس في RTL وتبدأ من الأعلى */
const DonutChart = ({ segments, center, centerLabel }: DonutChartProps) => {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg width={168} height={168} viewBox="0 0 168 168" role="img" aria-label={centerLabel} className="flex-none">
        {segments.map((s) => {
          const length = (s.value / total) * circumference;
          const visible = Math.max(length - 3, 0.5);
          const circle = (
            <circle
              key={s.label}
              cx={84}
              cy={84}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={18}
              strokeDasharray={`${visible} ${circumference - visible}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 84 84)"
            />
          );
          offset += length;
          return circle;
        })}
        <text x={84} y={84} textAnchor="middle" className="fill-foreground text-[26px] font-bold">{center}</text>
        <text x={84} y={106} textAnchor="middle" className="fill-muted-foreground text-xs font-medium">{centerLabel}</text>
      </svg>
      <div className="flex min-w-[140px] flex-1 flex-col gap-2.5 text-sm">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-muted-foreground">
            <i className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: s.color }} />
            {s.label}
            <b className="ms-auto font-semibold text-foreground">{formatNumber(s.value)}</b>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
