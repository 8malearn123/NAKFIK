import { useEffect, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface MyTicketConnectQRProps {
  // يعرض زر الفتح في مكانه (مثل قائمة الإجراءات) والنافذة تبقى هنا حتى لا تُغلق معه.
  // تصل قيمة null حين لا يملك المستخدم بطاقة تواصل بعد.
  children: (openCard: (() => void) | null) => ReactNode;
}

export default function MyTicketConnectQR({ children }: MyTicketConnectQRProps) {
  const { user } = useAuth();
  const { t, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("networking_profiles")
      .select("connect_code")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setCode(data?.connect_code || null));
  }, [user]);

  const url = code ? `${window.location.origin}/connect/${code}` : "";

  return (
    <>
      {children(code ? () => setOpen(true) : null)}
      {code && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir={dir} className="w-[calc(100vw-2rem)] max-w-sm">
            <DialogTitle className="text-center">{t("pgTickets.connectCardTitle")}</DialogTitle>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="rounded-2xl border bg-white p-5">
                <QRCodeSVG value={url} size={240} level="H" fgColor="#492C5A" />
              </div>
              <p className="text-center text-sm text-muted-foreground">{t("pgTickets.connectCardHint")}</p>
              <Button asChild variant="outline" className="w-full">
                <Link to={`/connect/${code}`} target="_blank">
                  <ExternalLink className="h-4 w-4" /> {t("pgTickets.openCardPage")}
                </Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
