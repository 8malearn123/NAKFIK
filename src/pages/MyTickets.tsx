import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, MapPin, Ticket, ChevronDown, ChevronUp, ExternalLink, Mail, MoreHorizontal, Phone, Bell, Trash2, Loader2, IdCard as IdCardIcon, UserSquare2,
} from "lucide-react";
import { toast } from "sonner";
import MyTicketConnectQR from "@/components/MyTicketConnectQR";
import AddToWalletButton from "@/components/AddToWalletButton";
import EventFeaturedCardsView from "@/components/EventFeaturedCardsView";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import StatusBadge from "@/components/app/StatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate, formatNumber } from "@/lib/format";

interface RegistrationRow {
  id: string;
  qr_code: string;
  status: string;
  registered_at: string;
  checked_in_at: string | null;
  event: {
    id: string;
    title_ar: string;
    start_date: string;
    venue_name: string | null;
    cover_image_url: string | null;
    is_online: boolean;
  };
  ticket: {
    name_ar: string;
    price: number;
  } | null;
}

const TicketCard = ({ reg, onCancelled, embedded }: { reg: RegistrationRow; onCancelled: (id: string) => void; embedded: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { profile } = useAuth();
  const { t, lang } = useLanguage();
  const isPast = new Date(reg.event.start_date) < new Date();
  const canCancel = !isPast && !reg.checked_in_at;

  const cancelTicket = async () => {
    const isPaid = (reg.ticket?.price || 0) > 0;
    const msg = t("pgTickets.cancelConfirm") + (isPaid ? `\n\n${t("pgTickets.cancelPaidNote")}` : "");
    if (!confirm(msg)) return;
    setCancelling(true);
    const { error } = await supabase.from("registrations").delete().eq("id", reg.id);
    setCancelling(false);
    if (error) return toast.error(t("pgTickets.cancelError"));
    toast.success(t("pgTickets.cancelSuccess"));
    onCancelled(reg.id);
  };

  return (
    <article className={`overflow-hidden rounded-2xl bg-card shadow-soft ${embedded ? "border" : ""}`}>
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-36 flex-none sm:h-auto sm:w-44">
          <img src={reg.event.cover_image_url || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop"} alt={reg.event.title_ar} className="absolute inset-0 h-full w-full object-cover" />
          {isPast && <StatusBadge tone="neutral" className="absolute start-3 top-3 bg-white">{t("pgTickets.ended")}</StatusBadge>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold leading-6">{reg.event.title_ar}</h3>
              <div className="mt-2 space-y-1 text-[13px] leading-5 text-muted-foreground">
                <p className="flex items-center gap-2"><Calendar className="h-[15px] w-[15px] flex-none opacity-70" /> {formatDate(reg.event.start_date)}</p>
                <p className="flex items-center gap-2"><MapPin className="h-[15px] w-[15px] flex-none opacity-70" /> <span className="truncate">{reg.event.is_online ? t("pgTickets.online") : (reg.event.venue_name || t("pgTickets.notSpecified"))}</span></p>
                {reg.ticket && (
                  <p className="flex items-center gap-2">
                    <Ticket className="h-[15px] w-[15px] flex-none opacity-70" />
                    <span className="truncate">{reg.ticket.name_ar}{lang === "ar" ? "، " : ", "}{reg.ticket.price === 0 ? t("pgTickets.free") : `${formatNumber(reg.ticket.price)} ${t("pgTickets.currency")}`}</span>
                  </p>
                )}
              </div>
            </div>
            {!isPast && (
              <div className="hidden flex-none rounded-xl bg-muted/50 p-2 sm:block">
                <QRCodeSVG value={reg.qr_code} size={72} bgColor="transparent" fgColor="#492C5A" level="M" />
              </div>
            )}
          </div>
          {isPast ? (
            <div>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/events/${reg.event.id}`}>
                  <ExternalLink className="h-[15px] w-[15px]" /> {t("pgTickets.eventPage")}
                </Link>
              </Button>
            </div>
          ) : (
            <MyTicketConnectQR>
              {(openCard) => (
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="soft" onClick={() => setExpanded(!expanded)}>
                    {expanded ? <ChevronUp className="h-[15px] w-[15px]" /> : <ChevronDown className="h-[15px] w-[15px]" />}
                    {expanded ? t("pgTickets.hideDetails") : t("pgTickets.viewTicket")}
                  </Button>
                  <AddToWalletButton registrationId={reg.id} compact />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" className="ms-auto h-9 w-9 flex-none" disabled={cancelling} aria-label={lang === "ar" ? "المزيد" : "More"}>
                        {cancelling ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <MoreHorizontal className="h-[18px] w-[18px]" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link to={`/events/${reg.event.id}`}><ExternalLink className="h-4 w-4" /> {t("pgTickets.eventPage")}</Link>
                      </DropdownMenuItem>
                      {openCard && (
                        <DropdownMenuItem onClick={openCard} title={t("pgTickets.myCardTooltip")}>
                          <UserSquare2 className="h-4 w-4" /> {t("pgTickets.myCard")}
                        </DropdownMenuItem>
                      )}
                      {canCancel && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={cancelTicket}>
                            <Trash2 className="h-4 w-4" /> {t("pgTickets.cancelTicket")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </MyTicketConnectQR>
          )}
        </div>
      </div>
      {expanded && !isPast && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border p-5">
          <div className="max-w-sm mx-auto bg-gradient-to-br from-primary to-brand-purple rounded-2xl p-5 text-primary-foreground shadow-xl">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-primary-foreground/20">
              <div className="w-12 h-12 rounded-full bg-primary-foreground/15 flex items-center justify-center overflow-hidden border-2 border-primary-foreground/30 flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : <span className="text-lg font-bold">{profile?.full_name?.[0] || t("pgTickets.avatarFallback")}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{profile?.full_name || "—"}</p>
                {profile?.job_title && <p className="text-[11px] text-primary-foreground/80 truncate">{profile.job_title}</p>}
                {profile?.company && <p className="text-[10px] text-brand-gold truncate font-semibold">{profile.company}</p>}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 flex items-center justify-center mb-3">
              <QRCodeSVG value={reg.qr_code} size={160} bgColor="#FFFFFF" fgColor="#492C5A" level="H" />
            </div>
            <p className="text-center text-[11px] font-bold mb-2">{reg.event.title_ar}</p>
            <div className="space-y-1 text-[11px] text-primary-foreground/80">
              {profile?.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /><span dir="ltr">{profile.phone}</span></div>}
              {profile?.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /><span dir="ltr" className="truncate">{profile.email}</span></div>}
              <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /><span>{formatDate(reg.event.start_date)}</span></div>
              {reg.event.venue_name && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /><span className="truncate">{reg.event.venue_name}</span></div>}
            </div>
            <p className="text-[8px] font-mono text-primary-foreground/40 text-center mt-3 pt-3 border-t border-primary-foreground/20" dir="ltr">{reg.qr_code}</p>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">{t("pgTickets.showCardAtEntry")}</p>
          <EventFeaturedCardsView eventId={reg.event.id} />
        </motion.div>
      )}
    </article>
  );
};

const MyTickets = ({ embedded = false }: { embedded?: boolean }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("registrations")
        .select(`
          id, qr_code, status, registered_at, checked_in_at,
          event:events!inner(id, title_ar, start_date, venue_name, cover_image_url, is_online),
          ticket:tickets(name_ar, price)
        `)
        .eq("attendee_id", user.id)
        .order("registered_at", { ascending: false });

      // Transform the data to handle the join response
      const transformed = (data || []).map((r: any) => ({
        ...r,
        event: Array.isArray(r.event) ? r.event[0] : r.event,
        ticket: Array.isArray(r.ticket) ? r.ticket[0] : r.ticket,
      })) as RegistrationRow[];

      setRegistrations(transformed);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleCancelled = (id: string) =>
    setRegistrations(prev => prev.filter(r => r.id !== id));

  const now = new Date();
  const upcoming = registrations.filter(r => new Date(r.event.start_date) >= now);
  const past = registrations.filter(r => new Date(r.event.start_date) < now);

  const browseEvents = (
    <Button asChild size="sm">
      <Link to="/events">{t("pgTickets.browseEvents")}</Link>
    </Button>
  );

  const actions = (
    <>
      <Button asChild>
        <Link to="/my/cards"><IdCardIcon className="h-4 w-4" /> بطاقاتي</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/my/notifications"><Bell className="h-4 w-4" /> {t("pgTickets.notifications")}</Link>
      </Button>
    </>
  );

  const content = (
    <div className="space-y-6">
      {embedded ? (
        <div className="flex flex-wrap items-center justify-end gap-2.5">{actions}</div>
      ) : (
        <PageHeader title={t("pgTickets.pageTitle")} description={t("pgTickets.pageSubtitle")} actions={actions} />
      )}

      {loading ? (
        <div className="space-y-6">
          {[1, 2].map(i => <div key={i} className="h-44 animate-pulse rounded-2xl bg-card shadow-soft" />)}
        </div>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming" className="gap-1.5">
              {t("pgTickets.upcoming")}
              <span className="text-xs font-normal text-muted-foreground">{formatNumber(upcoming.length)}</span>
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-1.5">
              {t("pgTickets.past")}
              <span className="text-xs font-normal text-muted-foreground">{formatNumber(past.length)}</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-6 space-y-6">
            {upcoming.length > 0 ? (
              upcoming.map(reg => <TicketCard key={reg.id} reg={reg} onCancelled={handleCancelled} embedded={embedded} />)
            ) : (
              <div className="rounded-2xl border bg-card shadow-soft">
                <EmptyState icon={Ticket} title={t("pgTickets.noUpcoming")} action={browseEvents} />
              </div>
            )}
          </TabsContent>
          <TabsContent value="past" className="mt-6 space-y-6">
            {past.length > 0 ? (
              past.map(reg => <TicketCard key={reg.id} reg={reg} onCancelled={handleCancelled} embedded={embedded} />)
            ) : (
              <div className="rounded-2xl border bg-card shadow-soft">
                <EmptyState icon={Ticket} title={t("pgTickets.noPast")} action={browseEvents} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );

  // داخل نافذة منبثقة (من صفحة الملف الشخصي) بدون شريط التنقل والتذييل
  if (embedded) return <div className="font-cairo">{content}</div>;

  return (
    <div className="flex min-h-screen flex-col bg-background font-cairo">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-24">{content}</main>
      <Footer />
    </div>
  );
};

export default MyTickets;
