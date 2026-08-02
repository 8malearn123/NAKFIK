import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { classifyAttendee, ATTENDEE_CLASS_META } from "@/lib/attendeeClass";
import { computeStay, formatDuration } from "@/lib/attendance";
import { ArrowRight, ClipboardList, Download, Search, Users } from "lucide-react";
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

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" }) : null;

const EventAttendance = () => {
  const { eventId } = useParams();
  const [eventTitle, setEventTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { document.title = "قائمة الحضور | نكفيك"; }, []);

  useEffect(() => {
    if (!eventId) return;
    const load = async () => {
      const [{ data: evt }, { data: regs }, { data: scans }] = await Promise.all([
        supabase.from("events").select("title_ar").eq("id", eventId).single(),
        supabase
          .from("registrations")
          .select("id, attendee_id, checked_in_at, ticket:tickets(name_ar, name_en, type)")
          .eq("event_id", eventId),
        supabase
          .from("scan_events")
          .select("registration_id, scan_type, scanned_at")
          .eq("event_id", eventId)
          .order("scanned_at"),
      ]);
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

      // أول دخول وآخر خروج لكل تسجيل من سجل المسح
      const firstEntry: Record<string, string> = {};
      const lastExit: Record<string, string> = {};
      ((scans as any) || []).forEach((sc: any) => {
        if (!sc.registration_id) return;
        if (sc.scan_type === "entry" && !firstEntry[sc.registration_id]) firstEntry[sc.registration_id] = sc.scanned_at;
        if (sc.scan_type === "exit") lastExit[sc.registration_id] = sc.scanned_at;
      });

      setRows(
        regList.map((r: any) => ({
          regId: r.id,
          name: names[r.attendee_id] || "—",
          tier: classifyAttendee(r.ticket?.name_ar, r.ticket?.name_en, r.ticket?.type),
          ticketName: r.ticket?.name_ar || "تذكرة",
          entry: firstEntry[r.id] || r.checked_in_at || null,
          exit: lastExit[r.id] || null,
        }))
      );
      setLoading(false);
    };
    load();
  }, [eventId]);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2 -mr-2">
              <Link to="/dashboard/events"><ArrowRight className="w-4 h-4" /> العودة لفعالياتي</Link>
            </Button>
            <h1 className="font-bold text-2xl text-foreground flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" /> قائمة الحضور
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {eventTitle} — تُعبأ تلقائياً من عمليات المسح على البوابات (الدخول من بوابات الدخول والخروج من بوابات الخروج)
            </p>
          </div>
          <Button variant="outline" className="rounded-full" onClick={exportCSV} disabled={rows.length === 0}>
            <Download className="w-4 h-4" /> تصدير CSV
          </Button>
        </div>

        {/* ملخص */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "إجمالي المسجلين", v: stats.total, cls: "text-foreground" },
            { label: "دخلوا الفعالية", v: stats.entered, cls: "text-green-600" },
            { label: "بالداخل الآن", v: stats.inside, cls: "text-primary" },
            { label: "غادروا", v: stats.left, cls: "text-amber-600" },
          ].map(c => (
            <div key={c.label} className="bg-card border rounded-2xl p-4 text-center">
              <div className={`font-extrabold text-2xl ${c.cls}`}>{c.v.toLocaleString("ar-SA")}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو التذكرة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pr-10 pl-4 rounded-xl bg-card text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-card rounded-xl h-14 border" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border rounded-2xl p-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">لا يوجد مسجلون{search ? " مطابقون للبحث" : " بعد"}</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="text-right p-3">الاسم</th>
                    <th className="text-right p-3">التصنيف</th>
                    <th className="text-right p-3">وقت الدخول</th>
                    <th className="text-right p-3">وقت الخروج</th>
                    <th className="text-right p-3">مدة البقاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map(r => {
                    const meta = ATTENDEE_CLASS_META[r.tier];
                    const stay = computeStay(r.entry, r.exit);
                    return (
                      <tr key={r.regId} className="hover:bg-muted/20">
                        <td className="p-3">
                          <span className="font-bold">{r.name}</span>
                          <span className="block text-[10px] text-muted-foreground">{r.ticketName}</span>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-extrabold rounded-full px-2.5 py-0.5 border ${meta.cls}`}>{meta.label}</span>
                        </td>
                        <td className="p-3 text-xs">
                          {r.entry
                            ? <span className="text-green-700 font-semibold">{fmtTime(r.entry)}</span>
                            : <span className="text-muted-foreground">لم يدخل بعد</span>}
                        </td>
                        <td className="p-3 text-xs">
                          {r.exit
                            ? <span className="text-amber-700 font-semibold">{fmtTime(r.exit)}</span>
                            : r.entry
                            ? <span className="text-primary font-semibold">بالداخل</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-3 text-xs font-bold">
                          {stay ? formatDuration(stay) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EventAttendance;
