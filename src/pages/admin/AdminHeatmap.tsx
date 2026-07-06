import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, ExternalLink, Flame, Building2 } from "lucide-react";

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

const pressureBucket = (pct: number) => {
  if (pct >= 90) return { label: "ممتلئ", cls: "bg-destructive text-destructive-foreground" };
  if (pct >= 75) return { label: "ضغط عالٍ", cls: "bg-brand-brick text-white" };
  if (pct >= 50) return { label: "متوسط", cls: "bg-brand-gold text-white" };
  if (pct >= 25) return { label: "منخفض", cls: "bg-brand-teal text-white" };
  return { label: "هادئ", cls: "bg-muted text-muted-foreground" };
};

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

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-destructive/30 border-t-destructive rounded-full animate-spin" />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="font-bold text-2xl text-foreground flex items-center gap-2">
            <Flame className="w-6 h-6 text-destructive" /> الخارطة الحرارية للمنصة
          </h1>
          <p className="text-sm text-muted-foreground mt-1">نظرة شاملة على ضغط البوابات عبر كل الفعاليات النشطة • تحديث كل 30 ثانية</p>
        </div>

        {/* Platform-wide stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <p className="text-xs text-muted-foreground">فعاليات نشطة</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{platformStats.totalEvents}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <p className="text-xs text-muted-foreground">إجمالي الدخول</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{platformStats.totalScans}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <p className="text-xs text-muted-foreground">السعة الكلية</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{platformStats.totalCap || "∞"}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <p className="text-xs text-muted-foreground">متوسط الإشغال</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{platformStats.pct}%</p>
          </div>
          <div className="bg-card rounded-2xl border-2 border-destructive/30 p-4">
            <p className="text-xs text-destructive">فعاليات حرجة</p>
            <p className="text-2xl font-bold text-destructive tabular-nums">{platformStats.critical}</p>
          </div>
        </div>

        {/* Critical alerts */}
        {events.filter(e => e.criticalGates > 0).slice(0, 5).map(e => (
          <div key={`alert-${e.id}`} className="bg-destructive/10 border border-destructive rounded-xl p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="flex-1 text-sm">
              <strong className="text-destructive">{e.title_ar}</strong> — {e.criticalGates} بوابة حرجة • {e.org_name}
            </div>
            <Link to={`/dashboard/events/${e.id}/heatmap`} className="text-xs font-bold text-destructive hover:underline flex items-center gap-1">
              فتح <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        ))}

        {/* Events table */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <h3 className="font-bold text-foreground flex items-center gap-2"><Activity className="w-4 h-4" /> كل الفعاليات حسب الضغط</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-right p-3 font-semibold text-foreground text-xs">الفعالية</th>
                  <th className="text-right p-3 font-semibold text-foreground text-xs">المنظِّم</th>
                  <th className="text-right p-3 font-semibold text-foreground text-xs">البوابات</th>
                  <th className="text-right p-3 font-semibold text-foreground text-xs">الدخول</th>
                  <th className="text-right p-3 font-semibold text-foreground text-xs">السعة</th>
                  <th className="text-right p-3 font-semibold text-foreground text-xs">الإشغال</th>
                  <th className="text-right p-3 font-semibold text-foreground text-xs">الحالة</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {events.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">لا توجد فعاليات نشطة</td></tr>
                ) : events.map(e => {
                  const pb = pressureBucket(e.pct);
                  return (
                    <tr key={e.id} className="hover:bg-muted/20">
                      <td className="p-3 font-medium text-foreground">{e.title_ar}</td>
                      <td className="p-3 text-muted-foreground text-xs">{e.org_name}</td>
                      <td className="p-3 text-foreground tabular-nums">{e.gates} {e.criticalGates > 0 && <span className="text-destructive font-bold">({e.criticalGates}⚠️)</span>}</td>
                      <td className="p-3 text-foreground tabular-nums">{e.totalScans}</td>
                      <td className="p-3 text-muted-foreground tabular-nums">{e.totalCapacity || "—"}</td>
                      <td className="p-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full ${pb.cls.split(" ")[0]}`} style={{ width: `${e.pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-foreground tabular-nums w-10 text-left">{e.pct}%</span>
                        </div>
                      </td>
                      <td className="p-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pb.cls}`}>{pb.label}</span></td>
                      <td className="p-3">
                        <Link to={`/dashboard/events/${e.id}/heatmap`} className="text-xs text-primary hover:underline flex items-center gap-1">
                          عرض <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Organizer load */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <h3 className="font-bold text-foreground flex items-center gap-2"><Building2 className="w-4 h-4" /> مقارنة المنظِّمين</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-right p-3 font-semibold text-foreground text-xs">المنظِّم</th>
                  <th className="text-right p-3 font-semibold text-foreground text-xs">فعاليات نشطة</th>
                  <th className="text-right p-3 font-semibold text-foreground text-xs">الدخول</th>
                  <th className="text-right p-3 font-semibold text-foreground text-xs">السعة</th>
                  <th className="text-right p-3 font-semibold text-foreground text-xs">متوسط الإشغال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {orgs.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">—</td></tr>
                ) : orgs.map(o => {
                  const pb = pressureBucket(o.pct);
                  return (
                    <tr key={o.organization_id} className="hover:bg-muted/20">
                      <td className="p-3 font-medium text-foreground">{o.org_name}</td>
                      <td className="p-3 text-foreground tabular-nums">{o.events}</td>
                      <td className="p-3 text-foreground tabular-nums">{o.totalScans}</td>
                      <td className="p-3 text-muted-foreground tabular-nums">{o.totalCapacity || "—"}</td>
                      <td className="p-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full ${pb.cls.split(" ")[0]}`} style={{ width: `${o.pct}%` }} />
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pb.cls}`}>{o.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminHeatmap;
