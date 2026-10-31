// تقارير المرحلة الأولى — الدعوات الخاصة فقط:
// نسخة كاملة بالفلاتر والبطاقات والرسوم وتوزيع VVIP/VIP/عادي والتصدير،
// كلها مبنية على بيانات الدعوات الخاصة وتتأثر فعلياً بالفلاتر المحددة.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ChevronDown, Crown, DoorOpen, Download, FileDown, FileSpreadsheet, FileText, Mail, Plus, TrendingUp, Users, X } from "lucide-react";
import DonutChart from "@/components/app/DonutChart";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatCard from "@/components/app/StatCard";
import TrendChart, { CHART_COLORS, ChartLegend } from "@/components/app/TrendChart";
import { formatDateShort, formatMonth, formatNumber, formatPercent, percent } from "@/lib/format";
import * as XLSX from "xlsx";
import { toast } from "sonner";

type Period = "all" | "7d" | "30d" | "12m";
const PERIODS: { key: Period; label: string }[] = [
  { key: "all", label: "كل الفترات" },
  { key: "7d", label: "آخر 7 أيام" },
  { key: "30d", label: "آخر 30 يومًا" },
  { key: "12m", label: "آخر 12 شهرًا" },
];

type Tier = "vvip" | "vip" | "regular";
const TIERS: { key: Tier; label: string; color: string }[] = [
  { key: "vvip", label: "VVIP", color: CHART_COLORS.gold },
  { key: "vip", label: "VIP", color: CHART_COLORS.primary },
  { key: "regular", label: "عادي", color: CHART_COLORS.mauve },
];
const RSVP_COLORS = { confirmed: CHART_COLORS.primary, declined: CHART_COLORS.gold, pending: CHART_COLORS.soft };
const TREND_SERIES = [
  { key: "تأكيدات", label: "تأكيدات", color: RSVP_COLORS.confirmed },
  { key: "اعتذارات", label: "اعتذارات", color: RSVP_COLORS.declined },
];

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

const FilterSelect = ({ value, onChange, options }: FilterSelectProps) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="h-10 w-auto min-w-[150px] gap-2 font-medium"><SelectValue /></SelectTrigger>
    <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
  </Select>
);

interface Inv { id: string; title: string; event_date: string; status: string }
interface Guest {
  id: string; invitation_id: string; rsvp_status: string;
  guest_tier?: string | null; confirmed_at?: string | null;
  checked_in_at?: string | null; invite_sent_at?: string | null; created_at?: string | null;
}

const tierOf = (g: Guest): Tier =>
  g.guest_tier === "vvip" ? "vvip" : g.guest_tier === "vip" ? "vip" : "regular";

// الطابع الزمني المعتمد لفلترة الفترة: الرد ثم الإرسال ثم الإضافة
const guestTime = (g: Guest): number => {
  const t = g.confirmed_at || g.invite_sent_at || g.created_at;
  return t ? new Date(t).getTime() : 0;
};

