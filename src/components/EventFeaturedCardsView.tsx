import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IdCard } from "lucide-react";

interface FeaturedCard {
  id: string;
  name: string;
  role_label: string | null;
  description: string | null;
  image_url: string | null;
}

const EventFeaturedCardsView = ({ eventId }: { eventId: string }) => {
  const [cards, setCards] = useState<FeaturedCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("event_featured_cards")
        .select("id, name, role_label, description, image_url")
        .eq("event_id", eventId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setCards((data as FeaturedCard[]) || []);
      setLoading(false);
    })();
  }, [eventId]);

  if (loading || cards.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <IdCard className="w-4 h-4 text-primary" />
        <h4 className="font-bold text-sm text-foreground">بطاقات الفعالية الخاصة</h4>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.id} className="bg-background rounded-xl border border-border/50 overflow-hidden">
            {c.image_url ? (
              <img src={c.image_url} alt={c.name} className="w-full h-24 object-cover" />
            ) : (
              <div className="w-full h-24 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <IdCard className="w-6 h-6 text-primary/40" />
              </div>
            )}
            <div className="p-2.5">
              <p className="font-bold text-xs text-foreground truncate">{c.name}</p>
              {c.role_label && (
                <span className="inline-block mt-1 text-[10px] font-semibold bg-primary/10 text-primary rounded-full px-2 py-0.5">
                  {c.role_label}
                </span>
              )}
              {c.description && (
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1.5">{c.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventFeaturedCardsView;
