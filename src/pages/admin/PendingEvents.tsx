import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Calendar, MapPin, Users, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp,
} from "lucide-react";

interface PendingEvent {
  id: string;
  title_ar: string;
  description_ar: string | null;
  start_date: string;
  venue_name: string | null;
  category: string;
  max_attendees: number | null;
  is_free: boolean;
  is_online: boolean;
  cover_image_url: string | null;
  created_at: string;
  organization: { name: string } | null;
}

const categoryLabels: Record<string, string> = {
  conference: "مؤتمر", workshop: "ورشة عمل", seminar: "ندوة", meetup: "لقاء", other: "أخرى",
};

const PendingEvents = () => {
  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("events")
        .select(`*, organization:organizations(name)`)
        .eq("status", "pending_review")
        .order("created_at", { ascending: false });
      
      const transformed = (data || []).map((e: any) => ({
        ...e,
        organization: Array.isArray(e.organization) ? e.organization[0] : e.organization,
      }));
      setEvents(transformed as PendingEvent[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from("events").update({ status: "published" } as any).eq("id", id);
    if (error) {
      toast.error("خطأ في الموافقة");
    } else {
      setEvents(events.filter(e => e.id !== id));
      toast.success("تمت الموافقة ونشر الفعالية");
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase.from("events").update({ status: "rejected", rejection_reason: rejectReason } as any).eq("id", id);
    if (error) {
      toast.error("خطأ في الرفض");
    } else {
      setEvents(events.filter(e => e.id !== id));
      setRejectingId(null);
      setRejectReason("");
      toast.success("تم رفض الفعالية");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl text-foreground">مراجعة الفعاليات المعلقة</h1>
            <p className="text-muted-foreground text-sm">{events.length} فعاليات بانتظار المراجعة</p>
          </div>
          <div className="flex items-center gap-2 bg-amber-100 text-amber-800 rounded-full px-4 py-2 text-sm font-semibold">
            <Clock className="w-4 h-4" /> {events.length} معلّقة
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="animate-pulse bg-card rounded-2xl h-40 border border-border/50" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {events.map((event) => (
                <motion.div key={event.id} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                  <div className="p-5 flex gap-4">
                    {event.cover_image_url && (
                      <img src={event.cover_image_url} alt={event.title_ar} className="w-36 h-24 rounded-xl object-cover flex-shrink-0 hidden sm:block" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-foreground">{event.title_ar}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">{event.organization?.name || "منظمة غير معروفة"}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(event.start_date).toLocaleDateString("ar-SA")}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.is_online ? "أونلاين" : (event.venue_name || "غير محدد")}</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{event.max_attendees || "∞"} حاضر</span>
                        <span className="bg-muted rounded-full px-2 py-0.5">{categoryLabels[event.category] || event.category}</span>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => setExpandedId(expandedId === event.id ? null : event.id)} className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground border-t border-border/30 transition-colors">
                    {expandedId === event.id ? <><ChevronUp className="w-4 h-4" /> إخفاء</> : <><ChevronDown className="w-4 h-4" /> عرض التفاصيل</>}
                  </button>

                  <AnimatePresence>
                    {expandedId === event.id && event.description_ar && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-5">
                          <h4 className="text-sm font-semibold text-foreground mb-1">الوصف</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">{event.description_ar}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {rejectingId === event.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-4 space-y-3">
                          <Textarea placeholder="اكتب سبب الرفض ليصل المنظم..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
                          <div className="flex gap-2">
                            <Button variant="destructive" size="sm" className="rounded-full" onClick={() => handleReject(event.id)} disabled={!rejectReason.trim()}>
                              تأكيد الرفض
                            </Button>
                            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => { setRejectingId(null); setRejectReason(""); }}>
                              إلغاء
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="px-5 pb-4 flex gap-2">
                    <Button variant="default" size="sm" className="rounded-full bg-teal hover:bg-teal/90 text-teal-foreground" onClick={() => handleApprove(event.id)}>
                      <CheckCircle className="w-4 h-4" /> موافقة ونشر
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setRejectingId(rejectingId === event.id ? null : event.id)}>
                      <XCircle className="w-4 h-4" /> رفض
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {events.length === 0 && (
              <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
                <CheckCircle className="w-12 h-12 text-teal mx-auto mb-3" />
                <p className="text-foreground font-semibold">لا توجد فعاليات معلقة</p>
                <p className="text-muted-foreground text-sm">تمت مراجعة جميع الفعاليات 🎉</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PendingEvents;