const PrivateReports = ({ organizationId, orgName }: { organizationId?: string; orgName?: string }) => {
  const [invs, setInvs] = useState<Inv[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("all");
  const [invFilter, setInvFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState<"all" | Tier>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "ended" | "cancelled">("all");
  const filtersActive = period !== "all" || invFilter !== "all" || tierFilter !== "all" || statusFilter !== "all";
  const resetFilters = () => { setPeriod("all"); setInvFilter("all"); setTierFilter("all"); setStatusFilter("all"); };

  useEffect(() => {
    if (!organizationId) return;
    (async () => {
      const { data: iv } = await supabase
        .from("private_invitations")
        .select("id, title, event_date, status")
        .eq("organization_id", organizationId)
        .order("event_date", { ascending: false });
      const list = (iv || []) as Inv[];
      setInvs(list);
      if (list.length) {
        const { data: g } = await supabase
          .from("private_invitation_guests")
          .select("*")
          .in("invitation_id", list.map((i) => i.id));
        setGuests((g || []) as Guest[]);
      }
      setLoading(false);
    })();
  }, [organizationId]);

  // ===== تطبيق الفلاتر — كل ما يلي يعتمد على النتائج المفلترة =====
  const cutoff = useMemo(() => {
    if (period === "all") return null;
    const d = new Date();
    if (period === "7d") d.setDate(d.getDate() - 7);
    else if (period === "30d") d.setDate(d.getDate() - 30);
    else d.setMonth(d.getMonth() - 12);
    return d.getTime();
  }, [period]);

  const fInvs = useMemo(() => invs.filter((i) => {
    if (invFilter !== "all" && i.id !== invFilter) return false;
    if (statusFilter !== "all") {
      const st = i.status === "cancelled" ? "cancelled"
        : new Date(i.event_date).getTime() > Date.now() ? "upcoming" : "ended";
      if (st !== statusFilter) return false;
    }
    return true;
  }), [invs, invFilter, statusFilter]);

  const fGuests = useMemo(() => {
    const ids = new Set(fInvs.map((i) => i.id));
    return guests.filter((g) => {
      if (!ids.has(g.invitation_id)) return false;
      if (tierFilter !== "all" && tierOf(g) !== tierFilter) return false;
      if (cutoff && guestTime(g) < cutoff) return false;
      return true;
    });
  }, [guests, fInvs, tierFilter, cutoff]);

  const stats = useMemo(() => {
    const total = fGuests.length;
    const confirmed = fGuests.filter((g) => g.rsvp_status === "confirmed").length;
    const declined = fGuests.filter((g) => g.rsvp_status === "declined").length;
    const checkedIn = fGuests.filter((g) => g.checked_in_at).length;
    const responseRate = total ? Math.round(((confirmed + declined) / total) * 100) : 0;
    return { invitations: fInvs.length, total, confirmed, declined, checkedIn, responseRate };
  }, [fInvs, fGuests]);

  // ===== اتجاه الردود عبر الزمن (تأكيدات/اعتذارات) =====
  const trend = useMemo(() => {
    const monthly = period === "12m" || period === "all";
    const buckets: { key: string; label: string; تأكيدات: number; اعتذارات: number }[] = [];
    const idx: Record<string, number> = {};
    const now = new Date();
    const count = monthly ? 12 : period === "7d" ? 7 : 30;
    for (let i = count - 1; i >= 0; i--) {
      // نبدأ من أول الشهر حتى لا يتكرر شهر عند 29-31
      const d = monthly ? new Date(now.getFullYear(), now.getMonth() - i, 1) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = monthly ? `${d.getFullYear()}-${d.getMonth()}` : d.toISOString().slice(0, 10);
      const label = monthly
        ? formatMonth(d)
        : formatDateShort(d);
      idx[key] = buckets.length;
      buckets.push({ key, label, تأكيدات: 0, اعتذارات: 0 });
    }
    fGuests.forEach((g) => {
      if (!g.confirmed_at) return;
      const d = new Date(g.confirmed_at);
      const key = monthly ? `${d.getFullYear()}-${d.getMonth()}` : d.toISOString().slice(0, 10);
      const i = idx[key];
      if (i === undefined) return;
      if (g.rsvp_status === "confirmed") buckets[i].تأكيدات++;
      else if (g.rsvp_status === "declined") buckets[i].اعتذارات++;
    });
    return buckets;
  }, [fGuests, period]);

  // ===== توزيع الردود =====
  const rsvpDist = useMemo(() => ([
    { name: "مؤكدون", value: stats.confirmed, color: RSVP_COLORS.confirmed },
    { name: "معتذرون", value: stats.declined, color: RSVP_COLORS.declined },
    { name: "بانتظار الرد", value: stats.total - stats.confirmed - stats.declined, color: RSVP_COLORS.pending },
  ].filter((x) => x.value > 0)), [stats]);

  // ===== توزيع التصنيفات VVIP / VIP / عادي =====
  const tierDist = useMemo(() => TIERS.map((t) => {
    const all = fGuests.filter((g) => tierOf(g) === t.key);
    const confirmed = all.filter((g) => g.rsvp_status === "confirmed").length;
    return {
      ...t,
      count: all.length,
      confirmed,
      pct: fGuests.length ? Math.round((all.length / fGuests.length) * 100) : 0,
    };
  }), [fGuests]);

  // ===== أداء المناسبات (مدعوون/مؤكدون لكل دعوة) =====
  const perInv = useMemo(() => fInvs.map((i) => {
    const g = fGuests.filter((x) => x.invitation_id === i.id);
    return {
      name: i.title,
      مدعوون: g.length,
      مؤكدون: g.filter((x) => x.rsvp_status === "confirmed").length,
    };
  }).filter((x) => x.مدعوون > 0).slice(0, 8), [fInvs, fGuests]);

  const STATUS_LABELS: Record<string, string> = { all: "كل الحالات", upcoming: "قادمة", ended: "منتهية", cancelled: "ملغاة" };
  const filtersSummary = () => {
    const out: string[] = [];
    out.push(`الفترة: ${PERIODS.find((p) => p.key === period)?.label}`);
    if (invFilter !== "all") out.push(`المناسبة: ${invs.find((i) => i.id === invFilter)?.title || ""}`);
    if (tierFilter !== "all") out.push(`التصنيف: ${TIERS.find((t) => t.key === tierFilter)?.label}`);
    if (statusFilter !== "all") out.push(`الحالة: ${STATUS_LABELS[statusFilter]}`);
    return out;
  };

  // ===== صفوف تقرير المناسبات (للتصدير) =====
  const buildInvRows = () => fInvs.map((i) => {
    const g = fGuests.filter((x) => x.invitation_id === i.id);
    const confirmed = g.filter((x) => x.rsvp_status === "confirmed").length;
    const declined = g.filter((x) => x.rsvp_status === "declined").length;
    return {
      "المناسبة": i.title,
      "التاريخ": new Date(i.event_date).toLocaleDateString("ar-SA"),
      "الحالة": i.status === "active" ? "نشطة" : i.status === "cancelled" ? "ملغاة" : i.status === "draft" ? "مسودة" : i.status,
      "المدعوون": g.length,
      "مؤكدون": confirmed,
      "معتذرون": declined,
      "بدون رد": g.length - confirmed - declined,
      "حضور فعلي": g.filter((x) => x.checked_in_at).length,
    };
  });

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    (wb.Workbook ||= {}).Views = [{ RTL: true }];
    const summary = [
      { "البند": "المناسبات", "القيمة": stats.invitations },
      { "البند": "المدعوون", "القيمة": stats.total },
      { "البند": "مؤكدون", "القيمة": stats.confirmed },
      { "البند": "معتذرون", "القيمة": stats.declined },
      { "البند": "حضور فعلي", "القيمة": stats.checkedIn },
      { "البند": "نسبة الاستجابة", "القيمة": `${stats.responseRate}%` },
      { "البند": "الفلاتر", "القيمة": filtersSummary().join(" · ") },
    ];
    const ws1 = XLSX.utils.json_to_sheet(summary);
    ws1["!cols"] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws1, "الملخص");
    const ws2 = XLSX.utils.json_to_sheet(buildInvRows());
    ws2["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws2, "المناسبات");
    const ws3 = XLSX.utils.json_to_sheet(tierDist.map((t) => ({
      "التصنيف": t.label, "المدعوون": t.count, "مؤكدون": t.confirmed, "النسبة": `${t.pct}%`,
    })));
    ws3["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws3, "التصنيفات");
    XLSX.writeFile(wb, `تقرير-الدعوات-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("تم تصدير التقرير بصيغة Excel");
  };

  const exportCSV = () => {
    const rows = buildInvRows();
    const head = Object.keys(rows[0] || { "المناسبة": "" });
    const csv = "﻿" + [head.join(","), ...rows.map((r) => head.map((h) => `"${(r as any)[h]}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `تقرير-الدعوات-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success("تم تصدير CSV");
  };

  const exportPDF = () => {
    const charts = Array.from(document.querySelectorAll("#priv-reports .recharts-wrapper svg"))
      .map((svg) => {
        const c = svg.cloneNode(true) as SVGElement;
        c.setAttribute("width", "660");
        c.removeAttribute("height");
        return c.outerHTML;
      });
    const rows = buildInvRows();
    const head = Object.keys(rows[0] || { "المناسبة": "" });
    const w = window.open("", "_blank");
    if (!w) { toast.error("اسمح بالنوافذ المنبثقة لتصدير PDF"); return; }
    w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
<title>تقرير الدعوات الخاصة</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; font-family: "Segoe UI", Tahoma, Arial, sans-serif; }
  body { color: #1f1830; margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #6b4d9e; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font-size: 22px; font-weight: 800; color: #6b4d9e; }
  .meta { font-size: 11px; color: #666; text-align: left; }
  .filters { background: #f5f1fb; border-radius: 10px; padding: 8px 12px; font-size: 11px; margin-bottom: 14px; }
  .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px; }
  .stat { border: 1px solid #e3dcf0; border-radius: 10px; padding: 10px; text-align: center; }
  .stat b { display: block; font-size: 18px; color: #6b4d9e; }
  .stat span { font-size: 10px; color: #777; }
  h2 { font-size: 14px; color: #6b4d9e; border-inline-start: 4px solid #6b4d9e; padding-inline-start: 8px; margin: 18px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #6b4d9e; color: #fff; padding: 6px; text-align: right; }
  td { border: 1px solid #e3dcf0; padding: 5px 6px; }
  tr:nth-child(even) td { background: #faf8fd; }
  .chart { margin: 10px 0; page-break-inside: avoid; text-align: center; }
  .foot { margin-top: 18px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
</style></head><body>
  <div class="head">
    <div class="brand">نكفيك تيكت — تقرير الدعوات الخاصة</div>
    <div class="meta">${new Date().toLocaleString("ar-SA")}<br/>${orgName || ""}</div>
  </div>
  <div class="filters"><b>الفلاتر المطبقة:</b> ${filtersSummary().join(" · ")}</div>
  <div class="stats">
    <div class="stat"><b>${stats.invitations}</b><span>المناسبات</span></div>
    <div class="stat"><b>${stats.total}</b><span>المدعوون</span></div>
    <div class="stat"><b>${stats.confirmed}</b><span>مؤكدون</span></div>
    <div class="stat"><b>${stats.checkedIn}</b><span>حضور فعلي</span></div>
    <div class="stat"><b>${stats.responseRate}%</b><span>نسبة الاستجابة</span></div>
  </div>
  <h2>توزيع التصنيفات</h2>
  <table><thead><tr><th>التصنيف</th><th>المدعوون</th><th>مؤكدون</th><th>النسبة</th></tr></thead>
  <tbody>${tierDist.map((t) => `<tr><td>${t.label}</td><td>${t.count}</td><td>${t.confirmed}</td><td>${t.pct}%</td></tr>`).join("")}</tbody></table>
  <h2>تفاصيل المناسبات</h2>
  <table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${head.map((h) => `<td>${(r as any)[h]}</td>`).join("")}</tr>`).join("")}</tbody></table>
  ${charts.length ? `<h2>الرسوم البيانية</h2>${charts.map((c) => `<div class="chart">${c}</div>`).join("")}` : ""}
  <div class="foot">أُنشئ هذا التقرير آلياً من منصة نكفيك تيكت</div>
<script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
</body></html>`);
    w.document.close();
    toast.success("افتح نافذة الطباعة واختر «حفظ كـ PDF»");
  };

  const statCards = [
    { icon: Mail, label: "المناسبات الخاصة", value: formatNumber(stats.invitations) },
    { icon: Users, label: "إجمالي المدعوين", value: formatNumber(stats.total) },
    { icon: CheckCircle2, label: "تأكيدات الحضور", value: formatNumber(stats.confirmed) },
    { icon: DoorOpen, label: "حضور فعلي", value: formatNumber(stats.checkedIn) },
    { icon: TrendingUp, label: "نسبة الاستجابة", value: `${stats.responseRate}%` },
  ];

  const header = (actions?: React.ReactNode) => <PageHeader title="التقارير" description="أداء دعواتك الخاصة" actions={actions} />;

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-card shadow-soft" />)}
      </div>
    );
  }

  // حالة فارغة فقط عندما لا توجد أي دعوات فعلاً في النظام
  if (invs.length === 0) {
    return (
      <div className="space-y-6">
        {header()}
        <div className="rounded-2xl bg-card shadow-soft">
          <EmptyState
            icon={Mail}
            title="لا توجد دعوات خاصة بعد"
            description="أنشئ أول دعوة لتظهر تقاريرها هنا"
            action={<Button asChild><Link to="/dashboard/invitations"><Plus className="w-4 h-4" /> إنشاء دعوة خاصة</Link></Button>}
          />
        </div>
      </div>
    );
  }

  const noData = <p className="py-12 text-center text-sm text-muted-foreground">لا توجد بيانات ضمن الفلاتر المحددة</p>;

  return (
    <div id="priv-reports" className="space-y-6">
      {header(
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Download className="w-4 h-4" /> تصدير التقرير <ChevronDown className="w-3.5 h-3.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportPDF} className="cursor-pointer"><FileText className="w-4 h-4" /> تصدير بصيغة PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel} className="cursor-pointer"><FileSpreadsheet className="w-4 h-4" /> تصدير بصيغة Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV} className="cursor-pointer"><FileDown className="w-4 h-4" /> تصدير بصيغة CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild><Link to="/dashboard/invitations"><Plus className="w-4 h-4" /> دعوة جديدة</Link></Button>
        </>,
      )}

      {/* الفلاتر تُطبَّق على كل إحصائيات ورسوم الصفحة */}
      <div className="flex flex-wrap items-center gap-2.5">
        <FilterSelect value={invFilter} onChange={setInvFilter} options={[{ value: "all", label: "كل المناسبات" }, ...invs.map((i) => ({ value: i.id, label: i.title }))]} />
        <FilterSelect value={period} onChange={(v) => setPeriod(v as Period)} options={PERIODS.map((p) => ({ value: p.key, label: p.label }))} />
        <FilterSelect value={tierFilter} onChange={(v) => setTierFilter(v as any)} options={[{ value: "all", label: "كل التصنيفات" }, ...TIERS.map((t) => ({ value: t.key, label: t.label }))]} />
        <FilterSelect value={statusFilter} onChange={(v) => setStatusFilter(v as any)} options={[{ value: "all", label: "كل الحالات" }, { value: "upcoming", label: "قادمة" }, { value: "ended", label: "منتهية" }, { value: "cancelled", label: "ملغاة" }]} />
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground"><X className="w-3.5 h-3.5" /> إعادة تعيين</Button>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((s) => <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="الردود عبر الزمن" description="تأكيدات واعتذارات المدعوين" actions={<ChartLegend series={TREND_SERIES} />}>
          <TrendChart data={trend} xKey="label" series={TREND_SERIES} height={270} />
        </Panel>
        <Panel title="توزيع الردود" bodyClassName="flex flex-col justify-center">
          {rsvpDist.length === 0 ? noData : (
            <DonutChart
              center={`${percent(stats.confirmed, stats.total)}%`}
              centerLabel="مؤكدون"
              segments={rsvpDist.map((d) => ({ label: d.name, value: d.value, color: d.color }))}
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="أداء المناسبات" description="نسبة التأكيد لكل مناسبة">
          {perInv.length === 0 ? noData : (
            <div className="space-y-4">
              {perInv.map((row) => {
                const rate = percent(row.مؤكدون, row.مدعوون);
                return (
                  <div key={row.name}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-semibold">{row.name}</span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">{formatNumber(row.مؤكدون)} من {formatNumber(row.مدعوون)}، {formatPercent(rate)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#EFEDF2]">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel title="تصنيفات المدعوين">
          {fGuests.length === 0 ? noData : (
            <div className="space-y-4">
              {tierDist.map((t) => (
                <div key={t.key}>
                  <div className="mb-1.5 flex items-center gap-2 text-sm">
                    {t.key === "vvip" && <Crown className="h-3.5 w-3.5 text-accent" />}
                    <span className="font-semibold"><bdi>{t.label}</bdi></span>
                    <span className="ms-auto text-xs text-muted-foreground">{formatNumber(t.count)} مدعو، {formatPercent(t.pct)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#EFEDF2]">
                    <div className="h-full rounded-full" style={{ width: `${t.pct}%`, background: t.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default PrivateReports;
