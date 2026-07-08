import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/landing/Navbar";
import { toast } from "sonner";
import {
  Loader2, Download, Maximize2, Linkedin, Mail, Phone, Globe, Twitter,
  Instagram, Ghost, X as XIcon,
} from "lucide-react";

export default function NetworkingProfile() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expertiseInput, setExpertiseInput] = useState("");
  const [lookingForInput, setLookingForInput] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState({
    job_title: "",
    company: "",
    bio: "",
    expertise: [] as string[],
    looking_for: [] as string[],
    linkedin_url: "",
    twitter_handle: "",
    snapchat_handle: "",
    instagram_handle: "",
    whatsapp: "",
    email_public: "",
    website_url: "",
    privacy_level: "event_only",
    connect_code: "",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: row } = await supabase
        .from("networking_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (row) {
        setData({
          job_title: row.job_title || "",
          company: row.company || "",
          bio: row.bio || "",
          expertise: (row as any).expertise || [],
          looking_for: row.looking_for || [],
          linkedin_url: row.linkedin_url || "",
          twitter_handle: row.twitter_handle || "",
          snapchat_handle: (row as any).snapchat_handle || "",
          instagram_handle: (row as any).instagram_handle || "",
          whatsapp: row.whatsapp || "",
          email_public: row.email_public || "",
          website_url: row.website_url || "",
          privacy_level: row.privacy_level || "event_only",
          connect_code: row.connect_code || "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const addTag = (field: "expertise" | "looking_for", value: string, max = 8) => {
    const v = value.trim();
    if (!v) return;
    setData((d) => {
      if (d[field].includes(v) || d[field].length >= max) return d;
      return { ...d, [field]: [...d[field], v] };
    });
  };
  const removeTag = (field: "expertise" | "looking_for", value: string) =>
    setData((d) => ({ ...d, [field]: d[field].filter((x) => x !== value) }));

  const addExpertise = () => { addTag("expertise", expertiseInput); setExpertiseInput(""); };
  const addLookingFor = () => { addTag("looking_for", lookingForInput); setLookingForInput(""); };

  const onTagKey = (e: KeyboardEvent<HTMLInputElement>, fn: () => void) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      fn();
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (data.bio.length > 150) {
      toast.error(t("pgNetworking.profile.bioTooLong"));
      return;
    }
    setSaving(true);
    const payload: any = {
      user_id: user.id,
      job_title: data.job_title || null,
      company: data.company || null,
      bio: data.bio || null,
      expertise: data.expertise,
      looking_for: data.looking_for,
      linkedin_url: data.linkedin_url || null,
      twitter_handle: data.twitter_handle || null,
      snapchat_handle: data.snapchat_handle || null,
      instagram_handle: data.instagram_handle || null,
      whatsapp: data.whatsapp || null,
      email_public: data.email_public || null,
      website_url: data.website_url || null,
      privacy_level: data.privacy_level,
    };
    const { data: saved, error } = await supabase
      .from("networking_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("connect_code")
      .maybeSingle();
    setSaving(false);
    if (error) {
      console.error("save error", error);
      toast.error(t("pgNetworking.profile.saveFailed") + ": " + error.message);
      return;
    }
    if (saved?.connect_code && saved.connect_code !== data.connect_code) {
      setData((d) => ({ ...d, connect_code: saved.connect_code }));
    }
    toast.success(t("pgNetworking.profile.saveSuccess"));
  };

  const connectUrl = `${window.location.origin}/connect/${data.connect_code}`;

  const downloadPng = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#492C5A",
        // skip cross-origin images that would taint the canvas
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
      a.download = `nakfeek-card-${data.connect_code}.png`;
      a.click();
    } catch (e: any) {
      console.error(e);
      toast.error(t("pgNetworking.profile.imageFailed"));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto pt-24 pb-12 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold font-cairo mb-2">{t("pgNetworking.profile.title")}</h1>
        <p className="text-muted-foreground mb-8">
          {t("pgNetworking.profile.subtitle")}
        </p>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="font-cairo">{t("pgNetworking.profile.infoTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("pgNetworking.profile.jobTitle")}</Label>
                  <Input value={data.job_title} onChange={(e) => setData({ ...data, job_title: e.target.value })} />
                </div>
                <div>
                  <Label>{t("pgNetworking.profile.company")}</Label>
                  <Input value={data.company} onChange={(e) => setData({ ...data, company: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>{t("pgNetworking.profile.bioLabel")} ({data.bio.length}/150)</Label>
                <Textarea
                  value={data.bio}
                  maxLength={150}
                  rows={2}
                  placeholder={t("pgNetworking.profile.bioPlaceholder")}
                  onChange={(e) => setData({ ...data, bio: e.target.value })}
                />
              </div>

              <div>
                <Label className="mb-2 block">{t("pgNetworking.profile.expertiseLabel")} {t("pgNetworking.profile.enterHint")}</Label>
                <Input
                  value={expertiseInput}
                  onChange={(e) => setExpertiseInput(e.target.value)}
                  onKeyDown={(e) => onTagKey(e, addExpertise)}
                  onBlur={addExpertise}
                  placeholder={t("pgNetworking.profile.expertisePlaceholder")}
                />
                {data.expertise.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.expertise.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 pe-2">
                        {tag}
                        <button onClick={() => removeTag("expertise", tag)} className="hover:text-destructive">
                          <XIcon className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label className="mb-2 block">{t("pgNetworking.profile.lookingForLabel")} {t("pgNetworking.profile.enterHint")}</Label>
                <Input
                  value={lookingForInput}
                  onChange={(e) => setLookingForInput(e.target.value)}
                  onKeyDown={(e) => onTagKey(e, addLookingFor)}
                  onBlur={addLookingFor}
                  placeholder={t("pgNetworking.profile.lookingForPlaceholder")}
                />
                {data.looking_for.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.looking_for.map((tag) => (
                      <Badge key={tag} className="gap-1 pe-2 bg-accent/20 text-accent-foreground hover:bg-accent/30">
                        {tag}
                        <button onClick={() => removeTag("looking_for", tag)} className="hover:text-destructive">
                          <XIcon className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="block">{t("pgNetworking.profile.socialsLabel")}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input value={data.linkedin_url} onChange={(e) => setData({ ...data, linkedin_url: e.target.value })} placeholder="LinkedIn URL" />
                  <Input value={data.twitter_handle} onChange={(e) => setData({ ...data, twitter_handle: e.target.value })} placeholder={t("pgNetworking.profile.twitterPlaceholder")} />
                  <Input value={data.snapchat_handle} onChange={(e) => setData({ ...data, snapchat_handle: e.target.value })} placeholder={t("pgNetworking.profile.snapchatPlaceholder")} />
                  <Input value={data.instagram_handle} onChange={(e) => setData({ ...data, instagram_handle: e.target.value })} placeholder={t("pgNetworking.profile.instagramPlaceholder")} />
                  <Input value={data.whatsapp} onChange={(e) => setData({ ...data, whatsapp: e.target.value })} placeholder={t("pgNetworking.profile.whatsappPlaceholder")} />
                  <Input value={data.email_public} type="email" onChange={(e) => setData({ ...data, email_public: e.target.value })} placeholder={t("pgNetworking.profile.emailPlaceholder")} />
                  <Input className="col-span-2" value={data.website_url} onChange={(e) => setData({ ...data, website_url: e.target.value })} placeholder={t("pgNetworking.profile.websitePlaceholder")} />
                </div>
              </div>

              <div>
                <Label>{t("pgNetworking.profile.privacyLabel")}</Label>
                <Select value={data.privacy_level} onValueChange={(v) => setData({ ...data, privacy_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event_only">{t("pgNetworking.profile.privacyEventOnly")}</SelectItem>
                    <SelectItem value="nakfeek_users">{t("pgNetworking.profile.privacyNakfeekUsers")}</SelectItem>
                    <SelectItem value="public">{t("pgNetworking.profile.privacyPublic")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving && <Loader2 className="w-4 h-4 ms-2 animate-spin" />}
                {t("pgNetworking.profile.saveButton")}
              </Button>
            </CardContent>
          </Card>

          {/* Live card preview */}
          <div className="space-y-4 lg:sticky lg:top-24 self-start">
            <div
              ref={cardRef}
              className="relative rounded-3xl overflow-hidden shadow-elegant border-2 border-primary/10 bg-gradient-to-br from-brand-purple via-brand-mauve to-brand-brick text-white p-6"
              style={{ aspectRatio: "3 / 4" }}
            >
              <div className="absolute inset-0 opacity-10 nakfeek-pattern" />
              <div className="relative h-full flex flex-col">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold overflow-hidden border-2 border-white/40">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      profile?.full_name?.[0] || t("pgNetworking.profile.avatarFallback")
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold font-cairo text-lg leading-tight truncate">{profile?.full_name || "—"}</h3>
                    {data.job_title && <p className="text-sm text-white/85 truncate">{data.job_title}</p>}
                    {data.company && <p className="text-sm font-semibold text-brand-gold truncate">{data.company}</p>}
                  </div>
                </div>

                {data.bio && (
                  <p className="text-sm italic text-white/90 mb-3 leading-relaxed">"{data.bio}"</p>
                )}

                {data.expertise.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-brand-gold mb-1.5 font-semibold">{t("pgNetworking.profile.myExpertise")}</p>
                    <div className="flex flex-wrap gap-1">
                      {data.expertise.map((tag) => (
                        <span key={tag} className="text-[10px] bg-white/15 backdrop-blur px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {data.looking_for.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-brand-gold mb-1.5 font-semibold">{t("pgNetworking.profile.lookingFor")}</p>
                    <div className="flex flex-wrap gap-1">
                      {data.looking_for.map((lf) => (
                        <span key={lf} className="text-[10px] bg-brand-gold/30 backdrop-blur px-2 py-0.5 rounded-full">{lf}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-center gap-2 flex-wrap mb-3">
                  {data.linkedin_url && <Linkedin className="w-4 h-4" />}
                  {data.twitter_handle && <Twitter className="w-4 h-4" />}
                  {data.instagram_handle && <Instagram className="w-4 h-4" />}
                  {data.snapchat_handle && <Ghost className="w-4 h-4" />}
                  {data.whatsapp && <Phone className="w-4 h-4" />}
                  {data.email_public && <Mail className="w-4 h-4" />}
                  {data.website_url && <Globe className="w-4 h-4" />}
                </div>

                <div className="mt-auto flex flex-col items-center">
                  <div className="bg-white rounded-2xl p-3 shadow-lg">
                    {data.connect_code && (
                      <QRCodeSVG value={connectUrl} size={130} level="M" fgColor="#492C5A" />
                    )}
                  </div>
                  <p className="text-[11px] text-white/90 mt-2">{t("pgNetworking.profile.scanToConnect")}</p>
                  <p className="text-[10px] text-white/60 mt-0.5 font-mono" dir="ltr">
                    nakfeek.sa/connect/{data.connect_code?.slice(0, 10)}…
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadPng} disabled={downloading} className="flex-1">
                {downloading ? <Loader2 className="w-4 h-4 ms-2 animate-spin" /> : <Download className="w-4 h-4 ms-2" />}
                {t("pgNetworking.profile.downloadPng")}
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link to={`/connect/${data.connect_code}`} target="_blank">
                  <Maximize2 className="w-4 h-4 ms-2" /> {t("pgNetworking.profile.fullScreen")}
                </Link>
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{t("pgNetworking.profile.cardLink")}</p>
              <code className="text-xs break-all" dir="ltr">{connectUrl}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
