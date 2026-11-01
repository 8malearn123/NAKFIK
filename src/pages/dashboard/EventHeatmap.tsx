import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { CHART_COLORS } from "@/components/app/TrendChart";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber, formatPercent, formatTimeWithSeconds } from "@/lib/format";
import { AlertTriangle, ArrowRight, DoorOpen, ScanLine, Settings2, TrendingUp } from "lucide-react";

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

const pressureBucket = (pct: number): { label: string; tone: StatusTone; bar: string } => {
  if (pct >= 90) return { label: "ممتلئ", tone: "danger", bar: CHART_COLORS.danger };
  if (pct >= 75) return { label: "ضغط عالٍ", tone: "danger", bar: CHART_COLORS.danger };
  if (pct >= 50) return { label: "متوسط", tone: "warning", bar: CHART_COLORS.gold };
  if (pct >= 25) return { label: "منخفض", tone: "success", bar: CHART_COLORS.primary };
  return { label: "هادئ", tone: "neutral", bar: CHART_COLORS.primary };
};

// تدرج بلون واحد للكثافة: كل درجة أغمق من سابقتها، والنص يبقى مقروءاً بنسبة 4.5:1 على الأقل
const HEAT_STEPS = ["#EDE7F2", "#D5C8E0", "#B9A7C6", "#7A5C92", "#492C5A"];

const heatStyle = (pct: number) => {
  if (pct === 0) return undefined;
  const step = pct < 20 ? 0 : pct < 40 ? 1 : pct < 60 ? 2 : pct < 80 ? 3 : 4;
  return { background: HEAT_STEPS[step], color: step >= 3 ? "#FFFFFF" : "#1C1524" };
};

const staffCount = (n: number) => {
  if (n === 1) return "موظف واحد";
  if (n === 2) return "موظفان";
  return n <= 10 ? `${formatNumber(n)} موظفين` : `${formatNumber(n)} موظفاً`;
};

