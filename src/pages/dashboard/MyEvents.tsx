import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Calendar, PlusCircle, Search, Eye, Edit, Trash2, MapPin, Users, Send, DoorOpen, Pencil, IdCard, Copy,
} from "lucide-react";

type EventStatus = "draft" | "pending_review" | "approved" | "published" | "rejected" | "completed" | "cancelled";

const statusConfig: Record<EventStatus, { label: string; className: string }> = {
  draft: { label: "مسودة", className: "bg-muted text-muted-foreground" },
  pending_review: { label: "قيد المراجعة", className: "bg-amber-100 text-amber-800" },
  approved: { label: "معتمدة", className: "bg-teal/10 text-teal" },
  published: { label: "منشورة", className: "bg-teal/10 text-teal" },
  rejected: { label: "مرفوضة", className: "bg-destructive/10 text-destructive" },
  completed: { label: "منتهية", className: "bg-secondary text-secondary-foreground" },
  cancelled: { label: "ملغاة", className: "bg-muted text-muted-foreground" },
};

const statusFilters: { key: EventStatus | "all"; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "draft", label: "مسودة" },
  { key: "pending_review", label: "قيد المراجعة" },
  { key: "published", label: "منشورة" },
  { key: "rejected", label: "مرفوضة" },
];

interface EventRow {
  id: string;
  title_ar: string;
  start_date: string;
  venue_name: string | null;
  status: EventStatus;
  type: string;
  current_attendees_count: number;
  max_attendees: number | null;
  cover_image_url: string | null;
  is_online: boolean;
}

