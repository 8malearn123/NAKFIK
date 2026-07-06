import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, MapPin, Clock, Ticket, ChevronDown, ChevronUp, ExternalLink, Mail, Phone, User as UserIcon, Bell,
} from "lucide-react";
import MyTicketConnectQR from "@/components/MyTicketConnectQR";
import EventFeaturedCardsView from "@/components/EventFeaturedCardsView";

interface RegistrationRow {
  id: string;
  qr_code: string;
  status: string;
  registered_at: string;
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

const TicketCard = ({ reg }: { reg: RegistrationRow }) => {
  const [expanded, setExpanded] = useState(false);
  const { profile } = useAuth();
  const isPast = new Date(reg.event.start_date) < new Date();

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isPast ? "opacity-70" : ""}`}>
      <div className="flex flex-col md:flex-row">
        <div className="md:w-48 h-36 md:h-auto flex-shrink-0 relative">
          <img src={reg.event.cover_image_url || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop"} alt={reg.event.title_ar} className="w-full h-full object-cover" />
          {isPast && (
            <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
              <span className="bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-full">انتهت</span>
            </div>
          )}
        </div>
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-foreground text-lg">{reg.event.title_ar}</h3>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(reg.event.start_date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{reg.event.is_online ? "أونلاين" : (reg.event.venue_name || "غير محدد")}</span>
              </div>
              {reg.ticket && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Ticket className="w-3 h-3" />{reg.ticket.name_ar}
                  </span>
                  <span className="text-xs font-bold text-accent">{reg.ticket.price === 0 ? "مجاني" : `${reg.ticket.price} ر.س`}</span>
                </div>
              )}
            </div>
            {!isPast && (
              <div className="hidden sm:block bg-background rounded-xl p-2 border border-border/50 flex-shrink-0">
                <QRCodeSVG value={reg.qr_code} size={64} bgColor="transparent" fgColor="hsl(270, 30%, 52%)" level="M" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {!isPast && (
              <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? "إخفاء التفاصيل" : "عرض التذكرة"}
              </Button>
            )}
            <Button size="sm" variant="ghost" className="rounded-full text-xs" asChild>
              <Link to={`/events/${reg.event.id}`}>
                <ExternalLink className="w-3 h-3" /> صفحة الفعالية
              </Link>
            </Button>
            {!isPast && <MyTicketConnectQR />}
          </div>
        </div>
      </div>
      {expanded && !isPast && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border/50 p-5">
          <div className="max-w-sm mx-auto bg-gradient-to-br from-primary to-brand-purple rounded-2xl p-5 text-primary-foreground shadow-xl">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-primary-foreground/20">
              <div className="w-12 h-12 rounded-full bg-primary-foreground/15 flex items-center justify-center overflow-hidden border-2 border-primary-foreground/30 flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : <span className="text-lg font-bold">{profile?.full_name?.[0] || "؟"}</span>}
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
              <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /><span>{new Date(reg.event.start_date).toLocaleDateString("ar-SA", { dateStyle: "medium" })}</span></div>
              {reg.event.venue_name && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /><span className="truncate">{reg.event.venue_name}</span></div>}
            </div>
            <p className="text-[8px] font-mono text-primary-foreground/40 text-center mt-3 pt-3 border-t border-primary-foreground/20" dir="ltr">{reg.qr_code}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">أظهر هذه البطاقة عند الدخول</p>
          <EventFeaturedCardsView eventId={reg.event.id} />
        </motion.div>
      )}
    </motion.div>
  );
};

const MyTickets = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("registrations")
        .select(`
          id, qr_code, status, registered_at,
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

  const now = new Date();
  const upcoming = registrations.filter(r => new Date(r.event.start_date) >= now);
  const past = registrations.filter(r => new Date(r.event.start_date) < now);

  return (
    <div className="min-h-screen font-cairo">
      <Navbar />
      <section className="pt-24 pb-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-bold text-3xl text-foreground">تذاكري</h1>
              <p className="text-muted-foreground mt-1">جميع تذاكرك وأكواد الدخول في مكان واحد</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link to="/my/notifications"><Bell className="w-4 h-4 ms-2" /> الإشعارات</Link>
            </Button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <div key={i} className="animate-pulse bg-card rounded-2xl h-40 border border-border/50" />)}
            </div>
          ) : (
            <Tabs defaultValue="upcoming" dir="rtl">
              <TabsList className="mb-6">
                <TabsTrigger value="upcoming">القادمة ({upcoming.length})</TabsTrigger>
                <TabsTrigger value="past">السابقة ({past.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="space-y-4">
                {upcoming.length > 0 ? (
                  upcoming.map(reg => <TicketCard key={reg.id} reg={reg} />)
                ) : (
                  <div className="text-center py-16">
                    <Ticket className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">لا توجد تذاكر قادمة</p>
                    <Button className="mt-4 rounded-full" asChild>
                      <Link to="/events">تصفح الفعاليات</Link>
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="past" className="space-y-4">
                {past.length > 0 ? (
                  past.map(reg => <TicketCard key={reg.id} reg={reg} />)
                ) : (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground">لا توجد تذاكر سابقة</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default MyTickets;
