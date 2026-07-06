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
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  Mail, Plus, Pencil, Trash2, Users, ExternalLink, Copy, QrCode, Palette,
  Calendar, MapPin, Shirt, Phone, Gift, Send, CheckCircle2, X,
  Heart, Flower2, GraduationCap, Cake, Landmark, Mic2, Scissors, Crown, Briefcase, Sparkles,
  Upload, Image as ImageIcon, Loader2, Database,
  type LucideIcon,
} from "lucide-react";
import DesignStudio from "@/components/design/DesignStudio";
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
}

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
};

const PrivateInvitations = () => {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [items, setItems] = useState<Inv[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Inv | null>(null);
  const [mode, setMode] = useState<"nakfeek" | "custom" | null>(null);
  const [form, setForm] = useState<Partial<Inv>>(emptyForm);

  const [guestsOpen, setGuestsOpen] = useState(false);
  const [activeInv, setActiveInv] = useState<Inv | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [newGuest, setNewGuest] = useState({ guest_name: "", guest_phone: "", guest_email: "" });

  const [qrGuest, setQrGuest] = useState<Guest | null>(null);
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
    if (editing) {
      const { error } = await supabase.from("private_invitations").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("تم التحديث");
    } else {
      const { error } = await supabase.from("private_invitations").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("تم إنشاء الدعوة");
    }
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
    const { error } = await supabase.from("private_invitation_guests").insert({
      invitation_id: activeInv.id,
      guest_name: newGuest.guest_name.trim(),
      guest_phone: newGuest.guest_phone || null,
      guest_email: newGuest.guest_email || null,
    });
    if (error) return toast.error(error.message);
    setNewGuest({ guest_name: "", guest_phone: "", guest_email: "" });
    await loadGuests(activeInv.id);
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

            <div className="flex flex-wrap gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={openImport}>
                <Database className="w-4 h-4 ml-1" /> استيراد من قاعدة بيانات
              </Button>
              <Button size="sm" onClick={sendAllPending} disabled={bulkSending || guests.length === 0}>
                {bulkSending ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
                إرسال للكل عبر واتساب
              </Button>
              <span className="text-xs text-muted-foreground self-center mr-auto">
                المجموع: {guests.length} · مؤكد: {guests.filter((g) => g.rsvp_status === "confirmed").length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-muted/30 rounded-xl p-3 mb-3">
              <Input placeholder="اسم المدعو *" value={newGuest.guest_name} onChange={(e) => setNewGuest({ ...newGuest, guest_name: e.target.value })} />
              <Input dir="ltr" placeholder="+9665..." value={newGuest.guest_phone} onChange={(e) => setNewGuest({ ...newGuest, guest_phone: e.target.value })} />
              <Input dir="ltr" placeholder="البريد (اختياري)" value={newGuest.guest_email} onChange={(e) => setNewGuest({ ...newGuest, guest_email: e.target.value })} />
              <Button onClick={addGuest}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
            </div>

            <div className="space-y-2">
              {guests.length === 0 && <p className="text-center text-muted-foreground p-6">لا يوجد مدعوين بعد</p>}
              {guests.map((g) => (
                <div key={g.id} className="border rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{g.guest_name}</span>
                      {statusBadge(g.rsvp_status)}
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
      </div>
    </DashboardLayout>
  );
};

export default PrivateInvitations;
