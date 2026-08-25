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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, Users, CheckCircle2, DoorOpen, TrendingUp, Download, ChevronDown,
  FileText, FileSpreadsheet, FileDown, Plus, Crown, SlidersHorizontal, X,
  LineChart as LineIcon, BarChart3, PieChart as PieIcon,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
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
  { key: "vvip", label: "VVIP", color: "hsl(42 65% 50%)" },
  { key: "vip", label: "VIP", color: "hsl(270 30% 52%)" },
  { key: "regular", label: "عادي", color: "hsl(172 55% 40%)" },
];
const RSVP_COLORS = { confirmed: "hsl(140 50% 45%)", declined: "hsl(0 70% 60%)", pending: "hsl(220 15% 65%)" };

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
      const d = new Date(now);
      if (monthly) d.setMonth(d.getMonth() - i);
      else d.setDate(d.getDate() - i);
      const key = monthly ? `${d.getFullYear()}-${d.getMonth()}` : d.toISOString().slice(0, 10);
      const label = monthly
        ? d.toLocaleDateString("ar-SA", { month: "short" })
        : d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
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
    { name: "مؤكد", value: stats.confirmed, color: RSVP_COLORS.confirmed },
    { name: "اعتذر", value: stats.declined, color: RSVP_COLORS.declined },
    { name: "بدون رد", value: stats.total - stats.confirmed - stats.declined, color: RSVP_COLORS.pending },
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
      name: i.title.length > 16 ? i.title.slice(0, 16) + "…" : i.title,
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
    { icon: Mail, label: "المناسبات الخاصة", value: stats.invitations.toLocaleString("ar-SA"), color: "bg-primary/10 text-primary" },
    { icon: Users, label: "إجمالي المدعوين", value: stats.total.toLocaleString("ar-SA"), color: "bg-teal/10 text-teal" },
    { icon: CheckCircle2, label: "تأكيدات الحضور", value: stats.confirmed.toLocaleString("ar-SA"), color: "bg-emerald-100 text-emerald-700" },
    { icon: DoorOpen, label: "حضور فعلي", value: stats.checkedIn.toLocaleString("ar-SA"), color: "bg-accent/10 text-accent" },
    { icon: TrendingUp, label: "نسبة الاستجابة", value: `${stats.responseRate}%`, color: "bg-purple-100 text-purple-700" },
  ];

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-28 rounded-2xl bg-card border border-border/50 animate-pulse" />)}
      </div>
    );
  }

  // حالة فارغة فقط عندما لا توجد أي دعوات فعلاً في النظام
  if (invs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-2xl text-foreground">التقارير والتحليلات</h1>
          <p className="text-muted-foreground text-sm mt-1">رؤية شاملة لأداء دعواتك الخاصة</p>
        </div>
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
          <Mail className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-semibold">لا توجد دعوات خاصة بعد</p>
          <p className="text-muted-foreground text-sm mb-4">أنشئ أول دعوة لتظهر تقاريرها هنا</p>
          <Button className="rounded-full" asChild>
            <Link to="/dashboard/invitations"><Plus className="w-4 h-4" /> إنشاء دعوة خاصة</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div id="priv-reports" className="space-y-6">
      {/* الهيدر — بنفس تصميم صفحة التقارير الأصلية: العنوان يميناً والتصدير يساراً */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl text-foreground">التقارير والتحليلات</h1>
          <p className="text-muted-foreground text-sm mt-1">رؤية شاملة لأداء دعواتك الخاصة</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button className="rounded-full" asChild>
            <Link to="/dashboard/invitations"><Plus className="w-4 h-4" /> دعوة جديدة</Link>
          </Button>
        </div>
      </div>

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
            <label className="text-[11px] text-muted-foreground block mb-1">المناسبة</label>
            <select
              value={invFilter}
              onChange={(e) => setInvFilter(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
            >
              <option value="all">كل المناسبات</option>
              {invs.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">الفترة الزمنية</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
            >
              {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">تصنيف المدعو</label>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as any)}
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
            >
              <option value="all">كل التصنيفات</option>
              {TIERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">حالة المناسبة</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
            >
              <option value="all">كل الحالات</option>
              <option value="upcoming">قادمة</option>
              <option value="ended">منتهية</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </div>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-card rounded-2xl border border-border/50 p-5">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="font-bold text-2xl text-foreground mb-1">{s.value}</div>
            <div className="text-muted-foreground text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {/* التبويبات — بنفس أسلوب تقارير المنصة */}
      <Tabs defaultValue="trends" dir="rtl">
        <TabsList>
          <TabsTrigger value="trends" className="gap-1.5"><LineIcon className="w-4 h-4" /> الاتجاهات</TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5"><BarChart3 className="w-4 h-4" /> أداء المناسبات</TabsTrigger>
          <TabsTrigger value="distribution" className="gap-1.5"><PieIcon className="w-4 h-4" /> التوزيع</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-4">
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <h3 className="font-bold text-foreground mb-4">اتجاه الردود — تأكيدات واعتذارات</h3>
            <div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="gConf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={RSVP_COLORS.confirmed} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={RSVP_COLORS.confirmed} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDecl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={RSVP_COLORS.declined} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={RSVP_COLORS.declined} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="تأكيدات" stroke={RSVP_COLORS.confirmed} fill="url(#gConf)" strokeWidth={2} />
                  <Area type="monotone" dataKey="اعتذارات" stroke={RSVP_COLORS.declined} fill="url(#gDecl)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <h3 className="font-bold text-foreground mb-4">أداء المناسبات — المدعوون مقابل المؤكدين</h3>
            {perInv.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-12">لا توجد بيانات ضمن الفلاتر المحددة</p>
            ) : (
              <div className="h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perInv}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="مدعوون" fill="hsl(270 30% 52%)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="مؤكدون" fill="hsl(172 55% 40%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="distribution" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl border border-border/50 p-5">
              <h3 className="font-bold text-foreground mb-4">توزيع الردود</h3>
              {rsvpDist.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-12">لا توجد بيانات ضمن الفلاتر المحددة</p>
              ) : (
                <div className="h-56" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={rsvpDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {rsvpDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border/50 p-5">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-500" /> توزيع تصنيفات المدعوين
              </h3>
              {fGuests.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-12">لا توجد بيانات ضمن الفلاتر المحددة</p>
              ) : (
                <>
                  <div className="h-40" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={tierDist.filter((t) => t.count > 0)} dataKey="count" nameKey="label" innerRadius={40} outerRadius={65} paddingAngle={3}>
                          {tierDist.filter((t) => t.count > 0).map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {tierDist.map((t) => (
                      <div key={t.key} className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                        <span className="font-bold w-14">{t.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${t.pct}%`, background: t.color }} />
                        </div>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {t.count} مدعو · {t.confirmed} مؤكد · {t.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrivateReports;
