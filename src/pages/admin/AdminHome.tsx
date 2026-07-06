import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calendar, Users, Building2, ClipboardCheck, TrendingUp,
  UserPlus, PlusCircle, DollarSign, Ticket, Activity,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const COLORS = ["hsl(270 30% 52%)", "hsl(172 55% 40%)", "hsl(42 65% 55%)", "hsl(0 70% 60%)", "hsl(220 60% 55%)"];

const AdminHome = () => {
  const [stats, setStats] = useState({
    organizers: 0, totalEvents: 0, totalUsers: 0, pendingEvents: 0,
    publishedEvents: 0, totalRegistrations: 0, totalRevenue: 0, attendees: 0,
  });
  const [eventsByMonth, setEventsByMonth] = useState<{ month: string; count: number }[]>([]);
  const [usersByType, setUsersByType] = useState<{ name: string; value: number }[]>([]);
  const [topOrgs, setTopOrgs] = useState<{ name: string; events: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [
        { count: orgCount },
        { count: evtCount },
        { count: userCount },
        { count: pendingCount },
        { count: publishedCount },
        { data: regs },
        { data: profilesByType },
        { data: events },
        { data: orgs },
      ] = await Promise.all([
        supabase.from("organizations").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("registrations").select("amount_paid"),
        supabase.from("profiles").select("account_type"),
        supabase.from("events").select("created_at, organization_id"),
        supabase.from("organizations").select("id, name"),
      ]);

      const revenue = (regs || []).reduce((s, r: any) => s + Number(r.amount_paid || 0), 0);
      const attendees = (profilesByType || []).filter((p: any) => p.account_type === "attendee").length;

      setStats({
        organizers: orgCount || 0,
        totalEvents: evtCount || 0,
        totalUsers: userCount || 0,
        pendingEvents: pendingCount || 0,
        publishedEvents: publishedCount || 0,
        totalRegistrations: (regs || []).length,
        totalRevenue: revenue,
        attendees,
      });

      // Events by month (last 6 months)
      const months = new Map<string, number>();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.set(key, 0);
      }
      (events || []).forEach((e: any) => {
        const k = e.created_at?.slice(0, 7);
        if (k && months.has(k)) months.set(k, (months.get(k) || 0) + 1);
      });
      setEventsByMonth(Array.from(months.entries()).map(([month, count]) => ({ month: month.slice(5), count })));

      // Users by type
      const typeCounts: Record<string, number> = {};
      (profilesByType || []).forEach((p: any) => { typeCounts[p.account_type] = (typeCounts[p.account_type] || 0) + 1; });
      const typeLabels: Record<string, string> = { attendee: "حضور", organizer: "منظمين", venue_owner: "أصحاب أماكن" };
      setUsersByType(Object.entries(typeCounts).map(([k, v]) => ({ name: typeLabels[k] || k, value: v })));

      // Top organizations by event count
      const orgCounts: Record<string, number> = {};
      (events || []).forEach((e: any) => { orgCounts[e.organization_id] = (orgCounts[e.organization_id] || 0) + 1; });
      const orgMap = new Map<string, string>();
      (orgs || []).forEach((o: any) => orgMap.set(o.id, o.name));
      const top = Object.entries(orgCounts)
        .map(([id, n]) => ({ name: orgMap.get(id) || "—", events: n }))
        .sort((a, b) => b.events - a.events)
        .slice(0, 5);
      setTopOrgs(top);

      setLoading(false);
    };
    load();
  }, []);

  const statCards = useMemo(() => ([
    { icon: Building2, label: "المنظمين", value: stats.organizers, color: "bg-primary/10 text-primary" },
    { icon: Calendar, label: "إجمالي الفعاليات", value: stats.totalEvents, color: "bg-teal/10 text-teal" },
    { icon: Activity, label: "فعاليات منشورة", value: stats.publishedEvents, color: "bg-emerald-100 text-emerald-700" },
    { icon: ClipboardCheck, label: "بانتظار المراجعة", value: stats.pendingEvents, color: "bg-destructive/10 text-destructive" },
    { icon: Users, label: "إجمالي المستخدمين", value: stats.totalUsers, color: "bg-accent/10 text-accent" },
    { icon: Ticket, label: "إجمالي التسجيلات", value: stats.totalRegistrations, color: "bg-blue-100 text-blue-700" },
    { icon: TrendingUp, label: "حضور (مستخدمين)", value: stats.attendees, color: "bg-purple-100 text-purple-700" },
    { icon: DollarSign, label: "إيرادات (ر.س)", value: stats.totalRevenue.toLocaleString("ar-SA"), color: "bg-amber-100 text-amber-700" },
  ]), [stats]);

  const quickActions = [
    { icon: UserPlus, label: "دعوة منظم/مستخدم", to: "/admin/users/invite", color: "bg-primary text-primary-foreground" },
    { icon: PlusCircle, label: "إنشاء فعالية لمنظم", to: "/admin/events/create", color: "bg-teal text-primary-foreground" },
    { icon: ClipboardCheck, label: "مراجعة الفعاليات", to: "/admin/pending", color: "bg-amber-500 text-white" },
    { icon: DollarSign, label: "المالية والتسويات", to: "/admin/finance", color: "bg-emerald-600 text-white" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-2xl text-foreground">لوحة مدير النظام</h1>
          <p className="text-muted-foreground text-sm">نظرة شاملة على منصة نكفيك تيكت</p>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((a, i) => (
            <motion.div key={a.to} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={a.to} className={`${a.color} rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all`}>
                <a.icon className="w-6 h-6" />
                <span className="font-semibold text-sm">{a.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Stat cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-card rounded-2xl p-5 border border-border/50 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="font-bold text-2xl text-foreground mb-1">{loading ? "..." : stat.value.toLocaleString("ar-SA")}</div>
              <div className="text-muted-foreground text-xs">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {stats.pendingEvents > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-foreground text-lg">{stats.pendingEvents} فعاليات بانتظار المراجعة</h3>
              <p className="text-muted-foreground text-sm">راجع الفعاليات المعلقة وقم بالموافقة أو الرفض</p>
            </div>
            <Link to="/admin/pending" className="bg-destructive text-destructive-foreground rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-destructive/90 transition-colors flex-shrink-0">
              مراجعة الآن
            </Link>
          </motion.div>
        )}

        {!loading && (
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-card rounded-2xl border border-border/50 p-5">
              <h3 className="font-semibold text-foreground mb-4">الفعاليات المُنشأة شهرياً (آخر 6 أشهر)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={eventsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" name="فعاليات" stroke="hsl(270 30% 52%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 p-5">
              <h3 className="font-semibold text-foreground mb-4">توزيع المستخدمين</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={usersByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {usersByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 p-5 lg:col-span-2">
              <h3 className="font-semibold text-foreground mb-4">أعلى المنظمين نشاطاً</h3>
              {topOrgs.length === 0 ? (
                <div className="text-center text-muted-foreground py-6 text-sm">لا توجد بيانات بعد</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topOrgs} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={140} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="events" name="عدد الفعاليات" fill="hsl(172 55% 40%)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminHome;
