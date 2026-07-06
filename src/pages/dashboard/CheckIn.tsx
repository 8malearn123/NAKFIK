import { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Camera, Search, CheckCircle, XCircle, User, Mail, Ticket, Calendar, RotateCcw, Keyboard, DoorOpen, Activity,
} from "lucide-react";

interface RegistrationData {
  id: string;
  qr_code: string;
  status: string;
  checked_in_at: string | null;
  attendee: { full_name: string | null; email: string | null } | null;
  event: { title_ar: string; start_date: string } | null;
  ticket: { name_ar: string } | null;
}

type ScanResult = { status: "success" | "error" | "already"; data?: RegistrationData; message: string };

interface EventOption { id: string; title_ar: string; }
interface CheckpointOption { id: string; name_ar: string; capacity: number; color: string; }

const LS_EVENT = "checkin.eventId";
const LS_CP = "checkin.checkpointId";

const CheckIn = () => {
  const { organization, user } = useAuth();
  const [mode, setMode] = useState<"manual" | "camera">("manual");
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [stats, setStats] = useState({ total: 0, checkedIn: 0 });
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [events, setEvents] = useState<EventOption[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckpointOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>(() => localStorage.getItem(LS_EVENT) || "");
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string>(() => localStorage.getItem(LS_CP) || "");
  const [gatePressure, setGatePressure] = useState<{ count: number; cap: number }>({ count: 0, cap: 0 });

  // Load events for the organizer
  useEffect(() => {
    if (!organization) return;
    supabase.from("events").select("id, title_ar").eq("organization_id", organization.id).in("status", ["published", "approved"]).order("start_date", { ascending: false }).then(({ data }) => {
      const list = (data as any) || [];
      setEvents(list);
      // Auto-pick first if none selected
      if (!selectedEvent && list[0]) {
        setSelectedEvent(list[0].id);
        localStorage.setItem(LS_EVENT, list[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization]);

  // Load checkpoints for selected event
  useEffect(() => {
    if (!selectedEvent) { setCheckpoints([]); return; }
    supabase.from("checkpoints").select("id, name_ar, capacity, color").eq("event_id", selectedEvent).eq("is_active", true).order("display_order").then(({ data }) => {
      const list = (data as any) || [];
      setCheckpoints(list);
      if (selectedCheckpoint && !list.find((c: any) => c.id === selectedCheckpoint)) {
        setSelectedCheckpoint("");
        localStorage.removeItem(LS_CP);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent]);

  // Load stats + gate pressure
  const refreshStats = useCallback(async () => {
    if (!selectedEvent) return;
    const { count: totalCount } = await supabase.from("registrations").select("*", { count: "exact", head: true }).eq("event_id", selectedEvent);
    const { count: checkedCount } = await supabase.from("registrations").select("*", { count: "exact", head: true }).eq("event_id", selectedEvent).eq("status", "checked_in");
    setStats({ total: totalCount || 0, checkedIn: checkedCount || 0 });

    if (selectedCheckpoint) {
      const cp = checkpoints.find(c => c.id === selectedCheckpoint);
      const { count } = await supabase.from("scan_events").select("*", { count: "exact", head: true }).eq("checkpoint_id", selectedCheckpoint).eq("scan_type", "entry");
      setGatePressure({ count: count || 0, cap: cp?.capacity || 0 });
    } else {
      setGatePressure({ count: 0, cap: 0 });
    }
  }, [selectedEvent, selectedCheckpoint, checkpoints]);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  const onChangeEvent = (id: string) => { setSelectedEvent(id); localStorage.setItem(LS_EVENT, id); setResult(null); };
  const onChangeCheckpoint = (id: string) => { setSelectedCheckpoint(id); localStorage.setItem(LS_CP, id); setResult(null); };

  const normalizePhone = (raw: string): string | null => {
    let p = raw.replace(/[\s-]/g, "");
    if (!p) return null;
    if (p.startsWith("00")) p = "+" + p.slice(2);
    if (p.startsWith("05")) p = "+966" + p.slice(1);
    if (p.startsWith("5") && p.length === 9) p = "+966" + p;
    if (p.startsWith("966") && !p.startsWith("+")) p = "+" + p;
    return /^\+\d{8,15}$/.test(p) ? p : null;
  };

  const lookupCode = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    if (!selectedEvent) { toast.error("اختر الفعالية أولاً"); return; }

    // 1) Try direct QR lookup
    let { data: reg } = await supabase
      .from("registrations")
      .select("id, qr_code, status, checked_in_at, attendee_id, event_id, ticket_id")
      .eq("qr_code", trimmed)
      .maybeSingle();

    // 2) Fallback: phone lookup
    if (!reg) {
      const phone = normalizePhone(trimmed);
      if (phone) {
        const { data: profileMatches } = await supabase
          .from("profiles")
          .select("id")
          .eq("phone", phone);
        const ids = (profileMatches || []).map((p: any) => p.id);
        if (ids.length > 0) {
          const { data: regByPhone } = await supabase
            .from("registrations")
            .select("id, qr_code, status, checked_in_at, attendee_id, event_id, ticket_id")
            .eq("event_id", selectedEvent)
            .in("attendee_id", ids)
            .maybeSingle();
          if (regByPhone) reg = regByPhone;
        }
      }
    }

    if (!reg) {
      setResult({ status: "error", message: "لم يتم العثور على تسجيل بهذا الرمز أو الرقم" });
      return;
    }

    const [{ data: attendee }, { data: event }, { data: ticket }] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("id", reg.attendee_id).maybeSingle(),
      supabase.from("events").select("title_ar, start_date, organization_id").eq("id", reg.event_id).single(),
      reg.ticket_id ? supabase.from("tickets").select("name_ar").eq("id", reg.ticket_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    if (organization && event?.organization_id !== organization.id) {
      setResult({ status: "error", message: "هذا التسجيل لا ينتمي لفعالياتك" });
      return;
    }
    if (reg.event_id !== selectedEvent) {
      setResult({ status: "error", message: "هذا التسجيل لفعالية أخرى — غيّر الفعالية أعلاه" });
      return;
    }

    const regData = {
      ...reg,
      attendee: attendee || { full_name: null, email: null },
      event: event || { title_ar: "", start_date: "" },
      ticket: ticket || null,
    };

    const isAlready = reg.status === "checked_in";

    if (!isAlready) {
      await supabase.from("registrations")
        .update({ status: "checked_in", checked_in_at: new Date().toISOString() } as any)
        .eq("id", reg.id);
    }

    // Always log a scan_event so heatmap stays accurate (even on re-scans)
    await supabase.from("scan_events").insert({
      event_id: reg.event_id,
      registration_id: reg.id,
      attendee_id: reg.attendee_id,
      checkpoint_id: selectedCheckpoint || null,
      scanned_by: user?.id || null,
      scan_type: "entry",
    } as any);

    if (!isAlready) {
      setStats(s => ({ ...s, checkedIn: s.checkedIn + 1 }));
      setGatePressure(p => ({ ...p, count: p.count + 1 }));
    }

    setResult({
      status: isAlready ? "already" : "success",
      data: regData as any,
      message: isAlready ? "تم تسجيل حضور هذا الشخص مسبقاً" : "تم تسجيل الحضور بنجاح!",
    });
  }, [selectedEvent, selectedCheckpoint, organization, user]);

  const handleManualSubmit = (e: React.FormEvent) => { e.preventDefault(); lookupCode(manualCode); };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch { toast.error("لا يمكن الوصول إلى الكاميرا"); }
  };
  const stopCamera = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setCameraActive(false); };
  useEffect(() => { return () => { streamRef.current?.getTracks().forEach(t => t.stop()); }; }, []);

  const resetResult = () => { setResult(null); setManualCode(""); };

  // Pressure visuals
  const pct = gatePressure.cap > 0 ? Math.min(100, Math.round((gatePressure.count / gatePressure.cap) * 100)) : 0;
  const pressureLabel = pct >= 90 ? { l: "⚠️ ممتلئ", c: "text-destructive", bg: "bg-destructive" }
    : pct >= 75 ? { l: "ضغط عالٍ", c: "text-brand-brick", bg: "bg-brand-brick" }
    : pct >= 50 ? { l: "متوسط", c: "text-brand-gold", bg: "bg-brand-gold" }
    : { l: "هادئ", c: "text-brand-teal", bg: "bg-brand-teal" };
  const currentCp = checkpoints.find(c => c.id === selectedCheckpoint);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="font-bold text-2xl text-foreground">تسجيل الحضور</h1>
          <p className="text-muted-foreground text-sm mt-1">امسح رمز QR أو أدخل الرمز / رقم الجوال يدوياً</p>
        </div>

        {/* Event + Checkpoint selectors */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 mb-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> الفعالية</label>
              <select value={selectedEvent} onChange={e => onChangeEvent(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— اختر —</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.title_ar}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><DoorOpen className="w-3 h-3" /> البوابة الحالية</label>
              <select value={selectedCheckpoint} onChange={e => onChangeCheckpoint(e.target.value)} disabled={!selectedEvent || checkpoints.length === 0}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50">
                <option value="">— بدون بوابة —</option>
                {checkpoints.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
          </div>

          {selectedEvent && checkpoints.length === 0 && (
            <p className="text-xs text-muted-foreground">
              لم يتم إعداد بوابات لهذه الفعالية. <a href={`/dashboard/events/${selectedEvent}/checkpoints`} className="text-primary underline">إعداد البوابات</a>
            </p>
          )}

          {currentCp && (
            <div className="rounded-xl bg-muted/30 p-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: `#${currentCp.color}` }} />
                  <span className="font-semibold text-foreground">{currentCp.name_ar}</span>
                </span>
                <span className={`font-bold ${pressureLabel.c}`}>{pressureLabel.l} — {gatePressure.count}/{gatePressure.cap || "∞"} {gatePressure.cap > 0 && `(${pct}%)`}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${pressureLabel.bg} transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">إجمالي المسجلين</p>
              <p className="font-bold text-lg text-foreground">{stats.total}</p>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div>
              <p className="text-xs text-muted-foreground">حضروا</p>
              <p className="font-bold text-lg text-brand-teal">{stats.checkedIn}</p>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div>
              <p className="text-xs text-muted-foreground">لم يحضروا بعد</p>
              <p className="font-bold text-lg text-accent">{Math.max(0, stats.total - stats.checkedIn)}</p>
            </div>
          </div>
          {stats.total > 0 && (
            <div className="text-xs text-muted-foreground">
              {Math.round((stats.checkedIn / stats.total) * 100)}%
            </div>
          )}
          {selectedEvent && (
            <Button variant="ghost" size="sm" className="rounded-full" asChild>
              <a href={`/dashboard/events/${selectedEvent}/heatmap`}><Activity className="w-3.5 h-3.5" /> الخارطة الحرارية</a>
            </Button>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          <Button variant={mode === "manual" ? "default" : "outline"} className="rounded-full flex-1" onClick={() => { setMode("manual"); stopCamera(); resetResult(); }}>
            <Keyboard className="w-4 h-4" /> إدخال يدوي
          </Button>
          <Button variant={mode === "camera" ? "default" : "outline"} className="rounded-full flex-1" onClick={() => { setMode("camera"); resetResult(); }}>
            <Camera className="w-4 h-4" /> ماسح الكاميرا
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-6 mb-6">
          {mode === "manual" ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="رمز QR أو رقم الجوال (مثال: 0501234567)" className="pr-10 text-center font-mono" dir="ltr" value={manualCode} onChange={(e) => setManualCode(e.target.value)} autoFocus />
              </div>
              <Button type="submit" className="w-full rounded-full" size="lg" disabled={!selectedEvent}>
                <Search className="w-4 h-4" /> بحث وتسجيل حضور
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              {!cameraActive ? (
                <div className="text-center py-8">
                  <Camera className="w-20 h-20 text-primary/30 mx-auto mb-4" />
                  <Button onClick={startCamera} className="rounded-full" size="lg" disabled={!selectedEvent}><Camera className="w-4 h-4" /> تشغيل الكاميرا</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-foreground/5 aspect-video">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-primary rounded-2xl" />
                    </div>
                  </div>
                  <Button variant="outline" className="rounded-full w-full" onClick={stopCamera}>إيقاف الكاميرا</Button>
                </div>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`rounded-2xl border p-6 mb-6 ${result.status === "success" ? "bg-brand-teal/5 border-brand-teal/30" : result.status === "already" ? "bg-accent/5 border-accent/30" : "bg-destructive/5 border-destructive/30"}`}>
              <div className="text-center mb-4">
                {result.status === "success" && <div className="w-16 h-16 rounded-full bg-brand-teal/10 flex items-center justify-center mx-auto mb-3"><CheckCircle className="w-9 h-9 text-brand-teal" /></div>}
                {result.status === "already" && <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3"><CheckCircle className="w-9 h-9 text-accent" /></div>}
                {result.status === "error" && <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3"><XCircle className="w-9 h-9 text-destructive" /></div>}
                <h3 className="font-bold text-lg text-foreground">{result.message}</h3>
              </div>
              {result.data && (
                <div className="bg-background/80 rounded-xl p-4 space-y-3 text-sm">
                  <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">الاسم:</span><span className="font-semibold text-foreground">{result.data.attendee?.full_name || "—"}</span></div>
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">البريد:</span><span className="font-semibold text-foreground" dir="ltr">{result.data.attendee?.email || "—"}</span></div>
                  <div className="flex items-center gap-2"><Ticket className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">التذكرة:</span><span className="font-semibold text-foreground">{result.data.ticket?.name_ar || "—"}</span></div>
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">الفعالية:</span><span className="font-semibold text-foreground">{result.data.event?.title_ar || "—"}</span></div>
                  {currentCp && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <DoorOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">البوابة:</span>
                      <span className="font-semibold text-foreground">{currentCp.name_ar}</span>
                      <span className={`text-xs ${pressureLabel.c} ms-auto`}>{pct}% • {pressureLabel.l}</span>
                    </div>
                  )}
                </div>
              )}
              <Button variant="outline" className="w-full rounded-full mt-4" onClick={resetResult}>
                <RotateCcw className="w-4 h-4" /> مسح تذكرة أخرى
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default CheckIn;
