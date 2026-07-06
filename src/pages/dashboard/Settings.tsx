import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { User, Building2, Mail, Camera, Save, Bell, Landmark, FileText, Share2, Receipt, Globe, ImagePlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
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
    if (error) toast.error("خطأ في حفظ الملف الشخصي");
    else { toast.success("تم حفظ التغييرات"); await refreshProfile(); }
    setSavingProfile(false);
  };

  const handleOrgSave = async () => {
    if (!organization) { toast.error("لا توجد منظمة مرتبطة بحسابك"); return; }
    setSavingOrg(true);
    const { error } = await supabase.from("organizations").update({
      name: org.name, description: org.description,
      logo_url: org.logo_url, cover_image_url: org.cover_image_url,
      address: org.address, commercial_register: org.commercial_register, tax_number: org.tax_number,
      website: org.website, public_email: org.public_email, phone: org.phone, brand_color: org.brand_color,
      twitter_url: org.twitter_url, instagram_url: org.instagram_url, linkedin_url: org.linkedin_url,
      tiktok_url: org.tiktok_url, snapchat_url: org.snapchat_url,
      terms_text: org.terms_text, refund_policy: org.refund_policy, privacy_policy: org.privacy_policy,
      bank_name: org.bank_name, iban: org.iban, bank_account_holder: org.bank_account_holder,
      billing_address: org.billing_address, billing_name: org.billing_name, billing_tax_number: org.billing_tax_number,
    } as any).eq("id", organization.id);
    if (error) toast.error("خطأ في حفظ بيانات الشركة");
    else { toast.success("تم حفظ بيانات الشركة"); await refreshProfile(); }
    setSavingOrg(false);
  };

  const uploadImage = async (file: File, kind: "logo" | "cover") => {
    if (!organization) return;
    const bucket = kind === "logo" ? "logos" : "event-covers";
    const ext = file.name.split(".").pop();
    const path = `org-${organization.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) { toast.error("فشل رفع الصورة"); return; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setOrg(o => kind === "logo" ? { ...o, logo_url: data.publicUrl } : { ...o, cover_image_url: data.publicUrl });
    toast.success("تم رفع الصورة — لا تنسَ الحفظ");
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="font-bold text-2xl text-foreground">إعدادات الحساب والشركة</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة هوية شركتك وبياناتها الاحترافية</p>
        </div>

        <Tabs defaultValue="company" dir="rtl">
          <TabsList className="mb-6 w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="company" className="gap-1.5"><Building2 className="w-4 h-4" /> هوية الشركة</TabsTrigger>
            <TabsTrigger value="contact" className="gap-1.5"><Globe className="w-4 h-4" /> الاتصال والروابط</TabsTrigger>
            <TabsTrigger value="bank" className="gap-1.5"><Landmark className="w-4 h-4" /> البنك والفوترة</TabsTrigger>
            <TabsTrigger value="legal" className="gap-1.5"><FileText className="w-4 h-4" /> السياسات</TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5"><User className="w-4 h-4" /> الملف الشخصي</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><Bell className="w-4 h-4" /> الإشعارات</TabsTrigger>
          </TabsList>

          {/* COMPANY IDENTITY */}
          <TabsContent value="company">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
                <h3 className="font-bold text-foreground flex items-center gap-2"><ImagePlus className="w-4 h-4 text-primary" /> الهوية البصرية</h3>

                {/* Cover */}
                <div className="space-y-2">
                  <Label>صورة الغلاف</Label>
                  <div className="relative w-full h-40 rounded-xl bg-muted border border-border/50 overflow-hidden flex items-center justify-center">
                    {org.cover_image_url ? (
                      <img src={org.cover_image_url} alt="cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-muted-foreground text-sm">لا يوجد غلاف</div>
                    )}
                    <Button size="sm" variant="secondary" className="absolute bottom-3 left-3 rounded-full" onClick={() => coverInputRef.current?.click()}>
                      <Camera className="w-3.5 h-3.5" /> تغيير الغلاف
                    </Button>
                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], "cover")} />
                  </div>
                </div>

                {/* Logo + brand color */}
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div className="space-y-2">
                    <Label>شعار الشركة</Label>
                    <div className="relative w-24 h-24 rounded-2xl bg-muted border border-border/50 flex items-center justify-center overflow-hidden">
                      {org.logo_url ? (
                        <img src={org.logo_url} alt="logo" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => logoInputRef.current?.click()}>
                      <Camera className="w-3.5 h-3.5" /> تغيير الشعار
                    </Button>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], "logo")} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>اللون الأساسي للهوية</Label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={org.brand_color || "#7E5CB5"} onChange={e => setOrg({ ...org, brand_color: e.target.value })} className="w-14 h-10 rounded-lg cursor-pointer border" />
                      <Input value={org.brand_color || ""} onChange={e => setOrg({ ...org, brand_color: e.target.value })} className="flex-1" dir="ltr" placeholder="#7E5CB5" />
                    </div>
                    <p className="text-xs text-muted-foreground">يستخدم في صفحات فعالياتك العامة</p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
                <h3 className="font-bold text-foreground flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> بيانات الشركة</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>اسم الشركة *</Label>
                    <Input value={org.name || ""} onChange={e => setOrg({ ...org, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>رقم السجل التجاري</Label>
                    <Input value={org.commercial_register || ""} onChange={e => setOrg({ ...org, commercial_register: e.target.value })} dir="ltr" /></div>
                  <div className="space-y-2"><Label>الرقم الضريبي</Label>
                    <Input value={org.tax_number || ""} onChange={e => setOrg({ ...org, tax_number: e.target.value })} dir="ltr" /></div>
                  <div className="space-y-2"><Label>عنوان المقر</Label>
                    <Input value={org.address || ""} onChange={e => setOrg({ ...org, address: e.target.value })} placeholder="المدينة، الحي، الشارع" /></div>
                </div>
                <div className="space-y-2">
                  <Label>نبذة عن الشركة</Label>
                  <Textarea value={org.description || ""} onChange={e => setOrg({ ...org, description: e.target.value })} rows={4} placeholder="وصف تعريفي يظهر في صفحاتك العامة..." />
                </div>
              </div>

              <Button className="rounded-full" onClick={handleOrgSave} disabled={savingOrg}>
                <Save className="w-4 h-4" /> {savingOrg ? "جارٍ الحفظ..." : "حفظ بيانات الشركة"}
              </Button>
            </motion.div>
          </TabsContent>

          {/* CONTACT & SOCIAL */}
          <TabsContent value="contact">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
                <h3 className="font-bold text-foreground flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> بيانات الاتصال</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>الموقع الإلكتروني</Label>
                    <Input value={org.website || ""} onChange={e => setOrg({ ...org, website: e.target.value })} dir="ltr" placeholder="https://..." /></div>
                  <div className="space-y-2"><Label>البريد العام</Label>
                    <Input value={org.public_email || ""} onChange={e => setOrg({ ...org, public_email: e.target.value })} dir="ltr" placeholder="info@company.com" /></div>
                  <div className="space-y-2"><Label>هاتف الشركة</Label>
                    <Input value={org.phone || ""} onChange={e => setOrg({ ...org, phone: e.target.value })} dir="ltr" placeholder="+966..." /></div>
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
                <h3 className="font-bold text-foreground flex items-center gap-2"><Share2 className="w-4 h-4 text-accent" /> روابط التواصل الاجتماعي</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { key: "twitter_url", label: "تويتر / X" },
                    { key: "instagram_url", label: "إنستغرام" },
                    { key: "linkedin_url", label: "لينكد إن" },
                    { key: "tiktok_url", label: "تيك توك" },
                    { key: "snapchat_url", label: "سناب شات" },
                  ].map(f => (
                    <div key={f.key} className="space-y-2">
                      <Label>{f.label}</Label>
                      <Input value={(org as any)[f.key] || ""} onChange={e => setOrg({ ...org, [f.key]: e.target.value } as any)} dir="ltr" placeholder="https://..." />
                    </div>
                  ))}
                </div>
              </div>

              <Button className="rounded-full" onClick={handleOrgSave} disabled={savingOrg}>
                <Save className="w-4 h-4" /> {savingOrg ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </Button>
            </motion.div>
          </TabsContent>

          {/* BANK & BILLING */}
          <TabsContent value="bank">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
                <h3 className="font-bold text-foreground flex items-center gap-2"><Landmark className="w-4 h-4 text-teal" /> الحساب البنكي للتسويات</h3>
                <p className="text-xs text-muted-foreground">تستخدم هذه البيانات لتحويل أرباحك من المنصة</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>اسم البنك</Label>
                    <Input value={org.bank_name || ""} onChange={e => setOrg({ ...org, bank_name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>اسم صاحب الحساب</Label>
                    <Input value={org.bank_account_holder || ""} onChange={e => setOrg({ ...org, bank_account_holder: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>رقم الآيبان (IBAN)</Label>
                  <Input value={org.iban || ""} onChange={e => setOrg({ ...org, iban: e.target.value })} dir="ltr" placeholder="SA00 0000 0000 0000 0000 0000" /></div>
              </div>

              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
                <h3 className="font-bold text-foreground flex items-center gap-2"><Receipt className="w-4 h-4 text-primary" /> بيانات الفوترة</h3>
                <p className="text-xs text-muted-foreground">تظهر في الفواتير الصادرة من نكفيك تيكت لشركتك</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>اسم جهة الفوترة</Label>
                    <Input value={org.billing_name || ""} onChange={e => setOrg({ ...org, billing_name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>الرقم الضريبي للفوترة</Label>
                    <Input value={org.billing_tax_number || ""} onChange={e => setOrg({ ...org, billing_tax_number: e.target.value })} dir="ltr" /></div>
                </div>
                <div className="space-y-2"><Label>عنوان الفوترة</Label>
                  <Textarea value={org.billing_address || ""} onChange={e => setOrg({ ...org, billing_address: e.target.value })} rows={2} /></div>
              </div>

              <Button className="rounded-full" onClick={handleOrgSave} disabled={savingOrg}>
                <Save className="w-4 h-4" /> {savingOrg ? "جارٍ الحفظ..." : "حفظ بيانات الفوترة"}
              </Button>
            </motion.div>
          </TabsContent>

          {/* LEGAL POLICIES */}
          <TabsContent value="legal">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
                <h3 className="font-bold text-foreground flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> السياسات القانونية</h3>
                <p className="text-xs text-muted-foreground">تظهر في صفحات شراء التذاكر وفي إيصالات الحضور</p>
                <div className="space-y-2"><Label>شروط الاستخدام</Label>
                  <Textarea value={org.terms_text || ""} onChange={e => setOrg({ ...org, terms_text: e.target.value })} rows={5} placeholder="شروط استخدام خدماتك..." /></div>
                <div className="space-y-2"><Label>سياسة الاسترجاع</Label>
                  <Textarea value={org.refund_policy || ""} onChange={e => setOrg({ ...org, refund_policy: e.target.value })} rows={5} placeholder="شروط استرداد المبالغ..." /></div>
                <div className="space-y-2"><Label>سياسة الخصوصية</Label>
                  <Textarea value={org.privacy_policy || ""} onChange={e => setOrg({ ...org, privacy_policy: e.target.value })} rows={5} placeholder="سياسة التعامل مع بيانات الحضور..." /></div>
              </div>
              <Button className="rounded-full" onClick={handleOrgSave} disabled={savingOrg}>
                <Save className="w-4 h-4" /> {savingOrg ? "جارٍ الحفظ..." : "حفظ السياسات"}
              </Button>
            </motion.div>
          </TabsContent>

          {/* PROFILE */}
          <TabsContent value="profile">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
                <h3 className="font-bold text-foreground flex items-center gap-2"><User className="w-4 h-4 text-primary" /> المعلومات الشخصية</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>الاسم الكامل</Label>
                    <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
                  <div className="space-y-2"><Label>رقم الجوال</Label>
                    <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} dir="ltr" placeholder="+966..." /></div>
                </div>
                <div className="space-y-2"><Label>البريد الإلكتروني</Label>
                  <Input value={form.email} readOnly className="opacity-60" dir="ltr" /></div>
                <div className="space-y-2"><Label>نبذة مختصرة</Label>
                  <Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} /></div>
                <Button className="rounded-full" onClick={handleProfileSave} disabled={savingProfile}>
                  <Save className="w-4 h-4" /> {savingProfile ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                </Button>
              </div>
            </motion.div>
          </TabsContent>

          {/* NOTIFICATIONS */}
          <TabsContent value="notifications">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-card rounded-2xl border border-border/50 p-6">
                <h3 className="font-bold text-foreground flex items-center gap-2 mb-5"><Mail className="w-4 h-4 text-primary" /> إشعارات البريد</h3>
                <div className="space-y-4">
                  {[
                    { key: "emailNewRegistration" as const, label: "تسجيل جديد", desc: "عند تسجيل حاضر جديد" },
                    { key: "emailEventReminder" as const, label: "تذكير بالفعالية", desc: "تذكير قبل 24 ساعة" },
                    { key: "emailWeeklyReport" as const, label: "تقرير أسبوعي", desc: "ملخص أداء فعالياتك" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div><p className="font-semibold text-foreground text-sm">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                      <Switch checked={notifications[item.key]} onCheckedChange={v => setNotifications({ ...notifications, [item.key]: v })} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-2xl border border-border/50 p-6">
                <h3 className="font-bold text-foreground flex items-center gap-2 mb-5"><Bell className="w-4 h-4 text-accent" /> إشعارات التطبيق</h3>
                <div className="space-y-4">
                  {[
                    { key: "pushNewRegistration" as const, label: "تسجيل جديد", desc: "إشعار فوري عند كل تسجيل" },
                    { key: "pushEventUpdate" as const, label: "تحديثات الفعالية", desc: "عند تغيير حالة الفعالية" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div><p className="font-semibold text-foreground text-sm">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                      <Switch checked={notifications[item.key]} onCheckedChange={v => setNotifications({ ...notifications, [item.key]: v })} />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
