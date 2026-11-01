import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandLogo from "@/components/brand/BrandLogo";
import { Mail, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const ForgotPassword = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
        toast.success(t("pgAuth.forgot.toastSent"));
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

        {sent ? (
          <div className="text-center space-y-4">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
              <Mail className="h-6 w-6" />
            </span>
            <h1 className="font-bold text-2xl text-foreground">{t("pgAuth.forgot.sentTitle")}</h1>
            <p className="text-muted-foreground text-sm">
              {t("pgAuth.forgot.sentDescPrefix")} <bdi dir="ltr" className="font-semibold text-foreground">{email}</bdi>
            </p>
            <p className="text-muted-foreground text-xs">
              {t("pgAuth.forgot.spamNote")}
            </p>
            <Button variant="outline" onClick={() => setSent(false)} className="mt-4">
              {t("pgAuth.forgot.resend")}
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="font-bold text-2xl text-foreground mb-2">{t("pgAuth.forgot.title")}</h1>
              <p className="text-muted-foreground text-sm">
                {t("pgAuth.forgot.subtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">{t("pgAuth.common.email")}</Label>
                <div className="relative">
                  <Mail className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pe-10 rtl:ps-10"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? t("pgAuth.forgot.submitting") : t("pgAuth.forgot.submit")}
              </Button>
            </form>
          </>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-primary font-semibold hover:underline inline-flex items-center gap-1">
            <ArrowRight className="h-4 w-4 ltr:rotate-180" />
            {t("pgAuth.forgot.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
