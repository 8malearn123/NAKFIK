import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, ArrowLeft, DoorOpen, Flame, TrendingUp, Users, Clock, Settings2 } from "lucide-react";

interface Checkpoint {
  id: string;
  name_ar: string;
  capacity: number;
  color: string;
  checkpoint_type: string;
  is_active: boolean;
}
interface ScanRow {
  id: string;
  checkpoint_id: string | null;
  scanned_at: string;
  registration_id: string | null;
  attendee_id: string | null;
  scan_type: string;
}
interface RegMeta {
  id: string;
  ticket_id: string | null;
  attendee_id: string;
  ticket_name?: string | null;
  attendee_name?: string | null;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const pressureBucket = (pct: number) => {
  if (pct >= 90) return { label: "ممتلئ", cls: "bg-destructive text-destructive-foreground", bar: "bg-destructive" };
  if (pct >= 75) return { label: "ضغط عالٍ", cls: "bg-brand-brick text-white", bar: "bg-brand-brick" };
  if (pct >= 50) return { label: "متوسط", cls: "bg-brand-gold text-white", bar: "bg-brand-gold" };
  if (pct >= 25) return { label: "منخفض", cls: "bg-brand-teal text-white", bar: "bg-brand-teal" };
  return { label: "هادئ", cls: "bg-muted text-muted-foreground", bar: "bg-muted-foreground/40" };
};

const heatColor = (pct: number) => {
  if (pct === 0) return "bg-muted/30";
  if (pct < 20) return "bg-brand-teal/20";
  if (pct < 40) return "bg-brand-teal/50";
  if (pct < 60) return "bg-brand-gold/60";
  if (pct < 80) return "bg-brand-brick/70";
  return "bg-destructive";
};

const EventHeatmap = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState<{ title_ar: string } | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [regs, setRegs] = useState<Record<string, RegMeta>>({});
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    const [{ data: evt }, { data: cps }, { data: sc }] = await Promise.all([
      supabase.from("events").select("title_ar").eq("id", eventId).single(),
      supabase.from("checkpoints").select("*").eq("event_id", eventId).order("display_order"),
      supabase.from("scan_events").select("id, checkpoint_id, scanned_at, registration_id, attendee_id, scan_type").eq("event_id", eventId).order("scanned_at", { ascending: false }).limit(2000),
    ]);
    setEvent(evt as any);
    setCheckpoints((cps as any) || []);
    const scList: ScanRow[] = (sc as any) || [];
    setScans(scList);