const MyEvents = () => {
  const { effectiveOrganization: organization } = useEffectiveUser();
  const [searchParams] = useSearchParams();
  const initialStatus = (searchParams.get("status") as EventStatus | null) || "all";
  const [events, setEvents] = useState<EventRow[]>([]);
  const [filter, setFilter] = useState<EventStatus | "all">(initialStatus);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title_ar, start_date, venue_name, status, type, current_attendees_count, max_attendees, cover_image_url, is_online")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("خطأ في تحميل الفعاليات");
      } else {
        setEvents((data || []) as EventRow[]);
      }
      setLoading(false);
    };
    load();
  }, [organization]);

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذه الفعالية؟")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast.error("خطأ في حذف الفعالية");
    } else {
      setEvents(events.filter(e => e.id !== id));
      toast.success("تم حذف الفعالية");
    }
  };

  const [duplicating, setDuplicating] = useState<string | null>(null);

  // نسخ الفعالية كاملة (البيانات + التذاكر + الجلسات) كمسودة جديدة
  const handleDuplicate = async (id: string) => {
    setDuplicating(id);
    try {
      const [{ data: src, error: srcErr }, { data: tix }, { data: sess }] = await Promise.all([
        supabase.from("events").select("*").eq("id", id).single(),
        supabase.from("tickets").select("*").eq("event_id", id),
        supabase.from("sessions").select("*").eq("event_id", id),
      ]);
      if (srcErr || !src) throw srcErr;

      const copy: any = { ...src };
      // حقول يولّدها النظام للنسخة الجديدة
      delete copy.id;
      delete copy.created_at;
      delete copy.updated_at;
      delete copy.private_link; // فريد لكل فعالية
      copy.status = "draft";
      copy.current_attendees_count = 0;
      copy.title_ar = `${(src as any).title_ar} (نسخة)`;

      const { data: newEvt, error: insErr } = await supabase
        .from("events")
        .insert(copy)
        .select("id, title_ar, start_date, venue_name, status, type, current_attendees_count, max_attendees, cover_image_url, is_online")
        .single();
      if (insErr || !newEvt) throw insErr;

      if (tix && tix.length) {
        const ticketCopies = (tix as any[]).map((tk) => {
          const c: any = { ...tk };
          delete c.id;
          delete c.created_at;
          delete c.updated_at;
          c.event_id = (newEvt as any).id;
          c.quantity_sold = 0;
          return c;
        });
        const { error } = await supabase.from("tickets").insert(ticketCopies);
        if (error) throw error;
      }

      if (sess && sess.length) {
        const sessionCopies = (sess as any[]).map((s) => {
          const c: any = { ...s };
          delete c.id;
          delete c.created_at;
          c.event_id = (newEvt as any).id;
          return c;
        });
        const { error } = await supabase.from("sessions").insert(sessionCopies);
        if (error) throw error;
      }

      setEvents((prev) => [newEvt as EventRow, ...prev]);
      toast.success("تم إنشاء نسخة من الفعالية كمسودة — راجعها وعدّلها قبل النشر");
    } catch {
      toast.error("تعذر نسخ الفعالية، حاول مرة أخرى");
    } finally {
      setDuplicating(null);
    }
  };

  const handleSubmitForReview = async (id: string) => {
    const { error } = await supabase.from("events").update({ status: "pending_review" } as any).eq("id", id);
    if (error) {
      toast.error("خطأ في تقديم الفعالية");
    } else {
      setEvents(events.map(e => e.id === id ? { ...e, status: "pending_review" as EventStatus } : e));
      toast.success("تم تقديم الفعالية للمراجعة");
    }
  };

  const filtered = events.filter((e) => {
    const matchStatus = filter === "all" || e.status === filter;
    const matchSearch = e.title_ar.includes(search);
    return matchStatus && matchSearch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-bold text-2xl text-foreground">فعالياتي</h1>
            <p className="text-muted-foreground text-sm">إدارة جميع فعالياتك من مكان واحد</p>
          </div>
          <Button className="rounded-full" asChild>
            <Link to="/dashboard/events/create">
              <PlusCircle className="w-4 h-4" />
              إنشاء فعالية جديدة
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="ابحث عن فعالية..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 pr-10 pl-4 rounded-xl bg-card text-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statusFilters.map((sf) => (
              <Button key={sf.key} variant={filter === sf.key ? "default" : "secondary"} size="sm" className="rounded-full" onClick={() => setFilter(sf.key)}>
                {sf.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="animate-pulse bg-card rounded-2xl h-24 border border-border/50" />)
          ) : filtered.length > 0 ? (
            filtered.map((event, i) => {
              const status = statusConfig[event.status] || statusConfig.draft;
              return (
                <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl border border-border/50 hover:border-primary/20 hover:shadow-md transition-all p-4 flex gap-4">
                  {event.cover_image_url && (
                    <img src={event.cover_image_url} alt={event.title_ar} className="w-28 h-20 rounded-xl object-cover flex-shrink-0 hidden sm:block" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate">{event.title_ar}</h3>
                    <div className="flex items-center gap-3 mt-1.5 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(event.start_date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.is_online ? "أونلاين" : (event.venue_name || "غير محدد")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {event.current_attendees_count}/{event.max_attendees || "∞"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`text-[11px] font-semibold rounded-full px-3 py-1 ${status.className}`}>{status.label}</span>
                      <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-3 py-1">
                        {event.type === "public" ? "عامة" : "خاصة"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {event.status === "draft" && event.type === "public" && (
                      <Button variant="default" size="sm" className="h-8 text-xs rounded-full" onClick={() => handleSubmitForReview(event.id)}>
                        <Send className="w-3.5 h-3.5" /> تقديم للمراجعة
                      </Button>
                    )}
                    {event.type === "private" && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs rounded-full" asChild>
                        <Link to={`/dashboard/events/${event.id}/guests`}>
                          <Users className="w-3.5 h-3.5" /> المدعوون
                        </Link>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 text-xs rounded-full" asChild>
                      <Link to={`/dashboard/events/${event.id}/checkpoints`}>
                        <DoorOpen className="w-3.5 h-3.5" /> البوابات
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs rounded-full" asChild>
                      <Link to={`/dashboard/events/${event.id}/featured-cards`}>
                        <IdCard className="w-3.5 h-3.5" /> البطاقات الخاصة
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="عرض">
                      <Link to={`/events/${event.id}`} target="_blank"><Eye className="w-4 h-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" asChild title="تعديل">
                      <Link to={`/dashboard/events/${event.id}/edit`}><Pencil className="w-4 h-4" /></Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDuplicate(event.id)}
                      disabled={duplicating === event.id}
                      title="نسخ الفعالية"
                    >
                      <Copy className={`w-4 h-4 ${duplicating === event.id ? "animate-pulse" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(event.id)} title="حذف">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-semibold">لا توجد فعاليات</p>
              <p className="text-muted-foreground text-sm mb-4">أنشئ فعاليتك الأولى الآن</p>
              <Button className="rounded-full" asChild>
                <Link to="/dashboard/events/create"><PlusCircle className="w-4 h-4" /> إنشاء فعالية</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyEvents;
