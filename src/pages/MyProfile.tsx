import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatCard from "@/components/app/StatCard";
import StatusBadge from "@/components/app/StatusBadge";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MyTickets from "@/pages/MyTickets";
import MyConnections from "@/pages/MyConnections";
import AttendeeCard from "@/components/networking/AttendeeCard";
import EntryPassCard, { type EntryPass } from "@/components/networking/EntryPassCard";
import { Switch } from "@/components/ui/switch";
import AvatarCropDialog from "@/components/networking/AvatarCropDialog";
import { formatNumber, formatPercent, formatTime } from "@/lib/format";
import { toast } from "sonner";
import {
  Loader2, Upload, CheckCircle, AlertCircle, Save, Ticket, Users2, Share2, Download,
  QrCode, X as XIcon, Award, Calendar, Copy, Heart, MoreHorizontal,
} from "lucide-react";

const makeProfileSchema = (t: (key: string) => string) => z.object({
  full_name: z.string().trim().min(2, t("pgProfile.validation.nameMin")).max(80),
  phone: z.string().trim().regex(/^\+?9665\d{8}$/, t("pgProfile.validation.phoneFormat")),
  job_title: z.string().trim().max(80).optional().or(z.literal("")),
  company: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().trim().max(200).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url(t("pgProfile.validation.linkedinInvalid")).max(200).optional().or(z.literal("")),
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
  const { t, lang, dir } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const profileSchema = useMemo(() => makeProfileSchema(t), [t]);
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const requiredMode = search.get("required") === "1";
  const returnTo = search.get("return") || "";

  const [loading, setLoading] = useState(true);
  // تذاكري / اتصالاتي تُفتح في نافذة فوق الصفحة بدل الانتقال لصفحة مستقلة
  const [panel, setPanel] = useState<"tickets" | "connections" | null>(null);
  // مفتاح بطاقة التواصل: عند إيقافه تبقى بطاقة دخول مختصرة فقط بدون بيانات تواصل
  const [networkingEnabled, setNetworkingEnabled] = useState(true);
  const [nextPass, setNextPass] = useState<EntryPass | null>(null);
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
        supabase.from("networking_profiles").select("connect_code, privacy_level, networking_enabled, expertise, looking_for, card_logo_url, ring_color, bg_color_from, bg_color_to, tier_label").eq("user_id", user.id).maybeSingle(),
        supabase.from("registrations").select("event_id, events!inner(start_date)", { count: "exact" }).eq("attendee_id", user.id),
        supabase.from("networking_connections").select("id", { count: "exact", head: true }).or(`scanner_id.eq.${user.id},scanned_id.eq.${user.id}`),
        supabase.from("attendee_points").select("points").eq("user_id", user.id),
      ]);
      if (net) {
        const n: any = net;
        setConnectCode(n.connect_code || "");
        setPrivacyLevel(n.privacy_level || "event_only");
        setNetworkingEnabled(n.networking_enabled !== false);
        if (n.networking_enabled === false) setActiveTab("personal");
        setExpertise(n.expertise || []);
        setLookingFor(n.looking_for || []);
        if (n.card_logo_url) setCardLogoUrl(n.card_logo_url);
        if (n.ring_color) setRingColor(n.ring_color);
        if (n.bg_color_from) setBgFrom(n.bg_color_from);
        if (n.bg_color_to) setBgTo(n.bg_color_to);
        if (n.tier_label) setTierLabel(n.tier_label);
      }
      const { data: passes } = await supabase
        .from("registrations")
        .select("qr_code, status, event:events!inner(title_ar, start_date, venue_name), ticket:tickets(name_ar)")
        .eq("attendee_id", user.id)
        .in("status", ["confirmed", "pending"]);
      const soonest = ((passes || []) as any[])
        .map(r => ({ ...r, event: Array.isArray(r.event) ? r.event[0] : r.event, ticket: Array.isArray(r.ticket) ? r.ticket[0] : r.ticket }))
        .filter(r => r.event?.start_date && new Date(r.event.start_date) > new Date())
        .sort((a, b) => +new Date(a.event.start_date) - +new Date(b.event.start_date))[0];
      setNextPass(soonest ? {
        event_title: soonest.event.title_ar, start_date: soonest.event.start_date, venue_name: soonest.event.venue_name,
        ticket_name: soonest.ticket?.name_ar ?? null, qr_code: soonest.qr_code,
      } : null);
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

  // يُحفظ فوراً بدون الحاجة لزر "حفظ جميع التعديلات"
  const toggleNetworking = async (enabled: boolean) => {
    if (!user) return;
    setNetworkingEnabled(enabled);
    if (!enabled) setActiveTab("personal");
    const { error } = await supabase.from("networking_profiles")
      .upsert({ user_id: user.id, networking_enabled: enabled } as any, { onConflict: "user_id" });
    if (error) {
      setNetworkingEnabled(!enabled);
      toast.error(t("pgProfile.cardMode.failed"));
      return;
    }
    toast.success(enabled ? t("pgProfile.cardMode.turnedOn") : t("pgProfile.cardMode.turnedOff"));
  };

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-pick same file
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(t("pgProfile.toasts.avatarMax")); return; }
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
      toast.success(t("pgProfile.toasts.avatarUpdated"));
    } catch (err: any) {
      toast.error(t("pgProfile.toasts.avatarUploadFailed") + (err.message || ""));
    } finally {
      setUploading(false);
    }
  };

  const handleCardLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error(t("pgProfile.toasts.logoMax")); return; }
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/card-logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
      setCardLogoUrl(pub.publicUrl);
      toast.success(t("pgProfile.toasts.logoUploaded"));
    } catch (err: any) {
      toast.error(t("pgProfile.toasts.logoUploadFailed") + (err.message || ""));
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
        networking_enabled: networkingEnabled,
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
    if (pErr || nErr) { toast.error(t("pgProfile.toasts.saveFailed") + (pErr?.message || nErr?.message)); return; }
    if (netSaved?.connect_code) setConnectCode(netSaved.connect_code);
    await refreshProfile();
    setSavedAt(new Date());
    toast.success(t("pgProfile.toasts.saveSuccess"));
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
      toast.error(t("pgProfile.toasts.imageCreateFailed"));
    } finally {
      setDownloading(false);
    }
  };

  const copyLink = () => {
    if (!connectUrl) { toast.error(t("pgProfile.toasts.saveFirstForLink")); return; }
    navigator.clipboard.writeText(connectUrl);
    toast.success(t("pgProfile.toasts.linkCopied"));
  };

  const sep = lang === "ar" ? "، " : ", ";
  const tabBody = networkingEnabled ? "mt-6 space-y-6" : "mt-0 space-y-6";

  if (loading) return (
    <div className="flex min-h-screen flex-col bg-background font-cairo" dir={dir}>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-24">
        <div className="space-y-6">
          <PageHeader title={t("pgProfile.header.pageTitle")} />
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="h-96 animate-pulse rounded-2xl bg-card shadow-soft" />
            <div className="h-96 animate-pulse rounded-2xl bg-card shadow-soft" />
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background font-cairo" dir={dir}>
      <Navbar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-24">
        <div className="space-y-6">
          <PageHeader
            title={t("pgProfile.header.pageTitle")}
            description={networkingEnabled && completion.pct < 100 ? t("pgProfile.completion.hint") : undefined}
            actions={
              <>
                <Button variant="outline" onClick={() => setPanel("tickets")}>
                  <Ticket className="h-4 w-4" /> {t("pgProfile.header.myTickets")}
                </Button>
                {networkingEnabled && (
                  <Button variant="outline" onClick={() => setPanel("connections")}>
                    <Users2 className="h-4 w-4" /> {t("pgProfile.header.myConnections")}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="outline" aria-label={lang === "ar" ? "المزيد" : "More"}>
                      <MoreHorizontal className="h-[18px] w-[18px]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {connectCode && networkingEnabled && (
                      <DropdownMenuItem onClick={copyLink}>
                        <Copy className="h-4 w-4" /> {t("pgProfile.header.copyCardLink")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/favorites"><Heart className="h-4 w-4" /> {t("pgProfile.header.favorites")}</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            }
          />

          {requiredMode && !profile?.profile_completed && (
            <div className="flex items-start gap-3 rounded-2xl bg-[#FDF3E3] p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#9A5F12]" />
              <div className="flex-1 text-sm">
                <p className="mb-0.5 font-bold">{t("pgProfile.required.title")}</p>
                <p className="text-muted-foreground">{t("pgProfile.required.desc")}</p>
              </div>
            </div>
          )}

          <div className={`grid grid-cols-2 gap-6 ${networkingEnabled ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {[
              { icon: Ticket, label: t("pgProfile.stats.totalTickets"), value: stats.registrations },
              { icon: Calendar, label: t("pgProfile.stats.upcomingEvents"), value: stats.upcoming },
              ...(networkingEnabled ? [{ icon: Users2, label: t("pgProfile.stats.connections"), value: stats.connections }] : []),
              { icon: Award, label: t("pgProfile.stats.myPoints"), value: stats.points },
            ].map((s) => (
              <StatCard key={s.label} className="px-3 sm:px-6" label={s.label} value={formatNumber(s.value)} icon={s.icon} />
            ))}
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Main editor with tabs: يعلو ظل البطاقة حتى لا يمتد فوق البطاقات البيضاء */}
            <div className="relative z-10 min-w-0 space-y-6">
              <Panel flush bodyClassName="divide-y divide-border">
                <div className="flex items-center gap-4 px-6 py-5">
                  <div className="relative flex-none">
                    <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-secondary text-primary">
                      {form.avatar_url ? (
                        <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold">{form.full_name?.[0] || t("pgProfile.header.initialFallback")}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      aria-label={lang === "ar" ? "تغيير الصورة" : "Change photo"}
                      className="absolute -bottom-1 -end-1 grid h-7 w-7 place-items-center rounded-lg border bg-card text-primary transition-colors hover:bg-secondary"
                    >
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold leading-6">{form.full_name || t("pgProfile.header.pageTitle")}</p>
                    {(form.job_title || form.company) && (
                      <p className="truncate text-[13px] leading-5 text-muted-foreground">{[form.job_title, form.company].filter(Boolean).join(sep)}</p>
                    )}
                  </div>
                  <StatusBadge tone={isComplete ? "success" : "warning"}>
                    {isComplete ? t("pgProfile.header.complete") : t("pgProfile.header.incomplete")}
                  </StatusBadge>
                </div>

                {networkingEnabled && (
                  <div className="px-6 py-5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{t("pgProfile.completion.title")}</span>
                      <span className="text-xs text-muted-foreground">{formatNumber(completion.filled)} {t("pgProfile.completion.of")} {formatNumber(completion.total)}{sep}{formatPercent(completion.pct)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#EFEDF2]">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${completion.pct}%` }} />
                    </div>
                  </div>
                )}

                {/* مفتاح بطاقة التواصل */}
                <div className="flex items-center gap-3 px-6 py-5">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
                    {networkingEnabled ? <QrCode className="h-[18px] w-[18px]" /> : <Ticket className="h-[18px] w-[18px]" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-[22px]">{t("pgProfile.cardMode.title")}</p>
                    <p className="text-xs leading-[18px] text-muted-foreground">{networkingEnabled ? t("pgProfile.cardMode.onDesc") : t("pgProfile.cardMode.offDesc")}</p>
                  </div>
                  <Switch checked={networkingEnabled} onCheckedChange={toggleNetworking} aria-label={t("pgProfile.cardMode.title")} />
                </div>
              </Panel>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {networkingEnabled && (
                  <TabsList>
                    <TabsTrigger value="overview">{t("pgProfile.tabs.overview")}</TabsTrigger>
                    <TabsTrigger value="personal">{t("pgProfile.tabs.personal")}</TabsTrigger>
                    <TabsTrigger value="professional">{t("pgProfile.tabs.professional")}</TabsTrigger>
                    <TabsTrigger value="networking">{t("pgProfile.tabs.networking")}</TabsTrigger>
                  </TabsList>
                )}

                {/* Overview */}
                <TabsContent value="overview" className={tabBody}>
                  <Panel title={t("pgProfile.overview.digitalCard")}>
                    {connectCode ? (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="w-fit flex-none rounded-xl border bg-white p-2">
                          <QRCodeSVG value={connectUrl} size={100} fgColor="#492C5A" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">{t("pgProfile.overview.publicCardLink")}</p>
                          <bdi dir="ltr" className="mt-1 block break-all text-[13px] font-medium leading-5">{connectUrl}</bdi>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={copyLink}><Copy className="h-[15px] w-[15px]" /> {t("pgProfile.overview.copy")}</Button>
                            <Button size="sm" variant="outline" onClick={downloadCard} disabled={downloading}>
                              {downloading ? <Loader2 className="h-[15px] w-[15px] animate-spin" /> : <Download className="h-[15px] w-[15px]" />} {t("pgProfile.overview.downloadPng")}
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/connect/${connectCode}`} target="_blank"><Share2 className="h-[15px] w-[15px]" /> {t("pgProfile.overview.openFull")}</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("pgProfile.overview.saveToCreate")}</p>
                    )}
                  </Panel>

                  <Panel title={t("pgProfile.overview.cardPrivacy")} bodyClassName="space-y-2">
                    <Select value={privacyLevel} onValueChange={setPrivacyLevel}>
                      <SelectTrigger aria-label={t("pgProfile.overview.cardPrivacy")}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="event_only">{t("pgProfile.overview.privacyEventOnly")}</SelectItem>
                        <SelectItem value="nakfeek_users">{t("pgProfile.overview.privacyNakfeekUsers")}</SelectItem>
                        <SelectItem value="public">{t("pgProfile.overview.privacyPublic")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t("pgProfile.overview.privacyHint")}</p>
                  </Panel>
                </TabsContent>

                {/* Personal */}
                <TabsContent value="personal" className={tabBody}>
                  <Panel title={`${t("pgProfile.personal.basicInfo")} ${t("pgProfile.personal.requiredMark")}`} bodyClassName="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>{t("pgProfile.personal.fullName")}</Label>
                        <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder={t("pgProfile.personal.fullNamePlaceholder")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("pgProfile.personal.phone")}</Label>
                        <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+966500000000" dir="ltr" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("pgProfile.personal.email")}</Label>
                      <Input value={profile?.email || ""} disabled dir="ltr" className="bg-muted/50" />
                      <p className="text-xs text-muted-foreground">{t("pgProfile.personal.emailHint")}</p>
                    </div>
                  </Panel>
                </TabsContent>

                {/* Professional */}
                <TabsContent value="professional" className={tabBody}>
                  <Panel title={t("pgProfile.professional.title")} bodyClassName="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>{t("pgProfile.professional.jobTitle")}</Label>
                        <Input value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} placeholder={t("pgProfile.professional.jobTitlePlaceholder")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("pgProfile.professional.company")}</Label>
                        <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder={t("pgProfile.professional.companyPlaceholder")} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("pgProfile.professional.bio")} ({formatNumber(form.bio.length)} {t("pgProfile.completion.of")} 200)</Label>
                      <Textarea value={form.bio} maxLength={200} rows={3} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder={t("pgProfile.professional.bioPlaceholder")} />
                    </div>
                  </Panel>

                  <Panel title={t("pgProfile.professional.expertise")} bodyClassName="space-y-3">
                    <Input
                      value={expInput}
                      onChange={e => setExpInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag("exp", expInput); } }}
                      onBlur={() => addTag("exp", expInput)}
                      placeholder={t("pgProfile.professional.expertisePlaceholder")}
                      aria-label={t("pgProfile.professional.expertise")}
                    />
                    {expertise.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {expertise.map(t => (
                          <Badge key={t} variant="secondary" className="gap-1 ps-2">
                            {t}
                            <button type="button" onClick={() => setExpertise(expertise.filter(x => x !== t))} className="hover:text-destructive" aria-label={t}><XIcon className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Panel>

                  <Panel title={t("pgProfile.professional.lookingFor")} bodyClassName="space-y-3">
                    <Input
                      value={lfInput}
                      onChange={e => setLfInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag("lf", lfInput); } }}
                      onBlur={() => addTag("lf", lfInput)}
                      placeholder={t("pgProfile.professional.lookingForPlaceholder")}
                      aria-label={t("pgProfile.professional.lookingFor")}
                    />
                    {lookingFor.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {lookingFor.map(t => (
                          <Badge key={t} variant="secondary" className="gap-1 ps-2">
                            {t}
                            <button type="button" onClick={() => setLookingFor(lookingFor.filter(x => x !== t))} className="hover:text-destructive" aria-label={t}><XIcon className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Panel>
                </TabsContent>

                {/* Networking / Social */}
                <TabsContent value="networking" className={tabBody}>
                  <Panel title={t("pgProfile.social.title")} bodyClassName="space-y-4">
                    <div className="space-y-1.5">
                      <Label>LinkedIn</Label>
                      <Input value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." dir="ltr" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>{t("pgProfile.social.twitter")}</Label>
                        <Input value={form.x_handle} onChange={e => setForm({ ...form, x_handle: e.target.value })} placeholder="username" dir="ltr" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("pgProfile.social.instagram")}</Label>
                        <Input value={form.instagram_handle} onChange={e => setForm({ ...form, instagram_handle: e.target.value })} placeholder="username" dir="ltr" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("pgProfile.social.hint")}</p>
                  </Panel>
                </TabsContent>

                {/* Customize */}
                {/* Customize tab removed: badge design is set per-event by the organizer */}
              </Tabs>

              {/* Save bar */}
              <div className="flex flex-wrap items-center justify-end gap-3">
                {savedAt && (
                  <p className="me-auto flex items-center gap-1.5 text-[13px] leading-5 text-muted-foreground">
                    <CheckCircle className="h-4 w-4 flex-none text-[#0E7A4F]" />
                    {t("pgProfile.save.lastSaved")} {formatTime(savedAt)}
                  </p>
                )}
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("pgProfile.save.saving")}</> : <><Save className="h-4 w-4" /> {t("pgProfile.save.saveAll")}</>}
                </Button>
              </div>
            </div>

            {/* Live preview */}
            <aside className="flex min-w-0 flex-col items-center gap-4 lg:sticky lg:top-24">
              {!networkingEnabled ? (
                <>
                  <h2 className="self-start text-[15px] font-bold leading-6">{t("pgProfile.entryPass.previewTitle")}</h2>
                  <EntryPassCard fullName={form.full_name || t("pgProfile.aside.yourNameHere")} pass={nextPass} onShowAll={() => setPanel("tickets")} />
                </>
              ) : (
                <>
                  <h2 className="self-start text-[15px] font-bold leading-6">{t("pgProfile.aside.previewTitle")}</h2>
                  <AttendeeCard
                    ref={cardRef}
                    data={{
                      full_name: form.full_name || t("pgProfile.aside.yourNameHere"),
                      avatar_url: form.avatar_url,
                      job_title: form.job_title,
                      company: form.company,
                      tier_label: "GUEST",
                      tags: [...expertise, ...lookingFor].slice(0, 5),
                      qr_value: connectUrl || null,
                      qr_label: t("pgProfile.aside.scanToConnect"),
                      logo_url: null,
                      ring_color: "#CC8E3D",
                      bg_from: "#2b1342",
                      bg_to: "#7a2855",
                    }}
                  />

                  <div className="relative z-10 w-full space-y-3 rounded-2xl bg-card p-4 shadow-soft">
                    <StatusBadge tone={isComplete ? "success" : "warning"} className="h-auto min-h-6 whitespace-normal py-0.5">
                      {isComplete ? t("pgProfile.aside.completeStatus") : t("pgProfile.aside.incompleteStatus")}
                    </StatusBadge>
                    <p className="text-xs leading-5 text-muted-foreground">
                      <strong className="font-semibold text-foreground">{t("pgProfile.aside.noteLabel")}</strong> {t("pgProfile.aside.noteText")}
                    </p>
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      </main>

      <Footer />

      <AvatarCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        onClose={() => setCropSrc(null)}
        onCropped={handleCroppedUpload}
      />

      <Dialog open={panel !== null} onOpenChange={(o) => !o && setPanel(null)}>
        <DialogContent className="max-h-[88vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto" dir={dir}>
          <DialogHeader className={panel === "connections" ? "sr-only" : "text-start"}>
            <DialogTitle>
              {panel === "tickets" ? t("pgProfile.header.myTickets") : t("pgProfile.header.myConnections")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {panel === "tickets" ? t("pgProfile.header.myTickets") : t("pgProfile.header.myConnections")}
            </DialogDescription>
          </DialogHeader>
          <div className="min-w-0">
            {panel === "tickets" && <MyTickets embedded />}
            {panel === "connections" && <MyConnections embedded />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyProfile;
