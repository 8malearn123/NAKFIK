import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, Download, Mail, Plus, Send, TrendingUp, UserPlus, Users, XCircle } from "lucide-react";
import DonutChart from "@/components/app/DonutChart";
import EmptyState from "@/components/app/EmptyState";
import Panel from "@/components/app/Panel";
import StatCard from "@/components/app/StatCard";
import { CHART_COLORS, ChartLegend } from "@/components/app/TrendChart";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatNumber, formatPercent, percent } from "@/lib/format";
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

const RSVP_SERIES = [
  { key: "confirmed", label: "مؤكدون", color: CHART_COLORS.primary },
  { key: "declined", label: "معتذرون", color: CHART_COLORS.gold },
  { key: "pending", label: "بانتظار الرد", color: CHART_COLORS.soft },
] as const;

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

  const chartData = useMemo(() => perInv.slice(0, 8), [perInv]);

  const statusPie = RSVP_SERIES.map((r) => ({ label: r.label, value: totals[r.key], color: r.color })).filter((x) => x.value > 0);

  const exportCSV = () => {
    const header = ["الدعوة", organizationId ? null : "المؤسسة", "النوع", "التاريخ", "إجمالي المدعوين", "تم الإرسال", "مؤكد", "معتذر", "بانتظار", "مرافقين", "حضور فعلي"].filter(Boolean);
    const rows = perInv.map((r) =>
      [
        r.title,
        organizationId ? null : r.organizations?.name || "—",
        CAT_LABEL[r.category] || r.category,
        formatDate(r.event_date),
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
      <div className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-[130px] animate-pulse rounded-2xl bg-card shadow-soft" />)}
        </div>
        <div className="h-80 animate-pulse rounded-2xl bg-card shadow-soft" />
      </div>
    );
  }

  if (invs.length === 0) {
    return (
      <div className="rounded-2xl bg-card shadow-soft">
        <EmptyState
          icon={Mail}
          title="لا توجد دعوات خاصة لعرض إحصائياتها بعد"
          description="أنشئ أول دعوة خاصة وستظهر هنا إحصائيات الردود والحضور تلقائياً"
          action={<Button asChild size="sm"><a href="/dashboard/invitations"><Plus className="h-4 w-4" /> إنشاء دعوة خاصة</a></Button>}
        />
      </div>
    );
  }

  const cards = [
    { icon: Send, label: "إجمالي الدعوات المرسلة", value: formatNumber(totals.sent) },
    { icon: CheckCircle2, label: "مؤكدون", value: formatNumber(totals.confirmed) },
    { icon: XCircle, label: "معتذرون", value: formatNumber(totals.declined) },
    { icon: Clock, label: "بانتظار الرد", value: formatNumber(totals.pending) },
    { icon: TrendingUp, label: "نسبة الاستجابة", value: `${totals.responseRate}%` },
    { icon: Mail, label: "عدد المناسبات", value: formatNumber(fInvs.length) },
    { icon: UserPlus, label: "إجمالي المرافقين", value: formatNumber(totals.companions) },
    { icon: Users, label: "الحضور المتوقع", value: formatNumber(totals.expected) },
  ];

  const noData = <p className="py-12 text-center text-sm text-muted-foreground">لا توجد بيانات ضمن الفلاتر المحددة</p>;

  return (
    <div className="space-y-6">
      {/* فلتر المناسبة — يعمل مع فلتر الفترة أعلى الصفحة */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Select value={invFilter} onValueChange={setInvFilter}>
          <SelectTrigger aria-label="المناسبة" className="h-10 w-auto min-w-[150px] max-w-full gap-2 font-medium"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المناسبات</SelectItem>
            {invs.map((i) => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}
          </SelectContent>
        </Select>
        {period !== "all" && <span className="text-xs text-muted-foreground">مفلتر حسب الفترة المختارة أعلى الصفحة</span>}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="حالة الردود لكل دعوة"
          description="أعلى 8 دعوات"
          actions={<div className="hidden flex-none sm:block"><ChartLegend series={[...RSVP_SERIES]} /></div>}
        >
          <div className="mb-4 sm:hidden"><ChartLegend series={[...RSVP_SERIES]} /></div>
          {chartData.length === 0 ? noData : (
            <div className="space-y-4">
              {chartData.map((r) => (
                <div key={r.id} title={`مؤكدون ${formatNumber(r.confirmed)}، معتذرون ${formatNumber(r.declined)}، بانتظار الرد ${formatNumber(r.pending)}`}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-semibold">{r.title}</span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {r.total === 0
                        ? "لا يوجد مدعوون"
                        : `${formatNumber(r.confirmed + r.declined)} من ${formatNumber(r.total)} ردوا، ${formatPercent(percent(r.confirmed + r.declined, r.total))}`}
                    </span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-[#EFEDF2]">
                    {RSVP_SERIES.map((s) => (
                      <i key={s.key} className="block h-full" style={{ width: `${percent(r[s.key], r.total)}%`, background: s.color }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="توزيع حالة الردود" bodyClassName="flex flex-col justify-center">
          {statusPie.length === 0 ? noData : (
            <DonutChart center={`${percent(totals.confirmed, totals.total)}%`} centerLabel="مؤكدون" segments={statusPie} />
          )}
        </Panel>
      </div>

      <Panel
        title="تفاصيل كل دعوة"
        flush
        actions={<Button size="sm" variant="outline" onClick={exportCSV}><Download className="h-4 w-4" /> <bdi dir="ltr">CSV</bdi></Button>}
      >
        {perInv.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="لا توجد دعوات ضمن الفلاتر المحددة"
            action={invFilter !== "all" ? <Button size="sm" variant="outline" onClick={() => setInvFilter("all")}>كل المناسبات</Button> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-6">الدعوة</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>المدعوون</TableHead>
                <TableHead>تم الإرسال</TableHead>
                <TableHead>مؤكدون</TableHead>
                <TableHead>معتذرون</TableHead>
                <TableHead>بانتظار الرد</TableHead>
                <TableHead>المرافقون</TableHead>
                <TableHead className="pe-6">الحضور</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perInv.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap ps-6">
                    <p className="font-semibold leading-[22px]">{r.title}</p>
                    {!organizationId && <p className="text-xs leading-[18px] text-muted-foreground">{r.organizations?.name || "—"}</p>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap"><bdi>{CAT_LABEL[r.category] || r.category}</bdi></TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(r.event_date)}</TableCell>
                  <TableCell className="font-semibold">{formatNumber(r.total)}</TableCell>
                  <TableCell>{formatNumber(r.sent)}</TableCell>
                  <TableCell>{formatNumber(r.confirmed)}</TableCell>
                  <TableCell>{formatNumber(r.declined)}</TableCell>
                  <TableCell>{formatNumber(r.pending)}</TableCell>
                  <TableCell>{formatNumber(r.companions)}</TableCell>
                  <TableCell className="pe-6">{formatNumber(r.checked)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
};

export default InvitationsReport;
