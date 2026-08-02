import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { classifyAttendee, ATTENDEE_CLASS_META } from "@/lib/attendeeClass";
import {
  IdCard, Copy, ExternalLink, Calendar, MapPin, CheckCircle2, Ticket as TicketIcon, UserSquare2, Sparkles,
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
    <div className="min-h-screen font-cairo">
      <Navbar />
      <section className="pt-24 pb-16 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-8">
            <h1 className="font-bold text-3xl text-foreground flex items-center gap-2">
              <IdCard className="w-8 h-8 text-primary" /> بطاقاتي
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              بطاقة واحدة موحدة — رمز QR ورابط ثابتان في كل الفعاليات، ونسخة بهوية كل فعالية سجّلت فيها
            </p>
          </div>

          {loading ? (
            <div className="animate-pulse bg-card rounded-3xl h-80 border border-border/50" />
          ) : !code ? (
            <div className="text-center py-14 bg-card border rounded-3xl">
              <UserSquare2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">فعّل ملف التواصل الخاص بك لإنشاء بطاقتك الموحدة</p>
              <Button className="rounded-full" asChild>
                <Link to="/my/profile/networking">إنشاء بطاقتي</Link>
              </Button>
            </div>
          ) : (
            <>
              {/* البطاقة الموحدة */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-primary to-brand-purple rounded-3xl p-6 text-primary-foreground shadow-xl"
              >
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
                      <Button size="sm" variant="secondary" className="rounded-full text-xs" onClick={() => copy(cardUrl!)}>
                        <Copy className="w-3.5 h-3.5" /> نسخ الرابط
                      </Button>
                      <Button size="sm" variant="secondary" className="rounded-full text-xs" asChild>
                        <Link to={`/connect/${code}`} target="_blank">
                          <ExternalLink className="w-3.5 h-3.5" /> فتح البطاقة
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* بطاقات الفعاليات */}
              <div className="mt-8">
                <h2 className="font-bold text-xl text-foreground flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-brand-gold" /> بطاقات الفعاليات
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  نسخة من بطاقتك بهوية كل فعالية سجّلت فيها — نفس الـ QR، يتغير التصميم والتصنيف فقط
                </p>
                {rows.length === 0 ? (
                  <div className="text-center py-10 bg-card border rounded-2xl">
                    <TicketIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">سجّل في فعالية وستظهر بطاقتها هنا</p>
                    <Button variant="outline" className="mt-3 rounded-full" asChild>
                      <Link to="/events">تصفح الفعاليات</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {rows.map((r) => {
                      const tier = tierOf(r);
                      const meta = ATTENDEE_CLASS_META[tier];
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setActiveCard(r)}
                          className="text-start bg-card border rounded-2xl overflow-hidden hover:shadow-lg hover:border-primary/40 transition group"
                        >
                          <div
                            className="h-20 relative"
                            style={{
                              background: r.event.cover_image_url
                                ? `url(${r.event.cover_image_url}) center/cover`
                                : "linear-gradient(135deg, hsl(270 30% 42%), hsl(270 40% 25%))",
                            }}
                          >
                            <div className="absolute inset-0 bg-black/35 group-hover:bg-black/25 transition" />
                            <span className={`absolute top-2 start-2 text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${meta.cls} bg-white/90`}>
                              {meta.label}
                            </span>
                          </div>
                          <div className="p-3">
                            <p className="font-bold text-sm truncate">{r.event.title_ar}</p>
                            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(r.event.start_date).toLocaleDateString("ar-SA", { dateStyle: "medium" })}
                              </span>
                              {r.checked_in_at
                                ? <span className="text-green-600 font-bold flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> تم الحضور</span>
                                : <span className="text-primary font-bold">مؤكد</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* بطاقة الفعالية — نفس QR المستخدم بهوية الفعالية */}
      <Dialog open={!!activeCard} onOpenChange={(v) => !v && setActiveCard(null)}>
        <DialogContent dir="rtl" className="max-w-sm p-0 overflow-hidden rounded-3xl font-cairo">
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
                        {new Date(activeCard.event.start_date).toLocaleDateString("ar-SA", { dateStyle: "medium" })}
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
                        {activeCard.ticket?.name_ar || "تذكرة"} · {activeCard.checked_in_at ? "تم الحضور ✓" : "مؤكد الحضور"}
                      </p>
                    </div>
                  </div>
                  {cardUrl && (
                    <div className="bg-white rounded-2xl p-4 flex flex-col items-center">
                      <QRCodeSVG value={cardUrl} size={160} level="H" fgColor="#492C5A" />
                      <p className="text-[10px] text-gray-400 mt-2">نفس رمزك الموحد — امسحه عند بوابة الفعالية</p>
                    </div>
                  )}
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
