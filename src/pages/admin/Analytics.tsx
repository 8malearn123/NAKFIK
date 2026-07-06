import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import InvitationsReport from "@/components/reports/InvitationsReport";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Users, Calendar, Ticket, TrendingUp, Eye,
  UserPlus, CheckCircle, ArrowUpRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";

const COLORS = ["hsl(262,83%,58%)", "hsl(173,58%,39%)", "hsl(43,96%,56%)", "hsl(0,84%,60%)", "hsl(210,40%,50%)"];

const Analytics = () => {
  const [stats, setStats] = useState({
    totalEvents: 0, publishedEvents: 0, totalRegistrations: 0,
    totalUsers: 0, totalOrganizers: 0, totalCheckedIn: 0,
  });
  const [eventsByCategory, setEventsByCategory] = useState<any[]>([]);
  const [eventsByStatus, setEventsByStatus] = useState<any[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);
  const [monthlyEvents, setMonthlyEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [
        { count: totalEvents },
        { count: publishedEvents },
        { count: totalRegistrations },
        { count: totalUsers },
        { count: totalOrganizers },
        { count: totalCheckedIn },
        { data: events },
        { data: regs },
      ] = await Promise.all([
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("registrations").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("account_type", "organizer"),
        supabase.from("registrations").select("id", { count: "exact", head: true }).not("checked_in_at", "is", null),
        supabase.from("events").select("category, status, created_at"),
        supabase.from("registrations").select("registered_at").order("registered_at", { ascending: false }).limit(500),
      ]);

      setStats({
        totalEvents: totalEvents || 0,
        publishedEvents: publishedEvents || 0,
        totalRegistrations: totalRegistrations || 0,
        totalUsers: totalUsers || 0,
        totalOrganizers: totalOrganizers || 0,
        totalCheckedIn: totalCheckedIn || 0,
      });

      // Events by category
      const catMap: Record<string, string> = {
        conference: "مؤتمر", workshop: "ورشة عمل", seminar: "ندوة", meetup: "لقاء", other: "أخرى",
      };
      const catCounts: Record<string, number> = {};
      (events || []).forEach(e => { catCounts[e.category] = (catCounts[e.category] || 0) + 1; });
      setEventsByCategory(Object.entries(catCounts).map(([k, v]) => ({ name: catMap[k] || k, value: v })));

      // Events by status
      const statusMap: Record<string, string> = {
        draft: "مسودة", pending_review: "قيد المراجعة", approved: "معتمد",
        published: "منشور", rejected: "مرفوض", cancelled: "ملغي", completed: "مكتمل",
      };
      const statusCounts: Record<string, number> = {};
      (events || []).forEach(e => { statusCounts[e.status] = (statusCounts[e.status] || 0) + 1; });
      setEventsByStatus(Object.entries(statusCounts).map(([k, v]) => ({ name: statusMap[k] || k, value: v })));

      // Monthly events trend
      const monthMap: Record<string, number> = {};
      const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
      (events || []).forEach(e => {
        const d = new Date(e.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
        monthMap[key] = (monthMap[key] || 0) + 1;
      });
      const sortedMonths = Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
      setMonthlyEvents(sortedMonths.map(([k, v]) => {
        const m = parseInt(k.split("-")[1]);
        return { name: monthNames[m], value: v };
      }));

      // Registration trend (last 7 days)
      const dayMap: Record<string, number> = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        dayMap[d.toISOString().split("T")[0]] = 0;
      }
      (regs || []).forEach(r => {
        const day = r.registered_at?.split("T")[0];
        if (day && day in dayMap) dayMap[day]++;
      });
      setRecentRegistrations(Object.entries(dayMap).map(([k, v]) => ({
        name: new Date(k).toLocaleDateString("ar-SA", { weekday: "short" }),
        value: v,
      })));

      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div></AdminLayout>;

  const kpis = [
    { label: "إجمالي الفعاليات", value: stats.totalEvents, icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
    { label: "فعاليات منشورة", value: stats.publishedEvents, icon: Eye, color: "text-green-600", bg: "bg-green-100" },
    { label: "إجمالي التسجيلات", value: stats.totalRegistrations, icon: Ticket, color: "text-teal", bg: "bg-teal/10" },
    { label: "تسجيل الحضور", value: stats.totalCheckedIn, icon: CheckCircle, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "إجمالي المستخدمين", value: stats.totalUsers, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "المنظمين", value: stats.totalOrganizers, icon: UserPlus, color: "text-purple-600", bg: "bg-purple-100" },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="font-bold text-2xl text-foreground">تحليلات المنصة</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map(kpi => (
            <div key={kpi.label} className="bg-card rounded-2xl border border-border/50 p-4">
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-2`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <span className="text-2xl font-bold text-foreground block">{kpi.value.toLocaleString("ar-SA")}</span>
              <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Monthly Events Trend */}
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <h3 className="font-semibold text-foreground mb-4 text-sm">الفعاليات حسب الشهر</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyEvents}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="فعاليات" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Registration trend */}
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <h3 className="font-semibold text-foreground mb-4 text-sm">التسجيلات (آخر 7 أيام)</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recentRegistrations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(173,58%,39%)" strokeWidth={2.5} dot={{ r: 4 }} name="تسجيلات" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Events by Category */}
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <h3 className="font-semibold text-foreground mb-4 text-sm">الفعاليات حسب التصنيف</h3>
            <div className="h-52 flex items-center justify-center">
              {eventsByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={eventsByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                      {eventsByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">لا توجد بيانات</p>
              )}
            </div>
          </div>

          {/* Events by Status */}
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <h3 className="font-semibold text-foreground mb-4 text-sm">الفعاليات حسب الحالة</h3>
            <div className="space-y-3">
              {eventsByStatus.map((s, i) => {
                const total = stats.totalEvents || 1;
                const pct = Math.round((s.value / total) * 100);
                return (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="text-muted-foreground">{s.value} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
              {eventsByStatus.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">لا توجد بيانات</p>}
          </div>
        </div>

        {/* Private invitations report (platform-wide) */}
        <div className="space-y-3">
          <div>
            <h2 className="font-bold text-xl text-foreground">إحصاءات الدعوات الخاصة</h2>
            <p className="text-sm text-muted-foreground">جميع الدعوات الخاصة عبر المنصة</p>
          </div>
          <InvitationsReport />
        </div>
      </div>
      </div>
    </AdminLayout>
  );
};

export default Analytics;
