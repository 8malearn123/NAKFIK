import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReminderSettings from "@/components/dashboard/ReminderSettings";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  Mail, Plus, Pencil, Trash2, Users, ExternalLink, Copy, QrCode, Palette,
  Calendar, MapPin, Shirt, Phone, Gift, Send, CheckCircle2, X,
  Heart, Flower2, GraduationCap, Cake, Landmark, Mic2, Scissors, Crown, Briefcase, Sparkles,
  Upload, Image as ImageIcon, Loader2, Database, Bell, ClipboardList, CalendarDays, Save, DoorOpen,
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
const GUEST_TIERS: Record<string, { label: string; cls: string }> = {
  vvip:    { label: "VVIP", cls: "bg-amber-500/15 text-amber-700 border-amber-400/60" },
  vip:     { label: "VIP",  cls: "bg-primary/10 text-primary border-primary/40" },
  regular: { label: "عادي", cls: "bg-muted text-muted-foreground border-border" },
};
const TIER_KEYS = ["vvip", "vip", "regular"] as const;

// Presets — تطبق ستايل و رسالة افتراضية حسب نوع المناسبة
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
};

const PrivateInvitations = () => {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [items, setItems] = useState<Inv[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [reminderInv, setReminderInv] = useState<Inv | null>(null);
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
    setLoading(false);
  };

  useEffect(() => { document.title = "الدعوات الخاصة | نكفيك"; load(); }, [user]);

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
    // توافقية: إذا لم يُنفَّذ ملف SQL الخاص بحقل التخصيصات بعد
    if (error?.message?.includes("design_extras")) {
      const { design_extras: _omit, ...rest } = payload;
      ({ error } = await run(rest));
      if (!error) toast.info("حُفظت الدعوة بدون خيارات التخصيص المتقدم — نفّذ ملف SQL الخاص بها أولاً");
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

  const sendWhatsApp = (g: Guest) => {
    if (!g.guest_phone) return toast.error("لا يوجد رقم جوال");
    const url = inviteUrl(g.token);
    const msg = encodeURIComponent(`مرحباً ${g.guest_name}،\nيسعدنا دعوتك إلى ${activeInv?.title}\nرابط الدعوة: ${url}`);
    const phone = g.guest_phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    supabase.from("private_invitation_guests").update({
      invite_sent_at: new Date().toISOString(),
      rsvp_status: g.rsvp_status === "pending" ? "invited" : g.rsvp_status,
    }).eq("id", g.id).then(() => activeInv && loadGuests(activeInv.id));
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: "بانتظار", cls: "bg-muted text-muted-foreground" },
      invited: { label: "تم الإرسال", cls: "bg-blue-500/10 text-blue-700" },
      confirmed: { label: "مؤكد", cls: "bg-green-500/10 text-green-700" },
      declined: { label: "اعتذر", cls: "bg-destructive/10 text-destructive" },
    };
    const v = map[s] || map.pending;
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.cls}`}>{v.label}</span>;
  };

  // حالة التتبع الكاملة للمدعو: الرد أولاً، ثم الفتح، ثم الإرسال
  const trackingState = (g: Guest): { label: string; cls: string; at: string | null } => {
    if (g.rsvp_status === "confirmed")
      return { label: "أكد الحضور", cls: "bg-green-500/10 text-green-700", at: g.confirmed_at };
    if (g.rsvp_status === "declined")
      return { label: "اعتذر", cls: "bg-destructive/10 text-destructive", at: g.confirmed_at };
    if ((g as any).opened_at)
      return { label: "فتح الدعوة — لم يرد بعد", cls: "bg-indigo-500/10 text-indigo-700", at: (g as any).opened_at };
    if ((g as any).invite_sent_at || g.rsvp_status === "invited")
      return { label: "أُرسلت الدعوة — لم يرد بعد", cls: "bg-blue-500/10 text-blue-700", at: (g as any).invite_sent_at };
    return { label: "لم تُرسل بعد", cls: "bg-muted text-muted-foreground", at: null };
  };

  const trackingBadge = (g: Guest) => {
    const s = trackingState(g);
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.cls}`}>{s.label}</span>
        {s.at && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(s.at).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}
          </span>
        )}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl text-primary flex items-center gap-2">
              <Mail className="w-6 h-6" /> الدعوات الخاصة
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              دعوات مخصصة بكروت رقمية و QR لمناسباتك (أعراس، VIP، تكريم...)
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 ml-1" /> دعوة جديدة
          </Button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2].map(i => <div key={i} className="h-48 bg-card border rounded-2xl animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-3xl">
            <Mail className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">لم تنشئ أي دعوة خاصة بعد</p>
            <Button onClick={openNew} className="mt-4">
              <Plus className="w-4 h-4 ml-1" /> أنشئ أول دعوة
            </Button>
          </div>
        ) : (
          <div dir="rtl" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((inv) => (
              <div
                key={inv.id}
                className="bg-card border rounded-2xl overflow-hidden flex flex-col hover:shadow-lg transition"
                style={{ borderColor: inv.theme_color + "33" }}
              >
                <div
                  className="h-32 relative flex items-end p-4"
                  style={{
                    background: inv.cover_image_url
                      ? `url(${inv.cover_image_url}) center/cover`
                      : `linear-gradient(135deg, ${inv.theme_color}, ${inv.accent_color})`,
                  }}
                >
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="relative text-white">
                    <p className="text-[10px] opacity-90 mb-0.5 flex items-center gap-1">
                      {(() => { const I = CATEGORY_PRESETS[inv.category]?.Icon; return I ? <I className="w-3 h-3" /> : null; })()}
                      {CATEGORY_PRESETS[inv.category]?.label || "مناسبة"}
                    </p>
                    <h3 className="font-bold text-lg">{inv.title}</h3>
                    {inv.host_name && <p className="text-xs opacity-90">{inv.formality === "business" ? "الجهة:" : "المضيف:"} {inv.host_name}</p>}
                  </div>
                  <Badge
                    className="absolute top-2 left-2"
                    variant={inv.status === "active" ? "default" : "secondary"}
                  >
                    {inv.status === "active" ? "نشطة" : inv.status === "draft" ? "مسودة" : "مغلقة"}
                  </Badge>
                </div>
                <div className="p-4 space-y-2 flex-1 flex flex-col">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(inv.event_date).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })}</p>
                    {inv.venue_name && <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {inv.venue_name}</p>}
                  </div>
                  <div className="flex gap-2 mt-auto pt-3 flex-wrap">
                    <Button size="sm" variant="secondary" onClick={() => openGuests(inv)}>
                      <Users className="w-3 h-3 ml-1" /> المدعوين
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setReminderInv(inv)}>
                      <Bell className="w-3 h-3 ml-1" /> التذكيرات
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openAttendance(inv)}>
                      <ClipboardList className="w-3 h-3 ml-1" /> الحضور
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDays(inv)}>
                      <CalendarDays className="w-3 h-3 ml-1" /> الأيام
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(inv)}>
                      <Pencil className="w-3 h-3 ml-1" /> تعديل
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(inv)}>
                      {inv.status === "active" ? "إيقاف" : "تفعيل"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(inv.id)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl" className="max-w-5xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل الدعوة" : "دعوة خاصة جديدة"}</DialogTitle>
            </DialogHeader>

            {!mode ? (
              <div className="py-4">
                <p className="text-center text-sm text-muted-foreground mb-6">
                  كيف تريد تجهيز دعوتك؟
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, use_custom_template: false }));
                      setMode("nakfeek");
                    }}
                    className="group relative rounded-2xl border-2 border-border hover:border-primary p-6 text-right transition-all hover:-translate-y-1 hover:shadow-elegant bg-gradient-to-br from-primary/5 via-card to-brand-gold/5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-brand-mauve flex items-center justify-center text-primary-foreground mb-3">
                      <Palette className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold font-cairo text-lg mb-1">خيارات نكفيك</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      اختر من قوالب جاهزة احترافية حسب نوع المناسبة — ألوان وخطوط ورسائل مُعدّة مسبقاً.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, use_custom_template: true }));
                      setMode("custom");
                    }}
                    className="group relative rounded-2xl border-2 border-border hover:border-brand-gold p-6 text-right transition-all hover:-translate-y-1 hover:shadow-elegant bg-gradient-to-br from-brand-gold/10 via-card to-brand-brick/5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-gold to-brand-brick flex items-center justify-center text-white mb-3">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold font-cairo text-lg mb-1">تصميمي الخاص</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      ارفع تصميمك الجاهز، وحدّد موقع اسم المدعو ليُكتب تلقائياً على كل دعوة.
                    </p>
                  </button>
                </div>
              </div>
            ) : (
            <Tabs defaultValue={mode === "custom" ? "custom" : "basic"} key={mode}>
              <TabsList className={`grid ${mode === "custom" ? "grid-cols-4" : "grid-cols-4"}`}>
                <TabsTrigger value="basic">الأساسيات</TabsTrigger>
                <TabsTrigger value="venue">الموقع</TabsTrigger>
                <TabsTrigger value="extras">إضافات</TabsTrigger>
                {mode === "nakfeek" ? (
                  <TabsTrigger value="design"><Palette className="w-3 h-3 ml-1" /> التصميم</TabsTrigger>
                ) : (
                  <TabsTrigger value="custom"><ImageIcon className="w-3 h-3 ml-1" /> تصميمي</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="basic" className="space-y-3 mt-4">
                {mode === "nakfeek" && (
                  <div>
                    <Label>نوع المناسبة</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mt-2">
                      {Object.entries(CATEGORY_PRESETS).map(([key, p]) => {
                        const active = form.category === key;
                        const Icon = p.Icon;
                        return (
                          <button
                            key={key}
                            type="button"
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
                            style={active ? {
                              borderColor: p.theme,
                              background: `linear-gradient(135deg, ${p.theme}15, ${p.accent}20)`,
                              boxShadow: `0 6px 20px -8px ${p.theme}60`,
                            } : undefined}
                            className={`group relative rounded-2xl border-2 p-3 text-xs flex flex-col items-center gap-2 transition-all duration-300 ${
                              active
                                ? "scale-[1.03] font-bold"
                                : "border-border/60 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md bg-card"
                            }`}
                          >
                            <span
                              style={{
                                background: active
                                  ? `linear-gradient(135deg, ${p.theme}, ${p.accent})`
                                  : undefined,
                                color: active ? "#fff" : p.theme,
                              }}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                active ? "shadow-lg" : "bg-muted/60 group-hover:bg-muted"
                              }`}
                            >
                              <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
                            </span>
                            <span className="leading-tight text-center">{p.label}</span>
                            {active && (
                              <span
                                style={{ background: p.theme }}
                                className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full ring-2 ring-background"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      اختيار النوع يضبط الألوان والخط والرسالة بشكل افتراضي — تقدر تعدّل أي شيء بعدها.
                    </p>
                  </div>
                )}
                {mode === "custom" && (
                  <div className="rounded-xl border-2 border-dashed border-brand-gold/40 bg-gradient-to-br from-brand-gold/10 to-transparent p-4">
                    <h4 className="font-bold text-sm flex items-center gap-1 mb-1">
                      <ImageIcon className="w-4 h-4 text-brand-gold" /> تصميمك الخاص
                    </h4>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      عبّي بيانات الدعوة الأساسية هنا (العنوان، التاريخ، الرسالة، الموقع، التواصل) — هذي البيانات تظهر في صفحة الدعوة تحت تصميمك.
                      تصميم الكرت نفسه ومواقع أسماء المدعوين تضبطها من تبويب <span className="font-bold">«تصميمي»</span>.
                    </p>
                  </div>
                )}
                <div><Label>عنوان الدعوة *</Label><Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={form.category === "opening" ? "افتتاح فرع الرياض" : form.category === "forum" ? "ملتقى القيادات 2026" : "حفل زفاف فلان وفلانة"} /></div>
                <div><Label>{form.formality === "business" ? "الجهة المنظمة" : "اسم المضيف"}</Label><Input value={form.host_name || ""} onChange={(e) => setForm({ ...form, host_name: e.target.value })} /></div>
                <div><Label>تاريخ ووقت المناسبة *</Label><Input type="datetime-local" value={form.event_date || ""} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
                <div>
                  <Label>{mode === "custom" ? "الرسالة الخاصة (تظهر تحت تصميمك)" : "رسالة الدعوة المخصصة"}</Label>
                  <Textarea rows={4} value={form.custom_message || ""} onChange={(e) => setForm({ ...form, custom_message: e.target.value })} placeholder={mode === "custom" ? "اكتب هنا الرسالة اللي تبغى تظهر مع دعوتك" : ""} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>جوال التواصل</Label><Input dir="ltr" value={form.contact_phone || ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+9665..." /></div>
                  <div><Label>واتساب</Label><Input dir="ltr" value={form.contact_whatsapp || ""} onChange={(e) => setForm({ ...form, contact_whatsapp: e.target.value })} placeholder="+9665..." /></div>
                  <div><Label>البريد</Label><Input dir="ltr" value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
                </div>
              </TabsContent>


              <TabsContent value="venue" className="space-y-3 mt-4">
                <div><Label>اسم الموقع</Label><Input value={form.venue_name || ""} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} placeholder="قاعة الماسة" /></div>
                <div><Label>العنوان</Label><Input value={form.venue_address || ""} onChange={(e) => setForm({ ...form, venue_address: e.target.value })} /></div>
                <div><Label>رابط الخريطة (Google Maps)</Label><Input dir="ltr" value={form.venue_map_url || ""} onChange={(e) => setForm({ ...form, venue_map_url: e.target.value })} /></div>
                <div><Label>الزي المطلوب</Label><Input value={form.dress_code || ""} onChange={(e) => setForm({ ...form, dress_code: e.target.value })} placeholder="رسمي / تقليدي" /></div>
              </TabsContent>

              <TabsContent value="extras" className="space-y-3 mt-4">
                <div className="rounded-xl border-2 border-dashed p-3 space-y-3 bg-gradient-to-br from-primary/5 to-transparent">
                  <Label className="text-sm font-bold">نطاق الدعوة</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "private", title: "خاصة", desc: "بقائمة مدعوين محددة — كل مدعو له رابط فريد" },
                      { key: "public",  title: "عامة",  desc: "رابط واحد يُشارك — أي شخص يقدر يأكد حضوره" },
                    ].map((o) => {
                      const active = (form.scope || "private") === o.key;
                      return (
                        <button
                          key={o.key}
                          type="button"
                          onClick={() => setForm({ ...form, scope: o.key })}
                          className={`text-right rounded-xl border-2 p-3 transition ${
                            active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 bg-card"
                          }`}
                        >
                          <div className="font-bold text-sm">{o.title}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{o.desc}</div>
                        </button>
                      );
                    })}
                  </div>

                  {form.scope === "private" && (
                    <div className="pt-1">
                      <Label className="text-xs">الحد الأقصى لإجمالي الحاضرين (اختياري)</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="اتركه فارغ = بلا حد"
                        value={form.max_attendees ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, max_attendees: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        لا يُسمح بتأكيد دعوات جديدة بعد بلوغ هذا العدد (شامل المرافقين).
                      </p>
                    </div>
                  )}

                  {form.scope === "public" && (
                    <div className="pt-1">
                      <Label className="text-xs">الحد الأقصى للحاضرين *</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="مثلاً 200"
                        value={form.max_attendees ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, max_attendees: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        مطلوب للدعوات العامة لمنع تجاوز سعة المكان.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between bg-muted/30 rounded-xl p-3">
                  <div>
                    <Label>السماح بالمرافقين</Label>
                    <p className="text-xs text-muted-foreground">يقدر المدعو يحدد عدد المرافقين عند التأكيد</p>
                  </div>
                  <Switch checked={!!form.allow_companions} onCheckedChange={(v) => setForm({ ...form, allow_companions: v })} />
                </div>
                {form.allow_companions && (
                  <div><Label>الحد الأقصى للمرافقين</Label><Input type="number" min={0} value={form.max_companions || 0} onChange={(e) => setForm({ ...form, max_companions: Number(e.target.value) })} /></div>
                )}
                <div className="border-t pt-3">
                  <Label className="flex items-center gap-1"><Gift className="w-4 h-4" /> قائمة الهدايا / التحويلات</Label>
                </div>
                <div><Label>ملاحظات الهدايا</Label><Textarea rows={2} value={form.gift_notes || ""} onChange={(e) => setForm({ ...form, gift_notes: e.target.value })} placeholder="تكفون يا أحبابنا، حضوركم هديتنا..." /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>اسم البنك</Label><Input value={form.gift_bank_name || ""} onChange={(e) => setForm({ ...form, gift_bank_name: e.target.value })} /></div>
                  <div><Label>اسم المستفيد</Label><Input value={form.gift_account_holder || ""} onChange={(e) => setForm({ ...form, gift_account_holder: e.target.value })} /></div>
                  <div><Label>IBAN</Label><Input dir="ltr" value={form.gift_iban || ""} onChange={(e) => setForm({ ...form, gift_iban: e.target.value })} /></div>
                </div>
              </TabsContent>

              <TabsContent value="design" className="mt-4">
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

              <TabsContent value="custom" className="mt-4 space-y-3">
                <div className="flex items-center justify-between bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/30 rounded-2xl p-3">
                  <div>
                    <Label className="text-sm font-bold flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" /> استخدام تصميمي الخاص
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      ارفع تصميم الدعوة الجاهز وحدد موضع اسم المدعو — يتم طباعته على كل دعوة تلقائياً.
                    </p>
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
                  <p className="text-xs text-center text-muted-foreground py-6">
                    فعّل الخيار أعلاه لرفع تصميم خاص بك بدلاً من القوالب الجاهزة.
                  </p>
                )}
              </TabsContent>
            </Tabs>
            )}

            <DialogFooter className="mt-4 gap-2">
              {mode && !editing && (
                <Button variant="ghost" onClick={() => setMode(null)}>← رجوع</Button>
              )}
              <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              {mode && <Button onClick={save}>{editing ? "حفظ التعديلات" : "إنشاء الدعوة"}</Button>}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Guests Dialog */}
        <Dialog open={guestsOpen} onOpenChange={setGuestsOpen}>
          <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إدارة المدعوين — {activeInv?.title}</DialogTitle>
            </DialogHeader>

            {/* عداد المؤكدين حسب التصنيف — أعلى الصفحة ليجهز المنظم لكل فئة */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {TIER_KEYS.map((k) => {
                const confirmed = guests.filter(
                  (g) => g.rsvp_status === "confirmed" && (g.guest_tier || "regular") === k
                ).length;
                return (
                  <div key={k} className={`rounded-xl border p-3 text-center ${GUEST_TIERS[k].cls}`}>
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold">
                      {k === "vvip" && <Crown className="w-3.5 h-3.5" />}
                      {GUEST_TIERS[k].label}
                    </div>
                    <div className="text-2xl font-extrabold leading-tight mt-0.5">{confirmed}</div>
                    <div className="text-[10px] opacity-80">{confirmed >= 2 && confirmed <= 10 ? "مؤكدين" : "مؤكد"}</div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={openImport}>
                <Database className="w-4 h-4 ml-1" /> استيراد من قاعدة بيانات
              </Button>
              <Button size="sm" onClick={sendAllPending} disabled={bulkSending || guests.length === 0}>
                {bulkSending ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
                إرسال للكل عبر واتساب
              </Button>
              <div className="flex items-center gap-1.5 flex-wrap self-center mr-auto">
                <span className="text-[11px] font-semibold bg-muted text-muted-foreground rounded-full px-2.5 py-1">
                  المجموع: {guests.length}
                </span>
                <span className="text-[11px] font-semibold bg-green-500/10 text-green-700 rounded-full px-2.5 py-1">
                  مؤكد: {guests.filter((g) => g.rsvp_status === "confirmed").length}
                </span>
                <span className="text-[11px] font-semibold bg-destructive/10 text-destructive rounded-full px-2.5 py-1">
                  اعتذر: {guests.filter((g) => g.rsvp_status === "declined").length}
                </span>
                <span className="text-[11px] font-semibold bg-indigo-500/10 text-indigo-700 rounded-full px-2.5 py-1">
                  لم يرد بعد: {guests.filter((g) => !["confirmed", "declined"].includes(g.rsvp_status)).length}
                </span>
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-3 mb-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <Input placeholder="اسم المدعو *" value={newGuest.guest_name} onChange={(e) => setNewGuest({ ...newGuest, guest_name: e.target.value })} />
                <Input dir="ltr" placeholder="+9665..." value={newGuest.guest_phone} onChange={(e) => setNewGuest({ ...newGuest, guest_phone: e.target.value })} />
                <Input dir="ltr" placeholder="البريد (اختياري)" value={newGuest.guest_email} onChange={(e) => setNewGuest({ ...newGuest, guest_email: e.target.value })} />
                <Button onClick={addGuest}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" /> تصنيف المدعو:
                </span>
                {TIER_KEYS.map((k) => {
                  const active = newGuest.guest_tier === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setNewGuest({ ...newGuest, guest_tier: k })}
                      className={`text-[11px] font-bold rounded-full px-3 py-1 border transition ${
                        active ? GUEST_TIERS[k].cls + " ring-1 ring-current" : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {GUEST_TIERS[k].label}
                    </button>
                  );
                })}
                <span className="text-[10px] text-muted-foreground">— يراه المنظم فقط ولا يظهر للمدعو</span>
              </div>
            </div>

            <div className="space-y-2">
              {guests.length === 0 && <p className="text-center text-muted-foreground p-6">لا يوجد مدعوين بعد</p>}
              {guests.map((g) => (
                <div key={g.id} className="border rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{g.guest_name}</span>
                      <select
                        value={g.guest_tier || "regular"}
                        onChange={(e) => updateTier(g, e.target.value)}
                        title="تصنيف المدعو — يحدده المنظم فقط"
                        className={`text-[10px] font-bold rounded-full px-2 py-0.5 border cursor-pointer appearance-none text-center ${
                          GUEST_TIERS[g.guest_tier || "regular"]?.cls || GUEST_TIERS.regular.cls
                        }`}
                      >
                        {TIER_KEYS.map((k) => (
                          <option key={k} value={k}>{GUEST_TIERS[k].label}</option>
                        ))}
                      </select>
                      {trackingBadge(g)}
                      {g.companions_count > 0 && <span className="text-xs text-muted-foreground">+{g.companions_count} مرافق</span>}
                    </div>
                    {g.guest_phone && <p className="text-xs text-muted-foreground" dir="ltr">{g.guest_phone}</p>}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => copy(inviteUrl(g.token))}>
                      <Copy className="w-3 h-3 ml-1" /> رابط
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setQrGuest(g)}>
                      <QrCode className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(inviteUrl(g.token), "_blank")}>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                    <Button size="sm" onClick={() => sendWhatsApp(g)}>
                      <Send className="w-3 h-3 ml-1" /> واتساب
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeGuest(g.id)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* أيام الدعوة — مناسبة متعددة الأيام */}
        <Dialog open={!!daysInv} onOpenChange={(v) => !v && setDaysInv(null)}>
          <DialogContent dir="rtl" className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" /> أيام المناسبة — {daysInv?.title}
              </DialogTitle>
            </DialogHeader>
            {!invDaysSupported ? (
              <p className="text-xs text-amber-700 bg-amber-500/10 border border-amber-400/30 rounded-lg p-3">
                نفّذ ملف SQL الخاص بأيام الدعوات (invitation_days) لتفعيل هذه الميزة
              </p>
            ) : (
              <>
                <p className="text-[11px] text-muted-foreground -mt-2">
                  للمناسبات الممتدة لعدة أيام — حضور كل يوم يُسجل مستقلاً وتشوفه في قائمة الحضور
                </p>

                {/* بوابات المناسبة — قسم قابل للطي حتى لا تزدحم الواجهة */}
                <details className="border rounded-xl overflow-hidden group">
                  <summary className="cursor-pointer select-none px-3 py-2.5 text-sm font-bold flex items-center gap-2 bg-muted/30 hover:bg-muted/50">
                    <DoorOpen className="w-4 h-4 text-primary" /> بوابات المناسبة
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {invGates.length ? `${invGates.length} بوابة` : "اختياري — للمناسبات الكبيرة"}
                    </span>
                  </summary>
                  <div className="p-3 space-y-2">
                    {!invGatesSupported ? (
                      <p className="text-[11px] text-amber-700 bg-amber-500/10 rounded-lg px-2 py-1.5">
                        نفّذ ملف SQL الخاص ببوابات الدعوات (invitation_gates) لتفعيل هذا القسم
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          {invGates.length === 0 && (
                            <span className="text-[11px] text-muted-foreground">
                              بدون بوابات تستخدم أزرار دخول/خروج البسيطة في شاشة المسح
                            </span>
                          )}
                          {invGates.map(g => (
                            <span key={g.id} className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 ${g.gate_type === "exit" ? "bg-amber-500/10 text-amber-700" : "bg-teal/10 text-teal-700"}`}>
                              {g.name_ar} · {g.gate_type === "exit" ? "خروج" : "دخول"}
                              <button type="button" onClick={() => removeInvGate(g.id)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-1.5 flex-wrap items-center">
                          <Input
                            value={newGate.name}
                            onChange={e => setNewGate({ ...newGate, name: e.target.value })}
                            placeholder="اسم البوابة (البوابة الرئيسية...)"
                            className="h-8 w-44 text-xs"
                          />
                          <select
                            value={newGate.type}
                            onChange={e => setNewGate({ ...newGate, type: e.target.value })}
                            className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                          >
                            <option value="entry">دخول</option>
                            <option value="exit">خروج</option>
                          </select>
                          <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={addInvGate} disabled={!newGate.name.trim()}>
                            <Plus className="w-3 h-3" /> إضافة بوابة
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </details>
                {invDays.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">لا أيام بعد — أضف اليوم الأول</p>
                )}
                <div className="space-y-2">
                  {invDays.map(d => (
                    <div key={d.id} className="border rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-extrabold flex items-center justify-center text-sm">{d.day_number}</span>
                        <Input value={d.title || ""} onChange={e => updateInvDayLocal(d.id, { title: e.target.value })} className="h-8 w-36 font-bold text-sm" />
                        <Input type="date" value={d.day_date} onChange={e => updateInvDayLocal(d.id, { day_date: e.target.value })} className="h-8 w-36 text-sm" />
                        <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => saveInvDay(d)}>
                          <Save className="w-3 h-3" /> حفظ
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 rounded-full text-destructive" onClick={() => removeInvDay(d)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <Input
                        value={d.notes || ""}
                        onChange={e => updateInvDayLocal(d.id, { notes: e.target.value })}
                        placeholder="التجهيزات اليومية (القاعة، الضيافة...)"
                        className="h-8 text-xs"
                      />
                      {invGatesSupported && invGates.length > 0 && (() => {
                        const dayLinks = invGateLinks.filter(l => l.day_id === d.id);
                        const linked = dayLinks
                          .map(l => ({ link: l, gate: invGates.find(g => g.id === l.gate_id) }))
                          .filter(x => x.gate) as { link: { id: string }; gate: { id: string; name_ar: string; gate_type: string } }[];
                        const addable = invGates.filter(g => !dayLinks.some(l => l.gate_id === g.id));
                        return (
                          <details className="border rounded-lg overflow-hidden">
                            <summary className="cursor-pointer select-none px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1.5 bg-muted/20 hover:bg-muted/40">
                              <DoorOpen className="w-3 h-3 text-primary" /> بوابات هذا اليوم
                              <span className="font-normal text-muted-foreground">({linked.length ? `${linked.length} مسندة` : "الكل يعمل"})</span>
                            </summary>
                            <div className="p-2 space-y-1.5">
                              <div className="flex flex-wrap gap-1">
                                {linked.length === 0 && (
                                  <span className="text-[10px] text-muted-foreground">لا بوابات مسندة — كل بوابات المناسبة تعمل في هذا اليوم</span>
                                )}
                                {linked.map(({ link, gate }) => (
                                  <span key={link.id} className="inline-flex items-center gap-1 text-[10px] font-bold bg-teal/10 text-teal-700 rounded-full px-2 py-0.5">
                                    {gate.name_ar} · {gate.gate_type === "exit" ? "خروج" : "دخول"}
                                    <button type="button" onClick={() => unlinkInvGate(link.id)} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                                  </span>
                                ))}
                              </div>
                              {addable.length > 0 && (
                                <select
                                  defaultValue=""
                                  onChange={e => { if (e.target.value) { linkInvGate(e.target.value, d.id); e.target.value = ""; } }}
                                  className="h-7 rounded-lg border border-border bg-background px-2 text-[11px]"
                                >
                                  <option value="">+ إسناد بوابة لهذا اليوم</option>
                                  {addable.map(g => <option key={g.id} value={g.id}>{g.name_ar} ({g.gate_type === "exit" ? "خروج" : "دخول"})</option>)}
                                </select>
                              )}
                            </div>
                          </details>
                        );
                      })()}
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="rounded-full w-full" onClick={addInvDay}>
                  <Plus className="w-4 h-4" /> إضافة يوم
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* قائمة حضور الدعوة */}
        <Dialog open={!!attInv} onOpenChange={(v) => !v && setAttInv(null)}>
          <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" /> قائمة الحضور — {attInv?.title}
              </DialogTitle>
            </DialogHeader>
            <p className="text-[11px] text-muted-foreground -mt-2">
              تُعبأ تلقائياً عند مسح دعوة الضيف على البوابات: الدخول من بوابات الدخول والخروج من بوابات الخروج
            </p>
            {attDays.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-[11px] text-muted-foreground font-semibold">عرض حسب اليوم:</span>
                <button
                  type="button"
                  onClick={() => setAttDayFilter("all")}
                  className={`text-[11px] font-bold rounded-full px-3 py-1 border transition ${attDayFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  كامل المناسبة
                </button>
                {attDays.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setAttDayFilter(d.id)}
                    className={`text-[11px] font-bold rounded-full px-3 py-1 border transition ${attDayFilter === d.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >
                    {d.title || `اليوم ${d.day_number}`}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {(() => {
                const times = attGuests.map(g => guestTimes(g));
                return (
                  <>
                    <span className="text-[11px] font-semibold bg-green-500/10 text-green-700 rounded-full px-2.5 py-1">
                      دخلوا: {times.filter(t => t.entry).length}
                    </span>
                    <span className="text-[11px] font-semibold bg-primary/10 text-primary rounded-full px-2.5 py-1">
                      بالداخل الآن: {times.filter(t => t.entry && !t.exit).length}
                    </span>
                    <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 rounded-full px-2.5 py-1">
                      غادروا: {times.filter(t => t.exit).length}
                    </span>
                  </>
                );
              })()}
            </div>
            {attGuests.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">لا يوجد مدعوون بعد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs">
                    <tr>
                      <th className="text-right p-2.5">المدعو</th>
                      <th className="text-right p-2.5">التصنيف</th>
                      <th className="text-right p-2.5">وقت الدخول</th>
                      <th className="text-right p-2.5">وقت الخروج</th>
                      <th className="text-right p-2.5">مدة البقاء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {attGuests.map(g => {
                      const tierMeta = GUEST_TIERS[g.guest_tier || "regular"] || GUEST_TIERS.regular;
                      const { entry, exit } = guestTimes(g);
                      const stay = computeStay(entry, exit);
                      return (
                        <tr key={g.id} className="hover:bg-muted/20">
                          <td className="p-2.5 font-bold">{g.guest_name}</td>
                          <td className="p-2.5">
                            <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${tierMeta.cls}`}>{tierMeta.label}</span>
                          </td>
                          <td className="p-2.5 text-xs">
                            {entry
                              ? <span className="text-green-700 font-semibold">{new Date(entry).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}</span>
                              : <span className="text-muted-foreground">لم يدخل بعد</span>}
                          </td>
                          <td className="p-2.5 text-xs">
                            {exit
                              ? <span className="text-amber-700 font-semibold">{new Date(exit).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}</span>
                              : entry
                              ? <span className="text-primary font-semibold">بالداخل</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="p-2.5 text-xs font-bold">{stay ? formatDuration(stay) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* QR Dialog */}
        <Dialog open={!!qrGuest} onOpenChange={(v) => !v && setQrGuest(null)}>
          <DialogContent dir="rtl" className="max-w-sm">
            <DialogHeader><DialogTitle>QR Code — {qrGuest?.guest_name}</DialogTitle></DialogHeader>
            {qrGuest && (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="bg-white p-4 rounded-2xl">
                  <QRCodeSVG value={inviteUrl(qrGuest.token)} size={220} />
                </div>
                <p className="text-xs text-muted-foreground text-center break-all" dir="ltr">{inviteUrl(qrGuest.token)}</p>
                <Button variant="outline" onClick={() => copy(inviteUrl(qrGuest.token))} className="w-full">
                  <Copy className="w-4 h-4 ml-1" /> نسخ الرابط
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Import from list */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader><DialogTitle>استيراد من قاعدة بيانات</DialogTitle></DialogHeader>
            {lists.length === 0 ? (
              <div className="text-center py-8">
                <Database className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">لا توجد قوائم بعد</p>
                <Button asChild variant="outline" size="sm">
                  <a href="/dashboard/guest-lists">إنشاء قائمة جديدة</a>
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {lists.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setImportingListId(l.id)}
                    className={`w-full text-right border rounded-xl p-3 flex items-center justify-between gap-2 transition ${
                      importingListId === l.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary" />
                      <span className="font-bold">{l.name}</span>
                    </div>
                    <Badge variant="secondary">{l.count} جهة</Badge>
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              سيتم تجاهل الجهات الموجودة مسبقاً (بناءً على الجوال أو البريد).
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)}>إلغاء</Button>
              <Button onClick={doImport} disabled={!importingListId}>استيراد</Button>
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
      </div>
    </DashboardLayout>
  );
};

export default PrivateInvitations;
