import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { usePlanScope } from "@/hooks/usePlanScope";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Ticket, Calendar, TrendingDown, TrendingUp, DollarSign, Download, X, FileText, FileSpreadsheet, FileDown, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import InvitationsReport from "@/components/reports/InvitationsReport";
import PrivateReports from "@/components/reports/PrivateReports";
import DonutChart from "@/components/app/DonutChart";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatCard from "@/components/app/StatCard";
import TrendChart, { CHART_COLORS, ChartLegend } from "@/components/app/TrendChart";
import { formatDateShort, formatDateTime, formatMonth, formatNumber, formatPercent, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EventRow {
  id: string;
  title_ar: string;
  start_date: string;
  end_date: string | null;
  current_attendees_count: number;
  max_attendees: number | null;
  status: string;
  category: string;
}
interface RegistrationRow {
  id: string;
  event_id: string;
  ticket_id: string | null;
  amount_paid: number | null;
  registered_at: string;
  checked_in_at: string | null;
  payment_status: string;
}

// ===== فلاتر أعلى الصفحة =====
type TicketClass = "vvip" | "vip" | "regular";
type EventTimeStatus = "upcoming" | "ongoing" | "ended";
type FilterPeriod = "all" | "7d" | "30d" | "12m";

// تصنيف التذكرة من اسمها ونوعها (VVIP / VIP / عادي)
const classifyTicket = (name: string | null, type: string | null): TicketClass => {
  const n = (name || "").toUpperCase();
  if (n.includes("VVIP")) return "vvip";
  if (type === "vip" || n.includes("VIP")) return "vip";
  return "regular";
};

// حالة الفعالية زمنياً: قادمة / جارية / منتهية
const eventTimeStatus = (e: EventRow): EventTimeStatus => {
  const now = Date.now();
  const start = new Date(e.start_date).getTime();
  // فعالية بلا وقت نهاية تُعتبر جارية لست ساعات من بدايتها
  const end = e.end_date ? new Date(e.end_date).getTime() : start + 6 * 3600_000;
  if (start > now) return "upcoming";
  if (end < now) return "ended";
  return "ongoing";
};

const FILTER_PERIODS: { key: FilterPeriod; label: string }[] = [
  { key: "all", label: "كل الفترات" },
  { key: "7d", label: "آخر 7 أيام" },
  { key: "30d", label: "آخر 30 يومًا" },
  { key: "12m", label: "آخر 12 شهرًا" },
];
const FILTER_TICKETS: { key: "all" | TicketClass; label: string }[] = [
  { key: "all", label: "كل التذاكر" },
  { key: "vvip", label: "VVIP" },
  { key: "vip", label: "VIP" },
  { key: "regular", label: "عادي" },
];
const FILTER_STATUS: { key: "all" | EventTimeStatus; label: string }[] = [
  { key: "all", label: "كل الحالات" },
  { key: "upcoming", label: "قادمة" },
  { key: "ongoing", label: "جارية" },
  { key: "ended", label: "منتهية" },
];

const COLORS = [CHART_COLORS.primary, CHART_COLORS.gold, CHART_COLORS.mauve, CHART_COLORS.teal, CHART_COLORS.soft, CHART_COLORS.danger];

const CATEGORY_LABELS: Record<string, string> = {
  conference: "مؤتمر", workshop: "ورشة عمل", seminar: "ندوة", meetup: "لقاء", other: "أخرى",
};

const SALES_SERIES = [
  { key: "registrations", label: "التسجيلات", color: CHART_COLORS.primary },
  { key: "tickets", label: "التذاكر المباعة", color: CHART_COLORS.gold },
];
const REVENUE_SERIES = [{ key: "revenue", label: "الإيراد", color: CHART_COLORS.primary }];

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: { value: string; label: string }[];
  className?: string;
}

const FilterSelect = ({ value, onChange, label, options, className }: FilterSelectProps) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label={label} className={cn("h-10 w-[calc(50%-5px)] gap-2 font-medium sm:w-auto sm:min-w-[150px]", className)}><SelectValue /></SelectTrigger>
    <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
  </Select>
);

// فترات تبويب "الاتجاهات"
type SalesPeriod = "7d" | "30d" | "12m";
const SALES_PERIODS: { key: SalesPeriod; label: string }[] = [
  { key: "7d", label: "آخر 7 أيام" },
  { key: "30d", label: "آخر 30 يومًا" },
  { key: "12m", label: "آخر 12 شهرًا" },
];

