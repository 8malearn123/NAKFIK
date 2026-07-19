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
import { useLanguage } from "@/contexts/LanguageContext";

const Login = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
          toast.error(t("pgAuth.login.toastConfirmEmail"));
        } else if (error.message.includes("Invalid login credentials")) {
          toast.error(t("pgAuth.login.toastInvalidCredentials"));
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
          toast.success(t("pgAuth.login.toastWelcomeAdmin"));
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

        toast.success(t("pgAuth.login.toastSuccess"));

        const accountType = profile?.account_type || "attendee";
        if (accountType === "organizer") {
          navigate("/dashboard");
        } else {
          navigate("/my/profile");
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
          <h2 className="text-primary-foreground font-bold text-3xl mb-4">{t("pgAuth.login.brandTitle")}</h2>
          <p className="text-primary-foreground/70 text-lg max-w-md">
            {t("pgAuth.login.brandSubtitle")}
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
            <h1 className="font-bold text-2xl text-foreground mb-2">{t("pgAuth.login.title")}</h1>
            <p className="text-muted-foreground text-sm">
              {t("pgAuth.login.noAccount")}{" "}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                {t("pgAuth.login.createAccountLink")}
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">{t("pgAuth.common.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("pgAuth.common.password")}</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  {t("pgAuth.login.forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pe-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading}>
              {loading ? t("pgAuth.login.submitting") : t("pgAuth.login.submit")}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("pgAuth.common.backHome")}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
