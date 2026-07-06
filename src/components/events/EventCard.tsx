import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Users, Ticket, MessageCircle, Mail, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

interface OrganizerInfo {
  id?: string;
  name: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
}

interface EventData {
  id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  price: string;
  isFree: boolean;
  image: string;
  attendees: number;
  organizer?: OrganizerInfo | null;
}

const categoryLabels: Record<string, string> = {
  conference: "مؤتمر",
  workshop: "ورشة عمل",
  seminar: "ندوة",
  meetup: "لقاء",
};

const buildWaLink = (phone: string, title: string) => {
  const digits = phone.replace(/[^\d]/g, "");
  const text = encodeURIComponent(`السلام عليكم، عندي استفسار بخصوص فعالية: ${title}`);
  return `https://wa.me/${digits}?text=${text}`;
};

const EventCard = ({ event, index }: { event: EventData; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="group bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <span className="bg-card/90 backdrop-blur-sm text-foreground text-xs font-cairo font-semibold rounded-full px-3 py-1">
            {categoryLabels[event.category] || event.category}
          </span>
        </div>
        <div className="absolute top-3 left-3">
          <span className={`text-xs font-cairo font-bold rounded-full px-3 py-1 ${event.isFree ? "bg-teal text-teal-foreground" : "bg-accent text-accent-foreground"}`}>
            {event.price}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-cairo font-bold text-foreground text-lg mb-3 line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <CalendarDays className="w-4 h-4 flex-shrink-0" />
            <span className="font-cairo">{event.date}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="font-cairo">{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="font-cairo">{event.attendees} مسجّل</span>
          </div>
        </div>

        {event.organizer && (
          <div className="flex items-center justify-between gap-2 mb-4 p-2.5 rounded-xl bg-muted/40 border border-border/40 hover:border-primary/40 transition-colors">
            {event.organizer.id ? (
              <Link to={`/o/${event.organizer.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 min-w-0 flex-1 group/org">
                {event.organizer.logo_url ? (
                  <img src={event.organizer.logo_url} alt={event.organizer.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-border/50" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-cairo leading-none mb-0.5">المنظّم</p>
                  <p className="text-xs font-cairo font-semibold text-foreground truncate group-hover/org:text-primary transition-colors">{event.organizer.name}</p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {event.organizer.logo_url ? (
                  <img src={event.organizer.logo_url} alt={event.organizer.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-border/50" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-cairo leading-none mb-0.5">المنظّم</p>
                  <p className="text-xs font-cairo font-semibold text-foreground truncate">{event.organizer.name}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1 flex-shrink-0">
              {event.organizer.phone && (
                <a
                  href={buildWaLink(event.organizer.phone, event.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="تواصل واتساب"
                  className="w-8 h-8 rounded-full bg-teal/10 hover:bg-teal hover:text-white text-teal flex items-center justify-center transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
              {event.organizer.email && (
                <a
                  href={`mailto:${event.organizer.email}?subject=${encodeURIComponent("استفسار عن: " + event.title)}`}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="تواصل بريد"
                  className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary flex items-center justify-center transition-colors"
                >
                  <Mail className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        <Button variant="default" className="w-full rounded-full" size="sm" asChild>
          <Link to={`/events/${event.id}`}>
            <Ticket className="w-4 h-4" />
            سجّل الآن
          </Link>
        </Button>
      </div>
    </motion.div>
  );
};

export default EventCard;
