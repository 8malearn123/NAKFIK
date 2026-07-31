import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, Ticket, Calendar, TrendingUp, DollarSign, Download, PieChart as PieIcon, LineChart as LineIcon, Mail, Trophy } from "lucide-react";
import InvitationsReport from "@/components/reports/InvitationsReport";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { toast } from "sonner";

interface EventRow {
  id: string;
  title_ar: string;
  start_date: string;
  current_attendees_count: number;
  max_attendees: number | null;
  status: string;
  category: string;
}
interface RegistrationRow {
  id: string;
  event_id: string;
  amount_paid: number | null;
  registered_at: string;
  checked_in_at: string | null;
  payment_status: string;
}

const COLORS = ["hsl(270 30% 52%)", "hsl(172 55% 40%)", "hsl(42 65% 55%)", "hsl(0 70% 60%)", "hsl(220 60% 55%)", "hsl(140 50% 50%)"];

// معايير ترتيب "أفضل الفعاليات أداءً"
type TopSort = "registrations" | "sold" | "attendance" | "revenue";
const TOP_SORTS: { key: TopSort; label: string }[] = [
  { key: "registrations", label: "عدد التسجيلات" },
  { key: "sold", label: "التذاكر المباعة" },
  { key: "attendance", label: "نسبة الحضور" },
  { key: "revenue", label: "الإيرادات" },
];
const RANK_LABELS = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة"];
const RANK_STYLES = [
  "bg-amber-400/20 text-amber-700 border-amber-400/60",   // ذهبي
  "bg-slate-300/30 text-slate-600 border-slate-400/60",   // فضي
  "bg-orange-400/15 text-orange-700 border-orange-400/50", // برونزي
  "bg-muted text-muted-foreground border-border",
  "bg-muted text-muted-foreground border-border",
];

