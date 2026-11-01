import { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatCard from "@/components/app/StatCard";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { classifyAttendee, ATTENDEE_CLASS_META, type AttendeeClass } from "@/lib/attendeeClass";
import { formatDateShort, formatNumber, formatPercent, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import jsQR from "jsqr";
import {
  Activity, AlertTriangle, Calendar, Camera, Check, Clock3, DoorOpen, Keyboard, Lock, Mail, RotateCcw, ScanLine, Search, Ticket, TrendingUp, UserCheck, Users, X,
  type LucideIcon,
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

// قيمة بديلة لخيار "بدون اختيار": قائمة Select لا تقبل قيمة فارغة
const NONE = "__none__";

const selectTriggerClass = "h-10 min-w-0 gap-2 text-[13px] font-medium sm:w-64 sm:text-sm [&>span]:flex-1 [&>span]:text-start";
const selectIconClass = "hidden h-4 w-4 flex-none text-muted-foreground sm:block";

// نتيجة المسح تُقرأ من بعيد عند الباب: لون وشكل مختلفان لكل حالة
const RESULT_META: Record<ScanResult["status"], { icon: LucideIcon; band: string; disc: string; text: string }> = {
  success: { icon: Check, band: "bg-[#E8F5EE]", disc: "bg-[#0E7A4F]", text: "text-[#0E7A4F]" },
  already: { icon: AlertTriangle, band: "bg-[#FDF3E3]", disc: "bg-[#9A5F12]", text: "text-[#9A5F12]" },
  error: { icon: X, band: "bg-[#FBECEA]", disc: "bg-[#B42F24]", text: "text-[#B42F24]" },
};

const CLASS_TONES: Record<AttendeeClass, StatusTone> = {
  vvip: "warning", vip: "primary", speaker: "success", organizer: "neutral", regular: "neutral",
};

const ResultRow = ({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-2.5 py-2.5">
    <Icon className="h-4 w-4 flex-none text-muted-foreground" />
    <dt className="flex-none text-muted-foreground">{label}</dt>
    <dd className="ms-auto flex min-w-0 items-center gap-2 font-semibold"><span className="truncate">{children}</span></dd>
  </div>
);

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
  // بوابات الدعوة (اختيارية للمناسبات الكبيرة) — وجودها يستبدل أزرار دخول/خروج
  const [invGates, setInvGates] = useState<{ id: string; name_ar: string; gate_type: string }[]>([]);
  const [invGateLinks, setInvGateLinks] = useState<{ gate_id: string; day_id: string }[]>([]);
  const [selectedInvGate, setSelectedInvGate] = useState<string>("");

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
    // بوابات الدعوة وروابطها بالأيام (تُتجاهل الأخطاء قبل تنفيذ SQL)
    supabase
      .from("invitation_gates" as any)
      .select("id, name_ar, gate_type")
      .eq("invitation_id", selectedEvent.slice(4))
      .eq("is_active", true)
      .order("display_order")
      .then(async ({ data, error }) => {
        if (error) { setInvGates([]); setInvGateLinks([]); return; }
        const gates = ((data as any) || []) as { id: string; name_ar: string; gate_type: string }[];
        setInvGates(gates);
        if (gates.length) {
          const linksRes = await supabase
            .from("invitation_gate_days" as any)
            .select("gate_id, day_id")
            .in("gate_id", gates.map(g => g.id));
          setInvGateLinks(linksRes.error ? [] : (((linksRes.data as any) || []) as any));
        } else {
          setInvGateLinks([]);
        }
      });
  }, [selectedEvent]);

  // بوابات الدعوة الظاهرة لليوم المختار: المرتبطة به + غير المرتبطة بأي يوم
  const visibleInvGates = invGates.filter(g => {
    if (!selectedInvDay) return true;
    const links = invGateLinks.filter(l => l.gate_id === g.id);
    return links.length === 0 || links.some(l => l.day_id === selectedInvDay);
  });

  // اختيار أول بوابة ظاهرة تلقائياً عند تغير القائمة
  useEffect(() => {
    if (!isInvMode || invGates.length === 0) { setSelectedInvGate(""); return; }
    if (!visibleInvGates.find(g => g.id === selectedInvGate)) {
      setSelectedInvGate(visibleInvGates[0]?.id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInvMode, invGates, invGateLinks, selectedInvDay]);

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
      // بوابة مختارة تحدد نوع المسحة — وإلا أزرار دخول/خروج
      const activeGate = invGates.find(g => g.id === selectedInvGate);
      const isExitScan = activeGate ? activeGate.gate_type === "exit" : scanMode === "exit";
      // سجل المسح اليومي للضيف (يتجاهل الخطأ إن لم يُنفذ ملف SQL بعد)
      const logGuestScan = (type: "entry" | "exit") =>
        supabase.from("invitation_guest_scans" as any).insert({
          invitation_id: invId,
          guest_id: (guest as any).id,
          day_id: selectedInvDay || null,
          gate_id: activeGate?.id || null,
          scan_type: type,
          scanned_by: user?.id || null,
        } as any).then(() => {});
      if (isExitScan) {
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
      } else if ((guest as any).checked_in_at && !selectedInvDay && !activeGate) {
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
  }, [selectedEvent, selectedCheckpoint, organization, user, checkpoints, scanMode, refreshStats, selectedDay, selectedInvDay, invGates, selectedInvGate]);

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

  // على الهاتف تبقى لوحة المفاتيح مفتوحة بعد الإدخال اليدوي وتغطي نتيجة المسح أسفل الشاشة،
  // فنخفيها مع ظهور النتيجة ونعيد التركيز إلى الحقل بعد إغلاقها ليتابع موظف البوابة الكتابة مباشرة
  useEffect(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    if (result) (document.activeElement as HTMLElement | null)?.blur();
    else document.getElementById("checkin-code")?.focus();
  }, [result]);

  const switchMode = (next: "manual" | "camera") => {
    setMode(next);
    if (next === "manual") stopCamera();
    resetResult();
  };

  // Pressure visuals
  const pct = gatePressure.cap > 0 ? Math.min(100, Math.round((gatePressure.count / gatePressure.cap) * 100)) : 0;
  const pressureLabel: { l: string; tone: StatusTone; bar: string } = pct >= 90 ? { l: "ممتلئ", tone: "danger", bar: "bg-[#C0392B]" }
    : pct >= 75 ? { l: "ضغط عالٍ", tone: "warning", bar: "bg-[#CC8E3D]" }
    : pct >= 50 ? { l: "متوسط", tone: "warning", bar: "bg-[#CC8E3D]" }
    : { l: "هادئ", tone: "success", bar: "bg-primary" };
  const currentCp = checkpoints.find(c => c.id === selectedCheckpoint);

  // القيمة المحفوظة قد لا تطابق القائمة بعد، وعندها يظهر النص البديل لا حقل فارغ
  const eventValue = [...events, ...invitations].some(e => e.id === selectedEvent) ? selectedEvent : "";
  const checkpointValue = currentCp ? selectedCheckpoint : locked ? "" : NONE;

  const days = isInvMode ? invDays : eventDays;
  const dayValue = isInvMode ? selectedInvDay : selectedDay;
  const pickDay = (id: string) => { (isInvMode ? setSelectedInvDay : setSelectedDay)(id); setResult(null); };

  const remaining = Math.max(0, stats.total - stats.checkedIn);
  const attendanceRate = percent(stats.checkedIn, stats.total);
  const resultMeta = result ? RESULT_META[result.status] : null;
  const resultClass = result?.data ? classifyAttendee(result.data.ticket?.name_ar, result.data.ticket?.name_en, result.data.ticket?.type) : null;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="تسجيل الحضور"
          description={<span className="hidden sm:inline">امسح رمز <bdi dir="ltr">QR</bdi> أو أدخل الرمز / رقم الجوال يدوياً</span>}
          actions={selectedEvent ? (
            <Button variant="outline" asChild className="w-10 px-0 sm:w-auto sm:px-4">
              <a href={`/dashboard/events/${selectedEvent}/heatmap`} aria-label="الخارطة الحرارية">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">الخارطة الحرارية</span>
              </a>
            </Button>
          ) : undefined}
        />

        {locked && (
          <div className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-soft">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary"><Lock className="h-[17px] w-[17px]" /></span>
            <p className="min-w-0 text-[13px] leading-5 text-muted-foreground">أنت معيَّن على بوابة محددة من الإدارة — جميع عمليات مسحك تُسجَّل عليها ولا يمكنك الوصول لأي بوابة أخرى.</p>
          </div>
        )}

        {/* Event + Checkpoint selectors */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
            <Select value={eventValue} onValueChange={v => onChangeEvent(v === NONE ? "" : v)} disabled={locked && events.length <= 1}>
              <SelectTrigger aria-label="الفعالية" className={selectTriggerClass}>
                <Calendar className={selectIconClass} />
                <SelectValue placeholder="اختر الفعالية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— اختر —</SelectItem>
                <SelectGroup>
                  <SelectLabel>الفعاليات</SelectLabel>
                  {events.map(e => <SelectItem key={e.id} value={e.id}>{e.title_ar}</SelectItem>)}
                </SelectGroup>
                {invitations.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>الدعوات الخاصة</SelectLabel>
                    {invitations.map(i => <SelectItem key={i.id} value={i.id}>{i.title_ar}</SelectItem>)}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>

            {isInvMode && invGates.length > 0 ? (
              <Select value={selectedInvGate} onValueChange={v => { setSelectedInvGate(v); setResult(null); }}>
                <SelectTrigger aria-label="البوابة الحالية" className={selectTriggerClass}>
                  <DoorOpen className={selectIconClass} />
                  <SelectValue placeholder="البوابة الحالية" />
                </SelectTrigger>
                <SelectContent>
                  {visibleInvGates.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name_ar} ({g.gate_type === "exit" ? "خروج" : "دخول"})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : isInvMode ? (
              <Tabs value={scanMode} onValueChange={v => setScanMode(v as "entry" | "exit")}>
                <TabsList aria-label="وضع المسح" className="h-10 w-full sm:w-auto">
                  <TabsTrigger value="entry" className="flex-1 px-1.5 text-[13px] sm:px-4 sm:text-sm">تسجيل دخول</TabsTrigger>
                  <TabsTrigger value="exit" className="flex-1 px-1.5 text-[13px] sm:px-4 sm:text-sm">تسجيل خروج</TabsTrigger>
                </TabsList>
              </Tabs>
            ) : (
              <Select value={checkpointValue} onValueChange={v => onChangeCheckpoint(v === NONE ? "" : v)} disabled={locked || !selectedEvent || checkpoints.length === 0}>
                <SelectTrigger aria-label="البوابة الحالية" className={selectTriggerClass}>
                  <DoorOpen className={selectIconClass} />
                  <SelectValue placeholder="البوابة الحالية" />
                </SelectTrigger>
                <SelectContent>
                  {!locked && <SelectItem value={NONE}>— بدون بوابة —</SelectItem>}
                  {checkpoints.map(c => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {days.length > 0 && (
              <div className="col-span-2 min-w-0 sm:contents">
                <Select value={days.some(d => d.id === dayValue) ? dayValue : ""} onValueChange={pickDay}>
                  <SelectTrigger aria-label={isInvMode ? "يوم المناسبة" : "يوم الفعالية"} className={selectTriggerClass}>
                    <Calendar className={selectIconClass} />
                    <SelectValue placeholder={isInvMode ? "يوم المناسبة" : "يوم الفعالية"} />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.title || `اليوم ${d.day_number}`} · {formatDateShort(d.day_date)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {selectedEvent && !isInvMode && checkpoints.length === 0 && (
            <p className="text-xs leading-[18px] text-muted-foreground">
              لم يتم إعداد بوابات لهذه الفعالية. <a href={`/dashboard/events/${selectedEvent}/checkpoints`} className="font-semibold text-primary">إعداد البوابات</a>
            </p>
          )}
        </div>

        {/* Stats: سطر واحد على الجوال حتى تبقى منطقة المسح في أول الشاشة */}
        <div className="rounded-2xl bg-card px-4 py-3 shadow-soft xl:hidden">
          <div className="flex items-baseline justify-between gap-3 text-xs leading-[18px] text-muted-foreground">
            <span>حضروا <b className="text-lg font-bold leading-6 text-foreground">{formatNumber(stats.checkedIn)}</b> من {formatNumber(stats.total)}، {formatPercent(attendanceRate)}</span>
            <span>لم يحضروا بعد <b className="text-sm font-bold text-foreground">{formatNumber(remaining)}</b></span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EFEDF2]">
            <div className="h-full rounded-full bg-primary" style={{ width: `${attendanceRate}%` }} />
          </div>
        </div>
        <div className="hidden gap-6 xl:grid xl:grid-cols-4">
          <StatCard label="إجمالي المسجلين" value={formatNumber(stats.total)} icon={Users} />
          <StatCard label="حضروا" value={formatNumber(stats.checkedIn)} icon={UserCheck} />
          <StatCard label="لم يحضروا بعد" value={formatNumber(remaining)} icon={Clock3} />
          <StatCard label="نسبة الحضور" value={`${attendanceRate}%`} icon={TrendingUp} />
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Panel className="self-start" bodyClassName="space-y-4 p-4 sm:p-6">
            <Tabs value={mode} onValueChange={v => switchMode(v as "manual" | "camera")}>
              <TabsList className="w-full">
                <TabsTrigger value="manual" className="flex-1 gap-2"><Keyboard className="h-4 w-4" /> إدخال يدوي</TabsTrigger>
                <TabsTrigger value="camera" className="flex-1 gap-2"><Camera className="h-4 w-4" /> ماسح الكاميرا</TabsTrigger>
              </TabsList>
            </Tabs>

            {mode === "manual" ? (
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="checkin-code">رمز <bdi dir="ltr">QR</bdi> أو رقم الجوال</Label>
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="checkin-code" placeholder="مثال: 0501234567" className="h-12 px-10 text-center lg:h-10" dir="ltr" value={manualCode} onChange={(e) => setManualCode(e.target.value)} autoFocus />
                  </div>
                </div>
                <Button type="submit" className="h-12 w-full lg:h-10" disabled={!selectedEvent}>
                  <Search className="h-4 w-4" /> بحث وتسجيل حضور
                </Button>
              </form>
            ) : !cameraActive ? (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-xl bg-muted/50 lg:aspect-video">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary"><Camera className="h-6 w-6" /></span>
                <Button onClick={startCamera} disabled={!selectedEvent}><Camera className="h-4 w-4" /> تشغيل الكاميرا</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-foreground/5 lg:aspect-video">
                  <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="aspect-square h-2/3 rounded-2xl border-2 border-white/90" />
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={stopCamera}>إيقاف الكاميرا</Button>
              </div>
            )}

            {currentCp && (
              <div className="rounded-xl bg-muted/50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-[13px] leading-5">
                    <i className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: `#${currentCp.color}` }} />
                    <span className="truncate font-semibold">{currentCp.name_ar}</span>
                  </span>
                  <span className="flex flex-none items-center gap-2 text-xs leading-[18px] text-muted-foreground">
                    <span>{formatNumber(gatePressure.count)} من {gatePressure.cap ? formatNumber(gatePressure.cap) : "∞"}{gatePressure.cap > 0 && `، ${formatPercent(pct)}`}</span>
                    <StatusBadge tone={pressureLabel.tone}>{pressureLabel.l}</StatusBadge>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#EFEDF2]">
                  <div className={cn("h-full rounded-full transition-all", pressureLabel.bar)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
          </Panel>

          <div className="min-w-0">
            {result && resultMeta ? (
              <>
                {/* على الجوال والأجهزة اللوحية: طبقة ثابتة فوق الصفحة تظهر دون أي تمرير، أياً كان موضع المستخدم */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-[65] bg-foreground/40 lg:hidden"
                  aria-hidden
                  onClick={() => setResult(null)}
                />
                <motion.div
                  role="status"
                  aria-live="assertive"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[calc(100dvh-1rem)] max-w-lg flex-col overflow-y-auto rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] shadow-soft lg:static lg:z-auto lg:mx-0 lg:max-h-none lg:max-w-none lg:rounded-2xl lg:pb-0"
                >
                  <div className={cn("flex-none px-5 py-6 text-center", resultMeta.band)}>
                    <span className={cn("mx-auto grid h-20 w-20 place-items-center rounded-full text-white", resultMeta.disc)}>
                      <resultMeta.icon className="h-11 w-11" strokeWidth={2.75} />
                    </span>
                    <h2 className={cn("mt-3 text-2xl font-bold leading-8", resultMeta.text)}>{result.message}</h2>
                  </div>

                  {result.data && (
                    <div className="flex-none px-5 pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-xl font-bold leading-7">{result.data.attendee?.full_name || "—"}</p>
                        {resultClass && <StatusBadge tone={CLASS_TONES[resultClass]}><bdi>{ATTENDEE_CLASS_META[resultClass].label}</bdi></StatusBadge>}
                      </div>
                      <dl className="mt-1.5 divide-y divide-border text-sm">
                        <ResultRow icon={Mail} label="البريد">{result.data.attendee?.email ? <bdi dir="ltr">{result.data.attendee.email}</bdi> : "—"}</ResultRow>
                        <ResultRow icon={Ticket} label="التذكرة">{result.data.ticket?.name_ar || "—"}</ResultRow>
                        <ResultRow icon={Calendar} label="الفعالية">{result.data.event?.title_ar || "—"}</ResultRow>
                        {currentCp && (
                          <ResultRow icon={DoorOpen} label="البوابة">{currentCp.name_ar}، {formatPercent(pct)}، {pressureLabel.l}</ResultRow>
                        )}
                      </dl>
                    </div>
                  )}

                  <div className="flex-none p-5">
                    <Button variant="outline" className="h-12 w-full lg:h-10" onClick={resetResult}>
                      <RotateCcw className="h-4 w-4" /> مسح تذكرة أخرى
                    </Button>
                  </div>
                </motion.div>
              </>
            ) : (
              <div className="hidden h-full items-center justify-center rounded-2xl bg-card shadow-soft lg:flex">
                <EmptyState icon={ScanLine} title="جاهز للمسح" description="ستظهر نتيجة كل عملية مسح هنا" />
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CheckIn;
