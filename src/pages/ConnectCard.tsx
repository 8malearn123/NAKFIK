import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2, Linkedin, Phone, Mail, Globe, UserPlus, MessageCircle,
  Instagram, Ghost, Save, Briefcase, Building2, Sparkles, Target, Share2,
} from "lucide-react";
import logo from "@/assets/logo.png";

const LOOKING_FOR_KEYS = ["partnerships", "funding", "career", "jobs", "learning"];

function buildVCard(p: any) {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  if (p.full_name) lines.push(`FN:${p.full_name}`, `N:${p.full_name};;;;`);
  if (p.job_title) lines.push(`TITLE:${p.job_title}`);
  if (p.company) lines.push(`ORG:${p.company}`);
  if (p.whatsapp) lines.push(`TEL;TYPE=CELL:${p.whatsapp}`);
  if (p.email_public) lines.push(`EMAIL:${p.email_public}`);
  if (p.website_url) lines.push(`URL:${p.website_url}`);
  if (p.linkedin_url) lines.push(`URL;TYPE=LinkedIn:${p.linkedin_url}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export default function ConnectCard() {
  const { code } = useParams();
  const { user } = useAuth();
  const { t, dir } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const downloadImage = async () => {
    if (!captureRef.current) return;
    try {
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${owner?.full_name || "contact"}.png`;
      a.click();
      toast.success(t("pgNetworking.card.downloadedCard"));
    } catch (e) {
      console.error(e);
      toast.error(t("pgNetworking.card.imageFailed"));
    }
  };

  useEffect(() => {
    if (!code) return;
    (async () => {
      const { data } = await supabase.rpc("get_connect_card", { _code: code });
      const row: any = Array.isArray(data) ? data[0] : data;
      if (!row) { setLoading(false); return; }
      setProfile(row);
      setOwner({ id: row.user_id, full_name: row.full_name, avatar_url: row.avatar_url });
      setLoading(false);
    })();
  }, [code]);

  const downloadVCard = () => {
    const vcard = buildVCard({
      full_name: owner?.full_name,
      job_title: profile?.job_title,
      company: profile?.company,
      whatsapp: profile?.whatsapp,
      email_public: profile?.email_public,
      website_url: profile?.website_url,
      linkedin_url: profile?.linkedin_url,
    });
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${owner?.full_name || "contact"}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("pgNetworking.card.vcardDownloaded"));
  };

  const saveContact = async () => {
    if (!user) {
      downloadVCard();
      return;
    }
    if (user.id === owner?.id) {
      toast.info(t("pgNetworking.card.ownCard"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("networking_connections").insert({
      scanner_id: user.id,
      scanned_id: owner.id,
    });
    if (error && !error.message.includes("duplicate")) {
      setSaving(false);
      toast.error(t("pgNetworking.card.saveFailed"));
      return;
    }
    const { data: scannerProfile } = await supabase
      .from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    await supabase.from("in_app_notifications").insert({
      user_id: owner.id,
      title: t("pgNetworking.card.newConnection"),
      body: `${scannerProfile?.full_name || t("pgNetworking.card.someone")} ${t("pgNetworking.card.savedYourInfo")}`,
      link: "/my/connections",
    });
    setSaving(false);
    toast.success(t("pgNetworking.card.savedToNetwork"));
  };

  const openWhatsApp = () => {
    if (!profile?.whatsapp) return;
    const num = profile.whatsapp.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${num}`, "_blank");
  };

  const sharePage = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: owner?.full_name, url }); } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t("pgNetworking.card.linkCopied"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || !owner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <p className="text-muted-foreground mb-4">{t("pgNetworking.card.notFound")}</p>
        <Button asChild><Link to="/">{t("pgNetworking.card.backHome")}</Link></Button>
      </div>
    );
  }

  const expertise: string[] = profile.expertise || [];
  const lookingFor: string[] = profile.looking_for || [];

  const socials = [
    profile.linkedin_url && { icon: Linkedin, label: "LinkedIn", href: profile.linkedin_url, color: "text-[#0A66C2]" },
    profile.twitter_handle && {
      icon: (props: any) => (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
          <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.844l-5.36-7.01L4.6 22H1.34l8.03-9.17L1 2h7.02l4.85 6.41L18.244 2zm-1.2 18h1.9L7.04 4h-2L17.044 20z"/>
        </svg>
      ),
      label: profile.twitter_handle,
      href: `https://x.com/${profile.twitter_handle.replace("@", "")}`,
      color: "text-foreground",
    },
    profile.instagram_handle && { icon: Instagram, label: profile.instagram_handle, href: `https://instagram.com/${profile.instagram_handle.replace("@", "")}`, color: "text-pink-500" },
    profile.snapchat_handle && { icon: Ghost, label: profile.snapchat_handle, href: `https://snapchat.com/add/${profile.snapchat_handle.replace("@", "")}`, color: "text-yellow-500" },
    profile.website_url && { icon: Globe, label: t("pgNetworking.card.website"), href: profile.website_url, color: "text-primary" },
  ].filter(Boolean) as any[];

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-background" dir={dir}>
      {/* Top bar */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt={t("pgNetworking.card.brand")} className="h-8" />
          </Link>
          <Button variant="ghost" size="sm" onClick={sharePage}>
            <Share2 className="w-4 h-4 ms-2" /> {t("pgNetworking.card.share")}
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div ref={captureRef} className="space-y-6 bg-background p-2 rounded-2xl">
        {/* Hero */}
        <Card className="overflow-hidden border-none shadow-lg">
          <div
            className="h-32 sm:h-40"
            style={{
              background: profile.bg_color_from && profile.bg_color_to
                ? `linear-gradient(135deg, ${profile.bg_color_from}, ${profile.bg_color_to})`
                : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
            }}
          />
          <div className="px-6 pb-6 -mt-16">
            <div className="flex flex-col items-center text-center gap-3">
              <div
                className="w-28 h-28 rounded-2xl border-4 border-background shadow-xl overflow-hidden bg-muted shrink-0"
                style={profile.ring_color ? { boxShadow: `0 0 0 3px ${profile.ring_color}` } : undefined}
              >
                {owner.avatar_url ? (
                  <img src={owner.avatar_url} alt={owner.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                    {owner.full_name?.[0] || "?"}
                  </div>
                )}
              </div>
              <div className="w-full">
                <div className="flex items-center justify-center flex-wrap gap-2 mb-1">
                  <h1 className="text-2xl font-bold">{owner.full_name}</h1>
                  {profile.tier_label && profile.tier_label.toUpperCase() !== "GUEST" && (
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                      {profile.tier_label}
                    </Badge>
                  )}
                </div>
                {(profile.job_title || profile.company) && (
                  <p className="text-muted-foreground text-sm flex items-center justify-center flex-wrap gap-1.5">
                    {profile.job_title && <><Briefcase className="w-3.5 h-3.5" />{profile.job_title}</>}
                    {profile.job_title && profile.company && <span className="mx-1">·</span>}
                    {profile.company && <><Building2 className="w-3.5 h-3.5" />{profile.company}</>}
                  </p>
                )}
              </div>
            </div>

            {profile.bio && (
              <p className="mt-5 text-foreground/80 leading-relaxed text-sm border-s-2 border-primary ps-3 pe-3 py-2 bg-muted/40 rounded">
                {profile.bio}
              </p>
            )}
          </div>
        </Card>

        {/* Action buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={async () => { await downloadImage(); saveContact(); }}
            disabled={saving}
            size="lg"
            className="w-full"
          >
            {saving ? <Loader2 className="w-4 h-4 ms-2 animate-spin" /> : <Save className="w-4 h-4 ms-2" />}
            {t("pgNetworking.card.saveContactInfo")}
          </Button>
          {profile.whatsapp && (
            <Button onClick={openWhatsApp} size="lg" variant="outline"
              className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400">
              <MessageCircle className="w-4 h-4 ms-2" /> {t("pgNetworking.card.whatsappContact")}
            </Button>
          )}
        </div>

        {/* Expertise & Looking for */}
        {(expertise.length > 0 || lookingFor.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {expertise.length > 0 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold">{t("pgNetworking.card.expertiseTitle")}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {expertise.map((t, i) => (
                    <Badge key={i} variant="secondary" className="rounded-full">{t}</Badge>
                  ))}
                </div>
              </Card>
            )}
            {lookingFor.length > 0 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-accent" />
                  <h2 className="font-semibold">{t("pgNetworking.card.lookingForTitle")}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lookingFor.map((item, i) => (
                    <Badge key={i} variant="outline" className="rounded-full">
                      {LOOKING_FOR_KEYS.includes(item) ? t(`pgNetworking.card.lf.${item}`) : item}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Contact info */}
        {(profile.email_public || profile.whatsapp) && (
          <Card className="p-5">
            <h2 className="font-semibold mb-3">{t("pgNetworking.card.contactInfoTitle")}</h2>
            <div className="space-y-2">
              {profile.email_public && (
                <a href={`mailto:${profile.email_public}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{t("pgNetworking.card.emailLabel")}</p>
                    <p className="text-sm font-medium truncate">{profile.email_public}</p>
                  </div>
                </a>
              )}
              {profile.whatsapp && (
                <a href={`tel:${profile.whatsapp}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{t("pgNetworking.card.phoneLabel")}</p>
                    <p className="text-sm font-medium truncate text-start" dir="ltr">{profile.whatsapp}</p>
                  </div>
                </a>
              )}
            </div>
          </Card>
        )}

        {/* Social links */}
        {socials.length > 0 && (
          <Card className="p-5">
            <h2 className="font-semibold mb-3">{t("pgNetworking.card.socialsTitle")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {socials.map((s, i) => (
                <a key={i} href={s.href} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border hover:border-primary hover:bg-muted/40 transition-all">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-xs truncate">{s.label}</span>
                </a>
              ))}
            </div>
          </Card>
        )}
        </div>

        {user && (
          <Button onClick={downloadVCard} variant="ghost" className="w-full">
            <Save className="w-4 h-4 ms-2" /> {t("pgNetworking.card.saveVcard")}
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center pt-4">
          {t("pgNetworking.card.footerPrefix")} <Link to="/" className="text-brand-gold font-bold">{t("pgNetworking.card.brand")}</Link> {t("pgNetworking.card.footerSuffix")}
        </p>
      </main>
    </div>
  );
}
