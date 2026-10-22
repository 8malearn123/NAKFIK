import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateContent } from "@/lib/contentTranslations";
import { Button } from "@/components/ui/button";
import { DEMO_EVENT, DEMO_TICKET, decodeDemoGift } from "@/lib/giftDemo";
import { Gift, Calendar, MapPin, Ticket as TicketIcon, Loader2, CheckCircle2, XCircle, Info } from "lucide-react";

// صفحة استلام تذكرة مُهداة لشخص لم يكن لديه حساب — يصلها المستلم من رابط واتساب
interface GiftInfo {
  status: string;
  recipient_name: string;
  buyer_name: string;
  message: string | null;
  event_id: string;
  event_title_ar: string;
  event_title_en: string | null;
  event_start: string;
  venue_name: string | null;
  ticket_name_ar: string | null;
  ticket_name_en: string | null;
}

// demo: رابط تجريبي (/demo/gift/...) يحمل بيانات الهدية بدون قاعدة بيانات
const GiftClaim = ({ demo = false }: { demo?: boolean }) => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const { t, lang, dir } = useLanguage();
  const navigate = useNavigate();

  const [gift, setGift] = useState<GiftInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${t("pgGift.title")} | نكفيك`;
  }, [t]);

  useEffect(() => {
    const load = async () => {
      if (!token) { setLoading(false); return; }
      if (demo) {
        const d = decodeDemoGift(token);
        setGift(d && {
          status: "pending",
          recipient_name: d.recipientName,
          buyer_name: d.buyerName,
          message: d.message || null,
          event_id: DEMO_EVENT.id,
          event_title_ar: DEMO_EVENT.title_ar,
          event_title_en: DEMO_EVENT.title_en,
          event_start: DEMO_EVENT.start_date,
          venue_name: DEMO_EVENT.venue_name,
          ticket_name_ar: DEMO_TICKET.name_ar,
          ticket_name_en: DEMO_TICKET.name_en,
        });
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc("get_ticket_gift", { _token: token });
      setGift((data?.[0] as GiftInfo) || null);
      setLoading(false);
    };
    load();
  }, [demo, token]);

  const claim = async () => {
    if (!token) return;
    if (demo) {
      setClaimed(true);
      return;
    }
    setClaiming(true);
    setClaimError(null);
    const { data, error } = await supabase.rpc("claim_ticket_gift", { _token: token });
    setClaiming(false);
    const result = data as { status?: string; error?: string } | null;
    if (!error && (result?.status === "claimed" || result?.error === "already_yours")) {
      setClaimed(true);
    } else {
      setClaimError(t(`pgGift.errors.${result?.error || "unknown"}`));
    }
  };

  if (loading || (authLoading && !demo)) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center font-cairo">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!gift) {
    return (
      <div dir={dir} className="min-h-screen bg-muted/30 font-cairo flex flex-col items-center justify-center gap-4 p-6 text-center">
        <XCircle className="w-12 h-12 text-destructive" />
        <p className="text-foreground text-lg font-bold">{t("pgGift.notFound")}</p>
        <Button className="rounded-full" asChild><Link to="/">{t("pgGift.home")}</Link></Button>
      </div>
    );
  }

  const eventTitle = lang === "en" && gift.event_title_en ? gift.event_title_en : gift.event_title_ar;
  const ticketName = lang === "en" && gift.ticket_name_en
    ? gift.ticket_name_en
    : gift.ticket_name_ar ? translateContent(gift.ticket_name_ar, lang) : null;
  const returnQuery = `?return=${encodeURIComponent(`/gift/${token}`)}`;
  const alreadyClaimed = gift.status === "claimed" && !claimed;

  return (
    <div dir={dir} className="min-h-screen bg-muted/30 font-cairo flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border rounded-3xl shadow-lg max-w-md w-full overflow-hidden"
      >
        {demo && (
          <div className="bg-amber-500/10 text-amber-800 text-xs p-3 flex items-start gap-2 leading-relaxed">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {t("pgGift.demoBanner")}
          </div>
        )}
        <div className="bg-primary/10 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto">
            <Gift className="w-8 h-8" />
          </div>
          <h1 className="font-bold text-xl mt-3">
            {t("pgGift.hello").replace("{name}", gift.recipient_name)}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("pgGift.giftFrom").replace("{name}", gift.buyer_name || t("pgGift.someone"))}
          </p>
          {gift.message && (
            <p className="mt-3 text-sm bg-card rounded-2xl p-3 leading-relaxed">«{gift.message}»</p>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2 text-sm">
            <p className="font-bold text-foreground">{eventTitle}</p>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(gift.event_start).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
            </p>
            {gift.venue_name && (
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5" /> {gift.venue_name}
              </p>
            )}
            {ticketName && (
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <TicketIcon className="w-3.5 h-3.5" /> {ticketName}
              </p>
            )}
          </div>

          {claimed ? (
            <div className="text-center space-y-3 border-t pt-4">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
              <p className="font-bold">{t("pgGift.claimedTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("pgGift.claimedDesc")}</p>
              {!demo && (
                <Button className="rounded-full w-full" onClick={() => navigate("/my-tickets")}>
                  {t("pgGift.goToTickets")}
                </Button>
              )}
            </div>
          ) : alreadyClaimed || gift.status === "cancelled" ? (
            <p className="text-sm text-center text-muted-foreground border-t pt-4">
              {t(alreadyClaimed ? "pgGift.errors.already_claimed" : "pgGift.errors.cancelled")}
            </p>
          ) : !user && !demo ? (
            <div className="space-y-2 border-t pt-4">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">{t("pgGift.signupFirst")}</p>
              <Button className="rounded-full w-full" asChild>
                <Link to={`/register${returnQuery}`}>{t("pgGift.createAccount")}</Link>
              </Button>
              <Button variant="outline" className="rounded-full w-full" asChild>
                <Link to={`/login${returnQuery}`}>{t("pgGift.haveAccount")}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2 border-t pt-4">
              <Button className="rounded-full w-full" size="lg" disabled={claiming} onClick={claim}>
                {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4 ml-1" />}
                {t("pgGift.claim")}
              </Button>
              {claimError && <p className="text-xs text-destructive text-center leading-relaxed">{claimError}</p>}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default GiftClaim;
