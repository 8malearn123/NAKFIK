import { Fragment, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import RsvpBar from "@/components/app/RsvpBar";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { guestsObject, daysLeftLabel, formatDate, formatDateShort, formatNumber, formatTime, formatWeekday } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InvitationScheduleDialog from "@/components/dashboard/InvitationScheduleDialog";
import ReminderSettings from "@/components/dashboard/ReminderSettings";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  Mail, Plus, Pencil, Trash2, Users, ExternalLink, Copy, QrCode, Palette,
  Calendar, MapPin, Shirt, Phone, Gift, Send, CheckCircle2, X,
  Heart, Flower2, GraduationCap, Cake, Landmark, Mic2, Scissors, Crown, Briefcase, Sparkles,
  Upload, Image as ImageIcon, Loader2, Database, Bell, ClipboardList, CalendarDays, Save, DoorOpen,
  ArrowRight, BarChart3, ChevronDown, MoreHorizontal, ScanLine, UserPlus,
  type LucideIcon,
} from "lucide-react";
import DesignStudio from "@/components/design/DesignStudio";
import { EXTRA_KEYS } from "@/components/design/templates";
import { computeStay, formatDuration } from "@/lib/attendance";
import CustomTemplateDesigner, { DEFAULT_OVERLAY, type NameOverlay } from "@/components/design/CustomTemplateDesigner";

interface Inv {
  id: string;
  organization_id: string;
  title: string;
  host_name: string | null;
  event_date: string;
  venue_name: string | null;
  venue_address: string | null;
  venue_map_url: string | null;
  dress_code: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  gift_notes: string | null;
  gift_iban: string | null;
  gift_bank_name: string | null;
  gift_account_holder: string | null;
  allow_companions: boolean;
  max_companions: number;
  scope: string;
  max_attendees: number | null;
  theme_color: string;
  accent_color: string;
  font_family: string;
  cover_image_url: string | null;
  background_image_url: string | null;
  custom_message: string | null;
  status: string;
  category: string;
  formality: string;
  layout_style: string;
  ornament_style: string;
  body_font: string;
  text_color: string;
  template_key: string | null;
  custom_template_url: string | null;
  use_custom_template: boolean;
  name_overlay: NameOverlay;
  design_extras?: Record<string, unknown> | null;
  // مرفقات الدعوة + خيارات الهدايا وطرق الدفع + تذكير المستفيد قبل الموعد
  attachments?: { name: string; url: string; size?: number }[] | null;
  gift_options?: { types?: string[]; payment_methods?: string[] } | null;
  reminder_hours_before?: number | null;
}

interface Guest {
  id: string;
  invitation_id: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  token: string;
  rsvp_status: string;
  companions_count: number;
  confirmed_at: string | null;
  checked_in_at: string | null;
  checked_out_at?: string | null;
  guest_tier?: string | null;
}

// تصنيفات المدعوين — يحددها المنظم فقط ولا يراها أو يغيرها المدعو
const GUEST_TIERS: Record<string, { label: string }> = {
  vvip:    { label: "VVIP" },
  vip:     { label: "VIP" },
  regular: { label: "عادي" },
};
const TIER_KEYS = ["vvip", "vip", "regular"] as const;

// Presets — تطبق ستايل و رسالة افتراضية حسب نوع المناسبة
// لون غلاف البطاقة حسب نوع المناسبة: [الخلفية، الأيقونة]
const COVER_TONES: Record<string, [string, string]> = {
  wedding: ["#F4E9F0", "#7A3B5D"], engagement: ["#F0ECF5", "#5B3A70"], graduation: ["#FBF0E0", "#8F5A14"],
  birthday: ["#FBECEA", "#A03C4A"], forum: ["#E9EEF6", "#34527E"], conference: ["#E9EEF6", "#34527E"],
  opening: ["#FBECEA", "#A03C4A"], vip: ["#FBF0E0", "#8F5A14"], corporate: ["#E6F1F0", "#0B6159"], other: ["#F0ECF5", "#5B3A70"],
};

interface InvStats { total: number; confirmed: number; declined: number; sent: number }
type InvView = "all" | "upcoming" | "draft" | "ended";

const isEnded = (inv: { event_date: string; status: string }) => inv.status === "cancelled" || new Date(inv.event_date).getTime() < Date.now();

const invStatus = (inv: { event_date: string; status: string }, s: InvStats): { label: string; tone: StatusTone } => {
  if (inv.status === "cancelled") return { label: "ملغاة", tone: "danger" };
  if (isEnded(inv)) return { label: "منتهية", tone: "neutral" };
  if (inv.status === "draft") return { label: "مسودة", tone: "neutral" };
  if (s.total > 0 && s.sent === 0) return { label: "لم تُرسل", tone: "primary" };
  if (new Date(inv.event_date).getTime() - Date.now() < 7 * 86400000) return { label: "قريبة", tone: "warning" };
  return { label: "نشطة", tone: "success" };
};

const CATEGORY_PRESETS: Record<string, {
  label: string; Icon: LucideIcon; formality: "personal" | "formal" | "business";
  theme: string; accent: string; font: string; message: string; dress?: string;
}> = {
  wedding:     { label: "حفل زفاف", Icon: Heart, formality: "personal", theme: "#7B2C50", accent: "#D4A574", font: "Amiri", message: "بكل الفرح والسرور نتشرف بدعوتكم لحضور حفل زفافنا، وحضوركم تاج فرحتنا.", dress: "رسمي" },
  engagement:  { label: "ملكة / خطوبة", Icon: Flower2, formality: "personal", theme: "#9B5C8F", accent: "#E8C5D0", font: "Amiri", message: "نشارككم فرحتنا بمناسبة عقد قراننا، يسعدنا حضوركم.", dress: "رسمي" },
  graduation:  { label: "حفل تخرج", Icon: GraduationCap, formality: "personal", theme: "#1E3A5F", accent: "#C9A84C", font: "Cairo", message: "بعد رحلة من الجد والاجتهاد، يسرنا دعوتكم لمشاركتنا فرحة التخرج." },
  birthday:    { label: "عيد ميلاد", Icon: Cake, formality: "personal", theme: "#E94560", accent: "#FFD93D", font: "Tajawal", message: "دعوة مميزة لمشاركتنا الاحتفال بعيد ميلاد خاص." },
  forum:       { label: "ملتقى رسمي", Icon: Landmark, formality: "formal", theme: "#0F1B3D", accent: "#C9A84C", font: "Cairo", message: "تتشرف الجهة المنظمة بدعوة سعادتكم لحضور الملتقى الرسمي." },
  conference:  { label: "مؤتمر", Icon: Mic2, formality: "formal", theme: "#064E3B", accent: "#C9A84C", font: "Cairo", message: "يسرنا دعوتكم للمشاركة في فعاليات المؤتمر." },
  opening:     { label: "افتتاح", Icon: Scissors, formality: "business", theme: "#A03C4A", accent: "#CC8E3D", font: "Cairo", message: "يسعدنا دعوتكم لحضور حفل الافتتاح الرسمي.", dress: "كاجوال أنيق" },
  vip:         { label: "دعوة VIP", Icon: Crown, formality: "business", theme: "#0D0D0D", accent: "#C9A84C", font: "Cairo", message: "دعوة خاصة لشخصكم الكريم لحضور اللقاء الحصري." },
  corporate:   { label: "فعالية شركات", Icon: Briefcase, formality: "business", theme: "#1E40AF", accent: "#94A3B8", font: "Cairo", message: "تتشرف الشركة بدعوتكم لحضور الفعالية." },
  other:       { label: "أخرى", Icon: Sparkles, formality: "personal", theme: "#492C5A", accent: "#CC8E3D", font: "Cairo", message: "" },
};

const emptyForm: Partial<Inv> = {
  title: "", host_name: "", event_date: "", venue_name: "", venue_address: "", venue_map_url: "",
  dress_code: "", contact_phone: "", contact_whatsapp: "", contact_email: "",
  gift_notes: "", gift_iban: "", gift_bank_name: "", gift_account_holder: "",
  allow_companions: false, max_companions: 0, scope: "private", max_attendees: null,
  theme_color: "#492C5A", accent_color: "#CC8E3D", font_family: "Cairo",
  cover_image_url: "", background_image_url: "", custom_message: "",
  status: "draft", category: "wedding", formality: "personal",
  layout_style: "classic", ornament_style: "none", body_font: "Cairo",
  text_color: "#FFFFFF", template_key: null,
  custom_template_url: null, use_custom_template: false, name_overlay: DEFAULT_OVERLAY,
  design_extras: {},
  attachments: [], gift_options: {}, reminder_hours_before: null,
};

// خيارات الهدايا المتاحة في الدعوة — قيم ثابتة، و"أخرى" يحددها المستفيد بنفسه
const GIFT_TYPES: { key: string; label: string; emoji: string; amount: number | null }[] = [
  { key: "flowers", label: "ورد", emoji: "🌹", amount: 100 },
  { key: "box", label: "بوكس", emoji: "🎁", amount: 300 },
  { key: "cheque", label: "شيك", emoji: "📝", amount: 500 },
  { key: "other", label: "أخرى", emoji: "", amount: null },
];

// طرق الدفع المتاحة في الدعوات الخاصة
const GIFT_PAY_METHODS: { key: string; label: string }[] = [
  { key: "bank", label: "تحويل بنكي" },
  { key: "tabby", label: "Tabby" },
  { key: "tamara", label: "Tamara" },
];

// نافذة بترويسة وتذييل ثابتين، والمحتوى وحده يتمرر
const DIALOG_CLS = "flex max-h-[90dvh] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 outline-none";
const DIALOG_HEAD = "px-6 pb-4 pe-12 pt-6 text-start";
const DIALOG_BODY = "min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6";
const TAB_BODY = "mt-0 min-h-0 flex-1 overflow-y-auto px-6 pb-6";
const DIALOG_FOOT = "flex-row flex-wrap gap-2 border-t border-border px-6 py-4";
const ICON_TILE = "grid h-9 w-9 place-items-center rounded-[10px] bg-secondary text-primary";
// الأزرار المخصصة تأخذ حلقة تركيز الهوية بدل الحلقة الزرقاء الافتراضية، ومن الداخل حتى لا تقصها مناطق التمرير
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
const MODE_TILE = `rounded-xl bg-muted/50 p-5 text-start transition-colors hover:bg-muted ${FOCUS}`;
const SECTION = "text-[15px] font-bold leading-6";
const HINT = "text-xs leading-[18px] text-muted-foreground";
const WARNING_NOTE = "rounded-xl bg-[#FDF3E3] p-3 text-[13px] leading-5 text-[#9A5F12]";

