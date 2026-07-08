import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import EventCard from "@/components/events/EventCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const categories = [
  { id: "all", labelKey: "pgMarketplace.catAll" },
  { id: "conference", labelKey: "pgMarketplace.catConference" },
  { id: "workshop", labelKey: "pgMarketplace.catWorkshop" },
  { id: "seminar", labelKey: "pgMarketplace.catSeminar" },
  { id: "meetup", labelKey: "pgMarketplace.catMeetup" },
];

// المدن السعودية الشائعة — لاستخراج مدينة الفعالية من اسم القاعة وعنوانها
const SAUDI_CITIES = [
  "الرياض", "جدة", "مكة", "المدينة المنورة", "الدمام", "الخبر", "الظهران",
  "الأحساء", "جازان", "أبها", "خميس مشيط", "الطائف", "تبوك", "حائل",
  "بريدة", "عنيزة", "نجران", "ينبع", "الجبيل", "القطيف", "الباحة", "سكاكا", "عرعر", "نيوم",
];

interface EventRow {
  id: string;
  title_ar: string;
  start_date: string;
  venue_name: string | null;
  venue_address?: string | null;
  category: string;
  is_free: boolean;
  cover_image_url: string | null;
  current_attendees_count: number;
  is_online: boolean;
  organization_id: string;
  tickets?: { price: number }[] | null;
  organizations?: {
    id: string;
    name: string;
    logo_url: string | null;
    phone: string | null;
    public_email: string | null;
  } | null;
}

const detectCity = (e: EventRow): string | null => {
  const haystack = `${e.venue_name || ""} ${e.venue_address || ""}`;
  return SAUDI_CITIES.find((c) => haystack.includes(c)) ?? null;
};

// أقل سعر تذكرة للفعالية (0 = مجاني، null = غير معروف)
const minPrice = (e: EventRow): number | null => {
  if (e.is_free) return 0;
  const prices = (e.tickets || []).map((tk) => Number(tk.price)).filter((p) => !isNaN(p));
  return prices.length ? Math.min(...prices) : null;
};

const EventsMarketplace = () => {
  const { t, lang } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  // فلاتر متقدمة
  const [showFilters, setShowFilters] = useState(false);
  const [cityFilter, setCityFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title_ar, start_date, venue_name, venue_address, category, is_free, cover_image_url, current_attendees_count, max_attendees, created_at, is_online, organization_id, tickets(price), organizations(id, name, logo_url, phone, public_email)")
        .eq("status", "published")
        .eq("type", "public")
        .order("start_date", { ascending: true });
      setEvents((data || []) as any);
      setLoading(false);
    };
    load();
  }, []);

  // المدن المتاحة من الفعاليات المعروضة فعلاً
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    events.forEach((e) => {
      if (e.is_online) cities.add("__online__");
      else {
        const c = detectCity(e);
        if (c) cities.add(c);
      }
    });
    return [...cities].sort((a, b) => a.localeCompare(b, "ar"));
  }, [events]);

  const matchPrice = (e: EventRow): boolean => {
    if (priceFilter === "all") return true;
    const p = minPrice(e);
    if (priceFilter === "free") return p === 0;
    if (p === null || p === 0) return false;
    if (priceFilter === "lt100") return p < 100;
    if (priceFilter === "100to500") return p >= 100 && p <= 500;
    return p > 500; // gt500
  };

  const filtered = events.filter((e) => {
    const matchCat = activeCategory === "all" || e.category === activeCategory;
    const q = searchQuery.trim();
    const matchSearch = !q || e.title_ar.includes(q) || (e.venue_name || "").includes(q);
    const matchCity =
      cityFilter === "all" ||
      (cityFilter === "__online__" ? e.is_online : !e.is_online && detectCity(e) === cityFilter);
    const day = e.start_date.slice(0, 10);
    const matchDate = (!dateFrom || day >= dateFrom) && (!dateTo || day <= dateTo);
    return matchCat && matchSearch && matchCity && matchDate && matchPrice(e);
  });

  const filtersActive =
    cityFilter !== "all" || dateFrom !== "" || dateTo !== "" || priceFilter !== "all";

  const clearFilters = () => {
    setCityFilter("all");
    setDateFrom("");
    setDateTo("");
    setPriceFilter("all");
  };

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
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Button
              variant={showFilters || filtersActive ? "default" : "secondary"}
              size="sm"
              className="rounded-full gap-1.5"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t("pgMarketplace.filters")}
            </Button>
            {categories.map((cat) => (
              <Button key={cat.id} variant={activeCategory === cat.id ? "default" : "secondary"} size="sm" className="rounded-full" onClick={() => setActiveCategory(cat.id)}>
                {t(cat.labelKey)}
              </Button>
            ))}
          </div>

          {/* لوحة الفلاتر المتقدمة */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-card rounded-2xl border border-border/50 p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("pgMarketplace.cityLabel")}</Label>
                    <Select value={cityFilter} onValueChange={setCityFilter}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("pgMarketplace.allCities")}</SelectItem>
                        {availableCities.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c === "__online__" ? t("pgMarketplace.online") : c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("pgMarketplace.dateFromLabel")}</Label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background text-foreground font-cairo text-sm border border-input focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("pgMarketplace.dateToLabel")}</Label>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background text-foreground font-cairo text-sm border border-input focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("pgMarketplace.priceLabel")}</Label>
                    <Select value={priceFilter} onValueChange={setPriceFilter}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("pgMarketplace.allPrices")}</SelectItem>
                        <SelectItem value="free">{t("pgMarketplace.priceFree")}</SelectItem>
                        <SelectItem value="lt100">{t("pgMarketplace.priceLt100")}</SelectItem>
                        <SelectItem value="100to500">{t("pgMarketplace.price100to500")}</SelectItem>
                        <SelectItem value="gt500">{t("pgMarketplace.priceGt500")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* عدد النتائج ومسح الفلاتر */}
          <div className="flex items-center justify-between gap-2 mb-6 min-h-6">
            {!loading && (
              <p className="text-xs text-muted-foreground">
                {t("pgMarketplace.resultsPrefix")} {filtered.length}
              </p>
            )}
            {filtersActive && (
              <Button variant="ghost" size="sm" className="rounded-full text-xs gap-1" onClick={clearFilters}>
                <X className="w-3.5 h-3.5" />
                {t("pgMarketplace.clearFilters")}
              </Button>
            )}
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
