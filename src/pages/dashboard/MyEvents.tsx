import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, Calendar, CalendarClock, CalendarDays, ClipboardList, Copy, DoorOpen, Eye, IdCard, Lock, MapPin, MoreHorizontal, Pencil, Plus, Search, Send, Trash2, Users,
  type LucideIcon,
} from "lucide-react";
import { computeEventReadiness, READINESS_THRESHOLD, type EventReadiness } from "@/lib/eventHealth";
import { formatNumber, formatPercent, formatTime, formatWeekday, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import EventScheduleDialog from "@/components/dashboard/EventScheduleDialog";

type EventStatus = "draft" | "pending_review" | "approved" | "published" | "rejected" | "completed" | "cancelled";

const statusConfig: Record<EventStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "مسودة", tone: "neutral" },
  pending_review: { label: "قيد المراجعة", tone: "warning" },
  approved: { label: "معتمدة", tone: "success" },
  published: { label: "منشورة", tone: "success" },
  rejected: { label: "مرفوضة", tone: "danger" },
  completed: { label: "منتهية", tone: "neutral" },
  cancelled: { label: "ملغاة", tone: "neutral" },
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
  description_ar: string | null;
  tickets?: { count: number }[];
}

interface EventAction {
  key: string;
  label: string;
  icon: LucideIcon;
  title?: string;
  to?: string;
  external?: boolean;
  run?: () => void;
  disabled?: boolean;
  busy?: boolean;
}

