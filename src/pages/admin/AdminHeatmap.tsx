import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatCard from "@/components/app/StatCard";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { CHART_COLORS } from "@/components/app/TrendChart";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber, formatPercent } from "@/lib/format";
import { Activity, AlertTriangle, Calendar, DoorOpen, ExternalLink, Gauge, Users } from "lucide-react";

interface EventRow {
  id: string;
  title_ar: string;
  organization_id: string;
  org_name?: string;
  totalCapacity: number;
  totalScans: number;
  pct: number;
  gates: number;
  criticalGates: number;
}
interface OrgRow {
  organization_id: string;
  org_name: string;
  events: number;
  totalScans: number;
  totalCapacity: number;
  pct: number;
}

const pressureBucket = (pct: number): { label: string; tone: StatusTone; bar: string } => {
  if (pct >= 90) return { label: "ممتلئ", tone: "danger", bar: CHART_COLORS.danger };
  if (pct >= 75) return { label: "ضغط عالٍ", tone: "warning", bar: CHART_COLORS.gold };
  if (pct >= 50) return { label: "متوسط", tone: "primary", bar: CHART_COLORS.primary };
  if (pct >= 25) return { label: "منخفض", tone: "success", bar: CHART_COLORS.primary };
  return { label: "هادئ", tone: "neutral", bar: CHART_COLORS.primary };
};

const criticalGatesLabel = (n: number) => {
  if (n === 1) return "بوابة حرجة واحدة";
  if (n === 2) return "بوابتان حرجتان";
  return `${formatNumber(n)} ${n <= 10 ? "بوابات حرجة" : "بوابة حرجة"}`;
};

const Occupancy = ({ pct, bar }: { pct: number; bar: string }) => (
  <div className="flex w-36 flex-col gap-1.5">
    <b className="text-sm font-bold">{formatPercent(pct)}</b>
    <div className="h-1.5 overflow-hidden rounded-full bg-[#EFEDF2]">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: bar }} />
    </div>
  </div>
);