const TIER_TONES: Record<string, StatusTone> = { vvip: "warning", vip: "primary", regular: "neutral" };

// حالة الخيار المحدد موحدة في كل مربعات الاختيار
const choiceCls = (active: boolean, idle = "bg-muted/50 hover:bg-muted") =>
  `transition-colors ${FOCUS} ${active ? "bg-secondary font-semibold text-primary ring-1 ring-inset ring-primary" : idle}`;

// تاريخ ووقت مختصران للجداول
const formatStamp = (value: string) => `${formatDateShort(value)}، ${formatTime(value)}`;

// حالة تتبع المدعو بصياغة محايدة: الرد أولاً، ثم الفتح، ثم الإرسال
const guestTracking = (g: Guest & { opened_at?: string | null; invite_sent_at?: string | null }): { label: string; tone: StatusTone; at: string | null } => {
  if (g.rsvp_status === "confirmed") return { label: "تم التأكيد", tone: "success", at: g.confirmed_at };
  if (g.rsvp_status === "declined") return { label: "تم الاعتذار", tone: "danger", at: g.confirmed_at };
  if (g.opened_at) return { label: "فُتحت الدعوة، بانتظار الرد", tone: "primary", at: g.opened_at };
  if (g.invite_sent_at || g.rsvp_status === "invited") return { label: "أُرسلت الدعوة، بانتظار الرد", tone: "neutral", at: g.invite_sent_at ?? null };
  return { label: "لم تُرسل بعد", tone: "neutral", at: null };
};

const reminderLabel = (h: number) =>
  h === 1 ? "قبل الموعد بساعة" : h === 2 ? "قبل الموعد بساعتين" : `قبل الموعد بـ ${h} ${h <= 10 ? "ساعات" : "ساعة"}`;

// الأعداد بصياغة عربية صحيحة: واحد، مثنى، جمع حتى 10، ثم تمييز مفرد
const guestCount = (n: number) => {
  if (n === 1) return "مدعو واحد";
  if (n === 2) return "مدعوان";
  const tail = n % 100;
  return `${formatNumber(n)} ${tail >= 3 && tail <= 10 ? "مدعوين" : tail >= 11 ? "مدعواً" : "مدعو"}`;
};
const companionsLabel = (n: number) => {
  if (!(n > 0)) return "";
  if (n === 1) return "مرافق واحد";
  if (n === 2) return "مرافقان";
  return `${formatNumber(n)} ${n <= 10 ? "مرافقين" : "مرافقاً"}`;
};
const gateCount = (n: number) => {
  if (n === 1) return "بوابة واحدة";
  if (n === 2) return "بوابتان";
  return `${formatNumber(n)} ${n <= 10 ? "بوابات" : "بوابة"}`;
};

function Field({ label, hint, className = "", children }: { label?: React.ReactNode; hint?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <Label>{label}</Label>}
      {children}
      {hint && <p className={HINT}>{hint}</p>}
    </div>
  );
}