    // load registration meta (ticket name + attendee name)
    const regIds = Array.from(new Set(scList.map(s => s.registration_id).filter(Boolean))) as string[];
    if (regIds.length > 0) {
      const { data: rg } = await supabase.from("registrations").select("id, ticket_id, attendee_id").in("id", regIds);
      const ticketIds = Array.from(new Set(((rg as any) || []).map((r: any) => r.ticket_id).filter(Boolean)));
      const attIds = Array.from(new Set(((rg as any) || []).map((r: any) => r.attendee_id).filter(Boolean)));
      const [{ data: tk }, { data: pr }] = await Promise.all([
        ticketIds.length ? supabase.from("tickets").select("id, name_ar").in("id", ticketIds as any) : Promise.resolve({ data: [] as any }),
        attIds.length ? supabase.from("profiles").select("id, full_name").in("id", attIds as any) : Promise.resolve({ data: [] as any }),
      ]);
      const tkMap = new Map<string, string>(((tk as any) || []).map((t: any) => [t.id, t.name_ar]));
      const prMap = new Map<string, string>(((pr as any) || []).map((p: any) => [p.id, p.full_name]));
      const map: Record<string, RegMeta> = {};
      ((rg as any) || []).forEach((r: any) => {
        map[r.id] = { id: r.id, ticket_id: r.ticket_id, attendee_id: r.attendee_id, ticket_name: tkMap.get(r.ticket_id) || "بدون تذكرة", attendee_name: prMap.get(r.attendee_id) || "—" };
      });
      setRegs(map);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  // Realtime: append new scans
  useEffect(() => {
    if (!eventId) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel(`heatmap-${eventId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scan_events", filter: `event_id=eq.${eventId}` }, (payload) => {
        const row = payload.new as any;
        setScans(prev => [{ id: row.id, checkpoint_id: row.checkpoint_id, scanned_at: row.scanned_at, registration_id: row.registration_id, attendee_id: row.attendee_id, scan_type: row.scan_type }, ...prev].slice(0, 2000));
      })
      .subscribe();
    channelRef.current = ch;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [eventId]);

  // Per-gate counts (entries only)
  const gateStats = useMemo(() => {
    const m = new Map<string, number>();
    scans.forEach(s => {
      if (s.scan_type !== "entry" || !s.checkpoint_id) return;
      m.set(s.checkpoint_id, (m.get(s.checkpoint_id) || 0) + 1);
    });
    return checkpoints.map(c => {
      const count = m.get(c.id) || 0;
      const pct = c.capacity > 0 ? Math.min(100, Math.round((count / c.capacity) * 100)) : 0;
      return { ...c, count, pct };
    });
  }, [scans, checkpoints]);

  // Last 15 minutes velocity → predict next 15 min per gate
  const prediction = useMemo(() => {
    const cutoff = Date.now() - 15 * 60 * 1000;
    const m = new Map<string, number>();
    scans.forEach(s => {
      if (s.scan_type !== "entry" || !s.checkpoint_id) return;
      if (new Date(s.scanned_at).getTime() < cutoff) return;
      m.set(s.checkpoint_id, (m.get(s.checkpoint_id) || 0) + 1);
    });
    return m;
  }, [scans]);

  // Hourly × gate heatmap matrix (today)
  const today = new Date().toISOString().slice(0, 10);
  const hourMatrix = useMemo(() => {
    // matrix[gateId][hour] = count
    const grid: Record<string, number[]> = {};
    checkpoints.forEach(c => { grid[c.id] = Array(24).fill(0); });
    scans.forEach(s => {
      if (!s.checkpoint_id || s.scan_type !== "entry") return;
      const d = new Date(s.scanned_at);
      if (d.toISOString().slice(0, 10) !== today) return;
      if (!grid[s.checkpoint_id]) return;
      grid[s.checkpoint_id][d.getHours()] += 1;
    });
    // find max for normalization
    let max = 0;
    Object.values(grid).forEach(arr => arr.forEach(v => { if (v > max) max = v; }));
    return { grid, max: max || 1 };
  }, [scans, checkpoints, today]);

  // Source breakdown (ticket type)
  const sourceBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    scans.forEach(s => {
      if (s.scan_type !== "entry" || !s.registration_id) return;
      const t = regs[s.registration_id]?.ticket_name || "بدون تذكرة";
      m.set(t, (m.get(t) || 0) + 1);
    });
    const total = Array.from(m.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(m.entries()).map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) })).sort((a, b) => b.count - a.count);
  }, [scans, regs]);

  // Staff recommendations (proportional to pressure pct, total 10 staff)
  const recommendations = useMemo(() => {
    const TOTAL_STAFF = 10;
    const totalPressure = gateStats.reduce((a, g) => a + Math.max(g.pct, 5), 0) || 1;
    return gateStats.map(g => ({
      ...g,
      staff: Math.max(1, Math.round((Math.max(g.pct, 5) / totalPressure) * TOTAL_STAFF)),
    }));
  }, [gateStats]);

  const liveFeed = scans.slice(0, 25);

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link to="/dashboard/events" className="hover:text-foreground"><ArrowLeft className="w-4 h-4 inline" /> فعالياتي</Link>
            </div>
            <h1 className="font-bold text-2xl text-foreground flex items-center gap-2">
              <Flame className="w-6 h-6 text-brand-brick" /> الخارطة الحرارية للضغط
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{event?.title_ar} — تحديث مباشر</p>
          </div>
          <Button variant="outline" className="rounded-full" asChild>
            <Link to={`/dashboard/events/${eventId}/checkpoints`}>
              <Settings2 className="w-4 h-4" /> إدارة البوابات
            </Link>
          </Button>
        </div>

        {/* Critical alerts */}
        {gateStats.filter(g => g.pct >= 85).length > 0 && (
          <div className="bg-destructive/10 border-2 border-destructive rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-destructive">⚠️ تنبيه: بوابات تحت ضغط حرج</p>
              <p className="text-sm text-foreground/80 mt-1">
                {gateStats.filter(g => g.pct >= 85).map(g => `${g.name_ar} (${g.pct}%)`).join(" • ")}
                {" — "}يُنصح بإعادة توزيع الموظفين فوراً
              </p>
            </div>
          </div>
        )}

        {gateStats.length === 0 && (
          <div className="bg-card rounded-2xl border border-border/50 p-12 text-center">
            <DoorOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-bold text-foreground mb-1">لا توجد بوابات معدّة</h3>
            <p className="text-sm text-muted-foreground mb-4">أضف نقاط الدخول أولاً لتظهر بياناتها هنا</p>
            <Button asChild className="rounded-full"><Link to={`/dashboard/events/${eventId}/checkpoints`}>إعداد البوابات</Link></Button>
          </div>
        )}

        {gateStats.length > 0 && (
          <>
            {/* Live gate pressure cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {gateStats.map(g => {
                const pb = pressureBucket(g.pct);
                const next15 = prediction.get(g.id) || 0;
                return (
                  <div key={g.id} className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: `#${g.color}` }} />
                        <span className="font-bold text-foreground text-sm">{g.name_ar}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pb.cls}`}>{pb.label}</span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-foreground tabular-nums">{g.count}</span>
                        <span className="text-xs text-muted-foreground">/ {g.capacity || "∞"}</span>
                        {g.capacity > 0 && <span className="text-xs font-semibold text-foreground mr-auto">{g.pct}%</span>}
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${pb.bar} transition-all duration-500`} style={{ width: `${g.pct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      <span>آخر 15د: <strong className="text-foreground">{next15}</strong> دخول</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hourly heatmap matrix */}
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-bold text-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> الشبكة الزمنية × البوابات (اليوم)</h3>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>هادئ</span>
                  <span className="w-3 h-3 rounded bg-muted/30 border border-border" />
                  <span className="w-3 h-3 rounded bg-brand-teal/50" />
                  <span className="w-3 h-3 rounded bg-brand-gold/60" />
                  <span className="w-3 h-3 rounded bg-brand-brick/70" />
                  <span className="w-3 h-3 rounded bg-destructive" />
                  <span>ذروة</span>
                </div>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-right p-1 font-semibold text-muted-foreground sticky right-0 bg-card min-w-[120px]">البوابة</th>
                      {HOURS.map(h => <th key={h} className="p-1 font-medium text-muted-foreground text-center w-9">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {checkpoints.map(c => (
                      <tr key={c.id}>
                        <td className="p-1 font-medium text-foreground sticky right-0 bg-card">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: `#${c.color}` }} />
                            {c.name_ar}
                          </div>
                        </td>
                        {HOURS.map(h => {
                          const v = hourMatrix.grid[c.id]?.[h] || 0;
                          const pct = (v / hourMatrix.max) * 100;
                          return (
                            <td key={h} className="p-0.5">
                              <div className={`h-8 rounded ${heatColor(pct)} flex items-center justify-center text-[10px] font-semibold transition-all hover:scale-110 cursor-help`}
                                title={`${c.name_ar} • ${h}:00 → ${v} دخول`}>
                                {v > 0 ? v : ""}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              {/* Source breakdown */}
              <div className="bg-card rounded-2xl border border-border/50 p-4">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> مصدر الحضور</h3>
                {sourceBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد بيانات بعد</p>
                ) : (
                  <div className="space-y-2.5">
                    {sourceBreakdown.map(s => (
                      <div key={s.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-foreground">{s.name}</span>
                          <span className="text-muted-foreground tabular-nums">{s.count} ({s.pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gradient-to-l from-brand-purple to-brand-teal" style={{ width: `${s.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Staff recommendations */}
              <div className="bg-card rounded-2xl border border-border/50 p-4">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> توصيات توزيع الموظفين</h3>
                <p className="text-xs text-muted-foreground mb-3">اقتراح توزيع 10 موظفين حسب الضغط الحالي</p>
                <div className="space-y-2">
                  {recommendations.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: `#${r.color}` }} />
                        <span className="font-medium text-foreground text-sm">{r.name_ar}</span>
                        <span className="text-[10px] text-muted-foreground">({r.pct}%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: r.staff }).map((_, i) => (
                          <span key={i} className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">👤</span>
                        ))}
                        <span className="text-xs font-bold text-foreground mr-1">{r.staff}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live feed */}
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
                  التدفّق الحي
                </h3>
                <span className="text-xs text-muted-foreground">آخر {liveFeed.length} عملية</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {liveFeed.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">لا توجد مسحات بعد</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 sticky top-0">
                      <tr>
                        <th className="text-right p-2.5 font-semibold text-muted-foreground text-xs">الوقت</th>
                        <th className="text-right p-2.5 font-semibold text-muted-foreground text-xs">الحاضر</th>
                        <th className="text-right p-2.5 font-semibold text-muted-foreground text-xs">التذكرة</th>
                        <th className="text-right p-2.5 font-semibold text-muted-foreground text-xs">البوابة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {liveFeed.map(s => {
                        const cp = checkpoints.find(c => c.id === s.checkpoint_id);
                        const reg = s.registration_id ? regs[s.registration_id] : null;
                        return (
                          <tr key={s.id} className="hover:bg-muted/20">
                            <td className="p-2.5 text-xs text-muted-foreground tabular-nums">{new Date(s.scanned_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                            <td className="p-2.5 text-foreground">{reg?.attendee_name || "—"}</td>
                            <td className="p-2.5 text-muted-foreground">{reg?.ticket_name || "—"}</td>
                            <td className="p-2.5">
                              {cp ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                                  <span className="w-2 h-2 rounded-full" style={{ background: `#${cp.color}` }} />
                                  {cp.name_ar}
                                </span>
                              ) : <span className="text-muted-foreground text-xs">بدون</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EventHeatmap;