const AdminHeatmap = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // get active events (today or upcoming)
    const { data: evts } = await supabase.from("events").select("id, title_ar, organization_id").in("status", ["published", "approved"] as any).order("start_date", { ascending: false }).limit(200);
    const evtList = (evts as any) || [];
    if (evtList.length === 0) { setEvents([]); setOrgs([]); setLoading(false); return; }

    const eventIds = evtList.map((e: any) => e.id);
    const orgIds = Array.from(new Set(evtList.map((e: any) => e.organization_id)));

    const [{ data: cps }, { data: sc }, { data: ogs }] = await Promise.all([
      supabase.from("checkpoints").select("id, event_id, capacity, is_active").in("event_id", eventIds),
      supabase.from("scan_events").select("id, event_id, checkpoint_id, scan_type").in("event_id", eventIds).eq("scan_type", "entry").limit(10000),
      supabase.from("organizations").select("id, name").in("id", orgIds as any),
    ]);

    const orgMap = new Map(((ogs as any) || []).map((o: any) => [o.id, o.name]));

    // capacity by event
    const capByEvent = new Map<string, number>();
    const gatesByEvent = new Map<string, number>();
    ((cps as any) || []).forEach((c: any) => {
      if (!c.is_active) return;
      capByEvent.set(c.event_id, (capByEvent.get(c.event_id) || 0) + (c.capacity || 0));
      gatesByEvent.set(c.event_id, (gatesByEvent.get(c.event_id) || 0) + 1);
    });

    // scan counts per event + per gate (to find critical gates)
    const scanByEvent = new Map<string, number>();
    const scanByGate = new Map<string, number>();
    ((sc as any) || []).forEach((s: any) => {
      scanByEvent.set(s.event_id, (scanByEvent.get(s.event_id) || 0) + 1);
      if (s.checkpoint_id) scanByGate.set(s.checkpoint_id, (scanByGate.get(s.checkpoint_id) || 0) + 1);
    });

    // per gate critical
    const criticalByEvent = new Map<string, number>();
    ((cps as any) || []).forEach((c: any) => {
      if (!c.is_active || !c.capacity) return;
      const cnt = scanByGate.get(c.id) || 0;
      const pct = Math.round((cnt / c.capacity) * 100);
      if (pct >= 85) criticalByEvent.set(c.event_id, (criticalByEvent.get(c.event_id) || 0) + 1);
    });

    const rows: EventRow[] = evtList.map((e: any) => {
      const cap = capByEvent.get(e.id) || 0;
      const sc = scanByEvent.get(e.id) || 0;
      const pct = cap > 0 ? Math.min(100, Math.round((sc / cap) * 100)) : 0;
      return {
        id: e.id,
        title_ar: e.title_ar,
        organization_id: e.organization_id,
        org_name: orgMap.get(e.organization_id) as any,
        totalCapacity: cap,
        totalScans: sc,
        pct,
        gates: gatesByEvent.get(e.id) || 0,
        criticalGates: criticalByEvent.get(e.id) || 0,
      };
    }).sort((a: EventRow, b: EventRow) => b.pct - a.pct);

    setEvents(rows);

    // organizer aggregates
    const oMap = new Map<string, OrgRow>();
    rows.forEach(r => {
      const cur = oMap.get(r.organization_id) || { organization_id: r.organization_id, org_name: r.org_name || "—", events: 0, totalScans: 0, totalCapacity: 0, pct: 0 };
      cur.events += 1;
      cur.totalScans += r.totalScans;
      cur.totalCapacity += r.totalCapacity;
      oMap.set(r.organization_id, cur);
    });
    const orgRows = Array.from(oMap.values()).map(o => ({ ...o, pct: o.totalCapacity > 0 ? Math.min(100, Math.round((o.totalScans / o.totalCapacity) * 100)) : 0 })).sort((a, b) => b.pct - a.pct);
    setOrgs(orgRows);
    setLoading(false);
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const platformStats = useMemo(() => {
    const totalEvents = events.length;
    const totalScans = events.reduce((a, e) => a + e.totalScans, 0);
    const totalCap = events.reduce((a, e) => a + e.totalCapacity, 0);
    const critical = events.filter(e => e.criticalGates > 0).length;
    return { totalEvents, totalScans, totalCap, critical, pct: totalCap > 0 ? Math.round((totalScans / totalCap) * 100) : 0 };
  }, [events]);

  // التحديث الدوري كل 30 ثانية لا يخفي البيانات المعروضة
  if (loading && events.length === 0) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader title="الخارطة الحرارية للمنصة" description="…" />
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[130px] animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-card shadow-soft" />
        </div>
      </AdminLayout>
    );
  }

  const criticalEvents = events.filter(e => e.criticalGates > 0).slice(0, 5);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader title="الخارطة الحرارية للمنصة" description="نظرة شاملة على ضغط البوابات عبر كل الفعاليات النشطة، تحديث كل 30 ثانية" />

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="فعاليات نشطة" value={formatNumber(platformStats.totalEvents)} icon={Calendar} />
          <StatCard label="إجمالي الدخول" value={formatNumber(platformStats.totalScans)} icon={DoorOpen} />
          <StatCard label="السعة الكلية" value={platformStats.totalCap ? formatNumber(platformStats.totalCap) : "∞"} icon={Users} />
          <StatCard label="متوسط الإشغال" value={`${platformStats.pct}%`} icon={Gauge} />
          <StatCard label="فعاليات حرجة" value={formatNumber(platformStats.critical)} icon={AlertTriangle} />
        </div>

        {criticalEvents.length > 0 && (
          <Panel title="فعاليات حرجة">
            <div className="divide-y divide-border">
              {criticalEvents.map(e => (
                <div key={`alert-${e.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
                    <AlertTriangle className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1 basis-3/5 sm:basis-0">
                    <p className="truncate text-sm font-semibold leading-[22px]">{e.title_ar}</p>
                    <p className="truncate text-xs leading-[18px] text-muted-foreground">{e.org_name}</p>
                  </div>
                  <StatusBadge tone="danger">{criticalGatesLabel(e.criticalGates)}</StatusBadge>
                  <Button asChild variant="outline" size="sm" className="ms-auto sm:ms-0"><Link to={`/dashboard/events/${e.id}/heatmap`}>فتح</Link></Button>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel title="كل الفعاليات حسب الضغط" flush>
          {events.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="لا توجد فعاليات نشطة"
              action={<Button asChild size="sm" variant="outline"><Link to="/admin/events">عرض جميع الفعاليات</Link></Button>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">الفعالية</TableHead>
                  <TableHead>البوابات</TableHead>
                  <TableHead>الدخول</TableHead>
                  <TableHead>السعة</TableHead>
                  <TableHead>الإشغال</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="pe-6"><span className="sr-only">عرض</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map(e => {
                  const pb = pressureBucket(e.pct);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap ps-6">
                        <p className="font-semibold leading-[22px]">{e.title_ar}</p>
                        <p className="text-xs leading-[18px] text-muted-foreground">{e.org_name}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          {formatNumber(e.gates)}
                          {e.criticalGates > 0 && <StatusBadge tone="danger">{formatNumber(e.criticalGates)} حرجة</StatusBadge>}
                        </span>
                      </TableCell>
                      <TableCell>{formatNumber(e.totalScans)}</TableCell>
                      <TableCell className="text-muted-foreground">{e.totalCapacity ? formatNumber(e.totalCapacity) : "—"}</TableCell>
                      <TableCell><Occupancy pct={e.pct} bar={pb.bar} /></TableCell>
                      <TableCell><StatusBadge tone={pb.tone}>{pb.label}</StatusBadge></TableCell>
                      <TableCell className="pe-6 text-end">
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/dashboard/events/${e.id}/heatmap`}>عرض <ExternalLink className="h-3.5 w-3.5" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Panel>

        {orgs.length > 0 && (
          <Panel title="مقارنة المنظِّمين" flush>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">المنظِّم</TableHead>
                  <TableHead>فعاليات نشطة</TableHead>
                  <TableHead>الدخول</TableHead>
                  <TableHead>السعة</TableHead>
                  <TableHead className="pe-6">متوسط الإشغال</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map(o => (
                  <TableRow key={o.organization_id}>
                    <TableCell className="whitespace-nowrap ps-6 font-semibold">{o.org_name}</TableCell>
                    <TableCell>{formatNumber(o.events)}</TableCell>
                    <TableCell>{formatNumber(o.totalScans)}</TableCell>
                    <TableCell className="text-muted-foreground">{o.totalCapacity ? formatNumber(o.totalCapacity) : "—"}</TableCell>
                    <TableCell className="pe-6"><Occupancy pct={o.pct} bar={pressureBucket(o.pct).bar} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminHeatmap;