const Reports = () => {
  const { organization } = useAuth();
  const { canPublic } = usePlanScope();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [regs, setRegs] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>("30d");
  const [ticketClasses, setTicketClasses] = useState<Record<string, TicketClass>>({});

  // حالة الفلاتر
  const [filterEvent, setFilterEvent] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all");
  const [filterTicket, setFilterTicket] = useState<"all" | TicketClass>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | EventTimeStatus>("all");
  const filtersActive = filterEvent !== "all" || filterPeriod !== "all" || filterTicket !== "all" || filterStatus !== "all";
  const resetFilters = () => { setFilterEvent("all"); setFilterPeriod("all"); setFilterTicket("all"); setFilterStatus("all"); };

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      const { data: ev } = await supabase
        .from("events")
        .select("id, title_ar, start_date, end_date, current_attendees_count, max_attendees, status, category")
        .eq("organization_id", organization.id);
      const evtList = (ev || []) as EventRow[];
      setEvents(evtList);

      if (evtList.length) {
        const ids = evtList.map(e => e.id);
        const [{ data: r }, { data: tix }] = await Promise.all([
          supabase
            .from("registrations")
            .select("id, event_id, ticket_id, amount_paid, registered_at, checked_in_at, payment_status")
            .in("event_id", ids),
          supabase.from("tickets").select("id, name_ar, name_en, type").in("event_id", ids),
        ]);
        setRegs((r || []) as RegistrationRow[]);
        const classes: Record<string, TicketClass> = {};
        (tix || []).forEach((t: any) => {
          classes[t.id] = classifyTicket(t.name_en || t.name_ar, t.type);
        });
        setTicketClasses(classes);
      }
      setLoading(false);
    };
    load();
  }, [organization]);

  // ===== تطبيق الفلاتر — كل الإحصائيات والرسوم أدناه تُبنى على النتائج المفلترة =====
  const fEvents = useMemo(() => {
    return events.filter(e => {
      if (filterEvent !== "all" && e.id !== filterEvent) return false;
      if (filterStatus !== "all" && eventTimeStatus(e) !== filterStatus) return false;
      return true;
    });
  }, [events, filterEvent, filterStatus]);

  const fRegs = useMemo(() => {
    const ids = new Set(fEvents.map(e => e.id));
    let cutoff: Date | null = null;
    if (filterPeriod !== "all") {
      cutoff = new Date();
      if (filterPeriod === "7d") cutoff.setDate(cutoff.getDate() - 7);
      else if (filterPeriod === "30d") cutoff.setDate(cutoff.getDate() - 30);
      else cutoff.setMonth(cutoff.getMonth() - 12);
    }
    return regs.filter(r => {
      if (!ids.has(r.event_id)) return false;
      if (cutoff && (!r.registered_at || new Date(r.registered_at) < cutoff)) return false;
      if (filterTicket !== "all") {
        const cls = r.ticket_id ? ticketClasses[r.ticket_id] || "regular" : "regular";
        if (cls !== filterTicket) return false;
      }
      return true;
    });
  }, [regs, fEvents, filterPeriod, filterTicket, ticketClasses]);

  const stats = useMemo(() => {
    const totalReg = fRegs.length;
    const checkedIn = fRegs.filter(r => r.checked_in_at).length;
    const revenue = fRegs.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    const attendanceRate = totalReg ? Math.round((checkedIn / totalReg) * 100) : 0;
    return { events: fEvents.length, registrations: totalReg, checkedIn, revenue, attendanceRate };
  }, [fEvents, fRegs]);

  // مقارنة تلقائية مع الفترة السابقة المكافئة — تتبع فلتر الفترة (والافتراضي 30 يوماً)
  type Delta = { pct: number; isNew: boolean };
  const statDeltas = useMemo(() => {
    const period: FilterPeriod = filterPeriod === "all" ? "30d" : filterPeriod;
    const now = new Date();
    const curStart = new Date(now);
    if (period === "7d") curStart.setDate(curStart.getDate() - 7);
    else if (period === "30d") curStart.setDate(curStart.getDate() - 30);
    else curStart.setMonth(curStart.getMonth() - 12);
    const prevStart = new Date(curStart);
    if (period === "7d") prevStart.setDate(prevStart.getDate() - 7);
    else if (period === "30d") prevStart.setDate(prevStart.getDate() - 30);
    else prevStart.setMonth(prevStart.getMonth() - 12);

    // نفس فلاتر الصفحة لكن بدون قصّ الفترة — حتى نقدر نقيس الفترة السابقة
    const ids = new Set(fEvents.map(e => e.id));
    const scoped = regs.filter(r => {
      if (!ids.has(r.event_id)) return false;
      if (filterTicket !== "all") {
        const cls = r.ticket_id ? ticketClasses[r.ticket_id] || "regular" : "regular";
        if (cls !== filterTicket) return false;
      }
      return true;
    });
    const inWin = (dateStr: string | null, from: Date, to: Date) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= from && d < to;
    };
    const cur = scoped.filter(r => inWin(r.registered_at, curStart, now));
    const prev = scoped.filter(r => inWin(r.registered_at, prevStart, curStart));

    const delta = (c: number, p: number): Delta =>
      p > 0 ? { pct: Math.round(((c - p) / p) * 100), isNew: false }
            : c > 0 ? { pct: 0, isNew: true } : { pct: 0, isNew: false };

    const curChecked = cur.filter(r => r.checked_in_at).length;
    const prevChecked = prev.filter(r => r.checked_in_at).length;
    const curRevenue = cur.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    const prevRevenue = prev.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    const curRate = cur.length ? (curChecked / cur.length) * 100 : 0;
    const prevRate = prev.length ? (prevChecked / prev.length) * 100 : 0;
    const curEvents = fEvents.filter(e => inWin(e.start_date, curStart, now)).length;
    const prevEvents = fEvents.filter(e => inWin(e.start_date, prevStart, curStart)).length;

    return {
      events: delta(curEvents, prevEvents),
      registrations: delta(cur.length, prev.length),
      checkedIn: delta(curChecked, prevChecked),
      attendanceRate: delta(Math.round(curRate), Math.round(prevRate)),
      revenue: delta(curRevenue, prevRevenue),
    };
  }, [regs, fEvents, filterPeriod, filterTicket, ticketClasses]);

  // توزيع مبيعات التذاكر حسب الفئة (VVIP / VIP / عادي)
  const ticketClassBreakdown = useMemo(() => {
    const meta: { key: TicketClass; name: string; color: string }[] = [
      { key: "vvip", name: "VVIP", color: CHART_COLORS.gold },
      { key: "vip", name: "VIP", color: CHART_COLORS.primary },
      { key: "regular", name: "عادي", color: CHART_COLORS.mauve },
    ];
    const sold = fRegs.filter(r => r.payment_status === "paid" || Number(r.amount_paid || 0) > 0);
    const total = sold.length;
    return meta.map(m => {
      const list = sold.filter(r => (r.ticket_id ? ticketClasses[r.ticket_id] || "regular" : "regular") === m.key);
      return {
        ...m,
        count: list.length,
        pct: total ? Math.round((list.length / total) * 100) : 0,
        revenue: list.reduce((s, r) => s + Number(r.amount_paid || 0), 0),
      };
    });
  }, [fRegs, ticketClasses]);

  // شارة التغير في بطاقة الإحصاء: جديد أو نسبة بالاتجاه، وبدون شارة عند عدم التغير
  const deltaProps = (d: Delta) => {
    if (d.isNew) return { delta: "جديد", note: "عن الفترة السابقة" };
    if (d.pct === 0) return { note: "بلا تغيير عن الفترة السابقة" };
    return { delta: `${d.pct > 0 ? "+" : ""}${d.pct}%`, deltaDown: d.pct < 0, note: "عن الفترة السابقة" };
  };

  // Time series — registrations per day (last 30 days)
  const timeSeries = useMemo(() => {
    const map = new Map<string, { date: string; registrations: number; revenue: number }>();
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: formatDateShort(d), registrations: 0, revenue: 0 });
    }
    fRegs.forEach(r => {
      const key = r.registered_at?.slice(0, 10);
      if (key && map.has(key)) {
        const e = map.get(key)!;
        e.registrations += 1;
        e.revenue += Number(r.amount_paid || 0);
      }
    });
    return Array.from(map.values());
  }, [fRegs]);

  // Top events
  const topEvents = useMemo(() => {
    return [...fEvents]
      .sort((a, b) => b.current_attendees_count - a.current_attendees_count)
      .slice(0, 7)
      .map(e => ({ name: e.title_ar, attendees: e.current_attendees_count }));
  }, [fEvents]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    fEvents.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
    const labels: Record<string, string> = {
      draft: "مسودة", pending_review: "قيد المراجعة", published: "منشورة",
      approved: "معتمدة", rejected: "مرفوضة", completed: "منتهية", cancelled: "ملغاة",
    };
    return Object.entries(counts).map(([k, v]) => ({ name: labels[k] || k, value: v }));
  }, [fEvents]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    fEvents.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: CATEGORY_LABELS[k] || k, value: v }));
  }, [fEvents]);

  // اتجاهات الفترة المختارة — التسجيلات والمبيعات المدفوعة مع مقارنة بالفترة السابقة
  const trend = useMemo(() => {
    const now = new Date();
    const daily = salesPeriod !== "12m";
    const units = salesPeriod === "7d" ? 7 : salesPeriod === "30d" ? 30 : 12;

    const keyOf = (d: Date) => (daily ? d.toISOString().slice(0, 10) : d.toISOString().slice(0, 7));
    const buckets = new Map<string, { label: string; registrations: number; tickets: number; revenue: number }>();
    for (let i = units - 1; i >= 0; i--) {
      const d = new Date(now);
      if (daily) d.setDate(d.getDate() - i);
      else d.setMonth(d.getMonth() - i, 1);
      const key = keyOf(d);
      buckets.set(key, {
        label: daily ? formatDateShort(d) : formatMonth(d),
        registrations: 0,
        tickets: 0,
        revenue: 0,
      });
    }

    // بداية الفترة الحالية وبداية الفترة السابقة (بنفس الطول) للمقارنة
    const currentStart = new Date(now);
    if (daily) { currentStart.setDate(currentStart.getDate() - (units - 1)); currentStart.setHours(0, 0, 0, 0); }
    else { currentStart.setMonth(currentStart.getMonth() - (units - 1), 1); currentStart.setHours(0, 0, 0, 0); }
    const prevStart = new Date(currentStart);
    if (daily) prevStart.setDate(prevStart.getDate() - units);
    else prevStart.setMonth(prevStart.getMonth() - units);

    let curTickets = 0, curRevenue = 0, curRegs = 0, prevTickets = 0, prevRevenue = 0;
    fRegs.forEach(r => {
      if (!r.registered_at) return;
      const at = new Date(r.registered_at);
      const isPaid = r.payment_status === "paid" || Number(r.amount_paid || 0) > 0;
      const amount = Number(r.amount_paid || 0);
      if (at >= currentStart) {
        curRegs += 1;
        const b = buckets.get(keyOf(at));
        if (b) b.registrations += 1;
        if (isPaid) {
          curTickets += 1; curRevenue += amount;
          if (b) { b.tickets += 1; b.revenue += amount; }
        }
      } else if (at >= prevStart && isPaid) {
        prevTickets += 1; prevRevenue += amount;
      }
    });

    const change = (cur: number, prev: number) =>
      prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0;

    return {
      series: Array.from(buckets.values()),
      registrations: curRegs,
      tickets: curTickets,
      revenue: curRevenue,
      ticketsChange: change(curTickets, prevTickets),
      revenueChange: change(curRevenue, prevRevenue),
    };
  }, [fRegs, salesPeriod]);

  const exportCSV = () => {
    const header = ["الفعالية", "التاريخ", "الحضور المسجل", "الحضور الفعلي", "السعة", "الحالة"];
    const rows = fEvents.map(e => {
      const evRegs = fRegs.filter(r => r.event_id === e.id);
      const checked = evRegs.filter(r => r.checked_in_at).length;
      return [e.title_ar, e.start_date.slice(0, 10), evRegs.length, checked, e.max_attendees || "—", e.status];
    });
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `تقرير-الفعاليات-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير التقرير");
  };

  // ملخص الفلاتر المفعّلة — يظهر في ترويسة التقارير المصدّرة
  const filtersSummary = (): string[] => {
    const out: string[] = [];
    if (filterEvent !== "all") out.push(`الفعالية: ${events.find(e => e.id === filterEvent)?.title_ar || ""}`);
    if (filterPeriod !== "all") out.push(`الفترة: ${FILTER_PERIODS.find(p => p.key === filterPeriod)?.label}`);
    if (filterTicket !== "all") out.push(`نوع التذكرة: ${FILTER_TICKETS.find(t => t.key === filterTicket)?.label}`);
    if (filterStatus !== "all") out.push(`حالة الفعالية: ${FILTER_STATUS.find(s => s.key === filterStatus)?.label}`);
    return out.length ? out : ["بدون فلاتر — كل البيانات"];
  };

  // صفوف تفاصيل الفعاليات (مشتركة بين Excel وPDF)
  const buildEventRows = () =>
    fEvents.map(e => {
      const evRegs = fRegs.filter(r => r.event_id === e.id);
      const checked = evRegs.filter(r => r.checked_in_at).length;
      return {
        "الفعالية": e.title_ar,
        "التاريخ": e.start_date.slice(0, 10),
        "الحالة": ({ upcoming: "قادمة", ongoing: "جارية", ended: "منتهية" } as const)[eventTimeStatus(e)],
        "التسجيلات": evRegs.length,
        "الحضور الفعلي": checked,
        "نسبة الحضور %": evRegs.length ? Math.round((checked / evRegs.length) * 100) : 0,
        "الإيرادات (ر.س)": evRegs.reduce((s, r) => s + Number(r.amount_paid || 0), 0),
        "السعة": e.max_attendees ?? "—",
      };
    });

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };

    const summary = [
      { "البند": "تاريخ التقرير", "القيمة": formatDateTime(new Date()) },
      ...filtersSummary().map((f, i) => ({ "البند": i === 0 ? "الفلاتر المطبقة" : "", "القيمة": f })),
      { "البند": "إجمالي الفعاليات", "القيمة": stats.events },
      { "البند": "إجمالي التسجيلات", "القيمة": stats.registrations },
      { "البند": "الحضور الفعلي", "القيمة": stats.checkedIn },
      { "البند": "نسبة الحضور", "القيمة": `${stats.attendanceRate}%` },
      { "البند": "الإيرادات (ر.س)", "القيمة": stats.revenue },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summary);
    wsSummary["!cols"] = [{ wch: 24 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "الملخص");

    const wsEvents = XLSX.utils.json_to_sheet(buildEventRows());
    wsEvents["!cols"] = [{ wch: 32 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsEvents, "الفعاليات");

    XLSX.writeFile(wb, `تقرير-نكفيك-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("تم تصدير التقرير بصيغة Excel");
  };

  const exportPDF = () => {
    // نافذة طباعة أنيقة تشمل الملخص والجداول ورسوم التبويب المفتوح — الحفظ كـ PDF من نافذة الطباعة
    const charts = Array.from(document.querySelectorAll(".recharts-wrapper svg, #public-reports svg[role='img']"))
      .map(svg => {
        const c = svg.cloneNode(true) as SVGElement;
        const isDonut = svg.getAttribute("role") === "img";
        // الحلقات مرسومة بحجمها الطبيعي، والرسوم الزمنية تمتد بعرض الصفحة
        c.setAttribute("width", isDonut ? "220" : "660");
        c.removeAttribute("height");
        // نص وسط الحلقة يعتمد على كلاسات Tailwind غير الموجودة في نافذة الطباعة
        if (isDonut) {
          const [value, label] = Array.from(c.querySelectorAll("text"));
          value?.setAttribute("style", "font-size:26px;font-weight:700;fill:#1f1830");
          label?.setAttribute("style", "font-size:12px;fill:#777");
        }
        return c.outerHTML;
      });
    // أشرطة تبويب الأداء ليست رسماً، فتُصدَّر جدولاً عند فتح التبويب
    const topEventsTable = document.getElementById("report-top-events")
      ? `<h2>أعلى الفعاليات حضوراً</h2><table><thead><tr><th>الفعالية</th><th>الحضور</th></tr></thead><tbody>${topEvents.map(e => `<tr><td>${e.name}</td><td>${formatNumber(e.attendees)}</td></tr>`).join("")}</tbody></table>`
      : "";
    // مفتاح كل حلقة عنصر HTML بجانب الرسم، فتُصدَّر أرقامها جدولاً تحت عنوان بطاقتها
    const donutTables = Array.from(document.querySelectorAll("#public-reports svg[role='img']"))
      .map(svg => {
        const title = svg.closest("section")?.querySelector("h2")?.textContent || "";
        const legend = Array.from(svg.nextElementSibling?.children || []).map(row => {
          const value = row.querySelector("b")?.textContent || "";
          return { label: (row.textContent || "").slice(0, -value.length), value };
        });
        return `<h2>${title}</h2><table><thead><tr><th>البند</th><th>العدد</th></tr></thead><tbody>${legend.map(l => `<tr><td>${l.label}</td><td>${l.value}</td></tr>`).join("")}</tbody></table>`;
      })
      .join("");
    // أشرطة ردود الدعوات عناصر HTML أيضاً، فتُصدَّر جدولاً عند فتح تبويب الدعوات الخاصة
    const invitationRows = Array.from(document.querySelectorAll<HTMLElement>("#report-invitation-bars [data-title]"));
    const invitationsTable = invitationRows.length
      ? `<h2>حالة الردود لكل دعوة</h2><table><thead><tr><th>الدعوة</th><th>مؤكدون</th><th>معتذرون</th><th>بانتظار الرد</th></tr></thead><tbody>${invitationRows.map(r => `<tr><td>${r.dataset.title}</td><td>${formatNumber(Number(r.dataset.confirmed))}</td><td>${formatNumber(Number(r.dataset.declined))}</td><td>${formatNumber(Number(r.dataset.pending))}</td></tr>`).join("")}</tbody></table>`
      : "";
    const rows = buildEventRows();
    const head = Object.keys(rows[0] || { "الفعالية": "" });
    const w = window.open("", "_blank");
    if (!w) { toast.error("اسمح بالنوافذ المنبثقة لتصدير PDF"); return; }
    w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
<title>تقرير نكفيك</title>
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
    <div class="brand">نكفيك تيكت — تقرير الفعاليات</div>
    <div class="meta">${formatDateTime(new Date())}<br/>${organization?.name || ""}</div>
  </div>
  <div class="filters"><b>الفلاتر المطبقة:</b> ${filtersSummary().join(" · ")}</div>
  <div class="stats">
    <div class="stat"><b>${stats.events}</b><span>الفعاليات</span></div>
    <div class="stat"><b>${stats.registrations}</b><span>التسجيلات</span></div>
    <div class="stat"><b>${stats.checkedIn}</b><span>حضور فعلي</span></div>
    <div class="stat"><b>${stats.attendanceRate}%</b><span>نسبة الحضور</span></div>
    <div class="stat"><b>${formatNumber(stats.revenue)}</b><span>الإيرادات (ر.س)</span></div>
  </div>
  <h2>تفاصيل الفعاليات</h2>
  <table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${rows.map(r => `<tr>${head.map(h => `<td>${(r as any)[h]}</td>`).join("")}</tr>`).join("")}</tbody></table>
  ${topEventsTable}
  ${invitationsTable}
  ${donutTables}
  ${charts.length ? `<h2>الرسوم البيانية</h2>${charts.map(c => `<div class="chart">${c}</div>`).join("")}` : ""}
  <div class="foot">أُنشئ هذا التقرير آلياً من منصة نكفيك تيكت</div>
<script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
</body></html>`);
    w.document.close();
    toast.success("افتح نافذة الطباعة واختر «حفظ كـ PDF»");
  };

  const cards = [
    { icon: Calendar, label: "إجمالي الفعاليات", value: formatNumber(stats.events), delta: statDeltas.events },
    { icon: Users, label: "إجمالي التسجيلات", value: formatNumber(stats.registrations), delta: statDeltas.registrations },
    { icon: Ticket, label: "حضور فعلي", value: formatNumber(stats.checkedIn), delta: statDeltas.checkedIn },
    { icon: TrendingUp, label: "نسبة الحضور", value: `${stats.attendanceRate}%`, delta: statDeltas.attendanceRate },
    { icon: DollarSign, label: "الإيرادات", value: formatNumber(stats.revenue), unit: "ر.س", delta: statDeltas.revenue },
  ];

  // المرحلة الأولى: التقارير تقتصر على الدعوات الخاصة — تقارير الفعاليات
  // العامة (المبيعات، التذاكر، الإيرادات...) تعود كما هي عند إطلاق المرحلة الثانية
  if (!canPublic) {
    return (
      <DashboardLayout>
        <PrivateReports organizationId={organization?.id} orgName={organization?.name} />
      </DashboardLayout>
    );
  }

  const noData = <p className="py-12 text-center text-sm text-muted-foreground">لا توجد بيانات ضمن الفلاتر المحددة</p>;
  const maxAttendees = Math.max(0, ...topEvents.map(e => e.attendees));
  const soldClasses = ticketClassBreakdown.filter(c => c.count > 0);

  return (
    <DashboardLayout>
      <div id="public-reports" className="space-y-6">
        <PageHeader
          title="التقارير والتحليلات"
          description="رؤية شاملة لأداء فعالياتك"
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"><Download className="h-4 w-4" /> تصدير التقرير <ChevronDown className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportPDF} className="cursor-pointer"><FileText className="h-4 w-4" /> تصدير بصيغة PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={exportExcel} className="cursor-pointer"><FileSpreadsheet className="h-4 w-4" /> تصدير بصيغة Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={exportCSV} className="cursor-pointer"><FileDown className="h-4 w-4" /> تصدير بصيغة CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-5 max-xl:[&>:last-child]:col-span-2">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
        ) : (
          <>
            {/* الفلاتر — تُطبَّق على كل إحصائيات ورسوم الصفحة */}
            <div className="flex flex-wrap items-center gap-2.5">
              <FilterSelect label="الفعالية" value={filterEvent} onChange={setFilterEvent} options={[{ value: "all", label: "كل الفعاليات" }, ...events.map(e => ({ value: e.id, label: e.title_ar }))]} />
              <FilterSelect label="الفترة الزمنية" value={filterPeriod} onChange={v => setFilterPeriod(v as FilterPeriod)} options={FILTER_PERIODS.map(p => ({ value: p.key, label: p.label }))} />
              <FilterSelect label="نوع التذكرة" value={filterTicket} onChange={v => setFilterTicket(v as "all" | TicketClass)} options={FILTER_TICKETS.map(t => ({ value: t.key, label: t.label }))} />
              <FilterSelect label="حالة الفعالية" value={filterStatus} onChange={v => setFilterStatus(v as "all" | EventTimeStatus)} options={FILTER_STATUS.map(st => ({ value: st.key, label: st.label }))} />
              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground"><X className="h-3.5 w-3.5" /> إعادة تعيين</Button>
              )}
              <p className="w-full text-xs leading-[18px] text-muted-foreground xl:ms-auto xl:w-auto">
                مقارنة بالفترة السابقة ({FILTER_PERIODS.find(p => p.key === (filterPeriod === "all" ? "30d" : filterPeriod))?.label})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-5 max-xl:[&>:last-child]:col-span-2">
              {cards.map(c => (
                <StatCard key={c.label} label={c.label} value={c.value} unit={c.unit} icon={c.icon} {...deltaProps(c.delta)} />
              ))}
            </div>

            <Tabs defaultValue="trends">
              {/* على الجوال يتمرر الشريط داخل مكانه ولا تتحرك الصفحة جانبياً */}
              <TabsList className="max-w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
                <TabsTrigger value="performance">أداء الفعاليات</TabsTrigger>
                <TabsTrigger value="distribution">التوزيع</TabsTrigger>
                <TabsTrigger value="financial">المالية</TabsTrigger>
                <TabsTrigger value="invitations">الدعوات الخاصة</TabsTrigger>
              </TabsList>

              <TabsContent value="trends" className="mt-6">
                <Panel
                  title="التسجيلات والمبيعات"
                  description={SALES_PERIODS.find(p => p.key === salesPeriod)?.label}
                  actions={
                    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
                      <div className="hidden sm:block"><ChartLegend series={SALES_SERIES} /></div>
                      <FilterSelect
                        label="الفترة"
                        className="h-9 w-[132px] sm:w-[132px] sm:min-w-0"
                        value={salesPeriod}
                        onChange={v => setSalesPeriod(v as SalesPeriod)}
                        options={SALES_PERIODS.map(p => ({ value: p.key, label: p.label }))}
                      />
                    </div>
                  }
                >
                  <div className="mb-3 sm:hidden"><ChartLegend series={SALES_SERIES} /></div>
                  <TrendChart data={trend.series} xKey="label" series={SALES_SERIES} height={300} />

                  {/* بطاقات ملخص الفترة — أسفل الرسم */}
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-muted/50 p-4">
                      <p className="text-xl font-bold leading-7">{formatNumber(trend.tickets)}</p>
                      <p className="mt-0.5 text-xs leading-[18px] text-muted-foreground">تذاكر مباعة خلال الفترة</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-4">
                      <p className="text-xl font-bold leading-7">
                        {formatNumber(trend.revenue)} <span className="text-sm font-semibold text-muted-foreground">ر.س</span>
                      </p>
                      <p className="mt-0.5 text-xs leading-[18px] text-muted-foreground">إجمالي الإيرادات خلال الفترة</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-4">
                      <p className={cn(
                        "flex items-center gap-1.5 text-xl font-bold leading-7",
                        trend.ticketsChange > 0 ? "text-[#0E7A4F]" : trend.ticketsChange < 0 ? "text-[#B42F24]" : "text-muted-foreground",
                      )}>
                        {trend.ticketsChange > 0 && <TrendingUp className="h-4 w-4" />}
                        {trend.ticketsChange < 0 && <TrendingDown className="h-4 w-4" />}
                        <bdi dir="ltr">{trend.ticketsChange > 0 ? "+" : ""}{trend.ticketsChange}%</bdi>
                      </p>
                      <p className="mt-0.5 text-xs leading-[18px] text-muted-foreground">
                        مقارنة بالفترة السابقة
                        {trend.revenueChange !== trend.ticketsChange && (
                          <>، الإيرادات <bdi dir="ltr">{trend.revenueChange > 0 ? "+" : ""}{trend.revenueChange}%</bdi></>
                        )}
                      </p>
                    </div>
                  </div>
                </Panel>
              </TabsContent>

              <TabsContent value="performance" className="mt-6">
                <Panel title="أعلى الفعاليات حضوراً">
                  {topEvents.length === 0 ? noData : (
                    <div id="report-top-events" className="space-y-4">
                      {topEvents.map((row, i) => (
                        <div key={i}>
                          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                            <span className="truncate font-semibold">{row.name}</span>
                            <span className="whitespace-nowrap text-xs text-muted-foreground">{formatNumber(row.attendees)}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#EFEDF2]">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${percent(row.attendees, maxAttendees)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </TabsContent>

              <TabsContent value="distribution" className="mt-6 space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Panel title="توزيع حالات الفعاليات" bodyClassName="flex flex-col justify-center">
                    {statusBreakdown.length === 0 ? noData : (
                      <DonutChart
                        center={formatNumber(stats.events)}
                        centerLabel="الفعاليات"
                        segments={statusBreakdown.map((d, i) => ({ label: d.name, value: d.value, color: COLORS[i % COLORS.length] }))}
                      />
                    )}
                  </Panel>
                  <Panel title="توزيع الفئات" bodyClassName="flex flex-col justify-center">
                    {categoryBreakdown.length === 0 ? noData : (
                      <DonutChart
                        center={formatNumber(stats.events)}
                        centerLabel="الفعاليات"
                        segments={categoryBreakdown.map((d, i) => ({ label: d.name, value: d.value, color: COLORS[i % COLORS.length] }))}
                      />
                    )}
                  </Panel>
                </div>

                {/* توزيع مبيعات التذاكر حسب الفئة */}
                <div className="grid gap-6 xl:grid-cols-3">
                  <Panel className="xl:col-span-2" title="مبيعات التذاكر حسب الفئة" flush>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="ps-6">الفئة</TableHead>
                          <TableHead>تذاكر مباعة</TableHead>
                          <TableHead>من الإجمالي</TableHead>
                          <TableHead className="pe-6">الإيرادات (ر.س)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ticketClassBreakdown.map(c => (
                          <TableRow key={c.key}>
                            <TableCell className="ps-6">
                              <span className="flex items-center gap-2 font-semibold">
                                <i className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: c.color }} />
                                <bdi>{c.name}</bdi>
                              </span>
                            </TableCell>
                            <TableCell>{formatNumber(c.count)}</TableCell>
                            <TableCell>{formatPercent(c.pct)}</TableCell>
                            <TableCell className="pe-6">{formatNumber(c.revenue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Panel>
                  <Panel title="توزيع المبيعات" bodyClassName="flex flex-col justify-center">
                    {soldClasses.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">لا توجد مبيعات مدفوعة ضمن الفلاتر الحالية بعد</p>
                    ) : (
                      <DonutChart
                        center={formatNumber(soldClasses.reduce((s, c) => s + c.count, 0))}
                        centerLabel="تذاكر مباعة"
                        segments={soldClasses.map(c => ({ label: c.name, value: c.count, color: c.color }))}
                      />
                    )}
                  </Panel>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="mt-6">
                <Panel title="الإيرادات اليومية" description="آخر 30 يوماً (ر.س)">
                  <TrendChart data={timeSeries} xKey="date" series={REVENUE_SERIES} height={300} />
                </Panel>
              </TabsContent>

              <TabsContent value="invitations" className="mt-6 space-y-6">
                <InvitationsReport organizationId={organization?.id} period={filterPeriod} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
