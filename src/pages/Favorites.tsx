import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import EventCard from "@/components/events/EventCard";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getFavoriteEventIds } from "@/lib/favorites";

interface EventRow {
  id: string;
  title_ar: string;
  start_date: string;
  venue_name: string | null;
  category: string;
  is_free: boolean;
  cover_image_url: string | null;
  current_attendees_count: number;
  is_online: boolean;
  organization_id: string;
  organizations?: {
    id: string;
    name: string;
    logo_url: string | null;
    phone: string | null;
    public_email: string | null;
  } | null;
}

const Favorites = () => {
  const { t, lang } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      const ids = getFavoriteEventIds(user?.id);
      if (ids.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("events")
        .select("id, title_ar, start_date, venue_name, category, is_free, cover_image_url, current_attendees_count, is_online, organization_id, organizations(id, name, logo_url, phone, public_email)")
        .in("id", ids)
        .eq("status", "published")
        .order("start_date", { ascending: true });
      setEvents((data || []) as any);
      setLoading(false);
    };
    load();
  }, [user?.id, authLoading]);

  return (
    <div className="min-h-screen font-cairo">
      <Navbar />

      <section className="gradient-hero pt-24 pb-12">
        <div className="container mx-auto px-4 pt-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="font-cairo font-bold text-3xl md:text-4xl text-primary-foreground mb-3">{t("pgFavorites.title")}</h1>
            <p className="text-primary-foreground/70 font-cairo">{t("pgFavorites.subtitle")}</p>
          </motion.div>
        </div>
      </section>

      <section className="py-10 bg-background">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-card rounded-2xl h-72 border border-border/50" />)}
            </div>
          ) : events.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event, i) => (
                <EventCard key={event.id} event={{
                  id: event.id,
                  title: event.title_ar,
                  date: new Date(event.start_date).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" }),
                  location: event.is_online ? t("pgFavorites.online") : (event.venue_name || t("pgFavorites.unspecified")),
                  category: event.category,
                  price: event.is_free ? t("pgFavorites.free") : t("pgFavorites.paid"),
                  isFree: event.is_free,
                  image: event.cover_image_url || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=340&fit=crop",
                  attendees: event.current_attendees_count,
                  organizer: event.organizations ? {
                    id: event.organizations.id,
                    name: event.organizations.name,
                    logo_url: event.organizations.logo_url,
                    phone: event.organizations.phone,
                    email: event.organizations.public_email,
                  } : null,
                }} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 space-y-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Heart className="w-7 h-7 text-primary" />
              </div>
              <p className="text-muted-foreground font-cairo text-lg">{t("pgFavorites.empty")}</p>
              <Button className="rounded-full" asChild>
                <Link to="/events">{t("pgFavorites.browseEvents")}</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Favorites;
