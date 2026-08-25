import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { usePlanScope } from "@/hooks/usePlanScope";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, Ticket, Calendar, TrendingUp, DollarSign, Download, PieChart as PieIcon, LineChart as LineIcon, Mail, SlidersHorizontal, X, FileText, FileSpreadsheet, FileDown, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import InvitationsReport from "@/components/reports/InvitationsReport";
import PrivateReports from "@/components/reports/PrivateReports";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
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

const COLORS = ["hsl(270 30% 52%)", "hsl(172 55% 40%)", "hsl(42 65% 55%)", "hsl(0 70% 60%)", "hsl(220 60% 55%)", "hsl(140 50% 50%)"];

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
      { key: "vvip", name: "VVIP", color: "hsl(42 65% 55%)" },
      { key: "vip", name: "VIP", color: "hsl(270 30% 52%)" },
      { key: "regular", name: "عادي", color: "hsl(172 55% 40%)" },
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

  // شارة التغير: ↑ أخضر / ↓ أحمر / محايد
  const DeltaBadge = ({ d }: { d: Delta }) => {
    if (d.isNew)
      return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600">جديد</span>;
    const cls = d.pct > 0 ? "bg-green-500/10 text-green-600" : d.pct < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground";
    const arrow = d.pct > 0 ? "↑" : d.pct < 0 ? "↓" : "—";
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${cls}`}>
        {arrow} <span dir="ltr">{Math.abs(d.pct)}%</span>
      </span>
    );
  };

  // Time series — registrations per day (last 30 days)
  const timeSeries = useMemo(() => {
    const map = new Map<string, { date: string; registrations: number; revenue: number }>();
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: key.slice(5), registrations: 0, revenue: 0 });
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
      .map(e => ({ name: e.title_ar.slice(0, 20), attendees: e.current_attendees_count }));
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
    return Object.entries(counts).map(([k, v]) => ({ name: k, value: v }));
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
        label: daily ? key.slice(5) : `${key.slice(5, 7)}/${key.slice(2, 4)}`,
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
      { "البند": "تاريخ التقرير", "القيمة": new Date().toLocaleString("ar-SA") },
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
    const charts = Array.from(document.querySelectorAll(".recharts-wrapper svg"))
      .map(svg => {
        const c = svg.cloneNode(true) as SVGElement;
        c.setAttribute("width", "660");
        c.removeAttribute("height");
        return c.outerHTML;
      });
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
    <div class="meta">${new Date().toLocaleString("ar-SA")}<br/>${organization?.name || ""}</div>
  </div>
  <div class="filters"><b>الفلاتر المطبقة:</b> ${filtersSummary().join(" · ")}</div>
  <div class="stats">
    <div class="stat"><b>${stats.events}</b><span>الفعاليات</span></div>
    <div class="stat"><b>${stats.registrations}</b><span>التسجيلات</span></div>
    <div class="stat"><b>${stats.checkedIn}</b><span>حضور فعلي</span></div>
    <div class="stat"><b>${stats.attendanceRate}%</b><span>نسبة الحضور</span></div>
    <div class="stat"><b>${stats.revenue.toLocaleString()}</b><span>الإيرادات (ر.س)</span></div>
  </div>
  <h2>تفاصيل الفعاليات</h2>
  <table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${rows.map(r => `<tr>${head.map(h => `<td>${(r as any)[h]}</td>`).join("")}</tr>`).join("")}</tbody></table>
  ${charts.length ? `<h2>الرسوم البيانية</h2>${charts.map(c => `<div class="chart">${c}</div>`).join("")}` : ""}
  <div class="foot">أُنشئ هذا التقرير آلياً من منصة نكفيك تيكت</div>
<script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
</body></html>`);
    w.document.close();
    toast.success("افتح نافذة الطباعة واختر «حفظ كـ PDF»");
  };

  const cards = [
    { icon: Calendar, label: "إجمالي الفعاليات", value: stats.events.toLocaleString("ar-SA"), color: "bg-primary/10 text-primary", delta: statDeltas.events },
    { icon: Users, label: "إجمالي التسجيلات", value: stats.registrations.toLocaleString("ar-SA"), color: "bg-teal/10 text-teal", delta: statDeltas.registrations },
    { icon: Ticket, label: "حضور فعلي", value: stats.checkedIn.toLocaleString("ar-SA"), color: "bg-accent/10 text-accent", delta: statDeltas.checkedIn },
    { icon: TrendingUp, label: "نسبة الحضور", value: `${stats.attendanceRate}%`, color: "bg-emerald-100 text-emerald-700", delta: statDeltas.attendanceRate },
    { icon: DollarSign, label: "الإيرادات (ر.س)", value: stats.revenue.toLocaleString("ar-SA"), color: "bg-purple-100 text-purple-700", delta: statDeltas.revenue },
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-2xl text-foreground">التقارير والتحليلات</h1>
            <p className="text-muted-foreground text-sm mt-1">رؤية شاملة لأداء فعالياتك</p>
          </div>
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-full">
                <Download className="w-4 h-4" /> تصدير التقرير <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportPDF} className="gap-2 cursor-pointer">
                <FileText className="w-4 h-4 text-destructive" /> تصدير بصيغة PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 text-green-600" /> تصدير بصيغة Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV} className="gap-2 cursor-pointer">
                <FileDown className="w-4 h-4 text-primary" /> تصدير بصيغة CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* الفلاتر — تُطبَّق على كل إحصائيات ورسوم الصفحة */}
            <div className="bg-card rounded-2xl border border-border/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">الفلاتر</span>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-[11px] font-bold text-destructive inline-flex items-center gap-0.5 hover:underline ms-auto"
                  >
                    <X className="w-3 h-3" /> إعادة تعيين
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">الفعالية</label>
                  <select
                    value={filterEvent}
                    onChange={(e) => setFilterEvent(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
                  >
                    <option value="all">كل الفعاليات</option>
                    {events.map(e => (
                      <option key={e.id} value={e.id}>{e.title_ar}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">الفترة الزمنية</label>
                  <select
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value as FilterPeriod)}
                    className="w-full h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
                  >
                    {FILTER_PERIODS.map(p => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">نوع التذكرة</label>
                  <select
                    value={filterTicket}
                    onChange={(e) => setFilterTicket(e.target.value as "all" | TicketClass)}
                    className="w-full h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
                  >
                    {FILTER_TICKETS.map(t => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">حالة الفعالية</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as "all" | EventTimeStatus)}
                    className="w-full h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
                  >
                    {FILTER_STATUS.map(st => (
                      <option key={st.key} value={st.key}>{st.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {cards.map(c => (
                <div key={c.label} className="bg-card rounded-2xl border border-border/50 p-5">
                  <div className={`w-10 h-10 rounded-xl ${c.color} flex items-center justify-center mb-3`}>
                    <c.icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-bold text-2xl text-foreground">{c.value}</div>
                    <DeltaBadge d={c.delta} />
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">
                    {c.label}
                    <span className="block text-[10px] opacity-70">
                      مقارنة بالفترة السابقة ({FILTER_PERIODS.find(p => p.key === (filterPeriod === "all" ? "30d" : filterPeriod))?.label})
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Tabs defaultValue="trends" dir="rtl">
              <TabsList>
                <TabsTrigger value="trends" className="gap-1.5"><LineIcon className="w-4 h-4" /> الاتجاهات</TabsTrigger>
                <TabsTrigger value="performance" className="gap-1.5"><BarChart3 className="w-4 h-4" /> أداء الفعاليات</TabsTrigger>
                <TabsTrigger value="distribution" className="gap-1.5"><PieIcon className="w-4 h-4" /> التوزيع</TabsTrigger>
                <TabsTrigger value="financial" className="gap-1.5"><DollarSign className="w-4 h-4" /> المالية</TabsTrigger>
                <TabsTrigger value="invitations" className="gap-1.5"><Mail className="w-4 h-4" /> الدعوات الخاصة</TabsTrigger>
              </TabsList>

              <TabsContent value="trends" className="space-y-5">
                <div className="bg-card rounded-2xl border border-border/50 p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <h3 className="font-semibold text-foreground">التسجيلات والمبيعات — {SALES_PERIODS.find(p => p.key === salesPeriod)?.label}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {SALES_PERIODS.map(p => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setSalesPeriod(p.key)}
                          className={`text-[11px] font-bold rounded-full px-3 py-1 border transition ${
                            salesPeriod === p.key
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trend.series}>
                      <defs>
                        <linearGradient id="gradRegs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(270 30% 52%)" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="hsl(270 30% 52%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradTickets" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(172 55% 40%)" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="hsl(172 55% 40%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickMargin={8} />
                      <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} width={32} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="registrations" name="التسجيلات" stroke="hsl(270 30% 52%)" strokeWidth={2.5} fill="url(#gradRegs)" dot={false} activeDot={{ r: 4 }} />
                      <Area type="monotone" dataKey="tickets" name="التذاكر المباعة" stroke="hsl(172 55% 40%)" strokeWidth={2} fill="url(#gradTickets)" dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* بطاقات ملخص الفترة — أسفل الرسم */}
                  <div className="grid sm:grid-cols-3 gap-3 mt-4">
                    <div className="rounded-xl border p-3 text-center bg-muted/20">
                      <div className="font-extrabold text-2xl text-foreground">{trend.tickets.toLocaleString("ar-SA")}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">تذاكر مباعة خلال الفترة</div>
                    </div>
                    <div className="rounded-xl border p-3 text-center bg-muted/20">
                      <div className="font-extrabold text-2xl text-foreground">
                        {trend.revenue.toLocaleString("ar-SA")} <span className="text-xs font-normal">ر.س</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">إجمالي الإيرادات خلال الفترة</div>
                    </div>
                    <div className="rounded-xl border p-3 text-center bg-muted/20">
                      <div className={`font-extrabold text-2xl inline-flex items-center gap-1 ${
                        trend.ticketsChange > 0 ? "text-green-600" : trend.ticketsChange < 0 ? "text-destructive" : "text-muted-foreground"
                      }`}>
                        {trend.ticketsChange > 0 ? "↑" : trend.ticketsChange < 0 ? "↓" : ""}
                        <span dir="ltr">{trend.ticketsChange > 0 ? "+" : ""}{trend.ticketsChange}%</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        مقارنة بالفترة السابقة
                        {trend.revenueChange !== trend.ticketsChange && (
                          <span dir="ltr" className="ms-1">
                            (الإيرادات {trend.revenueChange > 0 ? "+" : ""}{trend.revenueChange}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-5">
                <div className="bg-card rounded-2xl border border-border/50 p-5">
                  <h3 className="font-semibold text-foreground mb-4">أعلى الفعاليات حضوراً</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={topEvents} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={140} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="attendees" name="الحضور" fill="hsl(172 55% 40%)" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="distribution" className="grid md:grid-cols-2 gap-5">
                <div className="bg-card rounded-2xl border border-border/50 p-5">
                  <h3 className="font-semibold text-foreground mb-4">توزيع حالات الفعاليات</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                        {statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-card rounded-2xl border border-border/50 p-5">
                  <h3 className="font-semibold text-foreground mb-4">توزيع الفئات</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                        {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* توزيع مبيعات التذاكر حسب الفئة */}
                <div className="bg-card rounded-2xl border border-border/50 p-5 md:col-span-2">
                  <h3 className="font-semibold text-foreground mb-4">توزيع مبيعات التذاكر حسب الفئة</h3>
                  <div className="grid md:grid-cols-2 gap-4 items-center">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={ticketClassBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                          {ticketClassBreakdown.map((c, i) => <Cell key={i} fill={c.color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {ticketClassBreakdown.map(c => (
                        <div key={c.key} className="border rounded-xl p-3 flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color }} />
                          <span className="font-bold text-sm w-14">{c.name}</span>
                          <div className="flex items-center gap-4 flex-1 justify-end text-center flex-wrap">
                            <div>
                              <div className="font-extrabold text-sm">{c.count.toLocaleString("ar-SA")}</div>
                              <div className="text-[10px] text-muted-foreground">تذاكر مباعة</div>
                            </div>
                            <div>
                              <div className="font-extrabold text-sm">{c.pct}%</div>
                              <div className="text-[10px] text-muted-foreground">من الإجمالي</div>
                            </div>
                            <div>
                              <div className="font-extrabold text-sm">{c.revenue.toLocaleString("ar-SA")}</div>
                              <div className="text-[10px] text-muted-foreground">الإيرادات (ر.س)</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {ticketClassBreakdown.every(c => c.count === 0) && (
                        <p className="text-center text-xs text-muted-foreground pt-2">
                          لا توجد مبيعات مدفوعة ضمن الفلاتر الحالية بعد
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-5">
                <div className="bg-card rounded-2xl border border-border/50 p-5">
                  <h3 className="font-semibold text-foreground mb-4">الإيرادات اليومية — آخر 30 يوم (ر.س)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="revenue" name="الإيراد" fill="hsl(42 65% 55%)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="invitations" className="space-y-5">
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
