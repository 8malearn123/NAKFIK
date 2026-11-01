import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import DonutChart from "@/components/app/DonutChart";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatCard from "@/components/app/StatCard";
import TrendChart, { CHART_COLORS } from "@/components/app/TrendChart";
import InvitationsReport from "@/components/reports/InvitationsReport";
import { supabase } from "@/integrations/supabase/client";
import { formatDateShort, formatNumber, formatPercent, percent } from "@/lib/format";
import { Calendar, CheckCircle, Eye, Ticket, UserPlus, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const CATEGORY_COLORS = [CHART_COLORS.primary, CHART_COLORS.gold, CHART_COLORS.mauve, CHART_COLORS.teal, CHART_COLORS.soft];
const REGISTRATION_SERIES = [{ key: "value", label: "تسجيلات", color: CHART_COLORS.primary }];
const CHART_TICK = { fontSize: 12, fill: "hsl(var(--muted-foreground))" };
const NoData = () => <p className="py-12 text-center text-sm text-muted-foreground">لا توجد بيانات</p>;

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
        draft: "مسودة", pending_review: "قيد المراجعة", approved: "معتمدة",
        published: "منشورة", rejected: "مرفوضة", cancelled: "ملغاة", completed: "منتهية",
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
        name: formatDateShort(k),
        value: v,
      })));

      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader title="تحليلات المنصة" />
          <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-[130px] animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="h-[340px] animate-pulse rounded-2xl bg-card shadow-soft xl:col-span-2" />
            <div className="h-[340px] animate-pulse rounded-2xl bg-card shadow-soft" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  const kpis = [
    { label: "إجمالي الفعاليات", value: stats.totalEvents, icon: Calendar },
    { label: "فعاليات منشورة", value: stats.publishedEvents, icon: Eye },
    { label: "إجمالي التسجيلات", value: stats.totalRegistrations, icon: Ticket },
    { label: "تسجيل الحضور", value: stats.totalCheckedIn, icon: CheckCircle },
    { label: "إجمالي المستخدمين", value: stats.totalUsers, icon: Users },
    { label: "المنظمون", value: stats.totalOrganizers, icon: UserPlus },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader title="تحليلات المنصة" />

        <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
          {kpis.map((kpi) => <StatCard key={kpi.label} label={kpi.label} value={formatNumber(kpi.value)} icon={kpi.icon} />)}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel className="xl:col-span-2" title="التسجيلات" description="آخر 7 أيام">
            <TrendChart data={recentRegistrations} xKey="name" series={REGISTRATION_SERIES} height={270} />
          </Panel>

          <Panel title="الفعاليات حسب التصنيف" bodyClassName="flex flex-col justify-center">
            {eventsByCategory.length > 0 ? (
              <DonutChart
                center={formatNumber(stats.totalEvents)}
                centerLabel="الفعاليات"
                segments={eventsByCategory.map((c, i) => ({
                  label: `${c.name}، ${formatPercent(percent(c.value, stats.totalEvents))}`,
                  value: c.value,
                  color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                }))}
              />
            ) : <NoData />}
          </Panel>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel className="xl:col-span-2" title="الفعاليات حسب الشهر">
            {monthlyEvents.length > 0 ? (
              <div dir="ltr">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyEvents} margin={{ top: 8, right: 4, bottom: 0, left: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={CHART_TICK} tickMargin={10} />
                    <YAxis orientation="right" tickLine={false} axisLine={false} tick={CHART_TICK} width={44} tickFormatter={formatNumber} allowDecimals={false} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} contentStyle={{ direction: "rtl", borderRadius: 12, border: "none", boxShadow: "var(--shadow-soft-lg)", fontSize: 12 }} />
                    <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} maxBarSize={48} name="فعاليات" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <NoData />}
          </Panel>

          <Panel title="الفعاليات حسب الحالة">
            {eventsByStatus.length > 0 ? (
              <div className="space-y-4">
                {eventsByStatus.map((s) => {
                  const pct = percent(s.value, stats.totalEvents || 1);
                  return (
                    <div key={s.name}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-semibold">{s.name}</span>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">{formatNumber(s.value)}، {formatPercent(pct)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#EFEDF2]">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <NoData />}
          </Panel>
        </div>

        {/* إحصاءات الدعوات الخاصة على مستوى المنصة، بعرض الصفحة كاملاً */}
        <section className="space-y-4">
          <div>
            <h2 className="text-[15px] font-bold leading-6">إحصاءات الدعوات الخاصة</h2>
            <p className="text-[13px] leading-5 text-muted-foreground">جميع الدعوات الخاصة عبر المنصة</p>
          </div>
          <InvitationsReport />
        </section>
      </div>
    </AdminLayout>
  );
};

export default Analytics;
