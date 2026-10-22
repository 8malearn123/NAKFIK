import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { readPendingGift, savePendingGift } from "@/lib/checkoutGift";
import { useAuth } from "@/contexts/AuthContext";
import { DEMO_EVENT, encodeDemoGift, giftWhatsAppText, toWhatsAppNumber } from "@/lib/giftDemo";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, Ticket as TicketIcon, Copy, MessageCircle } from "lucide-react";

type Phase = "verifying" | "success" | "failed";

// demo: نتيجة دفع تجريبية (/demo/payment) — بدون بوابة أو خادم
const PaymentCallback = ({ demo = false }: { demo?: boolean }) => {
  const [params] = useSearchParams();
  const { t, dir } = useLanguage();
  const { user, profile } = useAuth();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [qr, setQr] = useState<string | null>(null);
  const [gatewayMsg, setGatewayMsg] = useState<string | null>(null);
  const [giftedTo, setGiftedTo] = useState<string | null>(null);
  // هدية لشخص بلا حساب: رابط الاستلام وهل أُرسل تلقائياً على واتساب
  const [pendingGift, setPendingGift] = useState<{ link: string; sent: boolean; share: string | null } | null>(null);
  const started = useRef(false);

  const paymentId = params.get("id");
  const message = params.get("message");
  const eventId = params.get("event");
  const ticketId = params.get("ticket");

  useEffect(() => {
    document.title = `${t("pgCheckout.title")} | نكفيك`;
    if (started.current) return;
    started.current = true;

    const simulate = () => {
      const gift = readPendingGift(eventId, ticketId);
      if (gift) {
        setGiftedTo(gift.recipientName);
        if (!gift.recipientId && gift.recipientPhone) {
          const buyerName = profile?.full_name?.trim() || user?.user_metadata?.full_name || t("pgGift.someone");
          const link = `${window.location.origin}/demo/gift/${encodeDemoGift({
            recipientName: gift.recipientName,
            buyerName,
            message: gift.message,
          })}`;
          const text = giftWhatsAppText(gift.recipientName, buyerName, DEMO_EVENT.title_ar, gift.message, link);
          setPendingGift({
            link,
            sent: false,
            share: `https://wa.me/${toWhatsAppNumber(gift.recipientPhone)}?text=${encodeURIComponent(text)}`,
          });
        }
        savePendingGift(null);
      } else {
        setQr(`DEMO-${Date.now()}`);
      }
      setPhase("success");
    };

    const verify = async () => {
      if (demo) {
        simulate();
        return;
      }
      if (!paymentId) {
        setGatewayMsg(message);
        setPhase("failed");
        return;
      }
      // التحقق النهائي دائماً من الخادم — لا ثقة بمعاملات الرابط.
      // حتى العمليات الفاشلة/الملغاة تمر هنا ليسجلها الخادم في سجل المدفوعات.
      const gift = readPendingGift(eventId, ticketId);
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: {
          payment_id: paymentId,
          event_id: eventId,
          ticket_id: ticketId,
          ...(gift && {
            gift_recipient_id: gift.recipientId,
            gift_recipient_phone: gift.recipientPhone,
            gift_recipient_name: gift.recipientName,
            gift_message: gift.message,
            app_origin: window.location.origin,
          }),
        },
      });
      if (error || !data || data.error) {
        setGatewayMsg((data as any)?.gateway_message || message || null);
        setPhase("failed");
        return;
      }
      if (data.gifted) {
        setGiftedTo(gift?.recipientName || "");
        if (data.pending) {
          setPendingGift({ link: data.gift_link, sent: !!data.whatsapp_sent, share: data.share_link || null });
        }
        savePendingGift(null);
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
            <p className="text-sm text-muted-foreground mt-1">
              {giftedTo !== null
                ? t(pendingGift
                    ? pendingGift.sent ? "pgCheckout.giftPendingSentDesc" : "pgCheckout.giftPendingManualDesc"
                    : "pgCheckout.giftSentDesc").replace("{name}", giftedTo)
                : t("pgCheckout.successDesc")}
            </p>
            {pendingGift && (
              <div className="mt-4 rounded-2xl border bg-muted/40 p-3 text-start space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{t("pgCheckout.giftLinkLabel")}</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    dir="ltr"
                    value={pendingGift.link}
                    className="flex-1 min-w-0 rounded-lg border bg-card px-2 py-1.5 text-xs"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg flex-shrink-0"
                    onClick={() => {
                      navigator.clipboard?.writeText(pendingGift.link)
                        .then(() => toast.success(t("pgCheckout.copied")))
                        .catch(() => undefined);
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {pendingGift.share && (
                  <Button size="sm" className="w-full rounded-full bg-green-600 hover:bg-green-700 text-white" asChild>
                    <a href={pendingGift.share} target="_blank" rel="noreferrer">
                      <MessageCircle className="w-4 h-4 ml-1" />
                      {t(pendingGift.sent ? "pgCheckout.resendWhatsApp" : "pgCheckout.sendWhatsApp")}
                    </a>
                  </Button>
                )}
              </div>
            )}
            {qr && (
              <div className="mt-5 inline-block bg-white rounded-2xl p-4 border-2 border-primary/30">
                <p className="text-xs text-gray-500 mb-2">{t("pgCheckout.yourQr")}</p>
                <QRCodeSVG value={qr} size={160} />
                <p className="text-[10px] text-gray-400 mt-2">{t("pgCheckout.qrNote")}</p>
              </div>
            )}
            {demo ? (
              <div className="flex gap-2 justify-center mt-6">
                <Button variant="outline" className="rounded-full" asChild>
                  <Link to="/demo/checkout">{t("pgCheckout.demoAgain")}</Link>
                </Button>
              </div>
            ) : (
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
            )}
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