const feedLabel = (n: number) => {
  if (n === 1) return "آخر عملية";
  if (n === 2) return "آخر عمليتين";
  return `آخر ${formatNumber(n)} ${n <= 10 ? "عمليات" : "عملية"}`;
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

  const header = (actions?: React.ReactNode) => (
    <div className="space-y-2">
      <Link to="/dashboard/events" className="inline-flex items-center gap-1.5 text-[13px] font-semibold leading-5 text-primary">
        <ArrowRight className="h-4 w-4" /> العودة لفعالياتي
      </Link>
      <PageHeader
        title="الخارطة الحرارية للضغط"
        description={event?.title_ar ? `${event.title_ar}، تحديث مباشر` : "تحديث مباشر"}
        actions={actions}
      />
    </div>
  );

  if (loading) return (
    <DashboardLayout>
      <div className="space-y-6">
        {header()}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-card shadow-soft" />)}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />
      </div>
    </DashboardLayout>
  );

  const critical = gateStats.filter(g => g.pct >= 85);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        {header(
          <Button variant="outline" asChild>
            <Link to={`/dashboard/events/${eventId}/checkpoints`}>
              <Settings2 className="h-4 w-4" /> إدارة البوابات
            </Link>
          </Button>,
        )}

        {/* Critical alerts */}
        {critical.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl bg-[#FBECEA] p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#B42F24]" />
            <div className="flex-1 text-sm">
              <p className="mb-0.5 font-bold">تنبيه: بوابات تحت ضغط حرج</p>
              <p className="text-muted-foreground">
                {critical.map(g => `${g.name_ar} (${formatPercent(g.pct)})`).join("، ")}، يُنصح بإعادة توزيع الموظفين فوراً
              </p>
            </div>
          </div>
        )}

        {gateStats.length === 0 && (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={DoorOpen}
              title="لا توجد بوابات معدّة"
              description="أضف نقاط الدخول أولاً لتظهر بياناتها هنا"
              action={<Button asChild size="sm"><Link to={`/dashboard/events/${eventId}/checkpoints`}>إعداد البوابات</Link></Button>}
            />
          </div>
        )}

        {gateStats.length > 0 && (
          <>
            {/* Live gate pressure cards */}
            <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
              {gateStats.map(g => {
                const pb = pressureBucket(g.pct);
                const next15 = prediction.get(g.id) || 0;
                return (
                  <div key={g.id} className="flex min-w-0 flex-col gap-3 rounded-2xl bg-card px-6 py-5 shadow-soft">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                        <i className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: `#${g.color}` }} />
                        <span className="truncate">{g.name_ar}</span>
                      </span>
                      <StatusBadge tone={pb.tone}>{pb.label}</StatusBadge>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[32px] font-bold leading-10">{formatNumber(g.count)}</span>
                        <span className="text-xs text-muted-foreground">{g.capacity > 0 ? `من ${formatNumber(g.capacity)}` : "بلا سعة محددة"}</span>
                        {g.capacity > 0 && <b className="ms-auto text-sm font-bold">{g.pct}%</b>}
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EFEDF2]">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${g.pct}%`, background: pb.bar }} />
                      </div>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>آخر 15 دقيقة: <b className="font-semibold text-foreground">{formatNumber(next15)}</b> دخول</span>
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Hourly heatmap matrix */}
            <Panel
              flush
              title="الشبكة الزمنية × البوابات (اليوم)"
              actions={
                <div className="flex flex-none items-center gap-1 pt-1 text-xs text-muted-foreground">
                  <span className="me-1">هادئ</span>
                  {HEAT_STEPS.map(c => <i key={c} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />)}
                  <span className="ms-1">ذروة</span>
                </div>
              }
            >
              {/* عرض ثابت على الشاشات الضيقة حتى تتساوى الأعمدة، ويتم التمرير داخل البطاقة */}
              <div className="px-6 pb-6">
                <Table className="w-[44rem] table-fixed text-xs md:w-full">
                  <thead>
                    <tr>
                      <th className="sticky start-0 z-10 w-28 bg-card pb-1.5 pe-3 text-start font-medium text-muted-foreground xl:w-40">البوابة</th>
                      {HOURS.map(h => <th key={h} className="px-0.5 pb-1.5 text-center font-medium text-muted-foreground">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {checkpoints.map(c => (
                      <tr key={c.id}>
                        <td className="sticky start-0 z-10 bg-card py-0.5 pe-3 text-sm font-medium">
                          <span className="flex min-w-0 items-center gap-2">
                            <i className="h-2 w-2 flex-none rounded-full" style={{ background: `#${c.color}` }} />
                            <span className="truncate" title={c.name_ar}>{c.name_ar}</span>
                          </span>
                        </td>
                        {HOURS.map(h => {
                          const v = hourMatrix.grid[c.id]?.[h] || 0;
                          const pct = (v / hourMatrix.max) * 100;
                          return (
                            <td key={h} className="p-0.5">
                              <div
                                className="flex h-8 items-center justify-center rounded-md bg-muted/50 text-xs font-semibold"
                                style={heatStyle(pct)}
                                title={`${c.name_ar}، الساعة ${h}:00، ${formatNumber(v)} دخول`}
                              >
                                {v > 0 ? formatNumber(v) : ""}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Panel>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Source breakdown */}
              <Panel title="مصدر الحضور">
                {sourceBreakdown.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">لا توجد بيانات بعد</p>
                ) : (
                  <div className="space-y-4">
                    {sourceBreakdown.map(s => (
                      <div key={s.name}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate font-semibold">{s.name}</span>
                          <span className="whitespace-nowrap text-xs text-muted-foreground">{formatNumber(s.count)}، {formatPercent(s.pct)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#EFEDF2]">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${s.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              {/* Staff recommendations */}
              <Panel title="توصيات توزيع الموظفين" description="اقتراح توزيع 10 موظفين حسب الضغط الحالي">
                <div className="divide-y divide-border">
                  {recommendations.map(r => (
                    <div key={r.id} className="flex items-center gap-2.5 py-3 first:pt-0 last:pb-0">
                      <i className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: `#${r.color}` }} />
                      <span className="min-w-0 truncate text-sm font-semibold">{r.name_ar}</span>
                      <span className="text-xs text-muted-foreground">{formatPercent(r.pct)}</span>
                      <span className="ms-auto whitespace-nowrap text-sm font-semibold">{staffCount(r.staff)}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* Live feed */}
            <Panel flush title="التدفّق الحي" description={liveFeed.length > 0 ? feedLabel(liveFeed.length) : undefined} actions={<StatusBadge tone="success">مباشر</StatusBadge>}>
              {liveFeed.length === 0 ? (
                <EmptyState
                  icon={ScanLine}
                  title="لا توجد مسحات بعد"
                  action={<Button asChild size="sm"><Link to="/dashboard/check-in">تسجيل الحضور</Link></Button>}
                />
              ) : (
                <div className="max-h-80 overflow-auto [&>div]:overflow-visible">
                  <Table>
                    <TableHeader className="sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="ps-6">الوقت</TableHead>
                        <TableHead>الحاضر</TableHead>
                        <TableHead>التذكرة</TableHead>
                        <TableHead className="pe-6">البوابة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {liveFeed.map(s => {
                        const cp = checkpoints.find(c => c.id === s.checkpoint_id);
                        const reg = s.registration_id ? regs[s.registration_id] : null;
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="whitespace-nowrap ps-6 text-xs text-muted-foreground">{formatTimeWithSeconds(s.scanned_at)}</TableCell>
                            <TableCell className="whitespace-nowrap font-semibold">{reg?.attendee_name || "—"}</TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground"><bdi>{reg?.ticket_name || "—"}</bdi></TableCell>
                            <TableCell className="whitespace-nowrap pe-6">
                              {cp ? (
                                <span className="inline-flex items-center gap-2">
                                  <i className="h-2 w-2 flex-none rounded-full" style={{ background: `#${cp.color}` }} />
                                  {cp.name_ar}
                                </span>
                              ) : <span className="text-xs text-muted-foreground">بدون</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EventHeatmap;
