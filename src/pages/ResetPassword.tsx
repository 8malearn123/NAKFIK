import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandLogo from "@/components/brand/BrandLogo";
import { Lock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Check hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("pgAuth.common.passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      toast.error(t("pgAuth.common.passwordMinLength"));
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success(t("pgAuth.reset.toastSuccess"));
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch {
      toast.error(t("pgAuth.common.errorUnexpected"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background font-cairo">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <BrandLogo alt={t("pgAuth.common.brandAlt")} className="h-16" />
          </Link>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
              <CheckCircle className="h-6 w-6" />
            </span>
            <h1 className="font-bold text-2xl text-foreground">{t("pgAuth.reset.successTitle")}</h1>
            <p className="text-muted-foreground text-sm">
              {t("pgAuth.reset.successDesc")}
            </p>
          </div>
        ) : !isRecovery ? (
          <div className="text-center space-y-4">
            <h1 className="font-bold text-2xl text-foreground">{t("pgAuth.reset.invalidTitle")}</h1>
            <p className="text-muted-foreground text-sm">
              {t("pgAuth.reset.invalidDesc")}
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/forgot-password">{t("pgAuth.reset.requestNew")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="font-bold text-2xl text-foreground mb-2">{t("pgAuth.reset.title")}</h1>
              <p className="text-muted-foreground text-sm">
                {t("pgAuth.reset.subtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">{t("pgAuth.reset.newPassword")}</Label>
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
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("pgAuth.common.confirmPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pe-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? t("pgAuth.reset.submitting") : t("pgAuth.reset.submit")}
              </Button>
            </form>
          </>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("pgAuth.reset.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
