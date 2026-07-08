import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import {
  Calendar, MapPin, Users, Clock, Ticket, CheckCircle, Info, ChevronLeft, Mail, Phone, User as UserIcon, Download, Heart,
} from "lucide-react";
import { isEventFavorite, toggleEventFavorite } from "@/lib/favorites";
import { isOnWaitlist, toggleWaitlist } from "@/lib/waitlist";
import SmartMatch from "@/components/SmartMatch";
import EventRatingSection from "@/components/events/EventRating";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateContent } from "@/lib/contentTranslations";
import { badgeStyles, getEventBadges } from "@/lib/eventBadges";
import { downloadIcs } from "@/lib/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BellRing, CalendarPlus, Share2 } from "lucide-react";

interface EventData {
  id: string;
  title_ar: string;
  description_ar: string | null;
  start_date: string;
  end_date: string | null;
  venue_name: string | null;
  category: string;
  is_free: boolean;
  max_attendees: number | null;
  current_attendees_count: number;
  cover_image_url: string | null;
  is_online: boolean;
  created_at?: string | null;
  venue_address?: string | null;
  venue_map_url?: string | null;
}

interface SessionData {
  id: string;
  title_ar: string;
  speaker_name: string | null;
  speaker_bio: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
}

interface TicketData {
  id: string;
  name_ar: string;
  type: string;
  price: number;
  is_for_sale?: boolean;
  visibility?: string;
}

