import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { UserSquare2, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function MyTicketConnectQR() {
  const { user } = useAuth();
  const { t } = useLanguage();
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

  if (!code) return null;
  const url = `${window.location.origin}/connect/${code}`;

  return (
    <>
      <Button
        size="sm" variant="ghost" className="rounded-full text-xs"
        onClick={() => setOpen(true)}
        title={t("pgTickets.myCardTooltip")}
      >
        <UserSquare2 className="w-3.5 h-3.5" /> {t("pgTickets.myCard")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-center font-cairo">{t("pgTickets.connectCardTitle")}</DialogTitle>
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="bg-white p-5 rounded-2xl shadow-md">
              <QRCodeSVG value={url} size={240} level="H" fgColor="#492C5A" />
            </div>
            <p className="text-sm text-muted-foreground text-center">{t("pgTickets.connectCardHint")}</p>
            <Button asChild variant="outline" className="w-full">
              <Link to={`/connect/${code}`} target="_blank">
                <ExternalLink className="w-4 h-4 ms-2" /> {t("pgTickets.openCardPage")}
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
