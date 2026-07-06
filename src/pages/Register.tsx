import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";
import { User, Building2, Mail, Lock, Phone, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AccountType = "attendee" | "organizer" | null;

const Register = () => {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
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
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
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
          toast.error("هذا البريد الإلكتروني مسجل مسبقاً");
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
          await supabase.from("organizations").insert({
            name: formData.orgName,
            owner_id: data.user.id,
          });
        }

        if (data.session) {
          toast.success("تم إنشاء الحساب بنجاح!");
          if (accountType === "organizer") {
            navigate("/dashboard");
          } else {
            navigate("/my/profile");
          }
        } else {
          toast.success("تم إنشاء الحساب! يرجى تأكيد بريدك الإلكتروني للمتابعة");
          navigate("/login");
        }
      }
    } catch (err: any) {
      toast.error("حدث خطأ غير متوقع");
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
          <img src={logo} alt="نكفيك تيكت" className="h-24 w-auto mx-auto mb-8" />
          <h2 className="text-primary-foreground font-bold text-3xl mb-4">انضم إلى نكفيك تيكت</h2>
          <p className="text-primary-foreground/70 text-lg max-w-md">
            المنصة الأولى في المملكة لإدارة الفعاليات والمؤتمرات
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
              <img src={logo} alt="نكفيك تيكت" className="h-16 w-auto" />
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="font-bold text-2xl text-foreground mb-2">إنشاء حساب جديد</h1>
            <p className="text-muted-foreground text-sm">
              لديك حساب بالفعل؟{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                تسجيل الدخول
              </Link>
            </p>
          </div>

          {/* Account type selection */}
          {!accountType ? (
            <div className="space-y-4">
              <p className="text-foreground font-semibold mb-4">اختر نوع الحساب:</p>
              <button
                onClick={() => setAccountType("attendee")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-border hover:border-primary bg-card hover:shadow-lg transition-all duration-200 text-right"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">حاضر / زائر</h3>
                  <p className="text-muted-foreground text-sm">سجّل في الفعاليات واحصل على تذاكرك</p>
                </div>
              </button>
              <button
                onClick={() => setAccountType("organizer")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-border hover:border-accent bg-card hover:shadow-lg transition-all duration-200 text-right"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">منظّم فعاليات</h3>
                  <p className="text-muted-foreground text-sm">أنشئ وأدِر فعالياتك ومؤتمراتك</p>
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
                تغيير نوع الحساب
              </button>

              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="fullName" name="fullName" placeholder="محمد أحمد" value={formData.fullName} onChange={handleChange} className="pr-10" required />
                </div>
              </div>

              {accountType === "organizer" && (
                <div className="space-y-2">
                  <Label htmlFor="orgName">اسم المنظمة</Label>
                  <div className="relative">
                    <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="orgName" name="orgName" placeholder="اسم مؤسستك أو شركتك" value={formData.orgName} onChange={handleChange} className="pr-10" required />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" name="email" type="email" placeholder="example@email.com" value={formData.email} onChange={handleChange} className="pr-10" dir="ltr" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">رقم الجوال</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="phone" name="phone" type="tel" placeholder="+966 5X XXX XXXX" value={formData.phone} onChange={handleChange} className="pr-10" dir="ltr" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} className="pr-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} className="pr-10" required />
                </div>
              </div>

              <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading}>
                {loading ? "جارٍ إنشاء الحساب..." : 
                 accountType === "organizer" ? "إنشاء حساب منظّم" : "إنشاء حساب"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                بإنشاء حسابك فإنك توافق على{" "}
                <a href="#" className="text-primary hover:underline">الشروط والأحكام</a>
                {" "}و{" "}
                <a href="#" className="text-primary hover:underline">سياسة الخصوصية</a>
              </p>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← العودة للصفحة الرئيسية
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