const MyEvents = () => {
  const { effectiveOrganization: organization } = useEffectiveUser();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
        .select("id, title_ar, start_date, venue_name, status, type, current_attendees_count, max_attendees, cover_image_url, is_online, description_ar, tickets(count)")
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

  // فعالية مفتوح لها حوار الإلغاء / إعادة الجدولة
  const [schedEvent, setSchedEvent] = useState<EventRow | null>(null);

  const [duplicating, setDuplicating] = useState<string | null>(null);
  // حالة صلاحية النسخ حسب الباقة: allowed | notInPlan | expired
  const [dupAccess, setDupAccess] = useState<"allowed" | "notInPlan" | "expired">("allowed");
  const [dupBlockOpen, setDupBlockOpen] = useState(false);

  useEffect(() => {
    if (!organization) return;
    (async () => {
      // آخر اشتراك للمنظّم أياً كانت حالته، مع صلاحية النسخ في باقته
      const { data } = await supabase
        .from("account_subscriptions" as any)
        .select("status, expires_at, subscription_plans(allow_duplicate_event)")
        .eq("account_id", (organization as any).owner_id)
        .order("created_at", { ascending: false })
        .limit(1);
      const sub: any = data?.[0];
      if (!sub) {
        setDupAccess("notInPlan"); // لا اشتراك — الميزة ضمن الباقات المدفوعة
        return;
      }
      const expired =
        sub.status !== "active" || (sub.expires_at && new Date(sub.expires_at) <= new Date());
      if (expired) setDupAccess("expired");
      else if (sub.subscription_plans?.allow_duplicate_event === false) setDupAccess("notInPlan");
      else setDupAccess("allowed");
    })();
  }, [organization]);

  const onDuplicateClick = (id: string) => {
    if (dupAccess !== "allowed") {
      setDupBlockOpen(true);
      return;
    }
    handleDuplicate(id);
  };

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
    } catch (err: any) {
      // النسخ يستهلك فعالية من رصيد الباقة — نعرض السبب الحقيقي عند الرفض
      const msg: string = err?.message || "";
      if (msg.includes("QUOTA_EXCEEDED")) {
        toast.error("لقد استنفدت رصيدك من الفعاليات — النسخ يحتاج فعالية من باقتك. يرجى الترقية.");
        setTimeout(() => navigate("/dashboard/subscription"), 1500);
      } else if (msg.includes("SUBSCRIPTION_EXPIRED")) {
        toast.error("انتهت صلاحية باقتك. يرجى التجديد للاستمرار.");
        setTimeout(() => navigate("/dashboard/subscription"), 1500);
      } else if (msg.includes("NO_ACTIVE_SUBSCRIPTION")) {
        toast.error("لا يوجد اشتراك نشط. يرجى الاشتراك في باقة أولاً.");
        setTimeout(() => navigate("/dashboard/subscription"), 1500);
      } else {
        toast.error("تعذر نسخ الفعالية، حاول مرة أخرى");
      }
    } finally {
      setDuplicating(null);
    }
  };

  // جاهزية الفعالية للمراجعة — من الحقول الإلزامية
  const readinessOf = (e: EventRow): EventReadiness =>
    computeEventReadiness({
      title: e.title_ar,
      description: e.description_ar,
      coverImage: e.cover_image_url,
      hasLocation: e.is_online || !!e.venue_name,
      startDate: e.start_date,
      ticketsCount: e.tickets?.[0]?.count || 0,
    });

  const handleSubmitForReview = async (event: EventRow) => {
    const readiness = readinessOf(event);
    if (!readiness.ready) {
      toast.error(
        `لا يمكن الإرسال — صحة الفعالية ${formatPercent(readiness.score)} (المطلوب ${formatPercent(READINESS_THRESHOLD)}).\nالناقص: ${readiness.missing.map(m => m.missingLabel).join("، ")}`
      );
      return;
    }
    const { error } = await supabase.from("events").update({ status: "pending_review" } as any).eq("id", event.id);
    if (error) {
      toast.error("خطأ في تقديم الفعالية");
    } else {
      setEvents(events.map(e => e.id === event.id ? { ...e, status: "pending_review" as EventStatus } : e));
      toast.success("تم تقديم الفعالية للمراجعة");
    }
  };

  const filtered = events.filter((e) => {
    const matchStatus = filter === "all" || e.status === filter;
    const matchSearch = e.title_ar.includes(search);
    return matchStatus && matchSearch;
  });

  const filterCount = (key: EventStatus | "all") => (key === "all" ? events.length : events.filter((e) => e.status === key).length);

  // كل إجراءات البطاقة في مكان واحد، موزعة على مجموعات القائمة
  const actionsOf = (event: EventRow, readiness: EventReadiness | null) => {
    const base = `/dashboard/events/${event.id}`;
    const ready = !!readiness?.ready;
    const operate: EventAction[] = [
      ...(event.type === "private" ? [{ key: "guests", label: "المدعوون", icon: Users, to: `${base}/guests` }] : []),
      { key: "attendance", label: "الحضور", icon: ClipboardList, to: `${base}/attendance`, title: "قائمة الحضور — الدخول والخروج ومدة البقاء" },
      { key: "days", label: "الأيام", icon: CalendarDays, to: `${base}/days`, title: "أيام الفعالية — فريق وبوابات وتجهيزات لكل يوم" },
      { key: "checkpoints", label: "البوابات", icon: DoorOpen, to: `${base}/checkpoints` },
      { key: "staff", label: "الفريق", icon: Users, to: `${base}/staff`, title: "فريق الفعالية — أدوار بصلاحيات محددة" },
      { key: "featured", label: "البطاقات الخاصة", icon: IdCard, to: `${base}/featured-cards` },
    ];
    const manage: EventAction[] = [
      ...(event.status === "draft" && event.type === "public"
        ? [{
            key: "submit",
            label: "تقديم للمراجعة",
            icon: ready ? Send : Lock,
            run: () => handleSubmitForReview(event),
            disabled: !ready,
            title: ready ? undefined : `أكمل البيانات الناقصة أولاً — الصحة ${formatPercent(readiness?.score ?? 0)} والمطلوب ${formatPercent(READINESS_THRESHOLD)}`,
          }]
        : []),
      { key: "view", label: "عرض", icon: Eye, to: `/events/${event.id}`, external: true },
      { key: "edit", label: "تعديل", icon: Pencil, to: `${base}/edit` },
      ...(event.status !== "completed"
        ? [{ key: "schedule", label: "إلغاء / إعادة جدولة", icon: CalendarClock, run: () => setSchedEvent(event), title: "إلغاء / إعادة جدولة — مع إشعار جميع المسجلين تلقائياً" }]
        : []),
      { key: "duplicate", label: "نسخ الفعالية", icon: Copy, run: () => onDuplicateClick(event.id), disabled: duplicating === event.id, busy: duplicating === event.id },
    ];
    return { operate, manage };
  };

  // زر واحد ظاهر هو الخطوة التالية للفعالية حسب حالتها، والباقي في القائمة
  const primaryKey = (event: EventRow, readiness: EventReadiness | null) => {
    if (event.status === "draft" && event.type === "public") return readiness?.ready ? "submit" : "edit";
    if (event.status === "draft" || event.status === "rejected") return "edit";
    if (event.status === "pending_review" || event.status === "cancelled") return "view";
    return event.type === "private" ? "guests" : "attendance";
  };

  const menuItem = (action: EventAction) => {
    const body = (
      <>
        <action.icon className={cn("h-4 w-4", action.busy && "animate-pulse")} /> {action.label}
      </>
    );
    return action.to ? (
      <DropdownMenuItem key={action.key} asChild title={action.title}>
        <Link to={action.to} target={action.external ? "_blank" : undefined}>{body}</Link>
      </DropdownMenuItem>
    ) : (
      <DropdownMenuItem key={action.key} disabled={action.disabled} title={action.title} onClick={action.run}>{body}</DropdownMenuItem>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="فعالياتي"
          description="إدارة جميع فعالياتك من مكان واحد"
          actions={
            <Button asChild>
              <Link to="/dashboard/events/create"><Plus className="h-4 w-4" /> إنشاء فعالية جديدة</Link>
            </Button>
          }
        />

        {!loading && events.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Tabs className="min-w-0 max-w-full" value={filter} onValueChange={(v) => setFilter(v as EventStatus | "all")}>
              <TabsList className="max-w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {statusFilters.map((sf) => (
                  <TabsTrigger key={sf.key} value={sf.key} className="gap-1.5 px-3 sm:px-4">
                    {sf.label}
                    <span className="text-xs font-normal text-muted-foreground">{formatNumber(filterCount(sf.key))}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64 xl:ms-auto">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="text" placeholder="ابحث عن فعالية..." value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((event) => {
              const status = statusConfig[event.status] || statusConfig.draft;
              const readiness = event.status === "draft" && event.type === "public" ? readinessOf(event) : null;
              const { operate, manage } = actionsOf(event, readiness);
              const primary = [...operate, ...manage].find((a) => a.key === primaryKey(event, readiness))!;
              const others = (group: EventAction[]) => group.filter((a) => a.key !== primary.key);
              const ended = event.status === "completed" || event.status === "cancelled";
              const attendees = event.current_attendees_count || 0;
              const filled = percent(attendees, event.max_attendees || 0);
              return (
                <article key={event.id} className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-soft">
                  <div
                    className="flex h-[76px] items-center justify-between gap-3 bg-secondary px-5"
                    style={event.cover_image_url ? { background: `url(${event.cover_image_url}) center/cover` } : undefined}
                  >
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-white/85 text-primary">
                      <Calendar className="h-5 w-5" />
                    </span>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge tone="neutral" className="bg-white">{event.type === "public" ? "عامة" : "خاصة"}</StatusBadge>
                      <StatusBadge tone={status.tone} className="bg-white">{status.label}</StatusBadge>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-4">
                    <h3 className="truncate text-base font-bold leading-6">{event.title_ar}</h3>
                    <div className="space-y-1 text-[13px] leading-5 text-muted-foreground">
                      <p className="flex items-center gap-2"><Calendar className="h-[15px] w-[15px] flex-none opacity-70" /> {formatWeekday(event.start_date)}، {formatTime(event.start_date)}</p>
                      <p className="flex items-center gap-2"><MapPin className="h-[15px] w-[15px] flex-none opacity-70" /> <span className="truncate">{event.is_online ? "أونلاين" : (event.venue_name || "غير محدد")}</span></p>
                    </div>
                    {event.max_attendees ? (
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <div className="flex items-baseline justify-between gap-2 whitespace-nowrap text-xs leading-[18px] text-muted-foreground">
                          <span><b className="text-sm font-bold leading-5 text-foreground">{formatNumber(attendees)}</b> من {formatNumber(event.max_attendees)} مسجّل</span>
                          <span>{filled}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#EFEDF2]">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(filled, 100)}%` }} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs leading-[18px] text-muted-foreground"><b className="text-sm font-bold leading-5 text-foreground">{formatNumber(attendees)}</b> مسجّل</p>
                    )}
                    {readiness?.ready && (
                      <StatusBadge tone="success" className="self-start">الصحة: {formatPercent(readiness.score)}</StatusBadge>
                    )}
                    {readiness && !readiness.ready && (
                      <div className="space-y-2 rounded-xl bg-muted/50 p-3">
                        <StatusBadge tone="warning">الصحة: {formatPercent(readiness.score)}</StatusBadge>
                        <p className="flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-[#9A5F12]" />
                          <span><b className="font-semibold text-foreground">لإرسالها للمراجعة أكمل:</b> {readiness.missing.map((m) => m.missingLabel).join("، ")}</span>
                        </p>
                      </div>
                    )}
                    <div className="mt-auto flex items-center gap-2 pt-1">
                      {primary.to ? (
                        <Button asChild size="sm" variant={ended ? "outline" : "soft"} className="min-w-0 flex-1">
                          <Link to={primary.to} target={primary.external ? "_blank" : undefined} title={primary.title}>
                            <primary.icon className="h-[15px] w-[15px]" /> {primary.label}
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="soft" className="min-w-0 flex-1" title={primary.title} onClick={primary.run}>
                          <primary.icon className="h-[15px] w-[15px]" /> {primary.label}
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="outline" className="h-9 w-9 flex-none" aria-label="المزيد"><MoreHorizontal className="h-[18px] w-[18px]" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {others(operate).map(menuItem)}
                          <DropdownMenuSeparator />
                          {others(manage).map(menuItem)}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(event.id)}>
                            <Trash2 className="h-4 w-4" /> حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-card shadow-soft">
            {events.length > 0 ? (
              <EmptyState
                icon={Calendar}
                title="لا توجد فعاليات"
                action={<Button variant="outline" size="sm" onClick={() => { setFilter("all"); setSearch(""); }}>إعادة تعيين</Button>}
              />
            ) : (
              <EmptyState
                icon={Calendar}
                title="لا توجد فعاليات"
                description="أنشئ فعاليتك الأولى الآن"
                action={<Button asChild variant="soft" size="sm"><Link to="/dashboard/events/create"><Plus className="h-4 w-4" /> إنشاء فعالية</Link></Button>}
              />
            )}
          </div>
        )}
      </div>

      {/* حوار إلغاء / إعادة جدولة الفعالية — يُشعر جميع المسجلين ويحفظ في السجل */}
      <EventScheduleDialog
        event={schedEvent}
        onOpenChange={(o) => !o && setSchedEvent(null)}
        onDone={(patch) => {
          if (schedEvent) {
            setEvents((prev) => prev.map((e) => (e.id === schedEvent.id ? { ...e, ...patch } as EventRow : e)));
          }
        }}
      />

      {/* نافذة توضيح عدم توفر ميزة النسخ */}
      <Dialog open={dupBlockOpen} onOpenChange={setDupBlockOpen}>
        <DialogContent dir="rtl" className="w-[calc(100%-1.5rem)] rounded-2xl max-w-sm">
          <DialogHeader className="items-center space-y-3 text-center sm:text-center">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-secondary text-primary">
              <Lock className="h-[18px] w-[18px]" />
            </span>
            <DialogTitle>
              {dupAccess === "expired" ? "انتهى اشتراكك" : "ميزة غير متاحة في باقتك"}
            </DialogTitle>
            <DialogDescription>
              {dupAccess === "expired"
                ? "انتهى اشتراكك الحالي. يرجى تجديد الباقة للاستمرار في استخدام هذه الميزة."
                : "ميزة نسخ الفعالية متاحة في الباقات المدفوعة فقط. قم بترقية باقتك للاستفادة منها."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" asChild>
              <Link to="/dashboard/subscription">
                {dupAccess === "expired" ? "تجديد الباقة" : "ترقية الباقة"}
              </Link>
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setDupBlockOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MyEvents;