const PrivateInvitations = () => {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [items, setItems] = useState<Inv[]>([]);
  const [invStats, setInvStats] = useState<Record<string, InvStats>>({});
  const [view, setView] = useState<InvView>("all");
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [reminderInv, setReminderInv] = useState<Inv | null>(null);
  // دعوة مفتوح لها حوار الإلغاء / إعادة الجدولة
  const [schedInv, setSchedInv] = useState<Inv | null>(null);
  const [editing, setEditing] = useState<Inv | null>(null);
  const [mode, setMode] = useState<"nakfeek" | "custom" | null>(null);
  const [form, setForm] = useState<Partial<Inv>>(emptyForm);

  const [guestsOpen, setGuestsOpen] = useState(false);
  const [activeInv, setActiveInv] = useState<Inv | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [newGuest, setNewGuest] = useState({ guest_name: "", guest_phone: "", guest_email: "", guest_tier: "regular" });

  const [qrGuest, setQrGuest] = useState<Guest | null>(null);
  const [attInv, setAttInv] = useState<Inv | null>(null);
  const [attGuests, setAttGuests] = useState<Guest[]>([]);
  const [attScans, setAttScans] = useState<{ guest_id: string; day_id: string | null; scan_type: string; scanned_at: string }[]>([]);
  const [attDays, setAttDays] = useState<{ id: string; day_number: number; day_date: string; title: string | null }[]>([]);
  const [attDayFilter, setAttDayFilter] = useState("all");

  // إدارة أيام الدعوة (مناسبة متعددة الأيام)
  const [daysInv, setDaysInv] = useState<Inv | null>(null);
  const [invDays, setInvDays] = useState<{ id: string; day_number: number; day_date: string; title: string | null; notes: string | null }[]>([]);
  const [invDaysSupported, setInvDaysSupported] = useState(true);

  // بوابات الدعوة — تُدار من داخل نافذة الأيام (تظهر عند الحاجة فقط)
  const [invGates, setInvGates] = useState<{ id: string; name_ar: string; gate_type: string }[]>([]);
  const [invGateLinks, setInvGateLinks] = useState<{ id: string; gate_id: string; day_id: string }[]>([]);
  const [invGatesSupported, setInvGatesSupported] = useState(true);
  const [newGate, setNewGate] = useState({ name: "", type: "entry" });

  const loadInvGates = async (invId: string) => {
    const gatesRes = await supabase
      .from("invitation_gates" as any)
      .select("id, name_ar, gate_type")
      .eq("invitation_id", invId)
      .order("display_order");
    if (gatesRes.error) { setInvGatesSupported(false); setInvGates([]); setInvGateLinks([]); return; }
    setInvGatesSupported(true);
    const gates = ((gatesRes.data as any) || []) as any[];
    setInvGates(gates);
    if (gates.length) {
      const linksRes = await supabase
        .from("invitation_gate_days" as any)
        .select("id, gate_id, day_id")
        .in("gate_id", gates.map(g => g.id));
      setInvGateLinks(linksRes.error ? [] : (((linksRes.data as any) || []) as any));
    } else {
      setInvGateLinks([]);
    }
  };

  const openDays = async (inv: Inv) => {
    setDaysInv(inv);
    const { data, error } = await supabase
      .from("invitation_days" as any)
      .select("*")
      .eq("invitation_id", inv.id)
      .order("day_number");
    if (error) { setInvDaysSupported(false); setInvDays([]); return; }
    setInvDaysSupported(true);
    setInvDays(((data as any) || []) as any);
    loadInvGates(inv.id);
  };

  const addInvGate = async () => {
    if (!daysInv || !newGate.name.trim()) return;
    const { error } = await supabase.from("invitation_gates" as any).insert({
      invitation_id: daysInv.id,
      name_ar: newGate.name.trim(),
      gate_type: newGate.type,
      display_order: invGates.length,
    } as any);
    if (error) {
      setInvGatesSupported(false);
      return toast.error("نفّذ ملف SQL الخاص ببوابات الدعوات أولاً");
    }
    setNewGate({ name: "", type: "entry" });
    loadInvGates(daysInv.id);
  };

  const removeInvGate = async (gateId: string) => {
    if (!confirm("حذف هذه البوابة؟")) return;
    await supabase.from("invitation_gates" as any).delete().eq("id", gateId);
    if (daysInv) loadInvGates(daysInv.id);
  };

  const linkInvGate = async (gateId: string, dayId: string) => {
    const { data, error } = await supabase
      .from("invitation_gate_days" as any)
      .insert({ gate_id: gateId, day_id: dayId } as any)
      .select()
      .single();
    if (error) return toast.error(error.message.includes("duplicate") ? "مسندة لهذا اليوم مسبقاً" : error.message);
    setInvGateLinks(prev => [...prev, data as any]);
  };

  const unlinkInvGate = async (linkId: string) => {
    await supabase.from("invitation_gate_days" as any).delete().eq("id", linkId);
    setInvGateLinks(prev => prev.filter(l => l.id !== linkId));
  };

  const DAY_ORDINALS = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع"];

  const addInvDay = async () => {
    if (!daysInv) return;
    const maxN = Math.max(0, ...invDays.map(d => d.day_number));
    const base = invDays.length
      ? new Date(invDays[invDays.length - 1].day_date)
      : new Date(daysInv.event_date);
    if (invDays.length) base.setDate(base.getDate() + 1);
    const { error } = await supabase.from("invitation_days" as any).insert({
      invitation_id: daysInv.id,
      day_number: maxN + 1,
      day_date: `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`,
      title: `اليوم ${DAY_ORDINALS[maxN] || maxN + 1}`,
    } as any);
    if (error) {
      setInvDaysSupported(false);
      return toast.error("نفّذ ملف SQL الخاص بأيام الدعوات أولاً");
    }
    openDays(daysInv);
  };

  const updateInvDayLocal = (id: string, patch: any) =>
    setInvDays(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));

  const saveInvDay = async (d: any) => {
    const { error } = await supabase
      .from("invitation_days" as any)
      .update({ title: d.title, day_date: d.day_date, notes: d.notes } as any)
      .eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ اليوم");
  };

  const removeInvDay = async (d: any) => {
    if (!confirm(`حذف «${d.title || `اليوم ${d.day_number}`}»؟`)) return;
    await supabase.from("invitation_days" as any).delete().eq("id", d.id);
    if (daysInv) openDays(daysInv);
  };

  // قائمة حضور الدعوة — الدخول والخروج من مسح الدعوات على البوابات
  const openAttendance = async (inv: Inv) => {
    setAttInv(inv);
    setAttDayFilter("all");
    const [{ data }, scansRes, daysRes] = await Promise.all([
      supabase
        .from("private_invitation_guests")
        .select("*")
        .eq("invitation_id", inv.id)
        .order("checked_in_at", { ascending: true }),
      supabase
        .from("invitation_guest_scans" as any)
        .select("guest_id, day_id, scan_type, scanned_at")
        .eq("invitation_id", inv.id)
        .order("scanned_at"),
      supabase
        .from("invitation_days" as any)
        .select("id, day_number, day_date, title")
        .eq("invitation_id", inv.id)
        .order("day_number"),
    ]);
    setAttGuests(((data || []) as Guest[]).filter(g => g.rsvp_status !== "declined"));
    setAttScans(scansRes.error ? [] : (((scansRes.data as any) || []) as any));
    setAttDays(daysRes.error ? [] : (((daysRes.data as any) || []) as any));
  };

  // أوقات الضيف حسب اليوم المختار: أول دخول وآخر خروج ضمن النطاق
  const guestTimes = (g: Guest): { entry: string | null; exit: string | null } => {
    const scoped = attScans.filter(
      sc => sc.guest_id === g.id && (attDayFilter === "all" || sc.day_id === attDayFilter)
    );
    let entry: string | null = null;
    let exit: string | null = null;
    scoped.forEach(sc => {
      if (sc.scan_type === "entry" && !entry) entry = sc.scanned_at;
      if (sc.scan_type === "exit") exit = sc.scanned_at;
    });
    if (attDayFilter === "all") {
      entry = entry || g.checked_in_at;
      exit = exit || g.checked_out_at || null;
    }
    return { entry, exit };
  };
  const [uploading, setUploading] = useState<"cover" | "background" | null>(null);

  const [lists, setLists] = useState<{ id: string; name: string; count: number }[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importingListId, setImportingListId] = useState<string>("");
  const [bulkSending, setBulkSending] = useState(false);

  const handleImageUpload = async (file: File, field: "cover_image_url" | "background_image_url") => {
    if (!user) return;
    if (!file.type.startsWith("image/")) { toast.error("الملف يجب أن يكون صورة"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("حجم الصورة يجب أن يكون أقل من 5MB"); return; }
    setUploading(field === "cover_image_url" ? "cover" : "background");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `invitations/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("event-covers").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("event-covers").getPublicUrl(path);
      setForm((f) => ({ ...f, [field]: data.publicUrl }));
      toast.success("تم رفع الصورة");
    } catch (e: any) {
      toast.error(e.message || "فشل رفع الصورة");
    } finally {
      setUploading(null);
    }
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: orgs } = await supabase.from("organizations").select("id").eq("owner_id", user.id).limit(1);
    const org = orgs?.[0];
    if (!org) { setLoading(false); return; }
    setOrgId(org.id);
    const { data } = await supabase
      .from("private_invitations")
      .select("*")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false });
    setItems((data || []) as any);
    await loadStats(((data || []) as any[]).map((i) => i.id));
    setLoading(false);
  };

  const loadStats = async (ids: string[]) => {
    if (!ids.length) { setInvStats({}); return; }
    const { data } = await supabase.from("private_invitation_guests").select("invitation_id, rsvp_status, invite_sent_at").in("invitation_id", ids);
    const next: Record<string, InvStats> = {};
    ((data || []) as any[]).forEach((g) => {
      const s = (next[g.invitation_id] ??= { total: 0, confirmed: 0, declined: 0, sent: 0 });
      s.total += 1;
      if (g.rsvp_status === "confirmed") s.confirmed += 1;
      if (g.rsvp_status === "declined") s.declined += 1;
      if (g.invite_sent_at) s.sent += 1;
    });
    setInvStats(next);
  };

  useEffect(() => { document.title = "الدعوات الخاصة | نكفيك"; load(); }, [user]);
  // أرقام البطاقات تتحدث بعد إغلاق نافذة المدعوين
  useEffect(() => { if (!activeInv && items.length) loadStats(items.map((i) => i.id)); }, [activeInv]);

  const loadGuests = async (invId: string) => {
    const { data } = await supabase
      .from("private_invitation_guests")
      .select("*")
      .eq("invitation_id", invId)
      .order("created_at", { ascending: false });
    setGuests((data || []) as any);
  };

  const openNew = () => { setEditing(null); setForm(emptyForm); setMode(null); setOpen(true); };
  const openEdit = (inv: Inv) => {
    setEditing(inv);
    setForm({ ...inv, event_date: inv.event_date?.slice(0, 16) });
    setMode(inv.use_custom_template ? "custom" : "nakfeek");
    setOpen(true);
  };

  const save = async () => {
    if (!orgId || !user) return toast.error("لا توجد مؤسسة مرتبطة بحسابك");
    if (!form.title || !form.event_date) return toast.error("العنوان وتاريخ المناسبة مطلوبان");
    const payload: any = { ...form, organization_id: orgId, created_by: user.id };
    const run = async (p: any) =>
      editing
        ? supabase.from("private_invitations").update(p).eq("id", editing.id)
        : supabase.from("private_invitations").insert(p);
    let { error } = await run(payload);
    // توافقية: أزل تدريجياً أي عمود جديد لم يُنفَّذ ملف SQL الخاص به بعد
    const strippable = ["design_extras", "attachments", "gift_options", "reminder_hours_before"];
    let stripped = false;
    let attempt = { ...payload };
    while (error && strippable.some((c) => error!.message?.includes(c))) {
      const col = strippable.find((c) => error!.message?.includes(c))!;
      delete attempt[col];
      stripped = true;
      ({ error } = await run(attempt));
    }
    if (!error && stripped) {
      toast.info("حُفظت الدعوة بدون بعض الخيارات الجديدة — نفّذ ملف nakfik_invitation_v2.sql في Supabase لتفعيلها كاملة");
    }
    if (error) return toast.error(error.message);
    toast.success(editing ? "تم التحديث" : "تم إنشاء الدعوة");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف الدعوة؟")) return;
    const { error } = await supabase.from("private_invitations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    load();
  };

  const toggleStatus = async (inv: Inv) => {
    const newStatus = inv.status === "active" ? "draft" : "active";
    await supabase.from("private_invitations").update({ status: newStatus }).eq("id", inv.id);
    load();
  };

  const openGuests = async (inv: Inv) => {
    setActiveInv(inv);
    setGuestsOpen(true);
    await loadGuests(inv.id);
  };

  const addGuest = async () => {
    if (!activeInv) return;
    if (!newGuest.guest_name.trim()) return toast.error("اسم المدعو مطلوب");
    const payload: any = {
      invitation_id: activeInv.id,
      guest_name: newGuest.guest_name.trim(),
      guest_phone: newGuest.guest_phone || null,
      guest_email: newGuest.guest_email || null,
      guest_tier: newGuest.guest_tier,
    };
    let { error } = await supabase.from("private_invitation_guests").insert(payload);
    // توافقية: إذا لم يُنفَّذ ملف SQL الخاص بتصنيف المدعوين بعد
    if (error?.message?.includes("guest_tier")) {
      const { guest_tier: _omit, ...rest } = payload;
      ({ error } = await supabase.from("private_invitation_guests").insert(rest));
      if (!error) toast.info("أُضيف المدعو بدون تصنيف — نفّذ ملف SQL الخاص بالتصنيفات أولاً");
    }
    if (error) return toast.error(error.message);
    setNewGuest({ guest_name: "", guest_phone: "", guest_email: "", guest_tier: "regular" });
    await loadGuests(activeInv.id);
  };

  const updateTier = async (g: Guest, tier: string) => {
    const { error } = await supabase
      .from("private_invitation_guests")
      .update({ guest_tier: tier } as any)
      .eq("id", g.id);
    if (error)
      return toast.error(
        error.message.includes("guest_tier")
          ? "نفّذ ملف SQL الخاص بتصنيف المدعوين أولاً"
          : error.message
      );
    if (activeInv) loadGuests(activeInv.id);
  };

  const removeGuest = async (id: string) => {
    await supabase.from("private_invitation_guests").delete().eq("id", id);
    if (activeInv) loadGuests(activeInv.id);
  };

  const openImport = async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("guest_lists")
      .select("id, name, guest_list_contacts(count)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    const mapped = (data || []).map((l: any) => ({
      id: l.id, name: l.name, count: l.guest_list_contacts?.[0]?.count || 0,
    }));
    setLists(mapped);
    setImportingListId("");
    setImportOpen(true);
  };

  const doImport = async () => {
    if (!activeInv || !importingListId) return toast.error("اختر قائمة");
    const { data, error } = await supabase.rpc("import_list_to_invitation", {
      _list_id: importingListId, _invitation_id: activeInv.id,
    });
    if (error) return toast.error(error.message);
    toast.success(`تم استيراد ${data || 0} مدعو${data === 1 ? "" : "ين"} جديد${data === 1 ? "" : "ين"}`);
    setImportOpen(false);
    loadGuests(activeInv.id);
  };

  const sendAllPending = async () => {
    const pending = guests.filter((g) => g.guest_phone && (g.rsvp_status === "pending" || g.rsvp_status === "invited"));
    if (!pending.length) return toast.error("لا يوجد مدعوين بأرقام جوال للإرسال");
    if (!confirm(`فتح ${pending.length} محادثة واتساب على التوالي؟`)) return;
    setBulkSending(true);
    for (const g of pending) {
      sendWhatsApp(g);
      await new Promise((r) => setTimeout(r, 700));
    }
    setBulkSending(false);
  };


  const inviteUrl = (token: string) => `${window.location.origin}/invite/${token}`;

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("تم النسخ"); };

  // ===== رسالة المشاركة التلقائية — تتولد حسب حالة الدعوة وحالة المدعو =====
  const fmtShareDate = (d: string) => `${formatDate(d)}، ${formatTime(d)}`;

  const autoShareMessage = (inv: Inv, g?: Guest | null): string => {
    const hello = g?.guest_name ? `مرحباً ${g.guest_name}،\n` : "";
    // الدعوة ملغاة → رسالة اعتذار
    if (inv.status === "cancelled")
      return `${hello}نعتذر عن إلغاء "${inv.title}"${(inv as any).cancel_reason ? ` — السبب: ${(inv as any).cancel_reason}` : ""}.\nنشكر تفهمكم ونعتذر عن أي إزعاج، ونتطلع للقائكم في مناسبة قادمة.`;
    // المدعو أكد حضوره → رسالة تأكيد
    if (g?.rsvp_status === "confirmed")
      return `${hello}تم تأكيد حضورك لـ"${inv.title}" بتاريخ ${fmtShareDate(inv.event_date)} 🎉\nأبرز رمز الدخول من رابط دعوتك عند البوابة.`;
    // المدعو اعتذر → رسالة شكر على الإبلاغ
    if (g?.rsvp_status === "declined")
      return `${hello}نشكر لك إبلاغنا باعتذارك عن حضور "${inv.title}"، ونتمنى رؤيتك في مناسبة قادمة بإذن الله.`;
    // الدعوة معاد جدولتها → رسالة الموعد الجديد
    if ((inv as any).rescheduled_from)
      return `${hello}نعتذر، تم إعادة جدولة "${inv.title}" إلى الموعد الجديد: ${fmtShareDate(inv.event_date)}.\nنرجو تأكيد حضوركم عبر رابط الدعوة.`;
    // دعوة جديدة
    return `${hello}يسعدنا دعوتك لحضور "${inv.title}"${inv.host_name ? ` — ${inv.formality === "business" ? "من" : "بضيافة"} ${inv.host_name}` : ""} بتاريخ ${fmtShareDate(inv.event_date)}.\nنتشرف بحضورك.`;
  };

  // ===== حوار المشاركة: رسالة تلقائية أو مخصصة قبل الإرسال =====
  const [shareGuest, setShareGuest] = useState<Guest | null>(null);
  const [shareMode, setShareMode] = useState<"auto" | "custom">("auto");
  const [shareCustom, setShareCustom] = useState("");

  const openShare = (g: Guest) => {
    setShareMode("auto");
    setShareCustom("");
    setShareGuest(g);
  };

  // الرسالة النهائية: المخصصة إن كُتبت، وإلا التلقائية — والرابط يُلحق دائماً
  const finalShareMessage = (g: Guest): string => {
    const base = shareMode === "custom" && shareCustom.trim()
      ? shareCustom.trim()
      : (activeInv ? autoShareMessage(activeInv, g) : "");
    return `${base}\n\nرابط الدعوة: ${inviteUrl(g.token)}`;
  };

  const markInviteSent = (g: Guest) => {
    supabase.from("private_invitation_guests").update({
      invite_sent_at: new Date().toISOString(),
      rsvp_status: g.rsvp_status === "pending" ? "invited" : g.rsvp_status,
    } as any).eq("id", g.id).then(() => activeInv && loadGuests(activeInv.id));
  };

  const sendWhatsApp = (g: Guest, message?: string) => {
    if (!g.guest_phone) return toast.error("لا يوجد رقم جوال");
    const text = message ?? `${activeInv ? autoShareMessage(activeInv, g) : ""}\n\nرابط الدعوة: ${inviteUrl(g.token)}`;
    const phone = g.guest_phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
    markInviteSent(g);
  };

  const statsOf = (inv: Inv): InvStats => invStats[inv.id] ?? { total: 0, confirmed: 0, declined: 0, sent: 0 };

  // زر واحد يقول ما يجب فعله الآن، وبقية الإجراءات في قائمة المزيد
  const nextStep = (inv: Inv): { label: string; icon: LucideIcon; run: () => void } => {
    const s = statsOf(inv);
    if (isEnded(inv)) return { label: "اعرض الحضور", icon: BarChart3, run: () => openAttendance(inv) };
    if (s.total === 0) return { label: "أضف المدعوين", icon: UserPlus, run: () => openGuests(inv) };
    if (s.sent === 0) return { label: "أرسل الروابط", icon: Send, run: () => openGuests(inv) };
    if (new Date(inv.event_date).getTime() - Date.now() < 7 * 86400000) return { label: "جهّز تسجيل الحضور", icon: ScanLine, run: () => openDays(inv) };
    const waiting = s.total - s.confirmed - s.declined;
    if (waiting > 0) return { label: `ذكّر ${guestsObject(waiting)}`, icon: Bell, run: () => setReminderInv(inv) };
    return { label: "المدعوون", icon: Users, run: () => openGuests(inv) };
  };

  const inView = (inv: Inv) =>
    view === "all" ||
    (view === "draft" && inv.status === "draft" && !isEnded(inv)) ||
    (view === "ended" && isEnded(inv)) ||
    (view === "upcoming" && inv.status !== "draft" && !isEnded(inv));
  const visible = items.filter(inView).sort((a, b) => Number(isEnded(a)) - Number(isEnded(b)) || new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const viewCount = (v: InvView) => items.filter((inv) => (v === "draft" ? inv.status === "draft" && !isEnded(inv) : v === "ended" ? isEnded(inv) : v === "upcoming" ? inv.status !== "draft" && !isEnded(inv) : true)).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="الدعوات الخاصة"
          description="تابع ردود مدعويك وأدر مناسباتك من مكان واحد"
          actions={<Button onClick={openNew}><Plus className="w-4 h-4" /> دعوة جديدة</Button>}
        />

        {!loading && items.length > 0 && (
          <Tabs value={view} onValueChange={(v) => setView(v as InvView)}>
            <TabsList>
              {([["all", "الكل"], ["upcoming", "قادمة"], ["draft", "مسودة"], ["ended", "منتهية"]] as [InvView, string][]).map(([key, label]) => (
                <TabsTrigger key={key} value={key} className="gap-1.5">
                  {label}
                  <span className="text-xs font-normal text-muted-foreground">{viewCount(key)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState icon={Mail} title="لم تنشئ أي دعوة خاصة بعد" description="أنشئ أول دعوة وأضف مدعويك وأرسل لهم روابطهم" action={<Button variant="soft" size="sm" onClick={openNew}><Plus className="w-4 h-4" /> أنشئ أول دعوة</Button>} />
          </div>
        ) : (
          <div dir="rtl" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((inv) => {
              const stats = statsOf(inv);
              const status = invStatus(inv, stats);
              const step = nextStep(inv);
              const [coverBg, coverFg] = COVER_TONES[inv.category] ?? COVER_TONES.other;
              const CategoryIcon = CATEGORY_PRESETS[inv.category]?.Icon ?? Sparkles;
              return (
                <article key={inv.id} className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-soft">
                  <div
                    className="flex h-[76px] items-center justify-between px-5"
                    style={{ background: inv.cover_image_url ? `url(${inv.cover_image_url}) center/cover` : coverBg }}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/85" style={{ color: coverFg }}>
                      <CategoryIcon className="h-5 w-5" />
                    </span>
                    <StatusBadge tone={status.tone} className="bg-white">{status.label}</StatusBadge>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-4">
                    <h3 className="truncate text-base font-bold leading-6">{inv.title}</h3>
                    <div className="space-y-1 text-[13px] leading-5 text-muted-foreground">
                      <p className="flex items-center gap-2"><Calendar className="h-[15px] w-[15px] flex-none opacity-70" /> {formatWeekday(inv.event_date)}، {formatTime(inv.event_date)}</p>
                      <p className="flex items-center gap-2"><MapPin className="h-[15px] w-[15px] flex-none opacity-70" /> <span className="truncate">{[inv.venue_name, inv.venue_address].filter(Boolean).join("، ") || "لم يُحدد المكان"}</span></p>
                    </div>
                    <div className="min-h-[44px]">
                      {stats.total === 0 ? (
                        <p className="text-sm text-muted-foreground">لا يوجد مدعوون بعد</p>
                      ) : stats.sent === 0 ? (
                        <p className="text-sm text-muted-foreground">{guestCount(stats.total)}، لم تُرسل الروابط</p>
                      ) : (
                        <RsvpBar confirmed={stats.confirmed} declined={stats.declined} total={stats.total} />
                      )}
                      {!isEnded(inv) && <p className="sr-only">{daysLeftLabel(inv.event_date)}</p>}
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-1">
                      <Button size="sm" variant={isEnded(inv) ? "outline" : "soft"} className="flex-1" onClick={step.run}>
                        <step.icon className="h-[15px] w-[15px]" /> {step.label}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="outline" className="h-9 w-9 flex-none" aria-label="المزيد"><MoreHorizontal className="h-[18px] w-[18px]" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => openGuests(inv)}><Users className="h-4 w-4" /> المدعوون</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setReminderInv(inv)}><Bell className="h-4 w-4" /> التذكيرات</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openAttendance(inv)}><ClipboardList className="h-4 w-4" /> الحضور</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDays(inv)}><CalendarDays className="h-4 w-4" /> الأيام والبوابات</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEdit(inv)}><Pencil className="h-4 w-4" /> تعديل</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSchedInv(inv)}><Calendar className="h-4 w-4" /> إلغاء أو تأجيل</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(inv)}><CheckCircle2 className="h-4 w-4" /> {inv.status === "active" ? "إيقاف" : "تفعيل"}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => remove(inv.id)}><Trash2 className="h-4 w-4" /> حذف</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </article>
              );
            })}
            {visible.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">لا توجد دعوات في هذا التصنيف</p>}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl" className={mode ? `${DIALOG_CLS} h-[min(820px,90dvh)] max-w-4xl` : `${DIALOG_CLS} max-w-2xl`}>
            <DialogHeader className={DIALOG_HEAD}>
              <DialogTitle>{editing ? "تعديل الدعوة" : "دعوة خاصة جديدة"}</DialogTitle>
              {!mode && <DialogDescription>كيف تريد تجهيز دعوتك؟</DialogDescription>}
            </DialogHeader>

            {!mode ? (
              <div className="grid gap-4 overflow-y-auto px-6 pb-6 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, use_custom_template: false }));
                    setMode("nakfeek");
                  }}
                  className={MODE_TILE}
                >
                  <span className={ICON_TILE}><Palette className="h-[17px] w-[17px]" /></span>
                  <span className="mt-3 block text-[15px] font-bold leading-6">خيارات نكفيك</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">
                    اختر من قوالب جاهزة احترافية حسب نوع المناسبة — ألوان وخطوط ورسائل مُعدّة مسبقاً.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, use_custom_template: true }));
                    setMode("custom");
                  }}
                  className={MODE_TILE}
                >
                  <span className={ICON_TILE}><ImageIcon className="h-[17px] w-[17px]" /></span>
                  <span className="mt-3 block text-[15px] font-bold leading-6">تصميمي الخاص</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">
                    ارفع تصميمك الجاهز، وحدّد موقع اسم المدعو ليُكتب تلقائياً على كل دعوة.
                  </span>
                </button>
              </div>
            ) : (
            <Tabs defaultValue={mode === "custom" ? "custom" : "basic"} key={mode} className="flex min-h-0 flex-1 flex-col">
              <div className="px-6 pb-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic" className="px-1 sm:px-4">الأساسيات</TabsTrigger>
                  <TabsTrigger value="venue" className="px-1 sm:px-4">الموقع</TabsTrigger>
                  <TabsTrigger value="extras" className="px-1 sm:px-4">إضافات</TabsTrigger>
                  {mode === "nakfeek" ? (
                    <TabsTrigger value="design" className="px-1 sm:px-4">التصميم</TabsTrigger>
                  ) : (
                    <TabsTrigger value="custom" className="px-1 sm:px-4">تصميمي</TabsTrigger>
                  )}
                </TabsList>
              </div>

              <TabsContent value="basic" className={`${TAB_BODY} space-y-4`}>
                {mode === "nakfeek" && (
                  <div className="space-y-2">
                    <Label>نوع المناسبة</Label>
                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                      {Object.entries(CATEGORY_PRESETS).map(([key, p]) => {
                        const active = form.category === key;
                        const Icon = p.Icon;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                              setForm((f) => ({
                                ...f,
                                category: key,
                                formality: p.formality,
                                theme_color: p.theme,
                                accent_color: p.accent,
                                font_family: p.font,
                                dress_code: f.dress_code || p.dress || "",
                                custom_message: f.custom_message || p.message,
                              }));
                            }}
                            className={`${choiceCls(active)} flex flex-col items-center gap-2 rounded-xl p-3 text-xs last:col-span-3 sm:last:col-span-1`}
                          >
                            <span className={`grid h-9 w-9 place-items-center rounded-[10px] ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
                              <Icon className="h-[17px] w-[17px]" />
                            </span>
                            <span className="text-center leading-[18px]">{p.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className={HINT}>اختيار النوع يضبط الألوان والخط والرسالة بشكل افتراضي — تقدر تعدّل أي شيء بعدها.</p>
                  </div>
                )}
                {mode === "custom" && (
                  <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
                    <span className={`${ICON_TILE} flex-none`}><ImageIcon className="h-[17px] w-[17px]" /></span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold leading-[22px]">تصميمك الخاص</h3>
                      <p className="text-[13px] leading-5 text-muted-foreground">
                        عبّي بيانات الدعوة الأساسية هنا (العنوان، التاريخ، الرسالة، الموقع، التواصل) — هذي البيانات تظهر في صفحة الدعوة تحت تصميمك.
                        تصميم الكرت نفسه ومواقع أسماء المدعوين تضبطها من تبويب <span className="font-semibold text-foreground">«تصميمي»</span>.
                      </p>
                    </div>
                  </div>
                )}
                <Field label="عنوان الدعوة *"><Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={form.category === "opening" ? "افتتاح فرع الرياض" : form.category === "forum" ? "ملتقى القيادات 2026" : "حفل زفاف فلان وفلانة"} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={form.formality === "business" ? "الجهة المنظمة" : "اسم المضيف"}><Input value={form.host_name || ""} onChange={(e) => setForm({ ...form, host_name: e.target.value })} /></Field>
                  <Field label="تاريخ ووقت المناسبة *"><Input dir="ltr" className="block" type="datetime-local" value={form.event_date || ""} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></Field>
                </div>
                <Field label={mode === "custom" ? "الرسالة الخاصة (تظهر تحت تصميمك)" : "رسالة الدعوة المخصصة"}>
                  <Textarea rows={4} value={form.custom_message || ""} onChange={(e) => setForm({ ...form, custom_message: e.target.value })} placeholder={mode === "custom" ? "اكتب هنا الرسالة اللي تبغى تظهر مع دعوتك" : ""} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="جوال التواصل"><Input dir="ltr" value={form.contact_phone || ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+9665..." /></Field>
                  <Field label="واتساب"><Input dir="ltr" value={form.contact_whatsapp || ""} onChange={(e) => setForm({ ...form, contact_whatsapp: e.target.value })} placeholder="+9665..." /></Field>
                  <Field label="البريد"><Input dir="ltr" value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
                </div>
              </TabsContent>


              <TabsContent value="venue" className={`${TAB_BODY} space-y-4`}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="اسم الموقع"><Input value={form.venue_name || ""} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} placeholder="قاعة الماسة" /></Field>
                  <Field label="العنوان"><Input value={form.venue_address || ""} onChange={(e) => setForm({ ...form, venue_address: e.target.value })} /></Field>
                </div>
                <Field label="رابط الخريطة (Google Maps)"><Input dir="ltr" value={form.venue_map_url || ""} onChange={(e) => setForm({ ...form, venue_map_url: e.target.value })} /></Field>
                <Field label="الزي المطلوب"><Input value={form.dress_code || ""} onChange={(e) => setForm({ ...form, dress_code: e.target.value })} placeholder="رسمي / تقليدي" /></Field>
              </TabsContent>

              <TabsContent value="extras" className={`${TAB_BODY} space-y-5`}>
                <section className="space-y-3">
                  <h3 className={SECTION}>نطاق الدعوة</h3>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {[
                      { key: "private", title: "خاصة", desc: "بقائمة مدعوين محددة — كل مدعو له رابط فريد" },
                      { key: "public",  title: "عامة",  desc: "رابط واحد يُشارك — أي شخص يقدر يأكد حضوره" },
                    ].map((o) => {
                      const active = (form.scope || "private") === o.key;
                      return (
                        <button
                          key={o.key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setForm({ ...form, scope: o.key })}
                          className={`${choiceCls(active)} rounded-xl p-3 text-start`}
                        >
                          <span className="block text-sm font-bold leading-[22px]">{o.title}</span>
                          <span className="block text-xs font-normal leading-[18px] text-muted-foreground">{o.desc}</span>
                        </button>
                      );
                    })}
                  </div>

                  {form.scope === "private" && (
                    <Field label="الحد الأقصى لإجمالي الحاضرين (اختياري)" hint="لا يُسمح بتأكيد دعوات جديدة بعد بلوغ هذا العدد (شامل المرافقين).">
                      <Input
                        type="number"
                        min={0}
                        placeholder="اتركه فارغ = بلا حد"
                        value={form.max_attendees ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, max_attendees: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      />
                    </Field>
                  )}

                  {form.scope === "public" && (
                    <Field label="الحد الأقصى للحاضرين *" hint="مطلوب للدعوات العامة لمنع تجاوز سعة المكان.">
                      <Input
                        type="number"
                        min={1}
                        placeholder="مثلاً 200"
                        value={form.max_attendees ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, max_attendees: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      />
                    </Field>
                  )}
                </section>

                <section className="space-y-3 border-t border-border pt-5">
                  <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-[22px]">السماح بالمرافقين</p>
                      <p className={HINT}>يقدر المدعو يحدد عدد المرافقين عند التأكيد</p>
                    </div>
                    <Switch checked={!!form.allow_companions} onCheckedChange={(v) => setForm({ ...form, allow_companions: v })} />
                  </div>
                  {form.allow_companions && (
                    <Field label="الحد الأقصى للمرافقين"><Input type="number" min={0} value={form.max_companions || 0} onChange={(e) => setForm({ ...form, max_companions: Number(e.target.value) })} /></Field>
                  )}
                </section>

                {/* تذكير المستفيد قبل الموعد — يظهر له في صفحة دعوته */}
                <section className="space-y-3 border-t border-border pt-5">
                  <h3 className={SECTION}>تذكير المستفيد قبل الموعد</h3>
                  <div className="space-y-1.5">
                    <Select
                      value={form.reminder_hours_before == null ? "none" : String(form.reminder_hours_before)}
                      onValueChange={(v) => setForm({ ...form, reminder_hours_before: v === "none" ? null : Number(v) })}
                    >
                      <SelectTrigger aria-label="تذكير المستفيد قبل الموعد"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون تذكير</SelectItem>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                          <SelectItem key={h} value={String(h)}>{reminderLabel(h)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className={HINT}>يظهر تنبيه تذكير واضح للمدعو عند فتح دعوته خلال هذه المدة قبل بداية المناسبة.</p>
                  </div>
                </section>

                {/* مرفقات الدعوة — ملفات ومحتويات المناسبة في مكان منظم */}
                <section className="space-y-3 border-t border-border pt-5">
                  <div>
                    <h3 className={SECTION}>مرفقات الدعوة</h3>
                    <p className={HINT}>جدول الفقرات، خريطة الموقع، تعليمات الدخول... تظهر للمدعو في قسم منظم داخل دعوته.</p>
                  </div>
                  {(form.attachments || []).length > 0 && (
                    <div className="divide-y divide-border rounded-xl bg-muted/50">
                      {(form.attachments || []).map((a, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{a.name}</span>
                          {a.size ? <span className="text-xs text-muted-foreground"><bdi dir="ltr">{formatNumber(Math.round(a.size / 1024))} KB</bdi></span> : null}
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="حذف المرفق" onClick={() => setForm({ ...form, attachments: (form.attachments || []).filter((_, j) => j !== i) })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="inline-block cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f || !user) return;
                        if (f.size > 10 * 1024 * 1024) return toast.error("الحد الأقصى للمرفق 10 ميجا");
                        const path = `invitations/attachments/${user.id}/${Date.now()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
                        const { error } = await supabase.storage.from("event-covers").upload(path, f);
                        if (error) return toast.error("فشل رفع المرفق");
                        const { data } = supabase.storage.from("event-covers").getPublicUrl(path);
                        setForm((prev) => ({ ...prev, attachments: [...(prev.attachments || []), { name: f.name, url: data.publicUrl, size: f.size }] }));
                        toast.success("تمت إضافة المرفق");
                      }}
                    />
                    <Button asChild variant="outline" size="sm">
                      <span><Plus className="h-4 w-4" /> إضافة مرفق (PDF، صورة، مستند...)</span>
                    </Button>
                  </label>
                </section>

                <section className="space-y-4 border-t border-border pt-5">
                  <h3 className={SECTION}>قائمة الهدايا</h3>
                  {/* خيارات الهدايا المتاحة للمدعوين */}
                  <div className="space-y-2">
                    <Label>خيارات الهدايا المتاحة</Label>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {GIFT_TYPES.map((t) => {
                        const types = form.gift_options?.types || [];
                        const active = types.includes(t.key);
                        return (
                          <button
                            key={t.key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setForm({
                              ...form,
                              gift_options: {
                                ...(form.gift_options || {}),
                                types: active ? types.filter((x) => x !== t.key) : [...types, t.key],
                              },
                            })}
                            className={`${choiceCls(active)} rounded-xl p-3 text-center`}
                          >
                            <span className="block text-sm font-semibold leading-[22px]">{t.label}</span>
                            <span className="block text-xs font-normal leading-[18px] text-muted-foreground">
                              {t.amount ? `${formatNumber(t.amount)} ريال` : "المستفيد يحدد النوع والقيمة"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {(form.gift_options?.types || []).length > 0 && (
                    <div className="space-y-2">
                      <Label>طرق الدفع المقبولة</Label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {GIFT_PAY_METHODS.map((m) => {
                          const methods = form.gift_options?.payment_methods || [];
                          const active = methods.includes(m.key);
                          return (
                            <button
                              key={m.key}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setForm({
                                ...form,
                                gift_options: {
                                  ...(form.gift_options || {}),
                                  payment_methods: active ? methods.filter((x) => x !== m.key) : [...methods, m.key],
                                },
                              })}
                              className={`${choiceCls(active)} h-10 rounded-lg px-2 text-[13px] font-semibold`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <Field label="ملاحظات الهدايا"><Textarea rows={2} value={form.gift_notes || ""} onChange={(e) => setForm({ ...form, gift_notes: e.target.value })} placeholder="تكفون يا أحبابنا، حضوركم هديتنا..." /></Field>
                </section>
              </TabsContent>

              <TabsContent value="design" className={TAB_BODY}>
                <DesignStudio
                  mode="invitation"
                  value={{
                    theme_color: form.theme_color || "#492C5A",
                    accent_color: form.accent_color || "#CC8E3D",
                    background_color: "#FFFFFF",
                    text_color: form.text_color || "#FFFFFF",
                    heading_font: form.font_family || "Cairo",
                    body_font: form.body_font || form.font_family || "Cairo",
                    layout_style: form.layout_style || "classic",
                    ornament_style: form.ornament_style || "none",
                    background_image_url: form.background_image_url || null,
                    template_key: form.template_key || null,
                    ...((form.design_extras as any) || {}),
                  }}
                  onChange={(patch) => {
                    setForm((f) => ({
                      ...f,
                      ...(patch.theme_color !== undefined && { theme_color: patch.theme_color }),
                      ...(patch.accent_color !== undefined && { accent_color: patch.accent_color }),
                      ...(patch.text_color !== undefined && { text_color: patch.text_color }),
                      ...(patch.heading_font !== undefined && { font_family: patch.heading_font }),
                      ...(patch.body_font !== undefined && { body_font: patch.body_font }),
                      ...(patch.layout_style !== undefined && { layout_style: patch.layout_style }),
                      ...(patch.ornament_style !== undefined && { ornament_style: patch.ornament_style }),
                      ...(patch.background_image_url !== undefined && { background_image_url: patch.background_image_url }),
                      ...(patch.template_key !== undefined && { template_key: patch.template_key }),
                    }));
                    // خيارات التخصيص المتقدم تُجمع في design_extras
                    const extras: Record<string, unknown> = {};
                    for (const k of EXTRA_KEYS) if ((patch as any)[k] !== undefined) extras[k] = (patch as any)[k];
                    if (Object.keys(extras).length)
                      setForm((f) => ({ ...f, design_extras: { ...((f.design_extras as any) || {}), ...extras } }));
                  }}
                  previewTitle={form.title || "عنوان الدعوة"}
                  previewSubtitle="INVITATION · دعوة كريمة"
                  previewBody={form.custom_message || "يسعدنا حضوركم بيننا في هذه المناسبة الخاصة."}
                  previewFooter={form.host_name || ""}
                  previewGuestName="الاسم الكريم"
                  uploadPathPrefix="invitations"
                />
              </TabsContent>

              <TabsContent value="custom" className={`${TAB_BODY} space-y-4`}>
                <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-[22px]">استخدام تصميمي الخاص</p>
                    <p className={HINT}>ارفع تصميم الدعوة الجاهز وحدد موضع اسم المدعو — يتم طباعته على كل دعوة تلقائياً.</p>
                  </div>
                  <Switch
                    checked={!!form.use_custom_template}
                    onCheckedChange={(v) => setForm({ ...form, use_custom_template: v })}
                  />
                </div>

                {form.use_custom_template && (
                  <CustomTemplateDesigner
                    templateUrl={form.custom_template_url || null}
                    overlay={(form.name_overlay as NameOverlay) || DEFAULT_OVERLAY}
                    onTemplateChange={(url) => setForm((f) => ({ ...f, custom_template_url: url }))}
                    onOverlayChange={(o) => setForm((f) => ({ ...f, name_overlay: o }))}
                  />
                )}

                {!form.use_custom_template && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    فعّل الخيار أعلاه لرفع تصميم خاص بك بدلاً من القوالب الجاهزة.
                  </p>
                )}
              </TabsContent>
            </Tabs>
            )}

            {/* التذييل ثابت أسفل النافذة ليبقى زر الحفظ ظاهراً في كل التبويبات */}
            <DialogFooter className={DIALOG_FOOT}>
              {mode && <Button className="flex-1 sm:flex-none" onClick={save}>{editing ? "حفظ التعديلات" : "إنشاء الدعوة"}</Button>}
              <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              {mode && !editing && (
                <Button variant="ghost" onClick={() => setMode(null)}><ArrowRight className="h-4 w-4" /> رجوع</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Guests Dialog */}
        <Dialog open={guestsOpen} onOpenChange={setGuestsOpen}>
          <DialogContent dir="rtl" className={`${DIALOG_CLS} h-[min(820px,90dvh)] max-w-4xl`}>
            <DialogHeader className={DIALOG_HEAD}>
              <DialogTitle>إدارة المدعوين — {activeInv?.title}</DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-4 px-6 pb-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {([
                    ["المجموع", guests.length],
                    ["مؤكدون", guests.filter((g) => g.rsvp_status === "confirmed").length],
                    ["معتذرون", guests.filter((g) => g.rsvp_status === "declined").length],
                    ["بانتظار الرد", guests.filter((g) => !["confirmed", "declined"].includes(g.rsvp_status)).length],
                  ] as [string, number][]).map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 sm:block sm:px-4 sm:py-3">
                      <p className="text-xs leading-[18px] text-muted-foreground">{label}</p>
                      <p className="text-base font-bold leading-6 sm:text-xl sm:leading-7">{formatNumber(value)}</p>
                    </div>
                  ))}
                </div>

                {/* عداد المؤكدين حسب التصنيف — أعلى النافذة ليجهز المنظم لكل فئة */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] leading-5 text-muted-foreground">
                  <span>المؤكدون حسب التصنيف</span>
                  {TIER_KEYS.map((k) => {
                    const confirmed = guests.filter(
                      (g) => g.rsvp_status === "confirmed" && (g.guest_tier || "regular") === k
                    ).length;
                    return (
                      <span key={k} className="inline-flex items-center gap-1.5">
                        {k === "vvip" && <Crown className="h-3.5 w-3.5 text-accent" />}
                        <bdi>{GUEST_TIERS[k].label}</bdi>
                        <b className="font-bold text-foreground">{formatNumber(confirmed)}</b>
                      </span>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Button className="w-full sm:w-auto" onClick={sendAllPending} disabled={bulkSending || guests.length === 0}>
                    {bulkSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    إرسال للكل عبر واتساب
                  </Button>
                  <Button variant="outline" className="w-full sm:w-auto" onClick={openImport}>
                    <Database className="h-4 w-4" /> استيراد من قاعدة بيانات
                  </Button>
                </div>

                <div className="space-y-3 rounded-xl bg-muted/50 p-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end">
                    <Field className="col-span-2 sm:col-span-1" label="اسم المدعو *"><Input value={newGuest.guest_name} onChange={(e) => setNewGuest({ ...newGuest, guest_name: e.target.value })} /></Field>
                    <Field label="الجوال"><Input dir="ltr" placeholder="+9665..." value={newGuest.guest_phone} onChange={(e) => setNewGuest({ ...newGuest, guest_phone: e.target.value })} /></Field>
                    <Field label="البريد (اختياري)"><Input dir="ltr" value={newGuest.guest_email} onChange={(e) => setNewGuest({ ...newGuest, guest_email: e.target.value })} /></Field>
                    <Button variant="soft" className="col-span-2 sm:col-span-1" onClick={addGuest}><Plus className="h-4 w-4" /> إضافة</Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium">تصنيف المدعو</span>
                    {TIER_KEYS.map((k) => {
                      const active = newGuest.guest_tier === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setNewGuest({ ...newGuest, guest_tier: k })}
                          className={`${choiceCls(active, "bg-card hover:bg-secondary")} h-8 rounded-lg px-3 text-xs font-semibold`}
                        >
                          {GUEST_TIERS[k].label}
                        </button>
                      );
                    })}
                    <span className={HINT}>يراه المنظم فقط ولا يظهر للمدعو</span>
                  </div>
                </div>
              </div>

              {guests.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="لا يوجد مدعوون بعد"
                  description="أضف مدعويك من النموذج أعلاه أو استورد قائمة جاهزة"
                  action={<Button variant="outline" size="sm" onClick={openImport}><Database className="h-4 w-4" /> استيراد من قاعدة بيانات</Button>}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-6">المدعو</TableHead>
                      <TableHead className="hidden w-28 sm:table-cell">التصنيف</TableHead>
                      <TableHead className="hidden sm:table-cell">الحالة</TableHead>
                      <TableHead className="pe-6"><span className="sr-only">الإجراءات</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guests.map((g) => {
                      const track = guestTracking(g);
                      const companions = companionsLabel(g.companions_count);
                      const statusCell = (
                        <div>
                          <StatusBadge tone={track.tone}>{track.label}</StatusBadge>
                          {track.at && <p className="mt-1 text-xs leading-[18px] text-muted-foreground">{formatStamp(track.at)}</p>}
                        </div>
                      );
                      const tierCell = (
                        <Select value={g.guest_tier || "regular"} onValueChange={(v) => updateTier(g, v)}>
                          <SelectTrigger className="h-8 w-[5.5rem] text-xs font-semibold" title="تصنيف المدعو — يحدده المنظم فقط" aria-label="تصنيف المدعو"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TIER_KEYS.map((k) => <SelectItem key={k} value={k}>{GUEST_TIERS[k].label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      );
                      return (
                        <Fragment key={g.id}>
                        <TableRow className="border-0 sm:border-b">
                          <TableCell className="ps-6">
                            <p className="font-semibold leading-[22px]">{g.guest_name}</p>
                            {(g.guest_phone || companions) && (
                              <p className="flex flex-wrap gap-x-2 text-xs leading-[18px] text-muted-foreground">
                                {g.guest_phone && <bdi dir="ltr">{g.guest_phone}</bdi>}
                                {companions && <span>{companions}</span>}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{tierCell}</TableCell>
                          <TableCell className="hidden sm:table-cell">{statusCell}</TableCell>
                          <TableCell className="pe-6">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="soft" onClick={() => openShare(g)}>
                                <Send className="h-[15px] w-[15px]" /> مشاركة
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="outline" className="h-9 w-9 flex-none" aria-label="المزيد"><MoreHorizontal className="h-[18px] w-[18px]" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => copy(inviteUrl(g.token))}><Copy className="h-4 w-4" /> نسخ الرابط</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setQrGuest(g)}><QrCode className="h-4 w-4" /> رمز QR</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => window.open(inviteUrl(g.token), "_blank")}><ExternalLink className="h-4 w-4" /> فتح الدعوة</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => removeGuest(g.id)}><Trash2 className="h-4 w-4" /> حذف</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent sm:hidden">
                          <TableCell colSpan={4} className="px-6 pb-3 pt-0">
                            <div className="flex flex-wrap items-start gap-2">
                              {tierCell}
                              {statusCell}
                            </div>
                          </TableCell>
                        </TableRow>
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* أيام الدعوة — مناسبة متعددة الأيام */}
        <Dialog open={!!daysInv} onOpenChange={(v) => !v && setDaysInv(null)}>
          <DialogContent dir="rtl" className={`${DIALOG_CLS} max-w-2xl`}>
            <DialogHeader className={DIALOG_HEAD}>
              <DialogTitle>أيام المناسبة — {daysInv?.title}</DialogTitle>
              {invDaysSupported && <DialogDescription>للمناسبات الممتدة لعدة أيام — حضور كل يوم يُسجل مستقلاً وتشوفه في قائمة الحضور</DialogDescription>}
            </DialogHeader>
            <div className={DIALOG_BODY}>
            {!invDaysSupported ? (
              <p className={WARNING_NOTE}>
                نفّذ ملف SQL الخاص بأيام الدعوات (invitation_days) لتفعيل هذه الميزة
              </p>
            ) : (
              <>
                {/* بوابات المناسبة — قسم قابل للطي حتى لا تزدحم الواجهة */}
                <details className="group rounded-xl bg-muted/50">
                  <summary className={`flex cursor-pointer select-none list-none items-center gap-3 rounded-xl p-4 [&::-webkit-details-marker]:hidden ${FOCUS}`}>
                    <span className={`${ICON_TILE} flex-none`}><DoorOpen className="h-[17px] w-[17px]" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-[22px]">بوابات المناسبة</span>
                      <span className="block text-xs leading-[18px] text-muted-foreground">
                        {invGates.length ? gateCount(invGates.length) : "اختياري — للمناسبات الكبيرة"}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 flex-none text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-3 px-4 pb-4">
                    {!invGatesSupported ? (
                      <p className={WARNING_NOTE}>
                        نفّذ ملف SQL الخاص ببوابات الدعوات (invitation_gates) لتفعيل هذا القسم
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {invGates.length === 0 && (
                            <span className={HINT}>
                              بدون بوابات تستخدم أزرار دخول/خروج البسيطة في شاشة المسح
                            </span>
                          )}
                          {invGates.map(g => (
                            <StatusBadge key={g.id} tone={g.gate_type === "exit" ? "warning" : "success"}>
                              {g.name_ar} · {g.gate_type === "exit" ? "خروج" : "دخول"}
                              <button type="button" aria-label={`حذف ${g.name_ar}`} onClick={() => removeInvGate(g.id)} className={`rounded-sm opacity-70 transition-opacity hover:opacity-100 ${FOCUS}`}><X className="h-3 w-3" /></button>
                            </StatusBadge>
                          ))}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-[1fr_7rem_auto] sm:items-end">
                          <Field label="اسم البوابة">
                            <Input
                              value={newGate.name}
                              onChange={e => setNewGate({ ...newGate, name: e.target.value })}
                              placeholder="البوابة الرئيسية..."
                            />
                          </Field>
                          <Field label="النوع">
                            <Select value={newGate.type} onValueChange={(v) => setNewGate({ ...newGate, type: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="entry">دخول</SelectItem>
                                <SelectItem value="exit">خروج</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Button variant="outline" onClick={addInvGate} disabled={!newGate.name.trim()}>
                            <Plus className="h-4 w-4" /> إضافة بوابة
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </details>
                {invDays.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="لا أيام بعد"
                    description="أضف اليوم الأول لتبدأ"
                    action={<Button size="sm" onClick={addInvDay}><Plus className="h-4 w-4" /> إضافة يوم</Button>}
                  />
                ) : (
                  <>
                <div className="space-y-3">
                  {invDays.map(d => (
                    <div key={d.id} className="space-y-3 rounded-xl bg-muted/50 p-4">
                      <div className="flex items-center gap-3">
                        <span className={`${ICON_TILE} flex-none text-sm font-bold`}>{formatNumber(d.day_number)}</span>
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-[22px]">{d.title || `اليوم ${formatNumber(d.day_number)}`}</p>
                        <Button size="sm" variant="outline" onClick={() => saveInvDay(d)}>
                          <Save className="h-4 w-4" /> حفظ
                        </Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9 flex-none text-muted-foreground hover:text-destructive" aria-label="حذف اليوم" onClick={() => removeInvDay(d)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="عنوان اليوم"><Input value={d.title || ""} onChange={e => updateInvDayLocal(d.id, { title: e.target.value })} /></Field>
                        <Field label="التاريخ"><Input dir="ltr" className="block" type="date" value={d.day_date} onChange={e => updateInvDayLocal(d.id, { day_date: e.target.value })} /></Field>
                      </div>
                      <Field label="التجهيزات اليومية">
                        <Input
                          value={d.notes || ""}
                          onChange={e => updateInvDayLocal(d.id, { notes: e.target.value })}
                          placeholder="القاعة، الضيافة..."
                        />
                      </Field>
                      {invGatesSupported && invGates.length > 0 && (() => {
                        const dayLinks = invGateLinks.filter(l => l.day_id === d.id);
                        const linked = dayLinks
                          .map(l => ({ link: l, gate: invGates.find(g => g.id === l.gate_id) }))
                          .filter(x => x.gate) as { link: { id: string }; gate: { id: string; name_ar: string; gate_type: string } }[];
                        const addable = invGates.filter(g => !dayLinks.some(l => l.gate_id === g.id));
                        return (
                          <details className="group rounded-lg bg-card">
                            <summary className={`flex cursor-pointer select-none list-none items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-semibold leading-5 [&::-webkit-details-marker]:hidden ${FOCUS}`}>
                              <DoorOpen className="h-4 w-4 flex-none text-primary" /> بوابات هذا اليوم
                              <span className="font-normal text-muted-foreground">({linked.length ? `${formatNumber(linked.length)} مسندة` : "الكل يعمل"})</span>
                              <ChevronDown className="ms-auto h-4 w-4 flex-none text-muted-foreground transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="space-y-2.5 px-3 pb-3">
                              <div className="flex flex-wrap gap-2">
                                {linked.length === 0 && (
                                  <span className={HINT}>لا بوابات مسندة — كل بوابات المناسبة تعمل في هذا اليوم</span>
                                )}
                                {linked.map(({ link, gate }) => (
                                  <StatusBadge key={link.id} tone="primary">
                                    {gate.name_ar} · {gate.gate_type === "exit" ? "خروج" : "دخول"}
                                    <button type="button" aria-label={`إلغاء إسناد ${gate.name_ar}`} onClick={() => unlinkInvGate(link.id)} className={`rounded-sm opacity-70 transition-opacity hover:opacity-100 ${FOCUS}`}><X className="h-3 w-3" /></button>
                                  </StatusBadge>
                                ))}
                              </div>
                              {addable.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={HINT}>اضغط للإسناد:</span>
                                  {addable.map(g => (
                                    <button
                                      key={g.id}
                                      type="button"
                                      onClick={() => linkInvGate(g.id, d.id)}
                                      className={`inline-flex h-7 items-center gap-1 rounded-lg bg-muted/50 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-secondary ${FOCUS}`}
                                    >
                                      <Plus className="h-3 w-3" /> {g.name_ar} · {g.gate_type === "exit" ? "خروج" : "دخول"}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </details>
                        );
                      })()}
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full" onClick={addInvDay}>
                  <Plus className="h-4 w-4" /> إضافة يوم
                </Button>
                  </>
                )}
              </>
            )}
            </div>
          </DialogContent>
        </Dialog>

        {/* قائمة حضور الدعوة */}
        <Dialog open={!!attInv} onOpenChange={(v) => !v && setAttInv(null)}>
          <DialogContent dir="rtl" className={`${DIALOG_CLS} max-w-3xl`}>
            <DialogHeader className={DIALOG_HEAD}>
              <DialogTitle>قائمة الحضور — {attInv?.title}</DialogTitle>
              <DialogDescription>تُعبأ تلقائياً عند مسح دعوة الضيف على البوابات: الدخول من بوابات الدخول والخروج من بوابات الخروج</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-4 px-6 pb-5">
                {attDays.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[13px] leading-5 text-muted-foreground">عرض حسب اليوم</span>
                    <button
                      type="button"
                      aria-pressed={attDayFilter === "all"}
                      onClick={() => setAttDayFilter("all")}
                      className={`${choiceCls(attDayFilter === "all")} h-9 rounded-lg px-3 text-[13px] font-semibold`}
                    >
                      كامل المناسبة
                    </button>
                    {attDays.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        aria-pressed={attDayFilter === d.id}
                        onClick={() => setAttDayFilter(d.id)}
                        className={`${choiceCls(attDayFilter === d.id)} h-9 rounded-lg px-3 text-[13px] font-semibold`}
                      >
                        {d.title || `اليوم ${d.day_number}`}
                      </button>
                    ))}
                  </div>
                )}
                {(() => {
                  const times = attGuests.map(g => guestTimes(g));
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        ["دخلوا", times.filter(t => t.entry).length],
                        ["بالداخل الآن", times.filter(t => t.entry && !t.exit).length],
                        ["غادروا", times.filter(t => t.exit).length],
                      ] as [string, number][]).map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-muted/50 px-4 py-3">
                          <p className="text-xs leading-[18px] text-muted-foreground">{label}</p>
                          <p className="text-xl font-bold leading-7">{formatNumber(value)}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {attGuests.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="لا يوجد مدعوون بعد"
                  description="أضف المدعوين لتظهر هنا أوقات دخولهم وخروجهم"
                  action={attInv ? <Button variant="outline" onClick={() => { openGuests(attInv); setAttInv(null); }}><UserPlus className="h-4 w-4" /> أضف المدعوين</Button> : undefined}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-6">المدعو</TableHead>
                      <TableHead>التصنيف</TableHead>
                      <TableHead>وقت الدخول</TableHead>
                      <TableHead>وقت الخروج</TableHead>
                      <TableHead className="pe-6">مدة البقاء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attGuests.map(g => {
                      const tier = g.guest_tier && TIER_TONES[g.guest_tier] ? g.guest_tier : "regular";
                      const { entry, exit } = guestTimes(g);
                      const stay = computeStay(entry, exit);
                      return (
                        <TableRow key={g.id}>
                          <TableCell className="whitespace-nowrap ps-6 font-semibold">{g.guest_name}</TableCell>
                          <TableCell><StatusBadge tone={TIER_TONES[tier]}><bdi>{GUEST_TIERS[tier].label}</bdi></StatusBadge></TableCell>
                          <TableCell className="whitespace-nowrap">
                            {entry ? formatStamp(entry) : <span className="text-xs text-muted-foreground">لم يُسجَّل دخول بعد</span>}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {exit
                              ? formatStamp(exit)
                              : entry
                              ? <StatusBadge tone="primary">بالداخل</StatusBadge>
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="whitespace-nowrap pe-6">{stay ? <span className="font-semibold">{formatDuration(stay)}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* QR Dialog */}
        <Dialog open={!!qrGuest} onOpenChange={(v) => !v && setQrGuest(null)}>
          <DialogContent dir="rtl" className="w-[calc(100%-1.5rem)] max-w-sm rounded-2xl outline-none">
            <DialogHeader className="pe-6 text-start"><DialogTitle>QR Code — {qrGuest?.guest_name}</DialogTitle></DialogHeader>
            {qrGuest && (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-xl bg-white p-4">
                  <QRCodeSVG value={inviteUrl(qrGuest.token)} size={220} />
                </div>
                <p className="w-full break-all rounded-xl bg-muted/50 p-3 text-center text-xs leading-[18px] text-muted-foreground"><bdi dir="ltr">{inviteUrl(qrGuest.token)}</bdi></p>
                <Button variant="soft" onClick={() => copy(inviteUrl(qrGuest.token))} className="w-full">
                  <Copy className="h-4 w-4" /> نسخ الرابط
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Import from list */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent dir="rtl" className={`${DIALOG_CLS} max-w-lg`}>
            <DialogHeader className={DIALOG_HEAD}>
              <DialogTitle>استيراد من قاعدة بيانات</DialogTitle>
              {lists.length > 0 && <DialogDescription>سيتم تجاهل المدعوين الموجودين مسبقاً (بناءً على الجوال أو البريد).</DialogDescription>}
            </DialogHeader>
            {lists.length === 0 ? (
              <EmptyState
                icon={Database}
                title="لا توجد قوائم بعد"
                action={<Button asChild variant="outline" size="sm"><a href="/dashboard/guest-lists">إنشاء قائمة جديدة</a></Button>}
              />
            ) : (
              <div className={`${DIALOG_BODY} !space-y-2.5`}>
                {lists.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={importingListId === l.id}
                    onClick={() => setImportingListId(l.id)}
                    className={`${choiceCls(importingListId === l.id)} flex w-full items-center gap-3 rounded-xl p-3 text-start`}
                  >
                    <span className={`${ICON_TILE} flex-none`}><Database className="h-[17px] w-[17px]" /></span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{l.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{guestCount(l.count)}</span>
                  </button>
                ))}
              </div>
            )}
            <DialogFooter className={DIALOG_FOOT}>
              <Button className="flex-1 sm:flex-none" onClick={doImport} disabled={!importingListId}>استيراد</Button>
              <Button variant="outline" onClick={() => setImportOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* إعدادات تذكير المدعوين */}
        {reminderInv && (
          <ReminderSettings
            invitationId={reminderInv.id}
            invitationTitle={reminderInv.title}
            open={!!reminderInv}
            onOpenChange={(v) => { if (!v) setReminderInv(null); }}
          />
        )}

        {/* حوار مشاركة الدعوة — رسالة تلقائية حسب الحالة أو رسالة مخصصة */}
        <Dialog open={!!shareGuest} onOpenChange={(o) => !o && setShareGuest(null)}>
          <DialogContent dir="rtl" className={`${DIALOG_CLS} max-w-lg`}>
            <DialogHeader className={DIALOG_HEAD}>
              <DialogTitle>مشاركة الدعوة — {shareGuest?.guest_name}</DialogTitle>
            </DialogHeader>
            {shareGuest && activeInv && (
              <>
              <div className={DIALOG_BODY}>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={shareMode === "auto"}
                    onClick={() => setShareMode("auto")}
                    className={`${choiceCls(shareMode === "auto")} rounded-xl p-3 text-start`}
                  >
                    <span className="block text-sm font-bold leading-[22px]">رسالة تلقائية</span>
                    <span className="block text-xs font-normal leading-[18px] text-muted-foreground">
                      تتولد حسب حالة الدعوة (جديدة، معاد جدولتها، ملغاة...) وحالة المدعو
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={shareMode === "custom"}
                    onClick={() => {
                      setShareMode("custom");
                      if (!shareCustom.trim()) setShareCustom(autoShareMessage(activeInv, shareGuest));
                    }}
                    className={`${choiceCls(shareMode === "custom")} rounded-xl p-3 text-start`}
                  >
                    <span className="block text-sm font-bold leading-[22px]">رسالة مخصصة</span>
                    <span className="block text-xs font-normal leading-[18px] text-muted-foreground">
                      عدّل النص بنفسك قبل الإرسال — لو تركتها فارغة تُستخدم التلقائية
                    </span>
                  </button>
                </div>

                {shareMode === "auto" ? (
                  <div className="whitespace-pre-wrap rounded-xl bg-muted/50 p-4 text-sm leading-6">
                    {autoShareMessage(activeInv, shareGuest)}
                    <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
                      رابط الدعوة: <bdi dir="ltr" className="break-all">{inviteUrl(shareGuest.token)}</bdi>
                    </p>
                  </div>
                ) : (
                  <Field hint="رابط الدعوة يُضاف تلقائياً في نهاية الرسالة.">
                    <Textarea
                      value={shareCustom}
                      onChange={(e) => setShareCustom(e.target.value)}
                      rows={6}
                      placeholder="اكتب رسالتك... لو تركتها فارغة تُرسل الرسالة التلقائية"
                    />
                  </Field>
                )}
              </div>
              <DialogFooter className={DIALOG_FOOT}>
                <Button
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    sendWhatsApp(shareGuest, finalShareMessage(shareGuest));
                    setShareGuest(null);
                  }}
                  disabled={!shareGuest.guest_phone}
                  title={shareGuest.guest_phone ? undefined : "لا يوجد رقم جوال لهذا المدعو"}
                >
                  <Send className="h-4 w-4" /> إرسال واتساب
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    copy(finalShareMessage(shareGuest));
                    markInviteSent(shareGuest);
                    setShareGuest(null);
                  }}
                >
                  <Copy className="h-4 w-4" /> نسخ الرسالة والرابط
                </Button>
              </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* حوار إلغاء / إعادة جدولة المناسبة — التحديث يظهر لكل المدعوين تلقائياً */}
        <InvitationScheduleDialog
          inv={schedInv}
          onOpenChange={(o) => !o && setSchedInv(null)}
          onDone={(patch) => {
            if (schedInv) {
              setItems((prev) => prev.map((i) => (i.id === schedInv.id ? ({ ...i, ...patch } as Inv) : i)));
            }
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default PrivateInvitations;
