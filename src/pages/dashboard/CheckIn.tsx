import { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { classifyAttendee, ATTENDEE_CLASS_META } from "@/lib/attendeeClass";
import jsQR from "jsqr";
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
  ticket: { name_ar: string; name_en?: string | null; type?: string | null } | null;
}

type ScanResult = { status: "success" | "error" | "already"; data?: RegistrationData; message: string };

interface EventOption { id: string; title_ar: string; }
interface CheckpointOption { id: string; name_ar: string; capacity: number; color: string; checkpoint_type?: string; }

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
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const lookupRef = useRef<(code: string) => void>(() => {});

  const [events, setEvents] = useState<EventOption[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckpointOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>(() => localStorage.getItem(LS_EVENT) || "");
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string>(() => localStorage.getItem(LS_CP) || "");
  const [gatePressure, setGatePressure] = useState<{ count: number; cap: number }>({ count: 0, cap: 0 });
  // بوابات المستخدم المعيَّنة من الإدارة — وجودها يقفل الاختيار عليها حصراً
  const [assignedGates, setAssignedGates] = useState<any[]>([]);
  const locked = assignedGates.length > 0;
  // الدعوات الخاصة تُختار من نفس قائمة الفعاليات (بقيمة inv:<id>)
  const [invitations, setInvitations] = useState<EventOption[]>([]);
  const [scanMode, setScanMode] = useState<"entry" | "exit">("entry");
  const isInvMode = selectedEvent.startsWith("inv:");
  // أيام الفعالية (للفعاليات متعددة الأيام) — المسح يُوسم باليوم المختار
  const [eventDays, setEventDays] = useState<{ id: string; day_number: number; day_date: string; title: string | null }[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("");
  // أيام الدعوة الخاصة — نفس الفكرة للمناسبات متعددة الأيام
  const [invDays, setInvDays] = useState<{ id: string; day_number: number; day_date: string; title: string | null }[]>([]);
  const [selectedInvDay, setSelectedInvDay] = useState<string>("");

  // بوابات معيَّنة لهذا المستخدم؟ (التعيين من الإدارة فقط)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("checkpoints")
      .select("id, name_ar, capacity, color, checkpoint_type, event_id, events(title_ar)")
      .eq("assigned_user_id", user.id)
      .eq("is_active", true)
      .then(({ data }) => {
        const list = (data as any) || [];
        setAssignedGates(list);
        if (list.length) {
          // فعاليات البوابات المعيَّنة فقط
          const evts = [...new Map(
            list.map((c: any) => [c.event_id, { id: c.event_id, title_ar: c.events?.title_ar || "فعالية" }])
          ).values()];
          setEvents(evts as any);
          const first = list[0];
          setSelectedEvent(first.event_id);
          setSelectedCheckpoint(first.id);
          localStorage.setItem(LS_EVENT, first.event_id);
          localStorage.setItem(LS_CP, first.id);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // الدعوات الخاصة النشطة للمنظم — تُمسح دعوات ضيوفها من نفس الشاشة
  useEffect(() => {
    if (!organization || locked) return;
    supabase
      .from("private_invitations")
      .select("id, title")
      .eq("organization_id", organization.id)
      .eq("status", "active")
      .then(({ data }) =>
        setInvitations(((data as any) || []).map((i: any) => ({ id: `inv:${i.id}`, title_ar: i.title })))
      );
  }, [organization, locked]);

  // Load events for the organizer
  useEffect(() => {
    if (!organization || locked) return;
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
  }, [organization, locked]);

  // أيام الدعوة الخاصة — تُحمَّل بصمت وتُختار تلقائياً حسب تاريخ اليوم
  useEffect(() => {
    if (!selectedEvent.startsWith("inv:")) { setInvDays([]); setSelectedInvDay(""); return; }
    supabase
      .from("invitation_days" as any)
      .select("id, day_number, day_date, title")
      .eq("invitation_id", selectedEvent.slice(4))
      .order("day_number")
      .then(({ data, error }) => {
        if (error) { setInvDays([]); setSelectedInvDay(""); return; }
        const list = ((data as any) || []) as { id: string; day_number: number; day_date: string; title: string | null }[];
        setInvDays(list);
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        setSelectedInvDay(list.find(d => d.day_date === todayStr)?.id || "");
      });
  }, [selectedEvent]);

  // أيام الفعالية — تُحمَّل بصمت وتُختار تلقائياً حسب تاريخ اليوم
  useEffect(() => {
    if (!selectedEvent || selectedEvent.startsWith("inv:")) { setEventDays([]); setSelectedDay(""); return; }
    supabase
      .from("event_days" as any)
      .select("id, day_number, day_date, title")
      .eq("event_id", selectedEvent)
      .order("day_number")
      .then(({ data, error }) => {
        if (error) { setEventDays([]); setSelectedDay(""); return; }
        const list = ((data as any) || []) as { id: string; day_number: number; day_date: string; title: string | null }[];
        setEventDays(list);
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const match = list.find(d => d.day_date === todayStr);
        setSelectedDay(match?.id || "");
      });
  }, [selectedEvent]);

  // Load checkpoints for selected event
  useEffect(() => {
    if (!selectedEvent || selectedEvent.startsWith("inv:")) { setCheckpoints([]); return; }
    // موظف معيَّن: بواباته المعيَّنة لهذه الفعالية فقط — بلا أي خيارات أخرى
    if (locked) {
      const mine = assignedGates.filter((c: any) => c.event_id === selectedEvent);
      setCheckpoints(mine as any);
      if (mine.length && !mine.find((c: any) => c.id === selectedCheckpoint)) {
        setSelectedCheckpoint(mine[0].id);
        localStorage.setItem(LS_CP, mine[0].id);
      }
      return;
    }
    supabase.from("checkpoints").select("id, name_ar, capacity, color, checkpoint_type").eq("event_id", selectedEvent).eq("is_active", true).order("display_order").then(async (res) => {
      let list = (res.data as any) || [];
      // بوابات اليوم: البوابة المرتبطة بأيام تظهر في أيامها فقط،
      // والبوابة بلا أي ربط عامة تعمل في كل الأيام — ولا تختفي لمجرد استخدامها في يوم آخر
      if (selectedDay && list.length) {
        const linksRes = await supabase
          .from("checkpoint_days" as any)
          .select("checkpoint_id, event_day_id")
          .in("checkpoint_id", list.map((c: any) => c.id));
        if (!linksRes.error) {
          const links = ((linksRes.data as any) || []) as { checkpoint_id: string; event_day_id: string }[];
          const linkedIds = new Set(links.map(l => l.checkpoint_id));
          const todayIds = new Set(links.filter(l => l.event_day_id === selectedDay).map(l => l.checkpoint_id));
          list = list.filter((c: any) => !linkedIds.has(c.id) || todayIds.has(c.id));
        }
      }
      setCheckpoints(list);
      if (selectedCheckpoint && !list.find((c: any) => c.id === selectedCheckpoint)) {
        setSelectedCheckpoint("");
        localStorage.removeItem(LS_CP);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent, locked, assignedGates, selectedDay]);

  // Load stats + gate pressure
  const refreshStats = useCallback(async () => {
    if (!selectedEvent) return;
    if (selectedEvent.startsWith("inv:")) {
      const invId = selectedEvent.slice(4);
      const { count: total } = await supabase.from("private_invitation_guests").select("*", { count: "exact", head: true }).eq("invitation_id", invId);
      const { count: checked } = await supabase.from("private_invitation_guests").select("*", { count: "exact", head: true }).eq("invitation_id", invId).not("checked_in_at", "is", null);
      setStats({ total: total || 0, checkedIn: checked || 0 });
      setGatePressure({ count: 0, cap: 0 });
      return;
    }
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

    // وضع الدعوات الخاصة: مسح دعوات الضيوف — دخول أو خروج حسب وضع المسح
    if (selectedEvent.startsWith("inv:")) {
      const invId = selectedEvent.slice(4);
      const m = trimmed.match(/\/invite\/([0-9a-fA-F-]{36})/) ||
        (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(trimmed) ? [null, trimmed] : null);
      const token = m?.[1];
      if (!token) {
        setResult({ status: "error", message: "امسح رابط أو رمز دعوة صالحاً" });
        return;
      }
      const { data: guest } = await supabase
        .from("private_invitation_guests")
        .select("id, guest_name, checked_in_at, invitation_id")
        .eq("token", token)
        .maybeSingle();
      if (!guest) {
        setResult({ status: "error", message: "لم يتم العثور على هذه الدعوة" });
        return;
      }
      if ((guest as any).invitation_id !== invId) {
        setResult({ status: "error", message: "هذه الدعوة تخص مناسبة أخرى — بدّل المناسبة أعلاه" });
        return;
      }
      const nowIso = new Date().toISOString();
      // سجل المسح اليومي للضيف (يتجاهل الخطأ إن لم يُنفذ ملف SQL بعد)
      const logGuestScan = (type: "entry" | "exit") =>
        supabase.from("invitation_guest_scans" as any).insert({
          invitation_id: invId,
          guest_id: (guest as any).id,
          day_id: selectedInvDay || null,
          scan_type: type,
          scanned_by: user?.id || null,
        } as any).then(() => {});
      if (scanMode === "exit") {
        const { error: outErr } = await supabase
          .from("private_invitation_guests")
          .update({ checked_out_at: nowIso, checked_in_at: (guest as any).checked_in_at || nowIso } as any)
          .eq("id", (guest as any).id);
        if (outErr?.message?.includes("checked_out_at")) {
          setResult({ status: "error", message: "نفّذ ملف SQL الخاص بتتبع الحضور لتفعيل تسجيل الخروج" });
          return;
        }
        await logGuestScan("exit");
        setResult({ status: "success", message: `${(guest as any).guest_name} — تم تسجيل الخروج` });
      } else if ((guest as any).checked_in_at && !selectedInvDay) {
        setResult({ status: "already", message: `${(guest as any).guest_name} مسجَّل دخوله مسبقاً` });
      } else {
        await supabase
          .from("private_invitation_guests")
          .update({ checked_in_at: (guest as any).checked_in_at || nowIso, rsvp_status: "confirmed" } as any)
          .eq("id", (guest as any).id);
        await logGuestScan("entry");
        setResult({ status: "success", message: `${(guest as any).guest_name} — تم تسجيل الدخول` });
      }
      refreshStats();
      return;
    }

    // 1) Try direct QR lookup
    let { data: reg } = await supabase
      .from("registrations")
      .select("id, qr_code, status, checked_in_at, attendee_id, event_id, ticket_id")
      .eq("qr_code", trimmed)
      .maybeSingle();

    // 1.5) البطاقة الموحدة: QR ثابت للمستخدم (رابط /connect/<code>) —
    // نتعرف على صاحبها ثم نجلب تسجيله في الفعالية المختارة تحديداً
    if (!reg) {
      const connectMatch = trimmed.match(/\/connect\/([A-Za-z0-9_-]+)/) ||
        (/^[A-Za-z0-9_-]{6,24}$/.test(trimmed) && !trimmed.includes("-") ? [null, trimmed] : null);
      const connectCode = connectMatch?.[1];
      if (connectCode) {
        const { data: card } = await supabase.rpc("get_connect_card", { _code: connectCode });
        const holder = Array.isArray(card) ? card[0] : card;
        if (holder?.user_id) {
          const { data: regByCard } = await supabase
            .from("registrations")
            .select("id, qr_code, status, checked_in_at, attendee_id, event_id, ticket_id")
            .eq("event_id", selectedEvent)
            .eq("attendee_id", holder.user_id)
            .maybeSingle();
          if (regByCard) reg = regByCard;
          else {
            setResult({ status: "error", message: "صاحب هذه البطاقة غير مسجل في هذه الفعالية" });
            return;
          }
        }
      }
    }

    // 1.7) دعوة خاصة: مسح رابط/رمز دعوة ضيف — دخول أو خروج حسب نوع البوابة
    if (!reg) {
      const invMatch = trimmed.match(/\/invite\/([0-9a-fA-F-]{36})/) ||
        (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(trimmed) ? [null, trimmed] : null);
      const invToken = invMatch?.[1];
      if (invToken) {
        const { data: guest } = await supabase
          .from("private_invitation_guests")
          .select("id, guest_name, checked_in_at, invitation_id, private_invitations(title, organization_id)")
          .eq("token", invToken)
          .maybeSingle();
        if (guest) {
          const inv: any = Array.isArray((guest as any).private_invitations)
            ? (guest as any).private_invitations[0]
            : (guest as any).private_invitations;
          if (organization && inv?.organization_id !== organization.id) {
            setResult({ status: "error", message: "هذه الدعوة لا تنتمي لمؤسستك" });
            return;
          }
          const isExitGate = checkpoints.find(c => c.id === selectedCheckpoint)?.checkpoint_type === "exit";
          const nowIso = new Date().toISOString();
          if (isExitGate) {
            let { error: outErr } = await supabase
              .from("private_invitation_guests")
              .update({ checked_out_at: nowIso, checked_in_at: (guest as any).checked_in_at || nowIso } as any)
              .eq("id", (guest as any).id);
            if (outErr?.message?.includes("checked_out_at")) {
              toast.info("نفّذ ملف SQL الخاص بتتبع الحضور لتسجيل الخروج");
              outErr = null as any;
            }
            setResult({ status: "success", message: `ضيف «${inv?.title || "دعوة خاصة"}»: ${(guest as any).guest_name} — تم تسجيل الخروج` });
          } else if ((guest as any).checked_in_at) {
            setResult({ status: "already", message: `${(guest as any).guest_name} مسجَّل دخوله مسبقاً — ${inv?.title || "دعوة خاصة"}` });
          } else {
            await supabase
              .from("private_invitation_guests")
              .update({ checked_in_at: nowIso, rsvp_status: "confirmed" } as any)
              .eq("id", (guest as any).id);
            setResult({ status: "success", message: `ضيف «${inv?.title || "دعوة خاصة"}»: ${(guest as any).guest_name} — تم تسجيل الدخول` });
          }
          return;
        }
      }
    }

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
      reg.ticket_id ? supabase.from("tickets").select("name_ar, name_en, type").eq("id", reg.ticket_id).maybeSingle() : Promise.resolve({ data: null }),
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
    const scanRow: any = {
      event_id: reg.event_id,
      registration_id: reg.id,
      attendee_id: reg.attendee_id,
      checkpoint_id: selectedCheckpoint || null,
      scanned_by: user?.id || null,
      // بوابة من نوع "خروج" تسجل مسحة خروج — وغيرها دخول
      scan_type: checkpoints.find(c => c.id === selectedCheckpoint)?.checkpoint_type === "exit" ? "exit" : "entry",
      event_day_id: selectedDay || null,
    };
    let { error: scanErr } = await supabase.from("scan_events").insert(scanRow);
    if (scanErr?.message?.includes("event_day_id")) {
      const { event_day_id: _omit, ...rest } = scanRow;
      await supabase.from("scan_events").insert(rest);
    }

    if (!isAlready) {
      setStats(s => ({ ...s, checkedIn: s.checkedIn + 1 }));
      setGatePressure(p => ({ ...p, count: p.count + 1 }));
    }

    setResult({
      status: isAlready ? "already" : "success",
      data: regData as any,
      message: isAlready ? "تم تسجيل حضور هذا الشخص مسبقاً" : "تم تسجيل الحضور بنجاح!",
    });
  }, [selectedEvent, selectedCheckpoint, organization, user, checkpoints, scanMode, refreshStats, selectedDay, selectedInvDay]);

  const handleManualSubmit = (e: React.FormEvent) => { e.preventDefault(); lookupCode(manualCode); };

  useEffect(() => { lookupRef.current = lookupCode; }, [lookupCode]);

  // حلقة المسح الفعلية: قراءة إطارات الكاميرا وفك رمز QR (تعمل على iOS Safari)
  useEffect(() => {
    if (!cameraActive) return;
    if (!scanCanvasRef.current) scanCanvasRef.current = document.createElement("canvas");
    const canvas = scanCanvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || !ctx || video.readyState < 2 || !video.videoWidth) return;
      // تصغير الإطار لأداء أفضل مع دقة كافية للفك
      const scale = Math.min(1, 640 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qr = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
      if (qr?.data) {
        const now = Date.now();
        // تجاهل تكرار نفس الرمز خلال 4 ثوانٍ
        if (qr.data === lastScanRef.current.code && now - lastScanRef.current.at < 4000) return;
        lastScanRef.current = { code: qr.data, at: now };
        if (navigator.vibrate) navigator.vibrate(120);
        lookupRef.current(qr.data);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [cameraActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraActive(true);
    } catch { toast.error("لا يمكن الوصول إلى الكاميرا"); }
  };

  // ربط البث بعنصر الفيديو بعد ظهوره في الصفحة (وإلا يبقى أبيض على iOS)
  useEffect(() => {
    if (!cameraActive || !streamRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});
  }, [cameraActive]);
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
          {locked && (
            <div className="rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-semibold p-3">
              🔒 أنت معيَّن على بوابة محددة من الإدارة — جميع عمليات مسحك تُسجَّل عليها ولا يمكنك الوصول لأي بوابة أخرى.
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> الفعالية</label>
              <select value={selectedEvent} onChange={e => onChangeEvent(e.target.value)} disabled={locked && events.length <= 1}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60">
                <option value="">— اختر —</option>
                <optgroup label="الفعاليات">
                  {events.map(e => <option key={e.id} value={e.id}>{e.title_ar}</option>)}
                </optgroup>
                {invitations.length > 0 && (
                  <optgroup label="الدعوات الخاصة">
                    {invitations.map(i => <option key={i.id} value={i.id}>{i.title_ar}</option>)}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              {isInvMode ? (
                <>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><DoorOpen className="w-3 h-3" /> وضع المسح</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setScanMode("entry")}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-bold transition ${scanMode === "entry" ? "border-brand-teal bg-brand-teal/10 text-brand-teal" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      تسجيل دخول
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanMode("exit")}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-bold transition ${scanMode === "exit" ? "border-amber-500 bg-amber-500/10 text-amber-600" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      تسجيل خروج
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><DoorOpen className="w-3 h-3" /> البوابة الحالية</label>
                  <select value={selectedCheckpoint} onChange={e => onChangeCheckpoint(e.target.value)} disabled={locked || !selectedEvent || checkpoints.length === 0}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60">
                    {!locked && <option value="">— بدون بوابة —</option>}
                    {checkpoints.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                  </select>
                </>
              )}
            </div>
          </div>

          {isInvMode && invDays.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> يوم المناسبة</label>
              <div className="flex gap-1.5 flex-wrap">
                {invDays.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => { setSelectedInvDay(d.id); setResult(null); }}
                    className={`text-[11px] font-bold rounded-full px-3 py-1.5 border transition ${
                      selectedInvDay === d.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {d.title || `اليوم ${d.day_number}`} · {new Date(d.day_date).toLocaleDateString("ar-SA", { day: "numeric", month: "short" })}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isInvMode && eventDays.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> يوم الفعالية</label>
              <div className="flex gap-1.5 flex-wrap">
                {eventDays.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => { setSelectedDay(d.id); setResult(null); }}
                    className={`text-[11px] font-bold rounded-full px-3 py-1.5 border transition ${
                      selectedDay === d.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {d.title || `اليوم ${d.day_number}`} · {new Date(d.day_date).toLocaleDateString("ar-SA", { day: "numeric", month: "short" })}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedEvent && !isInvMode && checkpoints.length === 0 && (
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
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Ticket className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">التذكرة:</span>
                    <span className="font-semibold text-foreground">{result.data.ticket?.name_ar || "—"}</span>
                    {(() => {
                      const tier = classifyAttendee(result.data.ticket?.name_ar, result.data.ticket?.name_en, result.data.ticket?.type);
                      const meta = ATTENDEE_CLASS_META[tier];
                      return (
                        <span className={`text-[10px] font-extrabold rounded-full px-2.5 py-0.5 border ${meta.cls}`}>
                          {meta.label}
                        </span>
                      );
                    })()}
                  </div>
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
