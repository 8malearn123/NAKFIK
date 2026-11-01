import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Calendar, CheckCircle, ChevronDown, ChevronUp, MapPin, Tag, Users, XCircle,
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

const pendingCount = (n: number) => {
  if (n === 0) return "لا توجد فعاليات بانتظار المراجعة";
  if (n === 1) return "فعالية واحدة بانتظار المراجعة";
  if (n === 2) return "فعاليتان بانتظار المراجعة";
  return `${formatNumber(n)} ${n <= 10 ? "فعاليات" : "فعالية"} بانتظار المراجعة`;
};

const metaIcon = "h-[15px] w-[15px] flex-none opacity-70";

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
        <PageHeader title="مراجعة الفعاليات المعلقة" description={loading ? "…" : pendingCount(events.length)} />

        {loading ? (
          <div className="grid gap-6">
            {[1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={CheckCircle}
              title="لا توجد فعاليات معلقة"
              description="تمت مراجعة جميع الفعاليات"
              action={<Button asChild size="sm" variant="outline"><Link to="/admin/events">عرض جميع الفعاليات</Link></Button>}
            />
          </div>
        ) : (
          <div className="grid gap-6">
            <AnimatePresence>
              {events.map((event) => (
                <motion.article key={event.id} layout="position" exit={{ opacity: 0, x: -100 }} className="min-w-0 rounded-2xl bg-card p-5 shadow-soft sm:p-6">
                  <div className="flex items-start gap-4">
                    {event.cover_image_url && (
                      <img src={event.cover_image_url} alt={event.title_ar} className="hidden h-24 w-36 flex-none rounded-xl object-cover sm:block" />
                    )}
                    <span className={cn("grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary", event.cover_image_url && "sm:hidden")}>
                      <Calendar className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold leading-6">{event.title_ar}</h3>
                      <p className="text-[13px] leading-5 text-muted-foreground">{event.organization?.name || "منظمة غير معروفة"}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] leading-5 text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Calendar className={metaIcon} />{formatDate(event.start_date)}</span>
                        <span className="flex items-center gap-1.5"><MapPin className={metaIcon} />{event.is_online ? "أونلاين" : (event.venue_name || "غير محدد")}</span>
                        <span className="flex items-center gap-1.5"><Users className={metaIcon} />{event.max_attendees ? formatNumber(event.max_attendees) : "∞"} حاضر</span>
                        <span className="flex items-center gap-1.5"><Tag className={metaIcon} />{categoryLabels[event.category] || event.category}</span>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === event.id && event.description_ar && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-4 rounded-xl bg-muted/50 p-4">
                          <h4 className="mb-1 text-sm font-semibold">الوصف</h4>
                          <p className="text-sm leading-relaxed text-muted-foreground">{event.description_ar}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {rejectingId === event.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-4 space-y-3 rounded-xl bg-muted/50 p-4">
                          <div className="space-y-2">
                            <Label htmlFor={`reject-${event.id}`}>سبب الرفض</Label>
                            <Textarea id={`reject-${event.id}`} placeholder="اكتب سبب الرفض ليصل المنظم..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="destructive" size="sm" onClick={() => handleReject(event.id)} disabled={!rejectReason.trim()}>
                              تأكيد الرفض
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setRejectingId(null); setRejectReason(""); }}>
                              إلغاء
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button variant="soft" size="sm" onClick={() => handleApprove(event.id)}>
                      <CheckCircle className="h-4 w-4" /> موافقة ونشر
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setRejectingId(rejectingId === event.id ? null : event.id)}>
                      <XCircle className="h-4 w-4" /> رفض
                    </Button>
                    <Button variant="ghost" size="sm" className="ms-auto text-muted-foreground" onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}>
                      {expandedId === event.id ? <><ChevronUp className="h-4 w-4" /> إخفاء</> : <><ChevronDown className="h-4 w-4" /> عرض التفاصيل</>}
                    </Button>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PendingEvents;
