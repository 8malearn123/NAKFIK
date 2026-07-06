import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import EventCard from "@/components/events/EventCard";
import { Button } from "@/components/ui/button";
import { Building2, Globe, Mail, MapPin, MessageCircle, Phone, Linkedin, Instagram, Twitter } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  phone: string | null;
  public_email: string | null;
  website: string | null;
  address: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
}

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
}

const buildWaLink = (phone: string) => {
  const digits = phone.replace(/[^\d]/g, "");
  const text = encodeURIComponent("السلام عليكم، عندي استفسار عن فعالياتكم");
  return `https://wa.me/${digits}?text=${text}`;
};

const OrganizerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [org, setOrg] = useState<Organization | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: orgData }, { data: eventsData }] = await Promise.all([
        supabase.from("organizations").select("id, name, description, logo_url, cover_image_url, phone, public_email, website, address, linkedin_url, twitter_url, instagram_url").eq("id", id).maybeSingle(),
        supabase.from("events").select("id, title_ar, start_date, venue_name, category, is_free, cover_image_url, current_attendees_count, is_online").eq("organization_id", id).eq("status", "published").eq("type", "public").order("start_date", { ascending: true }),
      ]);
      setOrg(orgData as Organization | null);
      setEvents((eventsData || []) as EventRow[]);
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="min-h-screen font-cairo bg-background">
      <Navbar />

      {loading ? (
        <div className="pt-32 container mx-auto px-4">
          <div className="animate-pulse h-48 bg-card rounded-2xl border border-border/50" />
        </div>
      ) : !org ? (
        <div className="pt-32 container mx-auto px-4 text-center">
          <p className="font-cairo text-muted-foreground text-lg">المنظّم غير موجود</p>
          <Button asChild className="mt-4 rounded-full"><Link to="/events">العودة للفعاليات</Link></Button>
        </div>
      ) : (
        <>
          {/* Cover */}
          <section className="relative pt-20">
            <div className="h-56 md:h-72 w-full overflow-hidden bg-gradient-to-br from-primary/30 via-accent/20 to-teal/20">
              {org.cover_image_url && (
                <img src={org.cover_image_url} alt={org.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="-mt-16 md:-mt-20 relative bg-card rounded-2xl border border-border/50 shadow-xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-shrink-0">
                    {org.logo_url ? (
                      <img src={org.logo_url} alt={org.name} className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover border-4 border-card shadow-lg" />
                    ) : (
                      <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-primary/10 border-4 border-card shadow-lg flex items-center justify-center">
                        <Building2 className="w-12 h-12 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="font-cairo font-bold text-2xl md:text-3xl text-foreground mb-2">{org.name}</h1>
                    {org.description && (
                      <p className="text-muted-foreground font-cairo text-sm md:text-base leading-relaxed mb-4">{org.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {org.phone && (
                        <Button asChild size="sm" className="rounded-full bg-teal text-white hover:bg-teal/90">
                          <a href={buildWaLink(org.phone)} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="w-4 h-4" /> واتساب
                          </a>
                        </Button>
                      )}
                      {org.public_email && (
                        <Button asChild size="sm" variant="secondary" className="rounded-full">
                          <a href={`mailto:${org.public_email}`}><Mail className="w-4 h-4" /> بريد</a>
                        </Button>
                      )}
                      {org.phone && (
                        <Button asChild size="sm" variant="outline" className="rounded-full">
                          <a href={`tel:${org.phone}`}><Phone className="w-4 h-4" /> اتصال</a>
                        </Button>
                      )}
                      {org.website && (
                        <Button asChild size="sm" variant="outline" className="rounded-full">
                          <a href={org.website} target="_blank" rel="noopener noreferrer"><Globe className="w-4 h-4" /> الموقع</a>
                        </Button>
                      )}
                      {org.linkedin_url && (
                        <a href={org.linkedin_url} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"><Linkedin className="w-4 h-4" /></a>
                      )}
                      {org.twitter_url && (
                        <a href={org.twitter_url} target="_blank" rel="noopener noreferrer" aria-label="X" className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"><Twitter className="w-4 h-4" /></a>
                      )}
                      {org.instagram_url && (
                        <a href={org.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"><Instagram className="w-4 h-4" /></a>
                      )}
                    </div>
                    {org.address && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground font-cairo">
                        <MapPin className="w-4 h-4" /> {org.address}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Events */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              <h2 className="font-cairo font-bold text-xl md:text-2xl text-foreground mb-6">فعاليات {org.name}</h2>
              {events.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
                  <p className="font-cairo text-muted-foreground">لا توجد فعاليات منشورة حالياً</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event, i) => (
                    <EventCard key={event.id} event={{
                      id: event.id,
                      title: event.title_ar,
                      date: new Date(event.start_date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }),
                      location: event.is_online ? "أونلاين" : (event.venue_name || "غير محدد"),
                      category: event.category,
                      price: event.is_free ? "مجاني" : "مدفوع",
                      isFree: event.is_free,
                      image: event.cover_image_url || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=340&fit=crop",
                      attendees: event.current_attendees_count,
                      organizer: null,
                    }} index={i} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <Footer />
    </div>
  );
};

export default OrganizerProfile;
