import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatCard from "@/components/app/StatCard";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { classifyAttendee, ATTENDEE_CLASS_META, type AttendeeClass } from "@/lib/attendeeClass";
import { computeStay, formatDuration } from "@/lib/attendance";
import { formatDateShort, formatNumber, formatTime } from "@/lib/format";
import { ArrowRight, Download, DoorOpen, LogIn, LogOut, Search, Users } from "lucide-react";
import { toast } from "sonner";

// قائمة الحضور — تُعبأ تلقائياً من عمليات المسح على البوابات:
// الدخول = أول مسحة دخول، الخروج = آخر مسحة خروج، والمدة تُحسب بينهما.

interface Row {
  regId: string;
  name: string;
  tier: ReturnType<typeof classifyAttendee>;
  ticketName: string;
  entry: string | null;
  exit: string | null;
}

const fmtTime = (iso: string | null) => (iso ? `${formatDateShort(iso)}، ${formatTime(iso)}` : null);

const TIER_TONES: Record<AttendeeClass, StatusTone> = {
  vvip: "warning",
  vip: "primary",
  speaker: "primary",
  organizer: "neutral",
  regular: "neutral",
};

interface ScanRow { registration_id: string | null; scan_type: string; scanned_at: string; event_day_id?: string | null; }
interface BaseRow { regId: string; name: string; tier: ReturnType<typeof classifyAttendee>; ticketName: string; fallbackEntry: string | null; }