const Reports = () => {
  const { organization } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [regs, setRegs] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [topSort, setTopSort] = useState<TopSort>("registrations");

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      const { data: ev } = await supabase
        .from("events")
        .select("id, title_ar, start_date, current_attendees_count, max_attendees, status, category")
        .eq("organization_id", organization.id);
      const evtList = (ev || []) as EventRow[];
      setEvents(evtList);

      if (evtList.length) {
        const ids = evtList.map(e => e.id);
        const { data: r } = await supabase
          .from("registrations")
          .select("id, event_id, amount_paid, registered_at, checked_in_at, payment_status")
          .in("event_id", ids);
        setRegs((r || []) as RegistrationRow[]);
      }
      setLoading(false);
    };
    load();
  }, [organization]);

  const stats = useMemo(() => {
    const totalReg = regs.length;
    const checkedIn = regs.filter(r => r.checked_in_at).length;
    const revenue = regs.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    const attendanceRate = totalReg ? Math.round((checkedIn / totalReg) * 100) : 0;
    return { events: events.length, registrations: totalReg, checkedIn, revenue, attendanceRate };
  }, [events, regs]);

  // Time series — registrations per day (last 30 days)
  const timeSeries = useMemo(() => {
    const map = new Map<string, { date: string; registrations: number; revenue: number }>();
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: key.slice(5), registrations: 0, revenue: 0 });
    }
    regs.forEach(r => {
      const key = r.registered_at?.slice(0, 10);
      if (key && map.has(key)) {
        const e = map.get(key)!;
        e.registrations += 1;
        e.revenue += Number(r.amount_paid || 0);
      }
    });
    return Array.from(map.values());
  }, [regs]);

  // Top events
  const topEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => b.current_attendees_count - a.current_attendees_count)
      .slice(0, 7)
      .map(e => ({ name: e.title_ar.slice(0, 20), attendees: e.current_attendees_count }));
  }, [events]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
    const labels: Record<string, string> = {
      draft: "مسودة", pending_review: "قيد المراجعة", published: "منشورة",
      approved: "معتمدة", rejected: "مرفوضة", completed: "منتهية", cancelled: "ملغاة",
    };
    return Object.entries(counts).map(([k, v]) => ({ name: labels[k] || k, value: v }));
  }, [events]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: k, value: v }));
  }, [events]);

  // أفضل الفعاليات أداءً — أفضل 5 حسب معيار الترتيب المختار
  const bestEvents = useMemo(() => {
    const rows = events.map(e => {
      const evRegs = regs.filter(r => r.event_id === e.id);
      const checked = evRegs.filter(r => r.checked_in_at).length;
      const sold = evRegs.filter(r => r.payment_status === "paid" || Number(r.amount_paid || 0) > 0).length;
      return {
        id: e.id,
        title: e.title_ar,
        registrations: evRegs.length,
        sold,
        attendance: evRegs.length ? Math.round((checked / evRegs.length) * 100) : 0,
        revenue: evRegs.reduce((s, r) => s + Number(r.amount_paid || 0), 0),
      };
    });
    const key = topSort;
    return rows.sort((a, b) => (b as any)[key] - (a as any)[key]).slice(0, 5);
  }, [events, regs, topSort]);

  const exportCSV = () => {
    const header = ["الفعالية", "التاريخ", "الحضور المسجل", "الحضور الفعلي", "السعة", "الحالة"];
    const rows = events.map(e => {
      const evRegs = regs.filter(r => r.event_id === e.id);
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

  const cards = [
    { icon: Calendar, label: "إجمالي الفعاليات", value: stats.events.toLocaleString("ar-SA"), color: "bg-primary/10 text-primary" },
    { icon: Users, label: "إجمالي التسجيلات", value: stats.registrations.toLocaleString("ar-SA"), color: "bg-teal/10 text-teal" },
    { icon: Ticket, label: "حضور فعلي", value: stats.checkedIn.toLocaleString("ar-SA"), color: "bg-accent/10 text-accent" },
    { icon: TrendingUp, label: "نسبة الحضور", value: `${stats.attendanceRate}%`, color: "bg-emerald-100 text-emerald-700" },
    { icon: DollarSign, label: "الإيرادات (ر.س)", value: stats.revenue.toLocaleString("ar-SA"), color: "bg-purple-100 text-purple-700" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-2xl text-foreground">التقارير والتحليلات</h1>
            <p className="text-muted-foreground text-sm mt-1">رؤية شاملة لأداء فعالياتك</p>
          </div>
          <Button onClick={exportCSV} variant="outline" className="rounded-full">
            <Download className="w-4 h-4" /> تصدير CSV
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {cards.map(c => (
                <div key={c.label} className="bg-card rounded-2xl border border-border/50 p-5">
                  <div className={`w-10 h-10 rounded-xl ${c.color} flex items-center justify-center mb-3`}>
                    <c.icon className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-2xl text-foreground">{c.value}</div>
                  <div className="text-muted-foreground text-xs mt-1">{c.label}</div>
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
                  <h3 className="font-semibold text-foreground mb-4">التسجيلات اليومية — آخر 30 يوم</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Legend />
                      <Line type="monotone" dataKey="registrations" name="تسجيلات" stroke="hsl(270 30% 52%)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
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
                <InvitationsReport organizationId={organization?.id} />
              </TabsContent>
            </Tabs>

            {/* أفضل الفعاليات أداءً */}
            <div className="bg-card rounded-2xl border border-border/50 p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" /> أفضل الفعاليات أداءً
                </h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">ترتيب حسب:</span>
                  {TOP_SORTS.map(s => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setTopSort(s.key)}
                      className={`text-[11px] font-bold rounded-full px-3 py-1 border transition ${
                        topSort === s.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {bestEvents.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">لا توجد فعاليات بعد</p>
              ) : (
                <div className="space-y-2">
                  {bestEvents.map((e, i) => (
                    <div key={e.id} className="border rounded-xl p-3 flex items-center gap-3 flex-wrap hover:bg-muted/40 transition">
                      {/* الترتيب */}
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-extrabold text-sm ${RANK_STYLES[i]}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-[160px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{e.title}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${RANK_STYLES[i]}`}>
                            {RANK_LABELS[i]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-center flex-wrap">
                        <div>
                          <div className={`font-extrabold text-sm ${topSort === "registrations" ? "text-primary" : "text-foreground"}`}>
                            {e.registrations.toLocaleString("ar-SA")}
                          </div>
                          <div className="text-[10px] text-muted-foreground">التسجيلات</div>
                        </div>
                        <div>
                          <div className={`font-extrabold text-sm ${topSort === "sold" ? "text-primary" : "text-foreground"}`}>
                            {e.sold.toLocaleString("ar-SA")}
                          </div>
                          <div className="text-[10px] text-muted-foreground">تذاكر مباعة</div>
                        </div>
                        <div>
                          <div className={`font-extrabold text-sm ${topSort === "attendance" ? "text-primary" : "text-foreground"}`}>
                            {e.attendance}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">نسبة الحضور</div>
                        </div>
                        <div>
                          <div className={`font-extrabold text-sm ${topSort === "revenue" ? "text-primary" : "text-foreground"}`}>
                            {e.revenue.toLocaleString("ar-SA")}
                          </div>
                          <div className="text-[10px] text-muted-foreground">الإيرادات (ر.س)</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
