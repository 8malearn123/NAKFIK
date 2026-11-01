import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { classifyAttendee, ATTENDEE_CLASS_META, type AttendeeClass } from "@/lib/attendeeClass";
import { formatDate } from "@/lib/format";
import AddToWalletButton from "@/components/AddToWalletButton";
import {
  Copy, ExternalLink, Calendar, MapPin, Ticket as TicketIcon, UserSquare2,
} from "lucide-react";
import { toast } from "sonner";

// بطاقاتي — بطاقة موحدة واحدة للمستخدم (QR ورابط ثابتان)
// + نسخة مخصصة بهوية كل فعالية سجّل فيها (يتغير الشكل والتصنيف فقط)

interface EventCardRow {
  id: string; // registration id
  status: string;
  checked_in_at: string | null;
  event: {
    id: string;
    title_ar: string;
    cover_image_url: string | null;
    start_date: string;
    venue_name: string | null;
    is_online: boolean;
  };
  ticket: { name_ar: string; name_en: string | null; type: string } | null;
}

const TIER_TONES: Record<AttendeeClass, StatusTone> = {
  vvip: "warning",
  vip: "primary",
  speaker: "success",
  organizer: "primary",
  regular: "neutral",
};

const MyCards = () => {
  const { user, profile } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [rows, setRows] = useState<EventCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<EventCardRow | null>(null);

  useEffect(() => { document.title = "بطاقاتي | نكفيك"; }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: np }, { data: regs }] = await Promise.all([
        supabase.from("networking_profiles").select("connect_code").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("registrations")
          .select(`
            id, status, checked_in_at,
            event:events!inner(id, title_ar, cover_image_url, start_date, venue_name, is_online),
            ticket:tickets(name_ar, name_en, type)
          `)
          .eq("attendee_id", user.id)
          .order("registered_at", { ascending: false }),
      ]);
      setCode((np as any)?.connect_code || null);
      setRows(
        ((regs || []) as any[]).map((r) => ({
          ...r,
          event: Array.isArray(r.event) ? r.event[0] : r.event,
          ticket: Array.isArray(r.ticket) ? r.ticket[0] : r.ticket,
        }))
      );
      setLoading(false);
    };
    load();
  }, [user]);

  const cardUrl = code ? `${window.location.origin}/connect/${code}` : null;
  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("تم النسخ"); };

  const tierOf = (r: EventCardRow) =>
    classifyAttendee(r.ticket?.name_ar, r.ticket?.name_en, r.ticket?.type);

  return (
    <div className="flex min-h-screen flex-col bg-background font-cairo">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-24">
        <div className="space-y-6">
          <PageHeader
            title="بطاقاتي"
            description="بطاقة واحدة موحدة — رمز QR ورابط ثابتان في كل الفعاليات، ونسخة بهوية كل فعالية سجّلت فيها"
          />

          {loading ? (
            <div className="h-80 animate-pulse rounded-2xl bg-card shadow-soft" />
          ) : !code ? (
            <div className="rounded-2xl bg-card shadow-soft">
              <EmptyState
                icon={UserSquare2}
                title="فعّل ملف التواصل الخاص بك لإنشاء بطاقتك الموحدة"
                action={<Button asChild><Link to="/my/profile/networking">إنشاء بطاقتي</Link></Button>}
              />
            </div>
          ) : (
            <>
              {/* البطاقة الموحدة */}
              <div className="bg-gradient-to-br from-primary to-brand-purple rounded-3xl p-6 text-primary-foreground shadow-xl">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-primary-foreground/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-full bg-primary-foreground/15 border-2 border-primary-foreground/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-xl font-bold">{profile?.full_name?.[0] || "؟"}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate">{profile?.full_name || "—"}</p>
                      {(profile as any)?.job_title && <p className="text-xs text-primary-foreground/80 truncate">{(profile as any).job_title}</p>}
                      {(profile as any)?.company && <p className="text-[11px] text-brand-gold font-semibold truncate">{(profile as any).company}</p>}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-primary-foreground/15 rounded-full px-3 py-1 flex-shrink-0">
                    البطاقة الموحدة
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="bg-white rounded-2xl p-4 flex-shrink-0">
                    <QRCodeSVG value={cardUrl!} size={150} level="H" fgColor="#492C5A" />
                  </div>
                  <div className="flex-1 w-full text-center sm:text-start space-y-2">
                    <p className="text-sm text-primary-foreground/90 leading-relaxed">
                      رمز QR ثابت يعرّف بك في جميع الفعاليات — امسحه في أي فعالية وسيتعرف النظام عليك وعلى تصنيفك فيها تلقائياً.
                    </p>
                    <p className="text-[11px] font-mono bg-primary-foreground/10 rounded-lg px-3 py-1.5 break-all" dir="ltr">{cardUrl}</p>
                    <div className="flex gap-2 justify-center sm:justify-start">
                      <Button size="sm" variant="secondary" onClick={() => copy(cardUrl!)}>
                        <Copy className="w-3.5 h-3.5" /> نسخ الرابط
                      </Button>
                      <Button size="sm" variant="secondary" asChild>
                        <Link to={`/connect/${code}`} target="_blank">
                          <ExternalLink className="w-3.5 h-3.5" /> فتح البطاقة
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* بطاقات الفعاليات */}
              <Panel
                title="بطاقات الفعاليات"
                description="نسخة من بطاقتك بهوية كل فعالية سجّلت فيها — نفس الـ QR، يتغير التصميم والتصنيف فقط"
              >
                {rows.length === 0 ? (
                  <EmptyState
                    icon={TicketIcon}
                    title="سجّل في فعالية وستظهر بطاقتها هنا"
                    action={<Button asChild size="sm"><Link to="/events">تصفح الفعاليات</Link></Button>}
                  />
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {rows.map((r) => {
                      const tier = tierOf(r);
                      const meta = ATTENDEE_CLASS_META[tier];
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setActiveCard(r)}
                          className="flex flex-col overflow-hidden rounded-xl bg-muted/50 text-start transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div
                            className="flex h-[76px] w-full items-center justify-between bg-secondary px-4"
                            style={r.event.cover_image_url ? { background: `url(${r.event.cover_image_url}) center/cover` } : undefined}
                          >
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/85 text-primary">
                              <TicketIcon className="h-5 w-5" />
                            </span>
                            <StatusBadge tone={TIER_TONES[tier]} className="bg-white"><bdi>{meta.label}</bdi></StatusBadge>
                          </div>
                          <div className="flex w-full flex-1 flex-col gap-2 p-4">
                            <p className="truncate text-sm font-bold leading-[22px]">{r.event.title_ar}</p>
                            <p className="flex items-center gap-2 text-xs leading-[18px] text-muted-foreground">
                              <Calendar className="h-[14px] w-[14px] flex-none opacity-70" />
                              {formatDate(r.event.start_date)}
                            </p>
                            <div>
                              {r.checked_in_at
                                ? <StatusBadge tone="success">تم الحضور</StatusBadge>
                                : <StatusBadge tone="primary">تم التأكيد</StatusBadge>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </>
          )}
        </div>
      </main>

      {/* بطاقة الفعالية — نفس QR المستخدم بهوية الفعالية */}
      <Dialog open={!!activeCard} onOpenChange={(v) => !v && setActiveCard(null)}>
        <DialogContent dir="rtl" className="max-w-sm overflow-hidden rounded-3xl p-0 font-cairo [&>button]:text-white [&>button]:opacity-90">
          {activeCard && (() => {
            const tier = tierOf(activeCard);
            const meta = ATTENDEE_CLASS_META[tier];
            return (
              <div>
                {/* هوية الفعالية */}
                <div
                  className="relative h-36 flex items-end p-4"
                  style={{
                    background: activeCard.event.cover_image_url
                      ? `url(${activeCard.event.cover_image_url}) center/cover`
                      : "linear-gradient(135deg, hsl(270 30% 42%), hsl(270 40% 25%))",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/20" />
                  <div className="relative text-white w-full">
                    <DialogTitle className="font-bold text-lg leading-snug text-white">
                      {activeCard.event.title_ar}
                    </DialogTitle>
                    <div className="flex items-center gap-2 text-[11px] text-white/85 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(activeCard.event.start_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {activeCard.event.is_online ? "أونلاين" : activeCard.event.venue_name || "—"}
                      </span>
                    </div>
                  </div>
                  <span className={`absolute top-3 start-3 text-xs font-extrabold rounded-full px-3 py-1 shadow ${meta.cardCls}`}>
                    {meta.label}
                  </span>
                </div>

                {/* بيانات المستخدم الثابتة */}
                <div className="p-5 bg-gradient-to-br from-primary to-brand-purple text-primary-foreground">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary-foreground/15 border-2 border-primary-foreground/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-lg font-bold">{profile?.full_name?.[0] || "؟"}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{profile?.full_name || "—"}</p>
                      <p className="text-[11px] text-primary-foreground/75">
                        {activeCard.ticket?.name_ar || "تذكرة"} · {activeCard.checked_in_at ? "تم الحضور ✓" : "تم التأكيد"}
                      </p>
                    </div>
                  </div>
                  {cardUrl && (
                    <div className="bg-white rounded-2xl p-4 flex flex-col items-center">
                      <QRCodeSVG
                        value={`${cardUrl}?event=${activeCard.event.id}`}
                        size={160}
                        level="H"
                        fgColor="#492C5A"
                      />
                      <p className="text-[10px] text-gray-400 mt-2">
                        رمزك الموحد نفسه — من يمسحه يشوف بطاقتك بهوية هذه الفعالية
                      </p>
                    </div>
                  )}
                  <div className="flex justify-center mt-3">
                    <AddToWalletButton registrationId={activeCard.id} />
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default MyCards;
