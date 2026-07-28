import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Ticket as TicketIcon } from "lucide-react";

type Phase = "verifying" | "success" | "failed";

const PaymentCallback = () => {
  const [params] = useSearchParams();
  const { t, dir } = useLanguage();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [qr, setQr] = useState<string | null>(null);
  const [gatewayMsg, setGatewayMsg] = useState<string | null>(null);
  const started = useRef(false);

  const paymentId = params.get("id");
  const message = params.get("message");
  const eventId = params.get("event");
  const ticketId = params.get("ticket");

  useEffect(() => {
    document.title = `${t("pgCheckout.title")} | نكفيك`;
    if (started.current) return;
    started.current = true;

    const verify = async () => {
      if (!paymentId) {
        setGatewayMsg(message);
        setPhase("failed");
        return;
      }
      // التحقق النهائي دائماً من الخادم — لا ثقة بمعاملات الرابط.
      // حتى العمليات الفاشلة/الملغاة تمر هنا ليسجلها الخادم في سجل المدفوعات.
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { payment_id: paymentId, event_id: eventId, ticket_id: ticketId },
      });
      if (error || !data || data.error) {
        setGatewayMsg((data as any)?.gateway_message || message || null);
        setPhase("failed");
        return;
      }
      setQr((data as any).qr_code || null);
      setPhase("success");
    };
    verify();
  }, []);

  return (
    <div dir={dir} className="min-h-screen bg-muted/30 font-cairo flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border rounded-3xl shadow-lg p-8 max-w-md w-full text-center"
      >
        {phase === "verifying" && (
          <>
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <h1 className="font-bold text-xl mt-4">{t("pgCheckout.verifying")}</h1>
            <p className="text-sm text-muted-foreground mt-2">{t("pgCheckout.verifyingDesc")}</p>
          </>
        )}

        {phase === "success" && (
          <>
            <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
            <h1 className="font-bold text-2xl mt-4">{t("pgCheckout.successTitle")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("pgCheckout.successDesc")}</p>
            {qr && (
              <div className="mt-5 inline-block bg-white rounded-2xl p-4 border-2 border-primary/30">
                <p className="text-xs text-gray-500 mb-2">{t("pgCheckout.yourQr")}</p>
                <QRCodeSVG value={qr} size={160} />
                <p className="text-[10px] text-gray-400 mt-2">{t("pgCheckout.qrNote")}</p>
              </div>
            )}
            <div className="flex gap-2 justify-center mt-6">
              <Button className="rounded-full" asChild>
                <Link to="/my-tickets"><TicketIcon className="w-4 h-4 ml-1" /> {t("pgCheckout.goToTickets")}</Link>
              </Button>
              {eventId && (
                <Button variant="outline" className="rounded-full" asChild>
                  <Link to={`/events/${eventId}`}>{t("pgCheckout.backToEvent")}</Link>
                </Button>
              )}
            </div>
          </>
        )}

        {phase === "failed" && (
          <>
            <XCircle className="w-14 h-14 text-destructive mx-auto" />
            <h1 className="font-bold text-2xl mt-4">{t("pgCheckout.failedTitle")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("pgCheckout.failedDesc")}</p>
            {gatewayMsg && <p className="text-xs text-destructive/80 mt-2" dir="ltr">{gatewayMsg}</p>}
            <div className="flex gap-2 justify-center mt-6">
              {eventId && ticketId && (
                <Button className="rounded-full" asChild>
                  <Link to={`/checkout/${eventId}/${ticketId}`}>{t("pgCheckout.tryAgain")}</Link>
                </Button>
              )}
              {eventId && (
                <Button variant="outline" className="rounded-full" asChild>
                  <Link to={`/events/${eventId}`}>{t("pgCheckout.backToEvent")}</Link>
                </Button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentCallback;
