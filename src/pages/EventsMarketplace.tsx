import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import EventCard from "@/components/events/EventCard";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const categories = [
  { id: "all", labelKey: "pgMarketplace.catAll" },
  { id: "conference", labelKey: "pgMarketplace.catConference" },
  { id: "workshop", labelKey: "pgMarketplace.catWorkshop" },
  { id: "seminar", labelKey: "pgMarketplace.catSeminar" },
  { id: "meetup", labelKey: "pgMarketplace.catMeetup" },
];

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

const EventsMarketplace = () => {
  const { t, lang } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title_ar, start_date, venue_name, category, is_free, cover_image_url, current_attendees_count, max_attendees, created_at, is_online, organization_id, organizations(id, name, logo_url, phone, public_email)")
        .eq("status", "published")
        .eq("type", "public")
        .order("start_date", { ascending: true });
      setEvents((data || []) as any);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = events.filter((e) => {
    const matchCat = activeCategory === "all" || e.category === activeCategory;
    const matchSearch = e.title_ar.includes(searchQuery) || (e.venue_name || "").includes(searchQuery);
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen font-cairo">
      <Navbar />

      <section className="gradient-hero pt-24 pb-12">
        <div className="container mx-auto px-4 pt-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="font-cairo font-bold text-3xl md:text-4xl text-primary-foreground mb-3">{t("pgMarketplace.title")}</h1>
            <p className="text-primary-foreground/70 font-cairo mb-8">{t("pgMarketplace.subtitle")}</p>
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute end-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="text" placeholder={t("pgMarketplace.searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-12 pe-12 ps-4 rounded-full bg-card text-foreground font-cairo text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-lg" />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-10 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-8 flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            {categories.map((cat) => (
              <Button key={cat.id} variant={activeCategory === cat.id ? "default" : "secondary"} size="sm" className="rounded-full" onClick={() => setActiveCategory(cat.id)}>
                {t(cat.labelKey)}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-card rounded-2xl h-72 border border-border/50" />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((event, i) => (
                <EventCard key={event.id} event={{
                  id: event.id,
                  title: event.title_ar,
                  date: new Date(event.start_date).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" }),
                  location: event.is_online ? t("pgMarketplace.online") : (event.venue_name || t("pgMarketplace.locationTbd")),
                  category: event.category,
                  price: event.is_free ? t("pgMarketplace.free") : t("pgMarketplace.paid"),
                  isFree: event.is_free,
                  image: event.cover_image_url || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=340&fit=crop",
                  attendees: event.current_attendees_count,
                  maxAttendees: (event as any).max_attendees,
                  createdAt: (event as any).created_at,
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
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground font-cairo text-lg">{t("pgMarketplace.emptyState")}</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default EventsMarketplace;
