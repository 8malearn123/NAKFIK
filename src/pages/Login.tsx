import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";
import { Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          toast.error("يرجى تأكيد بريدك الإلكتروني أولاً");
        } else if (error.message.includes("Invalid login credentials")) {
          toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // Check for super admin role
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "super_admin")
          .maybeSingle();

        if (adminRole) {
          toast.success("مرحباً مدير النظام!");
          // Use replace to avoid race condition with ProtectedRoute
          window.location.href = "/admin";
          return;
        }

        // Fetch profile to determine redirect
        const { data: profile } = await supabase
          .from("profiles")
          .select("account_type")
          .eq("id", data.user.id)
          .maybeSingle();

        toast.success("تم تسجيل الدخول بنجاح!");

        const accountType = profile?.account_type || "attendee";
        if (accountType === "organizer") {
          navigate("/dashboard");
        } else {
          navigate("/my/profile");
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
          <h2 className="text-primary-foreground font-bold text-3xl mb-4">مرحباً بعودتك!</h2>
          <p className="text-primary-foreground/70 text-lg max-w-md">
            سجّل دخولك لإدارة فعالياتك ومتابعة تذاكرك
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
            <h1 className="font-bold text-2xl text-foreground mb-2">تسجيل الدخول</h1>
            <p className="text-muted-foreground text-sm">
              ليس لديك حساب؟{" "}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                أنشئ حساباً جديداً
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">كلمة المرور</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading}>
              {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-6 p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground mb-3 text-center font-semibold">حسابات تجريبية (للاختبار)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "🛡️ سوبر أدمن", email: "admin@nakfeek.sa" },
                { label: "🎪 منظّم فعاليات", email: "org1@nakfeek.sa" },
                { label: "👤 حاضر", email: "attendee1@nakfeek.sa" },
              ].map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => { setEmail(demo.email); setPassword("Demo@12345"); }}
                  className="text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent/10 hover:border-primary/50 transition-all text-right truncate"
                >
                  <span className="block font-semibold">{demo.label}</span>
                  <span className="text-muted-foreground text-[10px]" dir="ltr">{demo.email}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center" dir="ltr">Password: Demo@12345</p>
          </div>

          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← العودة للصفحة الرئيسية
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
