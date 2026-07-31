import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { Mail, Send, CheckCircle2, XCircle, UserPlus, Clock, Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  /** If provided, scope to that organization only (organizer view). Otherwise loads all (admin view). */
  organizationId?: string;
  /** فلتر الفترة الزمنية القادم من فلاتر صفحة التقارير */
  period?: "all" | "7d" | "30d" | "12m";
}

interface InvRow {
  id: string;
  title: string;
  category: string;
  event_date: string;
  status: string;
  organization_id: string;
  organizations?: { name: string } | null;
}

interface GuestRow {
  id: string;
  invitation_id: string;
  rsvp_status: string;
  companions_count: number;
  invite_sent_at: string | null;
  checked_in_at: string | null;
}

const CAT_LABEL: Record<string, string> = {
  wedding: "زفاف", engagement: "ملكة", graduation: "تخرج", birthday: "ميلاد",
  forum: "ملتقى", conference: "مؤتمر", opening: "افتتاح", vip: "VIP",
  corporate: "شركات", other: "أخرى",
};

const COLORS = ["hsl(270 30% 52%)", "hsl(172 55% 40%)", "hsl(42 65% 55%)", "hsl(0 70% 60%)", "hsl(220 60% 55%)"];

const InvitationsReport = ({ organizationId, period = "all" }: Props) => {
  const [invs, setInvs] = useState<InvRow[]>([]);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [invFilter, setInvFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let q = supabase
        .from("private_invitations")
        .select("id, title, category, event_date, status, organization_id, organizations(name)")
        .order("event_date", { ascending: false });
      if (organizationId) q = q.eq("organization_id", organizationId);
      const { data: i } = await q;
      const list = (i || []) as any as InvRow[];
      setInvs(list);
      if (list.length) {
        const ids = list.map((x) => x.id);
        const { data: g } = await supabase
          .from("private_invitation_guests")
          .select("id, invitation_id, rsvp_status, companions_count, invite_sent_at, checked_in_at")
          .in("invitation_id", ids);
        setGuests((g || []) as GuestRow[]);
      } else {
        setGuests([]);
      }
      setLoading(false);
    };
    load();
  }, [organizationId]);

  // تطبيق فلتري المناسبة والفترة الزمنية القادمة من فلاتر الصفحة
  const fInvs = useMemo(() => {
    let cutoff: Date | null = null;
    if (period !== "all") {
      cutoff = new Date();
      if (period === "7d") cutoff.setDate(cutoff.getDate() - 7);
      else if (period === "30d") cutoff.setDate(cutoff.getDate() - 30);
      else cutoff.setMonth(cutoff.getMonth() - 12);
    }
    return invs.filter((inv) => {
      if (invFilter !== "all" && inv.id !== invFilter) return false;
      if (cutoff && new Date(inv.event_date) < cutoff) return false;
      return true;
    });
  }, [invs, invFilter, period]);

  const fGuests = useMemo(() => {
    const ids = new Set(fInvs.map((i) => i.id));
    return guests.filter((g) => ids.has(g.invitation_id));
  }, [guests, fInvs]);

  const totals = useMemo(() => {
    const total = fGuests.length;
    const sent = fGuests.filter((g) => g.invite_sent_at || g.rsvp_status !== "pending").length;
    const confirmed = fGuests.filter((g) => g.rsvp_status === "confirmed").length;
    const declined = fGuests.filter((g) => g.rsvp_status === "declined").length;
    const pending = fGuests.filter((g) => g.rsvp_status === "pending" || g.rsvp_status === "invited").length;
    const checked = fGuests.filter((g) => g.checked_in_at).length;
    const companions = fGuests.reduce((s, g) => s + (g.companions_count || 0), 0);
    // نسبة الاستجابة: من ردّ (تأكيداً أو اعتذاراً) من أصل من أُرسلت لهم الدعوة
    const responseRate = sent ? Math.round(((confirmed + declined) / sent) * 100) : 0;
    return { total, sent, confirmed, declined, pending, checked, companions, expected: confirmed + companions, responseRate };
  }, [fGuests]);

  const perInv = useMemo(() => {
    return fInvs.map((inv) => {
      const gs = fGuests.filter((g) => g.invitation_id === inv.id);
      const confirmed = gs.filter((g) => g.rsvp_status === "confirmed").length;
      const declined = gs.filter((g) => g.rsvp_status === "declined").length;
      const sent = gs.filter((g) => g.invite_sent_at || g.rsvp_status !== "pending").length;
      const pending = gs.filter((g) => g.rsvp_status === "pending" || g.rsvp_status === "invited").length;
      const companions = gs.reduce((s, g) => s + (g.companions_count || 0), 0);
      const checked = gs.filter((g) => g.checked_in_at).length;
      return { ...inv, total: gs.length, confirmed, declined, sent, pending, companions, checked };
    });
  }, [fInvs, fGuests]);

  const chartData = useMemo(
    () => perInv.slice(0, 8).map((r) => ({
      name: r.title.length > 14 ? r.title.slice(0, 14) + "…" : r.title,
      مؤكد: r.confirmed,
      معتذر: r.declined,
      بانتظار: r.pending,
    })),
    [perInv]
  );

  const statusPie = [
    { name: "مؤكدين", value: totals.confirmed },
    { name: "معتذرين", value: totals.declined },
    { name: "بانتظار الرد", value: totals.pending },
  ].filter((x) => x.value > 0);

  const exportCSV = () => {
    const header = ["الدعوة", organizationId ? null : "المؤسسة", "النوع", "التاريخ", "إجمالي المدعوين", "تم الإرسال", "مؤكد", "معتذر", "بانتظار", "مرافقين", "حضور فعلي"].filter(Boolean);
    const rows = perInv.map((r) =>
      [
        r.title,
        organizationId ? null : r.organizations?.name || "—",
        CAT_LABEL[r.category] || r.category,
        new Date(r.event_date).toLocaleDateString("ar-SA"),
        r.total, r.sent, r.confirmed, r.declined, r.pending, r.companions, r.checked,
      ].filter((c) => c !== null)
    );
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `تقرير-الدعوات-${Date.now()}.csv`;
    a.click();
    toast.success("تم التصدير");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (invs.length === 0) {
    return (
      <div className="text-center p-12 bg-card border rounded-2xl">
        <Mail className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm mb-1">لا توجد دعوات خاصة لعرض إحصائياتها بعد</p>
        <p className="text-muted-foreground/70 text-xs mb-4">أنشئ أول دعوة خاصة وستظهر هنا إحصائيات الردود والحضور تلقائياً</p>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <a href="/dashboard/invitations">+ إنشاء دعوة خاصة</a>
        </Button>
      </div>
    );
  }

  const cards = [
    { icon: Send, label: "إجمالي الدعوات المرسلة", value: `${totals.sent}`, cls: "bg-blue-100 text-blue-700" },
    { icon: CheckCircle2, label: "دعوات مؤكدة", value: `${totals.confirmed}`, cls: "bg-emerald-100 text-emerald-700" },
    { icon: XCircle, label: "دعوات معتذر عنها", value: `${totals.declined}`, cls: "bg-rose-100 text-rose-700" },
    { icon: Clock, label: "لم يتم الرد عليها", value: `${totals.pending}`, cls: "bg-amber-100 text-amber-700" },
    { icon: TrendingUp, label: "نسبة الاستجابة", value: `${totals.responseRate}%`, cls: "bg-primary/10 text-primary" },
    { icon: Mail, label: "عدد المناسبات", value: `${fInvs.length}`, cls: "bg-teal/10 text-teal-700" },
    { icon: UserPlus, label: "إجمالي المرافقين", value: `${totals.companions}`, cls: "bg-purple-100 text-purple-700" },
    { icon: CheckCircle2, label: "الحضور المتوقع", value: `${totals.expected}`, cls: "bg-accent/10 text-accent" },
  ];

  return (
    <div className="space-y-5">
      {/* فلتر المناسبة — يعمل مع فلتر الفترة أعلى الصفحة */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-[11px] text-muted-foreground">المناسبة:</label>
        <select
          value={invFilter}
          onChange={(e) => setInvFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold min-w-[180px]"
        >
          <option value="all">كل المناسبات</option>
          {invs.map((i) => (
            <option key={i.id} value={i.id}>{i.title}</option>
          ))}
        </select>
        {period !== "all" && (
          <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2.5 py-1">
            مفلتر حسب الفترة المختارة أعلى الصفحة
          </span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-card rounded-2xl border border-border/50 p-4">
            <div className={`w-9 h-9 rounded-lg ${c.cls} flex items-center justify-center mb-2`}>
              <c.icon className="w-4 h-4" />
            </div>
            <div className="font-bold text-xl text-foreground">{c.value}</div>
            <div className="text-muted-foreground text-[11px] mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-card rounded-2xl border border-border/50 p-5">
          <h3 className="font-semibold mb-3 text-sm">حالة الردود لكل دعوة (أعلى 8)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="مؤكد" stackId="a" fill="hsl(160 60% 45%)" />
              <Bar dataKey="معتذر" stackId="a" fill="hsl(0 70% 60%)" />
              <Bar dataKey="بانتظار" stackId="a" fill="hsl(42 90% 55%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <h3 className="font-semibold mb-3 text-sm">توزيع حالة الردود</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-invitation table */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">تفاصيل كل دعوة</h3>
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 ml-1" /> CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="p-3 text-right">الدعوة</th>
                {!organizationId && <th className="p-3 text-right">المؤسسة</th>}
                <th className="p-3 text-right">النوع</th>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-center">مدعوين</th>
                <th className="p-3 text-center">مُرسل</th>
                <th className="p-3 text-center text-emerald-700">مؤكد</th>
                <th className="p-3 text-center text-rose-700">معتذر</th>
                <th className="p-3 text-center text-amber-700">بانتظار</th>
                <th className="p-3 text-center">مرافقين</th>
                <th className="p-3 text-center">حضور</th>
              </tr>
            </thead>
            <tbody>
              {perInv.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/20">
                  <td className="p-3 font-medium">{r.title}</td>
                  {!organizationId && <td className="p-3 text-xs text-muted-foreground">{r.organizations?.name || "—"}</td>}
                  <td className="p-3 text-xs">{CAT_LABEL[r.category] || r.category}</td>
                  <td className="p-3 text-xs">{new Date(r.event_date).toLocaleDateString("ar-SA")}</td>
                  <td className="p-3 text-center font-bold">{r.total}</td>
                  <td className="p-3 text-center">{r.sent}</td>
                  <td className="p-3 text-center text-emerald-700 font-bold">{r.confirmed}</td>
                  <td className="p-3 text-center text-rose-700">{r.declined}</td>
                  <td className="p-3 text-center text-amber-700">{r.pending}</td>
                  <td className="p-3 text-center">{r.companions}</td>
                  <td className="p-3 text-center">{r.checked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvitationsReport;
