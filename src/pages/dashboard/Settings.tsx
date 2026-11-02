import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Camera, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
  const { t, dir } = useLanguage();
  const { profile, organization, refreshProfile } = useAuth();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", bio: "",
  });

  const [org, setOrg] = useState({
    name: "", description: "", logo_url: "", cover_image_url: "",
    address: "", commercial_register: "", tax_number: "",
    website: "", public_email: "", phone: "", brand_color: "#7E5CB5",
    twitter_url: "", instagram_url: "", linkedin_url: "", tiktok_url: "", snapchat_url: "",
    terms_text: "", refund_policy: "", privacy_policy: "",
    bank_name: "", iban: "", bank_account_holder: "",
    billing_address: "", billing_name: "", billing_tax_number: "",
  });

  const [notifications, setNotifications] = useState({
    emailNewRegistration: true, emailEventReminder: true, emailWeeklyReport: false,
    pushNewRegistration: true, pushEventUpdate: true,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
      });
    }
    if (organization) {
      setOrg(o => ({ ...o, ...Object.fromEntries(Object.entries(organization).filter(([_, v]) => v !== null)) as any }));
    }
  }, [profile, organization]);

  const handleProfileSave = async () => {
    if (!profile) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.fullName, phone: form.phone, bio: form.bio,
    }).eq("id", profile.id);
    if (error) toast.error(t("pgSettings.toastProfileSaveError"));
    else { toast.success(t("pgSettings.toastChangesSaved")); await refreshProfile(); }
    setSavingProfile(false);
  };

  const handleOrgSave = async () => {
    if (!organization) { toast.error(t("pgSettings.toastNoOrganization")); return; }
    // البيانات البنكية إلزامية — لا يمكن حفظ الملف بدونها أو بمسحها
    if (!org.bank_name?.trim() || !org.iban?.trim() || !org.bank_account_holder?.trim()) {
      toast.error("البيانات البنكية إلزامية: اسم البنك، الآيبان، واسم صاحب الحساب");
      return;
    }
    const cleanIban = org.iban.replace(/\s/g, "").toUpperCase();
    if (!/^SA\d{22}$/.test(cleanIban)) {
      toast.error("رقم IBAN غير صحيح — يبدأ بـ SA ويتكوّن من 24 خانة");
      return;
    }
    setSavingOrg(true);
    const { error } = await supabase.from("organizations").update({
      name: org.name, description: org.description,
      logo_url: org.logo_url, cover_image_url: org.cover_image_url,
      address: org.address, commercial_register: org.commercial_register, tax_number: org.tax_number,
      website: org.website, public_email: org.public_email, phone: org.phone, brand_color: org.brand_color,
      twitter_url: org.twitter_url, instagram_url: org.instagram_url, linkedin_url: org.linkedin_url,
      tiktok_url: org.tiktok_url, snapchat_url: org.snapchat_url,
      terms_text: org.terms_text, refund_policy: org.refund_policy, privacy_policy: org.privacy_policy,
      bank_name: org.bank_name.trim(), iban: cleanIban, bank_account_holder: org.bank_account_holder.trim(),
      billing_address: org.billing_address, billing_name: org.billing_name, billing_tax_number: org.billing_tax_number,
    } as any).eq("id", organization.id);
    if (error) toast.error(t("pgSettings.toastOrgSaveError"));
    else { toast.success(t("pgSettings.toastOrgSaved")); await refreshProfile(); }
    setSavingOrg(false);
  };

  const uploadImage = async (file: File, kind: "logo" | "cover") => {
    if (!organization) return;
    const bucket = kind === "logo" ? "logos" : "event-covers";
    const ext = file.name.split(".").pop();
    const path = `org-${organization.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) { toast.error(t("pgSettings.toastImageUploadFailed")); return; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setOrg(o => kind === "logo" ? { ...o, logo_url: data.publicUrl } : { ...o, cover_image_url: data.publicUrl });
    toast.success(t("pgSettings.toastImageUploaded"));
  };

  const toggleRows = (items: { key: keyof typeof notifications; label: string; desc: string }[]) => (
    <div className="divide-y divide-border">
      {items.map(item => (
        <div key={item.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-[22px]">{item.label}</p>
            <p className="text-xs leading-[18px] text-muted-foreground">{item.desc}</p>
          </div>
          <Switch aria-label={item.label} checked={notifications[item.key]} onCheckedChange={v => setNotifications({ ...notifications, [item.key]: v })} />
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title={t("pgSettings.pageTitle")} description={t("pgSettings.pageSubtitle")} />

        <Tabs defaultValue="company" dir={dir}>
          {/* الشريط يمرر داخل مكانه على الجوال حتى لا تتمدد الصفحة أفقياً */}
          <TabsList className="max-w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger value="company">{t("pgSettings.tabCompany")}</TabsTrigger>
            <TabsTrigger value="contact">{t("pgSettings.tabContact")}</TabsTrigger>
            <TabsTrigger value="bank">{t("pgSettings.tabBank")}</TabsTrigger>
            <TabsTrigger value="legal">{t("pgSettings.tabLegal")}</TabsTrigger>
            <TabsTrigger value="profile">{t("pgSettings.tabProfile")}</TabsTrigger>
            <TabsTrigger value="notifications">{t("pgSettings.tabNotifications")}</TabsTrigger>
          </TabsList>

          {/* COMPANY IDENTITY */}
          <TabsContent value="company" className="mt-6 space-y-6">
            <div className="grid gap-6 xl:grid-cols-3">
              <Panel className="xl:col-span-2" title={t("pgSettings.companyInfo")} bodyClassName="flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>{t("pgSettings.companyName")}</Label>
                    <Input value={org.name || ""} onChange={e => setOrg({ ...org, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>{t("pgSettings.commercialRegister")}</Label>
                    <Input value={org.commercial_register || ""} onChange={e => setOrg({ ...org, commercial_register: e.target.value })} dir="ltr" /></div>
                  <div className="space-y-2"><Label>{t("pgSettings.taxNumber")}</Label>
                    <Input value={org.tax_number || ""} onChange={e => setOrg({ ...org, tax_number: e.target.value })} dir="ltr" /></div>
                  <div className="space-y-2"><Label>{t("pgSettings.hqAddress")}</Label>
                    <Input value={org.address || ""} onChange={e => setOrg({ ...org, address: e.target.value })} placeholder={t("pgSettings.hqAddressPlaceholder")} /></div>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Label>{t("pgSettings.companyBio")}</Label>
                  <Textarea className="flex-1" value={org.description || ""} onChange={e => setOrg({ ...org, description: e.target.value })} rows={4} placeholder={t("pgSettings.companyBioPlaceholder")} />
                </div>
              </Panel>

              <Panel title={t("pgSettings.visualIdentity")} bodyClassName="space-y-5">
                {/* Cover */}
                <div className="space-y-2">
                  <Label>{t("pgSettings.coverImage")}</Label>
                  <div className="relative grid h-36 w-full place-items-center overflow-hidden rounded-xl bg-muted/50">
                    {org.cover_image_url ? (
                      <img src={org.cover_image_url} alt="cover" className="h-full w-full object-cover" />
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("pgSettings.noCover")}</p>
                    )}
                    <Button size="sm" variant="outline" className="absolute bottom-3 end-3" onClick={() => coverInputRef.current?.click()}>
                      <Camera className="w-3.5 h-3.5" /> {t("pgSettings.changeCover")}
                    </Button>
                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], "cover")} />
                  </div>
                </div>

                {/* Logo */}
                <div className="space-y-2">
                  <Label>{t("pgSettings.companyLogo")}</Label>
                  <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-xl bg-muted/50">
                      {org.logo_url ? (
                        <img src={org.logo_url} alt="logo" className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()}>
                      <Camera className="w-3.5 h-3.5" /> {t("pgSettings.changeLogo")}
                    </Button>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], "logo")} />
                  </div>
                </div>

                {/* Brand color */}
                <div className="space-y-2">
                  <Label>{t("pgSettings.brandColor")}</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" aria-label={t("pgSettings.brandColor")} value={org.brand_color || "#7E5CB5"} onChange={e => setOrg({ ...org, brand_color: e.target.value })}
                      className="h-10 w-12 flex-none cursor-pointer rounded-lg border border-input bg-card p-1 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0" />
                    <Input value={org.brand_color || ""} onChange={e => setOrg({ ...org, brand_color: e.target.value })} className="min-w-0 flex-1" dir="ltr" placeholder="#7E5CB5" />
                  </div>
                  <p className="text-xs text-muted-foreground">{t("pgSettings.brandColorHint")}</p>
                </div>
              </Panel>
            </div>

            <Button onClick={handleOrgSave} disabled={savingOrg}>
              <Save className="w-4 h-4" /> {savingOrg ? t("pgSettings.saving") : t("pgSettings.saveCompany")}
            </Button>
          </TabsContent>

          {/* CONTACT & SOCIAL */}
          <TabsContent value="contact" className="mt-6 space-y-6">
            <Panel title={t("pgSettings.contactInfo")}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2"><Label>{t("pgSettings.website")}</Label>
                  <Input value={org.website || ""} onChange={e => setOrg({ ...org, website: e.target.value })} dir="ltr" placeholder="https://..." /></div>
                <div className="space-y-2"><Label>{t("pgSettings.publicEmail")}</Label>
                  <Input value={org.public_email || ""} onChange={e => setOrg({ ...org, public_email: e.target.value })} dir="ltr" placeholder="info@company.com" /></div>
                <div className="space-y-2"><Label>{t("pgSettings.companyPhone")}</Label>
                  <Input value={org.phone || ""} onChange={e => setOrg({ ...org, phone: e.target.value })} dir="ltr" placeholder="+966..." /></div>
              </div>
            </Panel>

            <Panel title={t("pgSettings.socialLinks")}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[
                  { key: "twitter_url", label: t("pgSettings.twitter") },
                  { key: "instagram_url", label: t("pgSettings.instagram") },
                  { key: "linkedin_url", label: t("pgSettings.linkedin") },
                  { key: "tiktok_url", label: t("pgSettings.tiktok") },
                  { key: "snapchat_url", label: t("pgSettings.snapchat") },
                ].map(f => (
                  <div key={f.key} className="space-y-2">
                    <Label>{f.label}</Label>
                    <Input value={(org as any)[f.key] || ""} onChange={e => setOrg({ ...org, [f.key]: e.target.value } as any)} dir="ltr" placeholder="https://..." />
                  </div>
                ))}
              </div>
            </Panel>

            <Button onClick={handleOrgSave} disabled={savingOrg}>
              <Save className="w-4 h-4" /> {savingOrg ? t("pgSettings.saving") : t("pgSettings.saveChanges")}
            </Button>
          </TabsContent>

          {/* BANK & BILLING */}
          <TabsContent value="bank" className="mt-6 space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title={t("pgSettings.bankAccount")} description={t("pgSettings.bankAccountHint")} bodyClassName="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>{t("pgSettings.bankName")}</Label>
                    <Input value={org.bank_name || ""} onChange={e => setOrg({ ...org, bank_name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>{t("pgSettings.accountHolder")}</Label>
                    <Input value={org.bank_account_holder || ""} onChange={e => setOrg({ ...org, bank_account_holder: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>{t("pgSettings.iban")}</Label>
                  <Input value={org.iban || ""} onChange={e => setOrg({ ...org, iban: e.target.value })} dir="ltr" placeholder="SA00 0000 0000 0000 0000 0000" /></div>
              </Panel>

              <Panel title={t("pgSettings.billingInfo")} description={t("pgSettings.billingInfoHint")} bodyClassName="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>{t("pgSettings.billingName")}</Label>
                    <Input value={org.billing_name || ""} onChange={e => setOrg({ ...org, billing_name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>{t("pgSettings.billingTaxNumber")}</Label>
                    <Input value={org.billing_tax_number || ""} onChange={e => setOrg({ ...org, billing_tax_number: e.target.value })} dir="ltr" /></div>
                </div>
                <div className="space-y-2"><Label>{t("pgSettings.billingAddress")}</Label>
                  <Textarea value={org.billing_address || ""} onChange={e => setOrg({ ...org, billing_address: e.target.value })} rows={2} /></div>
              </Panel>
            </div>

            <Button onClick={handleOrgSave} disabled={savingOrg}>
              <Save className="w-4 h-4" /> {savingOrg ? t("pgSettings.saving") : t("pgSettings.saveBilling")}
            </Button>
          </TabsContent>

          {/* LEGAL POLICIES */}
          <TabsContent value="legal" className="mt-6 space-y-6">
            <Panel title={t("pgSettings.legalPolicies")} description={t("pgSettings.legalPoliciesHint")} bodyClassName="space-y-4">
              <div className="space-y-2"><Label>{t("pgSettings.termsOfUse")}</Label>
                <Textarea value={org.terms_text || ""} onChange={e => setOrg({ ...org, terms_text: e.target.value })} rows={5} placeholder={t("pgSettings.termsPlaceholder")} /></div>
              <div className="space-y-2"><Label>{t("pgSettings.refundPolicy")}</Label>
                <Textarea value={org.refund_policy || ""} onChange={e => setOrg({ ...org, refund_policy: e.target.value })} rows={5} placeholder={t("pgSettings.refundPlaceholder")} /></div>
              <div className="space-y-2"><Label>{t("pgSettings.privacyPolicy")}</Label>
                <Textarea value={org.privacy_policy || ""} onChange={e => setOrg({ ...org, privacy_policy: e.target.value })} rows={5} placeholder={t("pgSettings.privacyPlaceholder")} /></div>
            </Panel>

            <Button onClick={handleOrgSave} disabled={savingOrg}>
              <Save className="w-4 h-4" /> {savingOrg ? t("pgSettings.saving") : t("pgSettings.savePolicies")}
            </Button>
          </TabsContent>

          {/* PROFILE */}
          <TabsContent value="profile" className="mt-6 space-y-6">
            <Panel title={t("pgSettings.personalInfo")} bodyClassName="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2"><Label>{t("pgSettings.fullName")}</Label>
                  <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t("pgSettings.mobileNumber")}</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} dir="ltr" placeholder="+966..." /></div>
                <div className="space-y-2"><Label>{t("pgSettings.email")}</Label>
                  <Input value={form.email} readOnly className="border-border bg-muted/50 text-muted-foreground" dir="ltr" /></div>
              </div>
              <div className="space-y-2"><Label>{t("pgSettings.shortBio")}</Label>
                <Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} /></div>
            </Panel>

            <Button onClick={handleProfileSave} disabled={savingProfile}>
              <Save className="w-4 h-4" /> {savingProfile ? t("pgSettings.saving") : t("pgSettings.saveChanges")}
            </Button>
          </TabsContent>

          {/* NOTIFICATIONS */}
          <TabsContent value="notifications" className="mt-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title={t("pgSettings.emailNotifications")}>
                {toggleRows([
                  { key: "emailNewRegistration", label: t("pgSettings.newRegistration"), desc: t("pgSettings.newRegistrationDesc") },
                  { key: "emailEventReminder", label: t("pgSettings.eventReminder"), desc: t("pgSettings.eventReminderDesc") },
                  { key: "emailWeeklyReport", label: t("pgSettings.weeklyReport"), desc: t("pgSettings.weeklyReportDesc") },
                ])}
              </Panel>
              <Panel title={t("pgSettings.appNotifications")}>
                {toggleRows([
                  { key: "pushNewRegistration", label: t("pgSettings.newRegistration"), desc: t("pgSettings.pushNewRegistrationDesc") },
                  { key: "pushEventUpdate", label: t("pgSettings.eventUpdates"), desc: t("pgSettings.eventUpdatesDesc") },
                ])}
              </Panel>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
