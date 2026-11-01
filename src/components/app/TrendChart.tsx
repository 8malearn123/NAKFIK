import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";

export const CHART_COLORS = { primary: "#6B4A82", gold: "#CC8E3D", soft: "#E8E3EE", mauve: "#B9A7C6", teal: "#0B6159", danger: "#C0392B" };

interface Series {
  key: string;
  label: string;
  color: string;
}

interface TrendChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  series: Series[];
  height?: number;
}

export const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div dir="rtl" className="rounded-xl bg-card px-3 py-2 text-xs shadow-soft-lg">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <i className="h-2 w-2 rounded-[3px]" style={{ background: p.color }} />
          {p.name}
          <b className="ms-auto ps-3 font-semibold text-foreground">{formatNumber(p.value)}</b>
        </p>
      ))}
    </div>
  );
};

export const ChartLegend = ({ series }: { series: Pick<Series, "label" | "color">[] }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs leading-[18px] text-muted-foreground">
    {series.map((s) => (
      <span key={s.label} className="inline-flex items-center gap-1.5">
        <i className="h-2 w-2 rounded-[3px]" style={{ background: s.color }} />
        {s.label}
      </span>
    ))}
  </div>
);

/** الرسم الزمني الموحد: الزمن من اليسار إلى اليمين حتى يقرأ النمو صعوداً */
const TrendChart = ({ data, xKey, series, height = 280 }: TrendChartProps) => {
  const gradient = useId();
  const tick = { fontSize: 12, fill: "hsl(var(--muted-foreground))" };
  return (
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 24 }}>
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={series[0].color} stopOpacity={0.18} />
              <stop offset="1" stopColor={series[0].color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="hsl(var(--border))" />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={tick} tickMargin={10} interval="preserveStartEnd" />
          <YAxis orientation="right" tickLine={false} axisLine={false} tick={tick} width={44} tickFormatter={formatNumber} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))" }} />
          {series.map((s, i) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={i === 0 ? 2.5 : 2} fill={i === 0 ? `url(#${gradient})` : "none"} dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;
