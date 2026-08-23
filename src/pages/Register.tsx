import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";
import { User, Building2, Mail, Lock, Phone, ArrowLeft, Calendar, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PlanScope } from "@/hooks/usePlanScope";
import { PUBLIC_EVENTS_ENABLED } from "@/lib/phase";

type AccountType = "attendee" | "organizer" | null;

const Register = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [accountType, setAccountType] = useState<AccountType>(null);
  // باقة المنظم — المرحلة الأولى: الدعوات الخاصة فقط (تُختار تلقائياً بدون عرض خيارات عامة)
  const [planScope, setPlanScope] = useState<PlanScope | null>(PUBLIC_EVENTS_ENABLED ? null : "private");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    bankName: "",
    iban: "",
    accountHolder: "",
    phone: "",
    password: "",
    confirmPassword: "",
    orgName: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error(t("pgAuth.common.passwordMismatch"));
      return;
    }

    if (formData.password.length < 6) {
      toast.error(t("pgAuth.common.passwordMinLength"));
      return;
    }

    // البريد الإلكتروني إلزامي وصحيح لجميع أنواع الحسابات
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error(t("pgAuth.register.emailInvalid"));
      return;
    }

    // رقم الجوال إلزامي لجميع الحسابات
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, "").length < 9) {
      toast.error(t("pgAuth.register.phoneRequired"));
      return;
    }

    // المنظم: البيانات المالية إلزامية منذ التسجيل — تُستخدم لاحقاً للتسويات تلقائياً
    if (accountType === "organizer") {
      if (!planScope) {
        toast.error(t("pgAuth.register.planRequired"));
        return;
      }
      if (!formData.bankName.trim() || !formData.iban.trim() || !formData.accountHolder.trim()) {
        toast.error(t("pgAuth.register.bankRequired"));
        return;
      }
      const iban = formData.iban.replace(/\s/g, "").toUpperCase();
      if (!/^SA\d{22}$/.test(iban)) {
        toast.error(t("pgAuth.register.ibanInvalid"));
        return;
      }
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: formData.fullName,
            account_type: accountType || "attendee",
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error(t("pgAuth.register.toastEmailRegistered"));
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // Update profile with extra fields
        await supabase.from("profiles").update({
          phone: formData.phone || null,
          org_name: accountType === "organizer" ? formData.orgName : null,
        }).eq("id", data.user.id);

        // Auto-create organization for organizers
        if (accountType === "organizer" && formData.orgName) {
          const orgPayload = {
            name: formData.orgName,
            owner_id: data.user.id,
            bank_name: formData.bankName.trim(),
            iban: formData.iban.replace(/\s/g, "").toUpperCase(),
            bank_account_holder: formData.accountHolder.trim(),
          };
          // مع الباقة المختارة — ولو عمود plan_scope غير موجود بعد نحفظ بدونه حتى لا يفشل التسجيل
          const { error: orgErr } = await supabase.from("organizations").insert({
            ...orgPayload,
            plan_scope: planScope,
          } as any);
          if (orgErr) {
            await supabase.from("organizations").insert(orgPayload as any);
          }
        }

        if (data.session) {
          toast.success(t("pgAuth.register.toastSuccess"));
          if (accountType === "organizer") {
            navigate("/dashboard");
          } else {
            navigate("/my/profile");
          }
        } else {
          toast.success(t("pgAuth.register.toastSuccessConfirm"));
          navigate("/login");
        }
      }
    } catch (err: any) {
      toast.error(t("pgAuth.common.errorUnexpected"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-cairo">
      {/* Right side - Purple branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-20 left-10 w-20 h-20 rounded-full bg-accent/20 animate-float" />
        <div className="absolute bottom-32 right-20 w-14 h-14 rounded-full bg-teal/20 animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-purple-glow/10 blur-3xl" />

        <div className="text-center relative z-10">
          <img src={logo} alt={t("pgAuth.common.brandAlt")} className="h-24 w-auto mx-auto mb-8" />
          <h2 className="text-primary-foreground font-bold text-3xl mb-4">{t("pgAuth.register.brandTitle")}</h2>
          <p className="text-primary-foreground/70 text-lg max-w-md">
            {t("pgAuth.register.brandSubtitle")}
          </p>
        </div>
      </div>

      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/">
              <img src={logo} alt={t("pgAuth.common.brandAlt")} className="h-16 w-auto" />
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="font-bold text-2xl text-foreground mb-2">{t("pgAuth.register.title")}</h1>
            <p className="text-muted-foreground text-sm">
              {t("pgAuth.register.haveAccount")}{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                {t("pgAuth.register.loginLink")}
              </Link>
            </p>
          </div>

          {/* Account type selection */}
          {!accountType ? (
            <div className="space-y-4">
              <p className="text-foreground font-semibold mb-4">{t("pgAuth.register.chooseType")}</p>
              <button
                onClick={() => setAccountType("attendee")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-border hover:border-primary bg-card hover:shadow-lg transition-all duration-200 text-start"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{t("pgAuth.register.attendeeTitle")}</h3>
                  <p className="text-muted-foreground text-sm">{t("pgAuth.register.attendeeDesc")}</p>
                </div>
              </button>
              <button
                onClick={() => setAccountType("organizer")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-border hover:border-accent bg-card hover:shadow-lg transition-all duration-200 text-start"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{t("pgAuth.register.organizerTitle")}</h3>
                  <p className="text-muted-foreground text-sm">{t("pgAuth.register.organizerDesc")}</p>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => setAccountType(null)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("pgAuth.register.changeType")}
              </button>

              <div className="space-y-2">
                <Label htmlFor="fullName">{t("pgAuth.register.fullName")}</Label>
                <div className="relative">
                  <User className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="fullName" name="fullName" placeholder={t("pgAuth.register.fullNamePlaceholder")} value={formData.fullName} onChange={handleChange} className="pe-10" required />
                </div>
              </div>

              {accountType === "organizer" && (
                <div className="space-y-2">
                  <Label htmlFor="orgName">{t("pgAuth.register.orgName")}</Label>
                  <div className="relative">
                    <Building2 className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="orgName" name="orgName" placeholder={t("pgAuth.register.orgNamePlaceholder")} value={formData.orgName} onChange={handleChange} className="pe-10" required />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t("pgAuth.common.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" name="email" type="email" placeholder="example@email.com" value={formData.email} onChange={handleChange} className="pl-10" dir="ltr" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("pgAuth.register.phone")}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="phone" name="phone" type="tel" placeholder="+966 5X XXX XXXX" value={formData.phone} onChange={handleChange} className="pl-10" dir="ltr" required />
                </div>
              </div>

              {/* اختيار الباقة — المرحلة الأولى تعرض باقة الدعوات الخاصة فقط بلا خيارات */}
              {accountType === "organizer" && PUBLIC_EVENTS_ENABLED && (
                <div className="space-y-2">
                  <div>
                    <p className="font-bold text-sm">{t("pgAuth.register.planSectionTitle")} *</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{t("pgAuth.register.planSectionDesc")}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {([
                      { key: "private" as PlanScope, Icon: Mail, title: t("pgAuth.register.planPrivateTitle"), desc: t("pgAuth.register.planPrivateDesc") },
                      { key: "public" as PlanScope, Icon: Calendar, title: t("pgAuth.register.planPublicTitle"), desc: t("pgAuth.register.planPublicDesc") },
                      { key: "both" as PlanScope, Icon: Sparkles, title: t("pgAuth.register.planBothTitle"), desc: t("pgAuth.register.planBothDesc") },
                    ]).map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setPlanScope(p.key)}
                        className={`rounded-xl border-2 p-3 text-start transition-all ${
                          planScope === p.key
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <p.Icon className={`w-5 h-5 mb-1.5 ${planScope === p.key ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="font-bold text-xs">{p.title}</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* البيانات المالية — إلزامية لحساب المنظم منذ التسجيل */}
              {accountType === "organizer" && (
                <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div>
                    <p className="font-bold text-sm">{t("pgAuth.register.bankSectionTitle")} *</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{t("pgAuth.register.bankSectionDesc")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">{t("pgAuth.register.bankName")}</Label>
                    <Input id="bankName" name="bankName" placeholder={t("pgAuth.register.bankNamePlaceholder")} value={formData.bankName} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iban">{t("pgAuth.register.iban")}</Label>
                    <Input id="iban" name="iban" placeholder="SA0000000000000000000000" value={formData.iban} onChange={handleChange} dir="ltr" className="font-mono" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountHolder">{t("pgAuth.register.accountHolder")}</Label>
                    <Input id="accountHolder" name="accountHolder" value={formData.accountHolder} onChange={handleChange} required />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">{t("pgAuth.common.password")}</Label>
                <div className="relative">
                  <Lock className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} className="pe-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("pgAuth.common.confirmPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} className="pe-10" required />
                </div>
              </div>

              <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading}>
                {loading ? t("pgAuth.register.submitting") :
                 accountType === "organizer" ? t("pgAuth.register.submitOrganizer") : t("pgAuth.register.submit")}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                {t("pgAuth.register.termsPrefix")}{" "}
                <a href="#" className="text-primary hover:underline">{t("pgAuth.register.termsLink")}</a>
                {" "}{t("pgAuth.register.termsAnd")}{" "}
                <a href="#" className="text-primary hover:underline">{t("pgAuth.register.privacyLink")}</a>
              </p>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("pgAuth.common.backHome")}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
