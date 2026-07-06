import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/landing/Navbar";
import AttendeeCard from "@/components/networking/AttendeeCard";
import AvatarCropDialog from "@/components/networking/AvatarCropDialog";
import { toast } from "sonner";
import {
  Loader2, Upload, User as UserIcon, Briefcase, Mail, Phone, Linkedin, Instagram,
  CheckCircle, AlertCircle, Save, Ticket, Users2, Sparkles, Share2, Download,
  QrCode, Globe, X as XIcon, Eye, Lock, Award, Calendar, Copy, Heart,
} from "lucide-react";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "الاسم يجب أن يكون حرفين أو أكثر").max(80),
  phone: z.string().trim().regex(/^\+?9665\d{8}$/, "صيغة الجوال: +9665XXXXXXXX"),
  job_title: z.string().trim().max(80).optional().or(z.literal("")),
  company: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().trim().max(200).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url("رابط LinkedIn غير صالح").max(200).optional().or(z.literal("")),
  x_handle: z.string().trim().max(40).optional().or(z.literal("")),
  instagram_handle: z.string().trim().max(40).optional().or(z.literal("")),
});

interface Stats {
  registrations: number;
  upcoming: number;
  connections: number;
  points: number;
}

const MyProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const requiredMode = search.get("required") === "1";
  const returnTo = search.get("return") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<Stats>({ registrations: 0, upcoming: 0, connections: 0, points: 0 });
  const [connectCode, setConnectCode] = useState<string>("");
  const [privacyLevel, setPrivacyLevel] = useState<string>("event_only");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [expInput, setExpInput] = useState("");
  const [lfInput, setLfInput] = useState("");
  const [downloading, setDownloading] = useState(false);
  // Card customization
  const [cardLogoUrl, setCardLogoUrl] = useState<string>("");
  const [ringColor, setRingColor] = useState<string>("#CC8E3D");
  const [bgFrom, setBgFrom] = useState<string>("#2b1342");
  const [bgTo, setBgTo] = useState<string>("#7a2855");
  const [tierLabel, setTierLabel] = useState<string>("GUEST");
  const [logoUploading, setLogoUploading] = useState(false);
  const cardLogoInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    full_name: "", phone: "", avatar_url: "",
    job_title: "", company: "", bio: "",
    linkedin_url: "", x_handle: "", instagram_handle: "",
  });

  // Hydrate form
  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name || "",
      phone: profile.phone || "",
      avatar_url: profile.avatar_url || "",
      job_title: profile.job_title || "",
      company: profile.company || "",
      bio: profile.bio || "",
      linkedin_url: profile.linkedin_url || "",
      x_handle: profile.x_handle || "",
      instagram_handle: profile.instagram_handle || "",
    });
  }, [profile]);

  // Fetch networking profile + stats
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: net }, regsRes, connRes, ptsRes] = await Promise.all([
        supabase.from("networking_profiles").select("connect_code, privacy_level, expertise, looking_for, card_logo_url, ring_color, bg_color_from, bg_color_to, tier_label").eq("user_id", user.id).maybeSingle(),
        supabase.from("registrations").select("event_id, events!inner(start_date)", { count: "exact" }).eq("attendee_id", user.id),
        supabase.from("networking_connections").select("id", { count: "exact", head: true }).or(`scanner_id.eq.${user.id},scanned_id.eq.${user.id}`),
        supabase.from("attendee_points").select("points").eq("user_id", user.id),
      ]);
      if (net) {
        const n: any = net;
        setConnectCode(n.connect_code || "");
        setPrivacyLevel(n.privacy_level || "event_only");
        setExpertise(n.expertise || []);
        setLookingFor(n.looking_for || []);
        if (n.card_logo_url) setCardLogoUrl(n.card_logo_url);
        if (n.ring_color) setRingColor(n.ring_color);
        if (n.bg_color_from) setBgFrom(n.bg_color_from);
        if (n.bg_color_to) setBgTo(n.bg_color_to);
        if (n.tier_label) setTierLabel(n.tier_label);
      }
      const upcoming = ((regsRes.data || []) as any[]).filter(r => r.events?.start_date && new Date(r.events.start_date) > new Date()).length;
      setStats({
        registrations: regsRes.count || 0,
        upcoming,
        connections: connRes.count || 0,
        points: (ptsRes.data || []).reduce((s, r: any) => s + (r.points || 0), 0),
      });
      setLoading(false);
    })();
  }, [user]);

  // Completion percentage
  const completion = useMemo(() => {
    const fields = [
      form.full_name, form.phone, form.avatar_url, form.job_title, form.company,
      form.bio, form.linkedin_url, form.x_handle, form.instagram_handle,
    ];
    const filled = fields.filter(v => v && v.trim().length > 0).length;
    return { filled, total: fields.length, pct: Math.round((filled / fields.length) * 100) };
  }, [form]);

  const isComplete = !!(form.full_name.trim().length >= 2 && /^\+?9665\d{8}$/.test(form.phone || ""));

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-pick same file
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("الحد الأقصى للصورة 5 ميجا"); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCroppedUpload = async (blob: Blob) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      setForm(f => ({ ...f, avatar_url: url }));
      const { error: saveErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (saveErr) throw saveErr;
      toast.success("تم تحديث الصورة");
    } catch (err: any) {
      toast.error("تعذّر رفع الصورة: " + (err.message || ""));
    } finally {
      setUploading(false);
    }
  };

  const handleCardLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("الحد الأقصى للشعار 2 ميجا"); return; }
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/card-logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
      setCardLogoUrl(pub.publicUrl);
      toast.success("تم رفع الشعار — اضغط حفظ");
    } catch (err: any) {
      toast.error("تعذّر رفع الشعار: " + (err.message || ""));
    } finally {
      setLogoUploading(false);
    }
  };

  const addTag = (kind: "exp" | "lf", val: string) => {
    const t = val.trim();
    if (!t) return;
    if (kind === "exp") {
      setExpertise(prev => prev.includes(t) || prev.length >= 8 ? prev : [...prev, t]);
      setExpInput("");
    } else {
      setLookingFor(prev => prev.includes(t) || prev.length >= 6 ? prev : [...prev, t]);
      setLfInput("");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      setActiveTab(parsed.error.issues[0].path[0] === "full_name" || parsed.error.issues[0].path[0] === "phone" ? "personal" : activeTab);
      return;
    }
    setSaving(true);
    const [{ error: pErr }, { data: netSaved, error: nErr }] = await Promise.all([
      supabase.from("profiles").update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        avatar_url: form.avatar_url || null,
        job_title: form.job_title?.trim() || null,
        company: form.company?.trim() || null,
        bio: form.bio?.trim() || null,
        linkedin_url: form.linkedin_url?.trim() || null,
        x_handle: form.x_handle?.trim().replace(/^@/, "") || null,
        instagram_handle: form.instagram_handle?.trim().replace(/^@/, "") || null,
        profile_completed: true,
      } as any).eq("id", user.id),
      supabase.from("networking_profiles").upsert({
        user_id: user.id,
        privacy_level: privacyLevel,
        expertise,
        looking_for: lookingFor,
        job_title: form.job_title?.trim() || null,
        company: form.company?.trim() || null,
        bio: form.bio?.trim() || null,
        linkedin_url: form.linkedin_url?.trim() || null,
        twitter_handle: form.x_handle?.trim().replace(/^@/, "") || null,
        instagram_handle: form.instagram_handle?.trim().replace(/^@/, "") || null,
        whatsapp: form.phone?.trim() || null,
        email_public: profile?.email || null,
        card_logo_url: cardLogoUrl || null,
        ring_color: ringColor || null,
        bg_color_from: bgFrom || null,
        bg_color_to: bgTo || null,
        tier_label: tierLabel?.trim() || null,
      } as any, { onConflict: "user_id" }).select("connect_code").maybeSingle(),
    ]);
    setSaving(false);
    if (pErr || nErr) { toast.error("فشل الحفظ: " + (pErr?.message || nErr?.message)); return; }
    if (netSaved?.connect_code) setConnectCode(netSaved.connect_code);
    await refreshProfile();
    setSavedAt(new Date());
    toast.success("تم حفظ ملفك بنجاح ✅");
    if (returnTo) setTimeout(() => navigate(returnTo), 1200);
  };

  const connectUrl = connectCode ? `${window.location.origin}/connect/${connectCode}` : "";

  const downloadCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3, cacheBust: true, backgroundColor: "#492C5A",
        filter: (node) => {
          if (node instanceof HTMLImageElement) {
            try {
              const u = new URL(node.src, window.location.href);
              return u.origin === window.location.origin || node.src.startsWith("data:");
            } catch { return false; }
          }
          return true;
        },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `nakfeek-card-${connectCode || "card"}.png`;
      a.click();
    } catch {
      toast.error("تعذّر إنشاء الصورة");
    } finally {
      setDownloading(false);
    }
  };

  const copyLink = () => {
    if (!connectUrl) { toast.error("احفظ ملفك أولاً لإنشاء الرابط"); return; }
    navigator.clipboard.writeText(connectUrl);
    toast.success("تم نسخ الرابط");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20 font-cairo" dir="rtl">
      <Navbar />

      {/* Hero */}
      <section className="relative gradient-hero pt-24 pb-32">
        <div className="absolute inset-0 nakfeek-pattern opacity-10" />
        <div className="container mx-auto px-4 relative">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="relative">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-primary-foreground/15 backdrop-blur border-4 border-primary-foreground/30 overflow-hidden flex items-center justify-center shadow-xl">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary-foreground">{form.full_name?.[0] || "؟"}</span>
                )}
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute -bottom-2 -left-2 w-9 h-9 rounded-full bg-brand-gold text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
            </div>
            <div className="flex-1 min-w-0 text-primary-foreground">
              <h1 className="font-display text-2xl md:text-3xl">{form.full_name || "ملفي الشخصي"}</h1>
              {(form.job_title || form.company) && (
                <p className="text-primary-foreground/85 text-sm mt-1">
                  {form.job_title}{form.job_title && form.company ? " • " : ""}<span className="text-brand-gold font-semibold">{form.company}</span>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {isComplete ? (
                  <Badge className="bg-brand-teal/90 hover:bg-brand-teal text-white gap-1"><CheckCircle className="w-3 h-3" /> ملف مكتمل</Badge>
                ) : (
                  <Badge className="bg-brand-brick/90 hover:bg-brand-brick text-white gap-1"><AlertCircle className="w-3 h-3" /> غير مكتمل</Badge>
                )}
                {connectCode && (
                  <Button size="sm" variant="secondary" className="rounded-full h-7 gap-1.5 text-xs" onClick={copyLink}>
                    <Copy className="w-3 h-3" /> نسخ رابط بطاقتي
                  </Button>
                )}
                <Button size="sm" variant="secondary" className="rounded-full h-7 gap-1.5 text-xs" asChild>
                  <Link to="/my-tickets"><Ticket className="w-3 h-3" /> تذاكري</Link>
                </Button>
                <Button size="sm" variant="secondary" className="rounded-full h-7 gap-1.5 text-xs" asChild>
                  <Link to="/my/connections"><Users2 className="w-3 h-3" /> اتصالاتي</Link>
                </Button>
                <Button size="sm" variant="secondary" className="rounded-full h-7 gap-1.5 text-xs" asChild>
                  <Link to="/favorites"><Heart className="w-3 h-3" /> المفضلة</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-6xl -mt-20 relative pb-12">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Ticket, label: "إجمالي تذاكري", value: stats.registrations, color: "text-primary", bg: "bg-primary/10" },
            { icon: Calendar, label: "فعاليات قادمة", value: stats.upcoming, color: "text-brand-teal", bg: "bg-brand-teal/10" },
            { icon: Users2, label: "اتصالات", value: stats.connections, color: "text-brand-brick", bg: "bg-brand-brick/10" },
            { icon: Award, label: "نقاطي", value: stats.points, color: "text-brand-gold", bg: "bg-brand-gold/10" },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl ${s.bg} ${s.color} flex items-center justify-center flex-shrink-0`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                <p className="font-bold text-foreground text-xl">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Completion bar */}
        <div className="bg-card border border-border/50 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-gold" />
              <span className="font-bold text-sm">اكتمال الملف</span>
            </div>
            <span className="text-xs text-muted-foreground">{completion.filled} من {completion.total} حقل • {completion.pct}%</span>
          </div>
          <Progress value={completion.pct} className="h-2" />
          {completion.pct < 100 && (
            <p className="text-[11px] text-muted-foreground mt-2">أكمل ملفك للحصول على بطاقة تواصل أكثر احترافية وبيانات دقيقة في تذاكرك</p>
          )}
        </div>

        {requiredMode && !profile?.profile_completed && (
          <div className="bg-brand-gold/10 border-2 border-brand-gold/40 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-brand-gold flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-foreground">أكمل ملفك أولاً</p>
              <p className="text-sm text-muted-foreground mt-0.5">قبل تسجيلك بأول فعالية، نحتاج اسمك ورقمك الكامل لطباعتهم في بطاقة الدخول</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main editor with tabs */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-4 mb-4 h-auto p-1">
                <TabsTrigger value="overview" className="text-xs"><Eye className="w-3.5 h-3.5 ml-1" /> نظرة</TabsTrigger>
                <TabsTrigger value="personal" className="text-xs"><UserIcon className="w-3.5 h-3.5 ml-1" /> شخصي</TabsTrigger>
                <TabsTrigger value="professional" className="text-xs"><Briefcase className="w-3.5 h-3.5 ml-1" /> مهني</TabsTrigger>
                <TabsTrigger value="networking" className="text-xs"><Sparkles className="w-3.5 h-3.5 ml-1" /> تواصل</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-4">
                <section className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                  <h2 className="font-bold flex items-center gap-2"><QrCode className="w-4 h-4" /> بطاقتك الرقمية</h2>
                  {connectCode ? (
                    <div className="flex items-center gap-4">
                      <div className="bg-white rounded-xl p-2 shadow-sm">
                        <QRCodeSVG value={connectUrl} size={100} fgColor="#492C5A" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">رابط بطاقتك العام</p>
                        <code className="text-[11px] text-foreground break-all block mt-1" dir="ltr">{connectUrl}</code>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button size="sm" variant="outline" className="rounded-full h-8" onClick={copyLink}><Copy className="w-3.5 h-3.5" /> نسخ</Button>
                          <Button size="sm" variant="outline" className="rounded-full h-8" onClick={downloadCard} disabled={downloading}>
                            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} تحميل PNG
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-full h-8" asChild>
                            <Link to={`/connect/${connectCode}`} target="_blank"><Share2 className="w-3.5 h-3.5" /> فتح كاملة</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">احفظ ملفك لإنشاء بطاقة تواصل مع رمز QR</p>
                  )}
                </section>

                <section className="bg-card rounded-2xl border border-border/50 p-5">
                  <h2 className="font-bold flex items-center gap-2 mb-3"><Lock className="w-4 h-4" /> خصوصية بطاقتي</h2>
                  <Select value={privacyLevel} onValueChange={setPrivacyLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event_only">حضور نفس الفعالية فقط</SelectItem>
                      <SelectItem value="nakfeek_users">جميع مستخدمي نكفيك</SelectItem>
                      <SelectItem value="public">عام (أي شخص يملك الرابط)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-2">يحدد من يقدر يشوف بياناتك عبر رابط البطاقة</p>
                </section>
              </TabsContent>

              {/* Personal */}
              <TabsContent value="personal" className="space-y-4">
                <section className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                  <h2 className="font-bold flex items-center gap-2"><UserIcon className="w-4 h-4" /> البيانات الأساسية <span className="text-xs text-destructive font-normal">(مطلوبة)</span></h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>الاسم الكامل *</Label>
                      <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="محمد عبدالله" />
                    </div>
                    <div>
                      <Label>الجوال * (واتساب)</Label>
                      <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+966500000000" dir="ltr" />
                    </div>
                  </div>
                  <div>
                    <Label>البريد الإلكتروني</Label>
                    <Input value={profile?.email || ""} disabled dir="ltr" className="bg-muted/40" />
                    <p className="text-[11px] text-muted-foreground mt-1">يُستخدم لتسجيل الدخول ولا يمكن تعديله</p>
                  </div>
                </section>
              </TabsContent>

              {/* Professional */}
              <TabsContent value="professional" className="space-y-4">
                <section className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                  <h2 className="font-bold flex items-center gap-2"><Briefcase className="w-4 h-4" /> المعلومات المهنية</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>المسمى الوظيفي</Label>
                      <Input value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} placeholder="مدير تسويق" />
                    </div>
                    <div>
                      <Label>الشركة / الجهة</Label>
                      <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="أرامكو" />
                    </div>
                  </div>
                  <div>
                    <Label>نبذة قصيرة ({form.bio.length}/200)</Label>
                    <Textarea value={form.bio} maxLength={200} rows={3} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="مهتم بـ..." />
                  </div>
                </section>

                <section className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                  <h2 className="font-bold">تخصصاتي</h2>
                  <Input
                    value={expInput}
                    onChange={e => setExpInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag("exp", expInput); } }}
                    onBlur={() => addTag("exp", expInput)}
                    placeholder="اكتب تخصصاً واضغط Enter (حد أقصى 8)"
                  />
                  {expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {expertise.map(t => (
                        <Badge key={t} variant="secondary" className="gap-1 pr-2">
                          {t}
                          <button onClick={() => setExpertise(expertise.filter(x => x !== t))} className="hover:text-destructive"><XIcon className="w-3 h-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <h2 className="font-bold pt-2">ما الذي تبحث عنه؟</h2>
                  <Input
                    value={lfInput}
                    onChange={e => setLfInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag("lf", lfInput); } }}
                    onBlur={() => addTag("lf", lfInput)}
                    placeholder="مثال: شراكات، تمويل، فرص توظيف"
                  />
                  {lookingFor.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lookingFor.map(t => (
                        <Badge key={t} className="gap-1 pr-2 bg-brand-gold/20 text-foreground hover:bg-brand-gold/30">
                          {t}
                          <button onClick={() => setLookingFor(lookingFor.filter(x => x !== t))} className="hover:text-destructive"><XIcon className="w-3 h-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </section>
              </TabsContent>

              {/* Networking / Social */}
              <TabsContent value="networking" className="space-y-4">
                <section className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                  <h2 className="font-bold">حسابات التواصل</h2>
                  <div className="space-y-3">
                    <div>
                      <Label className="flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5" /> LinkedIn</Label>
                      <Input value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." dir="ltr" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label>𝕏 X (تويتر)</Label>
                        <Input value={form.x_handle} onChange={e => setForm({ ...form, x_handle: e.target.value })} placeholder="username" dir="ltr" />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5" /> إنستقرام</Label>
                        <Input value={form.instagram_handle} onChange={e => setForm({ ...form, instagram_handle: e.target.value })} placeholder="username" dir="ltr" />
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">تظهر هذه الحسابات في بطاقتك الرقمية ليتواصل معك الحاضرون</p>
                </section>
              </TabsContent>

              {/* Customize */}
              {/* Customize tab removed: badge design is set per-event by the organizer */}
            </Tabs>

            {/* Save bar */}
            {savedAt && (
              <div className="mt-4 bg-brand-teal/10 border-2 border-brand-teal/40 rounded-2xl p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <CheckCircle className="w-5 h-5 text-brand-teal flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-sm">تم حفظ بياناتك ✅</p>
                  <p className="text-[11px] text-muted-foreground">آخر حفظ: {savedAt.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            )}

            <div className="sticky bottom-4 z-10 mt-4 bg-card/95 backdrop-blur border border-border/50 rounded-2xl p-3 shadow-lg flex items-center gap-3">
              <Button onClick={handleSave} disabled={saving} size="lg" className="rounded-full px-8 flex-1">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الحفظ...</> : <><Save className="w-4 h-4" /> حفظ جميع التعديلات</>}
              </Button>
            </div>
          </div>

          {/* Live preview */}
          <aside className="lg:sticky lg:top-24 self-start space-y-3 flex flex-col items-center">
            <p className="text-xs text-muted-foreground font-semibold self-start">بطاقة التواصل العامة</p>
            <AttendeeCard
              ref={cardRef}
              data={{
                full_name: form.full_name || "اسمك هنا",
                avatar_url: form.avatar_url,
                job_title: form.job_title,
                company: form.company,
                tier_label: "GUEST",
                tags: [...expertise, ...lookingFor].slice(0, 5),
                qr_value: connectUrl || null,
                qr_label: "امسح للتواصل معي",
                logo_url: null,
                ring_color: "#CC8E3D",
                bg_from: "#2b1342",
                bg_to: "#7a2855",
              }}
            />

            <div className="w-full rounded-xl p-3 bg-muted/50 border border-border/50 text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">ملاحظة:</strong> تصميم بطاقة الحضور لكل فعالية يحدّده منظّم الفعالية (اللون والشعار والفئة).
              أنت تتحكم فقط بالبيانات الشخصية والتواصل التي تظهر عند مسح الباركود.
            </div>

            <div className={`w-full rounded-xl p-3 text-sm flex items-start gap-2 ${isComplete ? "bg-brand-teal/10 text-brand-teal" : "bg-brand-brick/10 text-brand-brick"}`}>
              {isComplete ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <span className="text-xs">{isComplete ? "ملفك مكتمل — جاهز للتسجيل" : "أكمل الاسم والجوال للتسجيل في الفعاليات"}</span>
            </div>
          </aside>

        </div>
      </div>

      <AvatarCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        onClose={() => setCropSrc(null)}
        onCropped={handleCroppedUpload}
      />
    </div>
  );
};

export default MyProfile;
