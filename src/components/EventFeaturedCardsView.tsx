import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IdCard } from "lucide-react";
import FeaturedCardArt, { type FeaturedCardData } from "@/components/FeaturedCardArt";

interface FeaturedCard extends FeaturedCardData {
  id: string;
}

const EventFeaturedCardsView = ({ eventId }: { eventId: string }) => {
  const [cards, setCards] = useState<FeaturedCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // select * حتى تصل أعمدة التصميم إن وُجدت، ويعمل مع المخطط القديم كما هو
      const { data } = await (supabase as any)
        .from("event_featured_cards")
        .select("*")
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
          <FeaturedCardArt key={c.id} card={c} compact />
        ))}
      </div>
    </div>
  );
};

export default EventFeaturedCardsView;