const EventDetail = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { t, lang, dir } = useLanguage();
  const locale = lang === "ar" ? "ar-SA" : "en-US";
  const categoryLabels: Record<string, string> = {
    conference: t("pgEventDetail.categoryConference"),
    workshop: t("pgEventDetail.categoryWorkshop"),
    seminar: t("pgEventDetail.categorySeminar"),
    meetup: t("pgEventDetail.categoryMeetup"),
    other: t("pgEventDetail.categoryOther"),
  };
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [attended, setAttended] = useState(false);
  const [registrationQR, setRegistrationQR] = useState("");
  const [selectedTicket, setSelectedTicket] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registeredTicket, setRegisteredTicket] = useState<TicketData | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [onWaitlist, setOnWaitlist] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // هل المستخدم في قائمة الانتظار؟ (نموذج واجهة أمامية — تخزين محلي)
  useEffect(() => {
    if (id) setOnWaitlist(isOnWaitlist(id, user?.id));
  }, [id, user?.id]);

  const handleJoinWaitlist = () => {
    if (!id) return;
    const joined = toggleWaitlist(id, user?.id);
    setOnWaitlist(joined);
    toast.success(joined ? t("pgEventDetail.waitlistJoined") : t("pgEventDetail.waitlistLeft"));
  };

  const handleShare = async () => {
    const url = window.location.href;
    // واجهة مشاركة المتصفح إن كانت مدعومة، وإلا نسخ الرابط
    if (navigator.share) {
      try {
        await navigator.share({ title: event?.title_ar, url });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return; // المستخدم أغلق نافذة المشاركة
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("pgEventDetail.linkCopied"));
    } catch {
      toast.error(t("pgEventDetail.copyFailed"));
    }
  };

  const handleAddToCalendar = () => {
    if (event) {
      downloadIcs({
        title: event.title_ar,
        description: event.description_ar,
        location: event.is_online ? t("pgEventDetail.online") : event.venue_name,
        start: new Date(event.start_date),
        end: event.end_date ? new Date(event.end_date) : null,
      });
    }
    setShowCalendarDialog(false);
  };

  useEffect(() => {
    if (id) setIsFavorite(isEventFavorite(id, user?.id));
  }, [id, user?.id]);

  const handleToggleFavorite = () => {
    if (!id) return;
    const nowFavorite = toggleEventFavorite(id, user?.id);
    setIsFavorite(nowFavorite);
    toast.success(nowFavorite ? t("pgEventDetail.favoriteAdded") : t("pgEventDetail.favoriteRemoved"));
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [{ data: evt }, { data: sess }, { data: tix }] = await Promise.all([
        supabase.from("events").select("*").eq("id", id).single(),
        supabase.from("sessions").select("*").eq("event_id", id).order("session_order"),
        supabase.from("tickets").select("*").eq("event_id", id).eq("is_active", true),
      ]);
      setEvent(evt as EventData | null);
      setSessions((sess || []) as SessionData[]);
      // Hide private tickets from public detail page
      const ticketsList = ((tix || []) as TicketData[]).filter(t => (t.visibility ?? "public") === "public");
      setTickets(ticketsList);
      const firstSellable = ticketsList.find(t => t.is_for_sale !== false);
      if (firstSellable) setSelectedTicket(firstSellable.id);

      if (user) {
        const { data: reg } = await supabase
          .from("registrations")
          .select("qr_code, ticket_id, status, checked_in_at")
          .eq("event_id", id)
          .eq("attendee_id", user.id)
          .maybeSingle();
        if (reg) {
          setRegistered(true);
          setAttended((reg as any).status === "checked_in" || !!(reg as any).checked_in_at);
          setRegistrationQR((reg as any).qr_code);
          const tkId = (reg as any).ticket_id;
          if (tkId) {
            const found = ticketsList.find(t => t.id === tkId);
            if (found) setRegisteredTicket(found);
            else {
              const { data: tk } = await supabase.from("tickets").select("id, name_ar, type, price").eq("id", tkId).maybeSingle();
              if (tk) setRegisteredTicket(tk as any);
            }
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [id, user]);

  const handleRegister = async () => {
    if (!user || !event) {
      toast.error(t("pgEventDetail.loginFirst"));
      return;
    }
    // Profile completion guard
    if (!profile?.profile_completed) {
      toast.info(t("pgEventDetail.completeProfileFirst"));
      navigate(`/my/profile?required=1&return=${encodeURIComponent(`/events/${event.id}`)}`);
      return;
    }
    // لا تسجيل بعد نفاد المقاعد
    if (event.max_attendees && event.current_attendees_count >= event.max_attendees) {
      toast.error(t("pgEventDetail.soldOutToast"));
      return;
    }
    setSubmitting(true);
    try {
      const { data: reg, error } = await supabase.from("registrations").insert({
        event_id: event.id,
        attendee_id: user.id,
        ticket_id: selectedTicket || null,
        status: "confirmed",
        payment_status: "free",
      } as any).select("qr_code").single();

      if (error) throw error;
      setRegistered(true);
      setRegistrationQR((reg as any).qr_code);
      const chosen = tickets.find(t => t.id === selectedTicket);
      if (chosen) setRegisteredTicket(chosen);
      toast.success(t("pgEventDetail.registerSuccess"));
      setShowCalendarDialog(true);
      // حدّث عدد المقاعد المتبقية فوراً ثم زامنه مع العدد الفعلي في قاعدة البيانات
      setEvent(prev =>
        prev ? { ...prev, current_attendees_count: prev.current_attendees_count + 1 } : prev,
      );
      supabase
        .from("events")
        .select("current_attendees_count")
        .eq("id", event.id)
        .single()
        .then(({ data }) => {
          if (data)
            setEvent(prev =>
              prev
                ? { ...prev, current_attendees_count: (data as any).current_attendees_count }
                : prev,
            );
        });
    } catch (err: any) {
      if (err.message?.includes("duplicate")) {
        toast.error(t("pgEventDetail.alreadyRegistered"));
      } else {
        toast.error(t("pgEventDetail.registerError"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center font-cairo">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-muted/30 font-cairo flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-xl">{t("pgEventDetail.notFound")}</p>
        <Button className="rounded-full" asChild>
          <Link to="/events">{t("pgEventDetail.browseEvents")}</Link>
        </Button>
      </div>
    );
  }

  const eventDate = new Date(event.start_date);
  const formattedDate = eventDate.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = eventDate.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const remainingSeats = event.max_attendees
    ? Math.max(0, event.max_attendees - event.current_attendees_count)
    : null;
  const soldOut = remainingSeats !== null && remainingSeats <= 0;
  const statusBadges = getEventBadges(event);

  const defaultImage =
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=500&fit=crop";

  return (
    <div className="min-h-screen bg-muted/30 font-cairo" dir={dir}>
      {/* Minimal header */}
      <div className="bg-background border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/events"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            {t("pgEventDetail.back")}
          </Link>
          <span className="text-sm font-bold text-primary">{t("pgEventDetail.brand")}</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Cover image */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden shadow-md"
        >
          <img
            src={event.cover_image_url || defaultImage}
            alt={event.title_ar}
            className="w-full aspect-[2/1] object-cover"
          />
        </motion.div>

        {/* Event title + meta */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-center space-y-3"
        >
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span className="inline-block bg-primary/10 text-primary text-xs font-bold rounded-full px-3 py-1">
              {categoryLabels[event.category] || event.category}
            </span>
            {event.is_free && (
              <span className="inline-block bg-teal text-teal-foreground text-xs font-bold rounded-full px-3 py-1">
                {t("badges.free")}
              </span>
            )}
            {statusBadges.map((b) => (
              <span key={b} className={`inline-block text-xs font-bold rounded-full px-3 py-1 ${badgeStyles[b]}`}>
                {t(`badges.${b}`)}
              </span>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-foreground leading-tight inline-flex items-center gap-2 max-w-full">
            <span>{event.title_ar}</span>
            <button
              onClick={handleToggleFavorite}
              aria-label={isFavorite ? t("pgEventDetail.removeFromFavorites") : t("pgEventDetail.addToFavorites")}
              aria-pressed={isFavorite}
              className="shrink-0 rounded-full p-1.5 hover:bg-muted transition-colors"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isFavorite
                    ? "fill-primary text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              />
            </button>
            <button
              onClick={handleShare}
              aria-label={t("pgEventDetail.shareEvent")}
              className="shrink-0 rounded-full p-1.5 hover:bg-muted transition-colors"
            >
              <Share2 className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
            </button>
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formattedTime}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {event.is_online ? t("pgEventDetail.online") : event.venue_name || t("pgEventDetail.unspecified")}
            </span>
          </div>
        </motion.div>

        {/* Location map */}
        {!event.is_online && (event.venue_name || event.venue_address || event.venue_map_url) && (() => {
          const mapQuery = [event.venue_name, event.venue_address].filter(Boolean).join("، ");
          const openUrl =
            event.venue_map_url ||
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-background rounded-2xl border border-border/50 p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h2 className="font-bold text-foreground">{t("pgEventDetail.locationTitle")}</h2>
                </div>
                <Button variant="outline" size="sm" className="rounded-full" asChild>
                  <a href={openUrl} target="_blank" rel="noopener noreferrer">
                    <MapPin className="w-3.5 h-3.5" />
                    {t("pgEventDetail.openInMaps")}
                  </a>
                </Button>
              </div>
              {(event.venue_name || event.venue_address) && (
                <p className="text-sm text-muted-foreground">{mapQuery}</p>
              )}
              {mapQuery && (
                <div className="rounded-xl overflow-hidden border border-border/50">
                  <iframe
                    title={t("pgEventDetail.mapFrameTitle")}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed&hl=${lang}`}
                    className="w-full h-56 border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* About section */}
        {event.description_ar && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-background rounded-2xl border border-border/50 p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-foreground">{t("pgEventDetail.about")}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {event.description_ar}
            </p>
          </motion.div>
        )}

        {/* Sessions schedule */}
        {sessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-background rounded-2xl border border-border/50 p-5"
          >
            <h2 className="font-bold text-foreground mb-4">{t("pgEventDetail.sessionsSchedule")}</h2>
            <div className="space-y-3">
              {sessions.map((session, i) => (
                <div
                  key={session.id}
                  className="flex gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-primary mb-0.5" />
                    {session.start_time && (
                      <span className="text-[10px] text-primary font-bold">
                        {new Date(session.start_time).toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm">{session.title_ar}</h3>
                    {session.speaker_name && (
                      <span className="text-xs text-muted-foreground">{session.speaker_name}</span>
                    )}
                    {session.location && (
                      <span className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {session.location}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Smart match — visible to logged-in registered attendees with a networking profile */}
        {user && id && registered && <SmartMatch eventId={id} />}

        {/* Registration section */}
        <AnimatePresence mode="wait">
          {!registered ? (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ delay: 0.2 }}
              className="bg-background rounded-2xl border border-border/50 p-5 space-y-5"
            >
              <h2 className="font-bold text-lg text-foreground text-center">
                {t("pgEventDetail.registerTitle")}
              </h2>

              {/* Ticket selection */}
              {tickets.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {t("pgEventDetail.chooseTicketType")}
                  </h3>
                  {tickets.map((ticket) => {
                    const sellable = ticket.is_for_sale !== false;
                    const selected = selectedTicket === ticket.id;
                    return (
                    <button
                      key={ticket.id}
                      onClick={() => sellable && setSelectedTicket(ticket.id)}
                      disabled={!sellable}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-start ${
                        !sellable
                          ? "border-border bg-muted/40 opacity-70 cursor-not-allowed"
                          : selected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            selected && sellable
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          } transition-colors`}
                        >
                          <Ticket className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm flex items-center gap-2">
                            {translateContent(ticket.name_ar, lang)}
                            {!sellable && (
                              <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-semibold">
                                {t("pgEventDetail.displayOnly")}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {!sellable
                              ? t("pgEventDetail.notAvailableForBooking")
                              : ticket.type === "vip"
                              ? t("pgEventDetail.vipDesc")
                              : t("pgEventDetail.regularDesc")}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`font-bold text-sm ${
                          selected && sellable ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {ticket.price === 0 ? t("pgEventDetail.free") : `${ticket.price} ${t("pgEventDetail.currency")}`}
                      </span>
                    </button>
                    );
                  })}
                </div>
              )}

              {/* Seats remaining */}
              {remainingSeats !== null && (
                <div
                  className={`flex items-center justify-center gap-2 text-xs rounded-xl py-2.5 ${
                    soldOut
                      ? "text-destructive bg-destructive/10 font-bold"
                      : "text-muted-foreground bg-muted/50"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  {soldOut
                    ? t("pgEventDetail.soldOutFull")
                    : `${remainingSeats} ${t("pgEventDetail.seatsRemainingOf")} ${event.max_attendees}`}
                </div>
              )}

              {/* Register button */}
              {(() => {
                const hasSellable = tickets.length === 0 || tickets.some(t => t.is_for_sale !== false);
                return (
                  <Button
                    className="w-full rounded-full h-12 text-base font-bold"
                    size="lg"
                    disabled={submitting || !hasSellable || soldOut}
                    onClick={() =>
                      user
                        ? handleRegister()
                        : toast.error(t("pgEventDetail.loginFirst"))
                    }
                  >
                    {soldOut
                      ? t("pgEventDetail.soldOutFull")
                      : !hasSellable
                      ? t("pgEventDetail.bookingUnavailable")
                      : submitting
                      ? t("pgEventDetail.registering")
                      : t("pgEventDetail.confirmRegister")}
                  </Button>
                );
              })()}

              {/* Waitlist when sold out */}
              {soldOut && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full rounded-full h-11 font-bold border-primary/40 text-primary hover:bg-primary/5"

                    onClick={handleJoinWaitlist}
                  >
                    <BellRing className="w-4 h-4" />
                    {onWaitlist
                      ? t("pgEventDetail.onWaitlist")
                      : t("pgEventDetail.joinWaitlist")}
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground">
                    {onWaitlist
                      ? t("pgEventDetail.leaveWaitlistHint")
                      : t("pgEventDetail.waitlistHint")}
                  </p>
                </div>
              )}

              {!user && (
                <p className="text-center text-xs text-muted-foreground">
                  {t("pgEventDetail.mustPrefix")}{" "}
                  <Link to="/login" className="text-primary font-bold hover:underline">
                    {t("pgEventDetail.loginLink")}
                  </Link>{" "}
                  {t("pgEventDetail.mustSuffix")}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3"
            >
              <div className="bg-background rounded-2xl border border-brand-teal/30 p-5 text-center">
                <div className="w-14 h-14 rounded-full bg-brand-teal/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-brand-teal" />
                </div>
                <h3 className="font-bold text-lg text-foreground">{t("pgEventDetail.successTitle")}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t("pgEventDetail.showCardAtEntry")}</p>
              </div>

              {/* Identification card */}
              <div ref={cardRef} className="bg-gradient-to-br from-primary to-brand-purple rounded-2xl p-5 text-primary-foreground shadow-xl">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-primary-foreground/20">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/60">{t("pgEventDetail.entryCard")}</p>
                    <p className="text-sm font-bold mt-0.5 line-clamp-1">{event?.title_ar}</p>
                  </div>
                  {registeredTicket && (
                    <span className="text-[10px] font-bold bg-primary-foreground/15 px-2.5 py-1 rounded-full">
                      {translateContent(registeredTicket.name_ar, lang)}
                    </span>
                  )}
                </div>

                {/* Attendee identity */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-full bg-primary-foreground/15 flex items-center justify-center overflow-hidden border-2 border-primary-foreground/30 flex-shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold">{profile?.full_name?.[0] || t("pgEventDetail.avatarFallback")}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-base truncate">{profile?.full_name || user?.email?.split("@")[0] || "—"}</p>
                    {profile?.job_title && <p className="text-[11px] text-primary-foreground/80 truncate">{profile.job_title}</p>}
                    {profile?.company && <p className="text-[11px] text-brand-gold truncate font-semibold">{profile.company}</p>}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 flex items-center justify-center mb-3">
                  <QRCodeSVG value={registrationQR} size={160} bgColor="#FFFFFF" fgColor="#492C5A" level="H" />
                </div>

                <div className="space-y-1.5 text-xs text-primary-foreground/80">
                  {profile?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-primary-foreground/60 flex-shrink-0" />
                      <span className="truncate" dir="ltr">{profile.phone}</span>
                    </div>
                  )}
                  {profile?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-primary-foreground/60 flex-shrink-0" />
                      <span className="truncate" dir="ltr">{profile.email}</span>
                    </div>
                  )}
                  {event?.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-primary-foreground/60 flex-shrink-0" />
                      <span>{new Date(event.start_date).toLocaleDateString(locale, { dateStyle: "medium" })}</span>
                    </div>
                  )}
                  {event?.venue_name && !event.is_online && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary-foreground/60 flex-shrink-0" />
                      <span className="truncate">{event.venue_name}</span>
                    </div>
                  )}
                </div>

                {(profile?.linkedin_url || profile?.x_handle || profile?.instagram_handle) && (
                  <div className="flex gap-1.5 mt-3 pt-3 border-t border-primary-foreground/20">
                    {profile?.linkedin_url && <span className="w-6 h-6 rounded-full bg-primary-foreground/15 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14M8.5 18v-7.5h-2.5V18h2.5M7.25 9.4a1.45 1.45 0 1 0 0-2.9 1.45 1.45 0 0 0 0 2.9M18 18v-4.3c0-2.4-1.3-3.5-3-3.5-1.4 0-2.05.8-2.4 1.4v-1.1H10.1V18h2.5v-4.2c0-1.1.2-2.1 1.5-2.1s1.4 1.2 1.4 2.2V18H18z"/></svg></span>}
                    {profile?.x_handle && <span className="w-6 h-6 rounded-full bg-primary-foreground/15 flex items-center justify-center text-[10px] font-bold">𝕏</span>}
                    {profile?.instagram_handle && <span className="w-6 h-6 rounded-full bg-primary-foreground/15 flex items-center justify-center text-[10px]">📷</span>}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-primary-foreground/20 text-[9px] font-mono text-primary-foreground/50 text-center" dir="ltr">
                  {registrationQR}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="rounded-full" onClick={async () => {
                  if (!cardRef.current) return;
                  try {
                    const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, backgroundColor: "#492C5A" });
                    const a = document.createElement("a");
                    a.href = dataUrl;
                    a.download = `ticket-${(event?.title_ar || "event").replace(/\s+/g, "-")}.png`;
                    a.click();
                    toast.success(t("pgEventDetail.cardDownloaded"));
                  } catch { toast.error(t("pgEventDetail.downloadFailed")); }
                }}>
                  <Download className="w-4 h-4" /> {t("pgEventDetail.download")}
                </Button>
                <Button variant="outline" className="rounded-full" asChild>
                  <Link to="/my-tickets">{t("pgEventDetail.myTickets")}</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Event rating */}
        <EventRatingSection eventId={event.id} attended={attended} userId={user?.id} />

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4">
          {t("pgEventDetail.brand")} © {new Date().getFullYear()}
        </div>
      </div>

      {/* Add-to-calendar prompt after successful registration */}
      <Dialog open={showCalendarDialog} onOpenChange={setShowCalendarDialog}>
        <DialogContent dir={dir} className="max-w-sm rounded-2xl font-cairo">
          <DialogHeader className="text-center sm:text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CalendarPlus className="w-7 h-7 text-primary" />
            </div>
            <DialogTitle>{t("pgEventDetail.calendarTitle")}</DialogTitle>
            <DialogDescription>{t("pgEventDetail.calendarDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button className="w-full rounded-full" onClick={handleAddToCalendar}>
              <CalendarPlus className="w-4 h-4" />
              {t("pgEventDetail.addToCalendar")}
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-full"
              onClick={() => setShowCalendarDialog(false)}
            >
              {t("pgEventDetail.notNow")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDetail;
