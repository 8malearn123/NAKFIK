import { QRCodeSVG } from "qrcode.react";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/brand/BrandLogo";
import { useLanguage } from "@/contexts/LanguageContext";

export interface EntryPass {
  event_title: string;
  start_date: string;
  venue_name: string | null;
  ticket_name: string | null;
  qr_code: string;
}

interface Props {
  fullName: string;
  pass: EntryPass | null;
  onShowAll: () => void;
}

/**
 * بطاقة دخول مختصرة — لمن أوقف بطاقة التواصل: الاسم + أقرب فعالية + رمز الدخول فقط،
 * بدون أي بيانات تواصل أو رابط عام.
 */
const EntryPassCard = ({ fullName, pass, onShowAll }: Props) => {
  const { t, lang } = useLanguage();
  const date = pass
    ? new Date(pass.start_date).toLocaleString(lang === "ar" ? "ar-SA" : "en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="w-full max-w-[340px] rounded-3xl overflow-hidden bg-card border border-border/60 shadow-elegant">
      <div className="relative gradient-hero px-5 pt-5 pb-6 text-white overflow-hidden">
        <div className="absolute inset-0 bg-brand-pattern opacity-30" />
        <div className="brand-slash absolute -top-2 -left-10 w-3/4 h-3 opacity-80" />
        <div className="relative flex items-center justify-between">
          <BrandLogo variant="wordmark" tone="white" className="h-6" />
          <span className="text-[10px] font-bold tracking-widest bg-white/15 rounded-full px-2.5 py-1">{t("pgProfile.entryPass.badge")}</span>
        </div>
        <p className="relative mt-5 text-[11px] text-white/60">{t("pgProfile.entryPass.holder")}</p>
        <p className="relative font-bold text-xl truncate">{fullName}</p>
      </div>

      {pass ? (
        <div className="p-5">
          <p className="font-bold text-foreground leading-snug">{pass.event_title}</p>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-accent" /> {date}</p>
            {pass.venue_name && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-accent" /> {pass.venue_name}</p>}
            {pass.ticket_name && <p className="flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5 text-accent" /> {pass.ticket_name}</p>}
          </div>
          <div className="mt-4 flex flex-col items-center">
            <div className="bg-white rounded-2xl p-3 border border-border/60">
              <QRCodeSVG value={pass.qr_code} size={150} fgColor="#492C5A" level="H" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">{t("pgProfile.entryPass.scanHint")}</p>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center">
          <Ticket className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t("pgProfile.entryPass.empty")}</p>
        </div>
      )}

      <div className="px-5 pb-5">
        <Button variant="outline" size="sm" className="w-full rounded-full" onClick={onShowAll}>
          <Ticket className="w-4 h-4" /> {t("pgProfile.entryPass.allTickets")}
        </Button>
      </div>
    </div>
  );
};

export default EntryPassCard;