const EventAttendance = () => {
  const { eventId } = useParams();
  const [eventTitle, setEventTitle] = useState("");
  const [base, setBase] = useState<BaseRow[]>([]);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [eventDays, setEventDays] = useState<{ id: string; day_number: number; day_date: string; title: string | null }[]>([]);
  const [dayFilter, setDayFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { document.title = "قائمة الحضور | نكفيك"; }, []);

  useEffect(() => {
    if (!eventId) return;
    const load = async () => {
      const [{ data: evt }, { data: regs }, scansRes, daysRes] = await Promise.all([
        supabase.from("events").select("title_ar").eq("id", eventId).single(),
        supabase
          .from("registrations")
          .select("id, attendee_id, checked_in_at, ticket:tickets(name_ar, name_en, type)")
          .eq("event_id", eventId),
        supabase
          .from("scan_events")
          .select("registration_id, scan_type, scanned_at, event_day_id")
          .eq("event_id", eventId)
          .order("scanned_at"),
        supabase.from("event_days" as any).select("id, day_number, day_date, title").eq("event_id", eventId).order("day_number"),
      ]);
      // توافقية: قبل ملف SQL الخاص بالأيام لا يوجد عمود event_day_id
      let scansData = (scansRes.data as any) || [];
      if (scansRes.error) {
        const fb = await supabase.from("scan_events").select("registration_id, scan_type, scanned_at").eq("event_id", eventId).order("scanned_at");
        scansData = (fb.data as any) || [];
      }
      setScans(scansData as ScanRow[]);
      setEventDays(daysRes.error ? [] : (((daysRes.data as any) || []) as any));
      setEventTitle((evt as any)?.title_ar || "");

      const regList = ((regs as any) || []).map((r: any) => ({
        ...r,
        ticket: Array.isArray(r.ticket) ? r.ticket[0] : r.ticket,
      }));

      // أسماء الحضور
      const ids = [...new Set(regList.map((r: any) => r.attendee_id))];
      const names: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids as string[]);
        (profs || []).forEach((p: any) => { names[p.id] = p.full_name || "—"; });
      }

      setBase(
        regList.map((r: any) => ({
          regId: r.id,
          name: names[r.attendee_id] || "—",
          tier: classifyAttendee(r.ticket?.name_ar, r.ticket?.name_en, r.ticket?.type),
          ticketName: r.ticket?.name_ar || "تذكرة",
          fallbackEntry: r.checked_in_at || null,
        }))
      );
      setLoading(false);
    };
    load();
  }, [eventId]);

  // بناء الصفوف حسب اليوم المختار — أول دخول وآخر خروج ضمن نطاق الفلتر
  const rows = useMemo<Row[]>(() => {
    const scoped = dayFilter === "all" ? scans : scans.filter(sc => sc.event_day_id === dayFilter);
    const firstEntry: Record<string, string> = {};
    const lastExit: Record<string, string> = {};
    scoped.forEach(sc => {
      if (!sc.registration_id) return;
      if (sc.scan_type === "entry" && !firstEntry[sc.registration_id]) firstEntry[sc.registration_id] = sc.scanned_at;
      if (sc.scan_type === "exit") lastExit[sc.registration_id] = sc.scanned_at;
    });
    return base.map(b => ({
      regId: b.regId,
      name: b.name,
      tier: b.tier,
      ticketName: b.ticketName,
      entry: firstEntry[b.regId] || (dayFilter === "all" ? b.fallbackEntry : null),
      exit: lastExit[b.regId] || null,
    }));
  }, [base, scans, dayFilter]);

  const filtered = useMemo(
    () => rows.filter(r => !search || r.name.includes(search) || r.ticketName.includes(search)),
    [rows, search]
  );

  const stats = useMemo(() => ({
    total: rows.length,
    entered: rows.filter(r => r.entry).length,
    inside: rows.filter(r => r.entry && !r.exit).length,
    left: rows.filter(r => r.exit).length,
  }), [rows]);

  const exportCSV = () => {
    const header = ["الاسم", "التصنيف", "التذكرة", "وقت الدخول", "وقت الخروج", "مدة البقاء"];
    const lines = filtered.map(r => {
      const stay = computeStay(r.entry, r.exit);
      return [r.name, ATTENDEE_CLASS_META[r.tier].label, r.ticketName, fmtTime(r.entry) || "—", fmtTime(r.exit) || "—", stay ? formatDuration(stay) : "—"];
    });
    const csv = [header, ...lines].map(l => l.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `قائمة-الحضور-${Date.now()}.csv`;
    a.click();
    toast.success("تم تصدير القائمة");
  };

  const tagline = "تُعبأ تلقائياً من عمليات المسح على البوابات (الدخول من بوابات الدخول والخروج من بوابات الخروج)";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <Link to="/dashboard/events" className="inline-flex items-center gap-1.5 text-[13px] font-semibold leading-5 text-primary">
            <ArrowRight className="h-4 w-4" /> العودة لفعالياتي
          </Link>
          <PageHeader
            title="قائمة الحضور"
            description={eventTitle ? `${eventTitle}، ${tagline}` : tagline}
            actions={
              <Button variant="outline" onClick={exportCSV} disabled={rows.length === 0}>
                <Download className="h-4 w-4" /> تصدير CSV
              </Button>
            }
          />
        </div>

        {/* ملخص */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-4">
          <StatCard label="إجمالي المسجلين" value={loading ? "…" : formatNumber(stats.total)} icon={Users} />
          <StatCard label="دخلوا الفعالية" value={loading ? "…" : formatNumber(stats.entered)} icon={LogIn} />
          <StatCard label="بالداخل الآن" value={loading ? "…" : formatNumber(stats.inside)} icon={DoorOpen} />
          <StatCard label="غادروا" value={loading ? "…" : formatNumber(stats.left)} icon={LogOut} />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو التذكرة..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          {eventDays.length > 0 && (
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger aria-label="عرض حسب اليوم" className="h-10 w-auto min-w-[150px] gap-2 font-medium"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كامل الفعالية</SelectItem>
                {eventDays.map(d => <SelectItem key={d.id} value={d.id}>{d.title || `اليوم ${d.day_number}`}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {loading ? (
          <div className="h-80 animate-pulse rounded-2xl bg-card shadow-soft" />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            {search ? (
              <EmptyState
                icon={Search}
                title="لا يوجد مسجلون مطابقون للبحث"
                action={<Button variant="outline" size="sm" onClick={() => setSearch("")}>مسح البحث</Button>}
              />
            ) : (
              <EmptyState
                icon={Users}
                title="لا يوجد مسجلون بعد"
                action={<Button asChild variant="soft" size="sm"><Link to="/dashboard/events">العودة لفعالياتي</Link></Button>}
              />
            )}
          </div>
        ) : (
          <Panel flush title="المسجلون">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">الاسم</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>وقت الدخول</TableHead>
                  <TableHead>وقت الخروج</TableHead>
                  <TableHead className="pe-6">مدة البقاء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const meta = ATTENDEE_CLASS_META[r.tier];
                  const stay = computeStay(r.entry, r.exit);
                  return (
                    <TableRow key={r.regId}>
                      <TableCell className="whitespace-nowrap ps-6">
                        <p className="font-semibold leading-[22px]">{r.name}</p>
                        <p className="text-xs leading-[18px] text-muted-foreground">{r.ticketName}</p>
                      </TableCell>
                      <TableCell><StatusBadge tone={TIER_TONES[r.tier]}><bdi>{meta.label}</bdi></StatusBadge></TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r.entry ? fmtTime(r.entry) : <span className="text-xs text-muted-foreground">لم يتم الدخول بعد</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r.exit
                          ? fmtTime(r.exit)
                          : r.entry
                          ? <StatusBadge tone="success">بالداخل</StatusBadge>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap pe-6 font-semibold">
                        {stay ? formatDuration(stay) : <span className="font-normal text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Panel>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EventAttendance;
