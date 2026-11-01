import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import EventCard from "@/components/events/EventCard";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getFavoriteEventIds } from "@/lib/favorites";
import { formatDate } from "@/lib/format";

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
        .select("id, title_ar, start_date, venue_name, category, is_free, cover_image_url, current_attendees_count, max_attendees, created_at, is_online, organization_id, organizations(id, name, logo_url, phone, public_email)")
        .in("id", ids)
        .eq("status", "published")
        .order("start_date", { ascending: true });
      setEvents((data || []) as any);
      setLoading(false);
    };
    load();
  }, [user?.id, authLoading]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-cairo">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-24">
        <div className="space-y-6">
          <PageHeader title={t("pgFavorites.title")} description={t("pgFavorites.subtitle")} />

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <div key={i} className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />)}
            </div>
          ) : events.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event, i) => (
                <EventCard key={event.id} event={{
                  id: event.id,
                  title: event.title_ar,
                  date: formatDate(event.start_date, true, lang),
                  location: event.is_online ? t("pgFavorites.online") : (event.venue_name || t("pgFavorites.unspecified")),
                  category: event.category,
                  price: event.is_free ? t("pgFavorites.free") : t("pgFavorites.paid"),
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
          ) : (
            <div className="rounded-2xl bg-card shadow-soft">
              <EmptyState
                icon={Heart}
                title={t("pgFavorites.empty")}
                action={<Button asChild><Link to="/events">{t("pgFavorites.browseEvents")}</Link></Button>}
              />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Favorites;
