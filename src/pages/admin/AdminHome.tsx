import { useEffect, useState } from "react";
import { Calendar, ClipboardCheck, CreditCard, LifeBuoy, Plus, UserCheck, Users, Wallet, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatCard from "@/components/app/StatCard";
import TrendChart, { CHART_COLORS, ChartLegend } from "@/components/app/TrendChart";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatDateShort, formatMonth, formatNumber, percent } from "@/lib/format";

interface Decision {
  icon: LucideIcon;
  tone: string;
  title: string;
  subtitle: string;
  action: string;
  to: string;
}

interface Upcoming {
  id: string;
  title: string;
  organizer: string;
  date: string;
  guests: number;
  replied: number;
}

const DAY = 86400000;
const SERIES = [
  { key: "sent", label: "المدعوون", color: CHART_COLORS.primary },
  { key: "replied", label: "الردود", color: CHART_COLORS.gold },
];

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
const pendingAge = (iso: string) => {
  const days = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / DAY));
  if (days === 1) return "منذ يوم";
  if (days === 2) return "منذ يومين";
  return days <= 10 ? `منذ ${days} أيام` : `منذ ${days} يوماً`;
};

const AdminHome = () => {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ soon: 0, soonPrev: 0, rate: 0, guests: 0, organizers: 0, newOrganizers: 0, revenue: 0, revenuePrev: 0 });
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [trend, setTrend] = useState<{ month: string; sent: number; replied: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const now = Date.now();
      const [{ data: invitations }, { data: guests }, { data: orgs }, { data: regs }, { data: pending }, { data: subs }, { data: requests }] = await Promise.all([
        supabase.from("private_invitations").select("id, title, event_date, organization_id, status"),
        supabase.from("private_invitation_guests").select("invitation_id, rsvp_status, created_at, confirmed_at"),
        supabase.from("organizations").select("id, name, created_at"),
        supabase.from("registrations").select("amount_paid, registered_at"),
        supabase.from("events").select("id, title_ar, created_at").eq("status", "pending_review").order("created_at"),
        supabase.from("account_subscriptions").select("id, expires_at").eq("status", "active"),
        supabase.from("service_requests").select("id, title, created_at").eq("status", "new"),
      ]);

      const invs = (invitations || []) as any[];
      const gs = (guests || []) as any[];
      const orgName = new Map(((orgs || []) as any[]).map((o) => [o.id, o.name]));
      const when = (i: any) => new Date(i.event_date).getTime();

      const repliedCount = gs.filter((g) => g.rsvp_status === "confirmed" || g.rsvp_status === "declined").length;
      const thisMonth = monthKey(new Date());
      const lastMonth = monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
      const revenueIn = (key: string) =>
        ((regs || []) as any[]).filter((r) => r.registered_at && monthKey(new Date(r.registered_at)) === key).reduce((s, r) => s + Number(r.amount_paid || 0), 0);

      setKpi({
        soon: invs.filter((i) => when(i) >= now && when(i) <= now + 7 * DAY).length,
        soonPrev: invs.filter((i) => when(i) < now && when(i) >= now - 7 * DAY).length,
        rate: percent(repliedCount, gs.length),
        guests: gs.length,
        organizers: (orgs || []).length,
        newOrganizers: ((orgs || []) as any[]).filter((o) => o.created_at && monthKey(new Date(o.created_at)) === thisMonth).length,
        revenue: revenueIn(thisMonth),
        revenuePrev: revenueIn(lastMonth),
      });

      const expiring = ((subs || []) as any[]).filter((s) => s.expires_at && new Date(s.expires_at).getTime() <= now + 7 * DAY);
      const queue: Decision[] = [];
      ((pending || []) as any[]).slice(0, 2).forEach((e) =>
        queue.push({ icon: ClipboardCheck, tone: "bg-[#FDF3E3] text-[#9A5F12]", title: e.title_ar, subtitle: `بانتظار المراجعة ${pendingAge(e.created_at)}`, action: "راجع", to: "/admin/pending" }),
      );
      if (expiring.length) {
        queue.push({ icon: CreditCard, tone: "bg-secondary text-primary", title: `${formatNumber(expiring.length)} اشتراك ينتهي خلال 7 أيام`, subtitle: "راجع الاشتراكات قبل انتهائها", action: "افتح", to: "/admin/subscriptions" });
      }
      ((requests || []) as any[]).slice(0, 2).forEach((r) =>
        queue.push({ icon: LifeBuoy, tone: "bg-[#FBECEA] text-[#B42F24]", title: r.title, subtitle: `طلب خدمة بلا رد ${pendingAge(r.created_at)}`, action: "رد", to: "/admin/service-requests" }),
      );
      setDecisions(queue.slice(0, 4));

      setUpcoming(
        invs
          .filter((i) => when(i) >= now)
          .sort((a, b) => when(a) - when(b))
          .slice(0, 5)
          .map((i) => {
            const own = gs.filter((g) => g.invitation_id === i.id);
            return {
              id: i.id,
              title: i.title,
              organizer: orgName.get(i.organization_id) || "—",
              date: i.event_date,
              guests: own.length,
              replied: own.filter((g) => g.rsvp_status === "confirmed" || g.rsvp_status === "declined").length,
            };
          }),
      );

      const today = new Date();
      setTrend(
        Array.from({ length: 6 }, (_, idx) => {
          const d = new Date(today.getFullYear(), today.getMonth() - (5 - idx), 1);
          const key = monthKey(d);
          return {
            month: formatMonth(d),
            sent: gs.filter((g) => g.created_at && monthKey(new Date(g.created_at)) === key).length,
            replied: gs.filter((g) => g.confirmed_at && monthKey(new Date(g.confirmed_at)) === key).length,
          };
        }),
      );
      setLoading(false);
    };
    load();
  }, []);

  const revenueDelta = kpi.revenuePrev ? percent(kpi.revenue - kpi.revenuePrev, kpi.revenuePrev) : null;
  const soonDelta = kpi.soon - kpi.soonPrev;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="لوحة التحكم"
          description={`ملخص المنصة، ${formatDate(new Date())}`}
          actions={
            <Button asChild>
              <Link to="/admin/users/invite"><Plus className="h-4 w-4" />دعوة حساب</Link>
            </Button>
          }
        />

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="مناسبات خلال 7 أيام" value={loading ? "…" : kpi.soon} icon={Calendar} delta={`${soonDelta >= 0 ? "+" : ""}${soonDelta}`} deltaDown={soonDelta < 0} note="مقارنة بالأسبوع الماضي" />
          <StatCard label="نسبة الرد على الدعوات" value={loading ? "…" : `${kpi.rate}%`} icon={UserCheck} note={`من ${formatNumber(kpi.guests)} مدعو`} />
          <StatCard label="المنظمون" value={loading ? "…" : kpi.organizers} icon={Users} delta={`+${kpi.newOrganizers}`} note="جدد هذا الشهر" />
          <StatCard
            label={`إيراد ${formatMonth(new Date())}`}
            value={loading ? "…" : formatNumber(kpi.revenue)}
            unit="ر.س"
            icon={Wallet}
            delta={revenueDelta === null ? undefined : `${revenueDelta >= 0 ? "+" : ""}${revenueDelta}%`}
            deltaDown={(revenueDelta ?? 0) < 0}
            note="مقارنة بالشهر الماضي"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel className="xl:col-span-2" title="المدعوون والردود" description="آخر 6 أشهر" actions={<ChartLegend series={SERIES} />}>
            <TrendChart data={trend} xKey="month" series={SERIES} height={300} />
          </Panel>

          <Panel title="تحتاج قرارك" bodyClassName="flex flex-col">
            {decisions.length === 0 ? (
              <p className="my-auto py-10 text-center text-sm text-muted-foreground">لا شيء يحتاج قرارك اليوم</p>
            ) : (
              <div className="flex flex-1 flex-col divide-y divide-border">
                {decisions.map((d) => (
                  <div key={d.title} className="flex flex-1 items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={`grid h-9 w-9 flex-none place-items-center rounded-[10px] ${d.tone}`}><d.icon className="h-[17px] w-[17px]" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-[22px]">{d.title}</p>
                      <p className="truncate text-xs leading-[18px] text-muted-foreground">{d.subtitle}</p>
                    </div>
                    <Button asChild variant="outline" size="sm"><Link to={d.to}>{d.action}</Link></Button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <Panel title="المناسبات القادمة" flush actions={<Link to="/admin/private-invitations" className="text-[13px] font-semibold leading-5 text-primary">عرض الكل</Link>}>
          {upcoming.length === 0 ? (
            <EmptyState icon={Calendar} title="لا توجد مناسبات قادمة" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">المناسبة</TableHead>
                  <TableHead>الموعد</TableHead>
                  <TableHead>المدعوون</TableHead>
                  <TableHead className="w-56 pe-6">نسبة الرد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((u) => {
                  const rate = percent(u.replied, u.guests);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="ps-6">
                        <p className="font-semibold leading-[22px]">{u.title}</p>
                        <p className="text-xs leading-[18px] text-muted-foreground">{u.organizer}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateShort(u.date)}</TableCell>
                      <TableCell>{formatNumber(u.guests)}</TableCell>
                      <TableCell className="pe-6">
                        <div className="flex flex-col gap-1.5">
                          <b className={`text-sm font-bold ${rate < 50 ? "text-[#B42F24]" : ""}`}>{rate}%</b>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#EFEDF2]">
                            <div className={`h-full rounded-full ${rate < 50 ? "bg-[#C0392B]" : "bg-primary"}`} style={{ width: `${rate}%` }} />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>
    </AdminLayout>
  );
};

export default AdminHome;
