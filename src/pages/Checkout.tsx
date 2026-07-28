import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateContent } from "@/lib/contentTranslations";
import { MOYASAR_PUBLISHABLE_KEY, isPaymentsConfigured, loadMoyasar, toHalalas } from "@/lib/payments";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/landing/Navbar";
import { ShieldCheck, Lock, CreditCard, ArrowRight, Ticket as TicketIcon, Calendar, MapPin } from "lucide-react";

interface EventInfo {
  id: string;
  title_ar: string;
  title_en: string | null;
  start_date: string;
  venue_name: string | null;
  is_online: boolean;
  cover_image_url: string | null;
}

interface TicketInfo {
  id: string;
  name_ar: string;
  name_en: string | null;
  price: number;
}

const Checkout = () => {
  const { eventId, ticketId } = useParams<{ eventId: string; ticketId: string }>();
  const { user } = useAuth();
  const { t, lang, dir } = useLanguage();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    document.title = `${t("pgCheckout.title")} | نكفيك`;
  }, [t]);

  useEffect(() => {
    const load = async () => {
      if (!eventId || !ticketId) { setLoading(false); return; }
      const [{ data: ev }, { data: tk }] = await Promise.all([
        supabase.from("events")
          .select("id, title_ar, title_en, start_date, venue_name, is_online, cover_image_url")
          .eq("id", eventId).maybeSingle(),
        supabase.from("tickets")
          .select("id, name_ar, name_en, price")
          .eq("id", ticketId).eq("event_id", eventId).maybeSingle(),
      ]);
      setEvent(ev as any);
      setTicket(tk as any);
      setLoading(false);
    };
    load();
  }, [eventId, ticketId]);

  // تهيئة نموذج ميسر بعد توفر البيانات
  useEffect(() => {
    if (loading || !event || !ticket || !user) return;
    if (!isPaymentsConfigured() || ticket.price <= 0 || initialized.current) return;
    initialized.current = true;

    loadMoyasar()
      .then(() => {
        const Moyasar = (window as any).Moyasar;
        if (!Moyasar || !formRef.current) return;
        Moyasar.init({
          element: formRef.current,
          language: lang === "ar" ? "ar" : "en",
          amount: toHalalas(ticket.price),
          currency: "SAR",
          description: `${event.title_ar} — ${ticket.name_ar}`,
          publishable_api_key: MOYASAR_PUBLISHABLE_KEY,
          callback_url: `${window.location.origin}/payment/callback?event=${event.id}&ticket=${ticket.id}`,
          methods: ["creditcard", "applepay", "stcpay"],
          supported_networks: ["mada", "visa", "mastercard"],
          apple_pay: {
            country: "SA",
            label: "Nakfeek Ticket",
            validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
          },
          metadata: {
            user_id: user.id,
            event_id: event.id,
            ticket_id: ticket.id,
          },
        });
      })
      .catch(() => setFormError("failed_to_load"));
  }, [loading, event, ticket, user, lang]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center font-cairo">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!event || !ticket) {
    return (
      <div dir={dir} className="min-h-screen bg-muted/30 font-cairo flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-xl">{t("pgCheckout.notFound")}</p>
        <Button className="rounded-full" asChild>
          <Link to="/events">{t("pgCheckout.backToEvent")}</Link>
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div dir={dir} className="min-h-screen bg-muted/30 font-cairo flex flex-col items-center justify-center gap-4 p-6">
        <Lock className="w-10 h-10 text-primary" />
        <p className="text-foreground text-lg font-bold">{t("pgCheckout.loginFirst")}</p>
        <Button
          className="rounded-full"
          onClick={() => navigate(`/login?return=${encodeURIComponent(`/checkout/${eventId}/${ticketId}`)}`)}
        >
          {t("pgAuth.login.submit")}
        </Button>
      </div>
    );
  }

  const eventTitle = lang === "en" && event.title_en ? event.title_en : event.title_ar;
  const ticketName = lang === "en" && ticket.name_en ? ticket.name_en : translateContent(ticket.name_ar, lang);

  return (
    <div dir={dir} className="min-h-screen bg-muted/30 font-cairo">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6">
            <Link
              to={`/events/${event.id}`}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" /> {t("pgCheckout.backToEvent")}
            </Link>
            <h1 className="font-bold text-2xl md:text-3xl text-foreground mt-2 flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-primary" /> {t("pgCheckout.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("pgCheckout.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-5 gap-6 items-start">
            {/* ملخص الطلب */}
            <div className="md:col-span-2 bg-card border rounded-3xl overflow-hidden shadow-sm">
              {event.cover_image_url && (
                <div
                  className="h-28 w-full"
                  style={{ background: `url(${event.cover_image_url}) center/cover` }}
                />
              )}
              <div className="p-5 space-y-3">
                <h2 className="font-bold text-sm text-muted-foreground">{t("pgCheckout.orderSummary")}</h2>
                <div className="space-y-2 text-sm">
                  <p className="font-bold text-foreground">{eventTitle}</p>
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(event.start_date).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  {event.venue_name && (
                    <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <MapPin className="w-3.5 h-3.5" /> {event.venue_name}
                    </p>
                  )}
                </div>
                <div className="border-t pt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <TicketIcon className="w-4 h-4" /> {t("pgCheckout.ticket")}
                    </span>
                    <span className="font-semibold">{ticketName}</span>
                  </div>
                  <div className="flex items-center justify-between text-base">
                    <span className="font-bold">{t("pgCheckout.total")}</span>
                    <span className="font-extrabold text-primary text-xl">
                      {ticket.price.toLocaleString()} <span className="text-xs font-normal">{t("pgCheckout.currency")}</span>
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-green-500/10 text-green-700 text-[11px] p-2.5 flex items-start gap-1.5 leading-relaxed">
                  <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  {t("pgCheckout.securePayment")}
                </div>
              </div>
            </div>

            {/* نموذج الدفع */}
            <div className="md:col-span-3 bg-card border rounded-3xl p-5 shadow-sm">
              <h2 className="font-bold mb-1 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> {t("pgCheckout.payWith")}
              </h2>
              <p className="text-[11px] text-muted-foreground mb-4">{t("pgCheckout.methods")}</p>

              {ticket.price <= 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{t("pgCheckout.freeTicketNote")}</p>
                  <Button className="mt-4 rounded-full" asChild>
                    <Link to={`/events/${event.id}`}>{t("pgCheckout.backToEvent")}</Link>
                  </Button>
                </div>
              ) : !isPaymentsConfigured() ? (
                <div className="text-center py-8 space-y-2">
                  <ShieldCheck className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                  <p className="font-bold">{t("pgCheckout.notConfigured")}</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">{t("pgCheckout.notConfiguredDesc")}</p>
                </div>
              ) : formError ? (
                <div className="text-center py-8">
                  <p className="text-destructive text-sm">{t("pgCheckout.failedTitle")}</p>
                  <Button variant="outline" className="mt-3 rounded-full" onClick={() => window.location.reload()}>
                    {t("pgCheckout.tryAgain")}
                  </Button>
                </div>
              ) : (
                <div ref={formRef} className="mysr-form" dir="ltr" />
              )}

              <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed border-t pt-3">
                {t("pgCheckout.pciNote")}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Checkout;
