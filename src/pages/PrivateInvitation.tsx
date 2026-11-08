import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarDays, Check, ChevronDown, Clock, ExternalLink, Gift, Mail, MapPin, MessageCircle,
  Minus, Paperclip, Phone, Plus, QrCode, Shirt, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandMark from "@/components/BrandMark";
import DesignPreview from "@/components/design/DesignPreview";
import CustomTemplateRender from "@/components/design/CustomTemplateRender";
import { DEFAULT_OVERLAY } from "@/components/design/CustomTemplateDesigner";
import SealedEnvelope, { type EnvelopePhase } from "@/components/invitation/SealedEnvelope";
import CardFlip from "@/components/invitation/CardFlip";
import EntryFace from "@/components/invitation/EntryFace";
import WaxSeal from "@/components/invitation/WaxSeal";
import { alpha, mix } from "@/components/invitation/colors";
import type { GuestInvitation, InvitationGuest, InvitationPayload, RsvpResult } from "@/components/invitation/types";
import { demoGuest, demoInvitation } from "@/lib/inviteDemo";
import { formatDateTime, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// صفحة الدعوة الخاصة كما يراها الضيف من رابطه.
// أول مرة تصله الدعوة في ظرف مختوم باسمه: يفك الختم فتخرج البطاقة ويُكتب اسمه عليها،
// وحين يؤكد حضوره يُختم ردّه على البطاقة، وخلفها رمز الدخول.
// demo: نسخة تجريبية على /demo/invite ببيانات ثابتة ورد لا يُحفظ.

const openedKey = (token: string) => `nakfeek-invite-opened:${token}`;
// ختم أول فتح للدعوة عند المضيف — الدالة خارج الأنواع المولّدة، والخطأ يُتجاهل بصمت إن لم تُفعّل بعد
const markOpened = (token: string) =>
  (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => PromiseLike<unknown>)("mark_invitation_opened", { _token: token }).then(
    () => {},
    () => {},
  );
const storage = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

// ورد/بوكس/شيك بقيم ثابتة — و"أخرى" يحددها المستفيد بنفسه
const GIFT_META: Record<string, { label: string; emoji: string; amount: number | null }> = {
  flowers: { label: "ورد", emoji: "🌹", amount: 100 },
  box: { label: "بوكس", emoji: "🎁", amount: 300 },
  cheque: { label: "شيك", emoji: "📝", amount: 500 },
  other: { label: "أخرى", emoji: "", amount: null },
};
const PAY_METHOD_LABELS: Record<string, string> = { bank: "تحويل بنكي", tabby: "Tabby", tamara: "Tamara" };

const inHours = (h: number) => (h === 1 ? "بعد ساعة" : h === 2 ? "بعد ساعتين" : h <= 10 ? `بعد ${h} ساعات` : `بعد ${h} ساعة`);
const inMinutes = (m: number) => (m <= 1 ? "بعد دقيقة" : m === 2 ? "بعد دقيقتين" : m <= 10 ? `بعد ${m} دقائق` : `بعد ${m} دقيقة`);
const optionsLabel = (n: number) => (n === 1 ? "خيار واحد" : n === 2 ? "خياران" : `${n} خيارات`);
const companionsLine = (n: number) => (n === 1 ? "ومعك مرافق واحد" : n === 2 ? "ومعك مرافقان" : n <= 10 ? `ومعك ${n} مرافقين` : `ومعك ${n} مرافقاً`);

const MUTED = "text-[#6B6573]";

const Panel = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn("rounded-[18px] bg-white px-5 py-4 shadow-soft", className)}>{children}</div>
);

type IconType = ComponentType<{ className?: string }>;

const IconTile = ({ icon: Icon, theme }: { icon: IconType; theme: string }) => (
  <span className="grid h-9 w-9 flex-none place-items-center rounded-xl" style={{ background: alpha(theme, 0.08), color: theme }}>
    <Icon className="h-[18px] w-[18px]" />
  </span>
);

const PrivateInvitation = ({ demo = false }: { demo?: boolean }) => {
  const { token } = useParams<{ token: string }>();
  const reduce = useReducedMotion();
  const [guest, setGuest] = useState<InvitationGuest | null>(null);
  const [inv, setInv] = useState<GuestInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [companions, setCompanions] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // اختيار المستفيد لهديته: "أخرى" يكتب قيمتها بنفسه
  const [giftPick, setGiftPick] = useState<string | null>(null);
  const [giftAmount, setGiftAmount] = useState("");
  const [giftOtherType, setGiftOtherType] = useState("");
  // قسم الهدايا مطوي افتراضياً — يظهر عند الحاجة فقط ولا يزاحم محتوى الدعوة
  const [giftOpen, setGiftOpen] = useState(false);
  // الظرف يظهر في أول فتح فقط، والاسم يُكتب بالحبر في تلك المرة
  const [phase, setPhase] = useState<EnvelopePhase>("open");
  const [fresh, setFresh] = useState(false);
  // وجه البطاقة: الدعوة أو رمز الدخول
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const load = async () => {
      let g: InvitationGuest | null;
      let i: GuestInvitation | null;
      if (demo) {
        g = demoGuest();
        i = demoInvitation();
      } else {
        if (!token) { setLoading(false); return; }
        const { data, error } = await supabase.rpc("get_invitation_by_token", { _token: token });
        if (error || !data) { setLoading(false); return; }
        ({ guest: g, invitation: i } = data as unknown as InvitationPayload);
      }
      if (!g || !i) { setLoading(false); return; }
      setGuest(g);
      setInv(i);
      setCompanions(g.companions_count || 0);
      const firstOpen =
        i.status !== "cancelled" && g.rsvp_status === "pending" && !g.checked_in_at && !(!demo && storage.get(openedKey(g.token)));
      setPhase(firstOpen ? "sealed" : "open");
      setFresh(firstOpen);
      // قرب الموعد يفتح رمز الدخول مباشرة لمن أكّد، فهو ما يحتاجه عند الباب
      const msToEvent = new Date(i.event_date).getTime() - Date.now();
      setFlipped(g.rsvp_status === "confirmed" && Math.abs(msToEvent) < 12 * 3600000);
      setLoading(false);
      if (!demo) markOpened(token);
    };
    load();
  }, [token, demo]);

  useEffect(() => {
    if (inv) document.title = inv.title + " | دعوة خاصة";
  }, [inv]);

  const changePhase = (next: EnvelopePhase) => {
    setPhase(next);
    if (next === "opening" && !demo && guest?.token) storage.set(openedKey(guest.token), "1");
  };

  const respond = async (status: "confirmed" | "declined") => {
    if (!guest) return;
    setSubmitting(true);
    let result: RsvpResult;
    if (demo) {
      const cap = inv.allow_companions ? inv.max_companions || 0 : 0;
      result = { rsvp_status: status, companions_count: status === "confirmed" ? Math.min(companions, cap) : 0 };
    } else {
      const { data, error } = await supabase.rpc("confirm_invitation_rsvp", {
        _token: guest.token,
        _status: status,
        _companions: status === "confirmed" ? companions : 0,
      });
      if (error || !data) {
        setSubmitting(false);
        toast.error("تعذر حفظ ردك");
        return;
      }
      result = data as unknown as RsvpResult;
    }
    setSubmitting(false);
    setFlipped(false);
    setGuest({ ...guest, rsvp_status: result.rsvp_status, companions_count: result.companions_count, confirmed_at: new Date().toISOString() });
  };

  // تغيير الرد: يعيد الأزرار فقط، ولا يتغير شيء عند المضيف حتى يختار الضيف من جديد
  const changeReply = () => {
    setFlipped(false);
    setCompanions(guest.companions_count || 0);
    setGuest({ ...guest, rsvp_status: "pending" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F5F8]">
        <BrandMark className="h-12 w-12 animate-pulse" />
      </div>
    );
  }
  if (!guest || !inv) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#F6F5F8] p-6 font-cairo">
        <Panel className="max-w-sm px-6 py-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#FBECEE] text-[#A03C4A]">
            <X className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-[#1C1524]">رابط الدعوة غير صحيح</h1>
          <p className={cn("mt-2 text-sm", MUTED)}>قد تكون الدعوة محذوفة أو الرابط منتهياً</p>
        </Panel>
      </div>
    );
  }

  const theme: string = inv.theme_color || "#492C5A";
  const accent: string = inv.accent_color || "#CC8E3D";
  const canvas = mix(theme, "#FFFFFF", 0.93);
  const guestName: string = guest.guest_name || "ضيفنا الكريم";
  const cancelled = inv.status === "cancelled";
  const confirmed = guest.rsvp_status === "confirmed";
  const declined = guest.rsvp_status === "declined";
  const sealed = phase !== "open";
  const qrValue = `${window.location.origin}/invite/${guest.token}`;

  const eventDate = new Date(inv.event_date);
  const when = formatDateTime(eventDate);
  // تذكير المستفيد: يظهر بوضوح إذا حان وقت التذكير الذي حدده المنظم (1-12 ساعة قبل الموعد)
  const msToEvent = eventDate.getTime() - Date.now();
  const reminderActive = !cancelled && inv.reminder_hours_before && msToEvent > 0 && msToEvent <= inv.reminder_hours_before * 3600000;
  const hoursLeft = Math.floor(msToEvent / 3600000);
  const minsLeft = Math.floor((msToEvent % 3600000) / 60000);

  // خيار التحويل أُزيل من النظام — نتجاهله في الدعوات القديمة المحفوظة
  const giftTypes: string[] = (inv.gift_options?.types || []).filter((t: string) => t !== "transfer");
  const giftPayMethods: string[] = inv.gift_options?.payment_methods || [];
  const attachments: { name: string; url: string; size?: number }[] = Array.isArray(inv.attachments) ? inv.attachments : [];
  const maxCompanions = inv.allow_companions ? inv.max_companions || 0 : 0;

  // بعد فك الختم يتأخر ظهور الرد والتفاصيل قليلاً حتى يُكتب الاسم أولاً
  const reveal = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: fresh ? delay : 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  });

  // ===== البطاقة: تصميم المضيف في الأمام ورمز الدخول في الخلف =====
  const ink = fresh ? { play: phase === "open" } : undefined;
  const front = (
    <div className="relative">
      {inv.use_custom_template && inv.custom_template_url ? (
        <CustomTemplateRender
          templateUrl={inv.custom_template_url}
          overlay={inv.name_overlay || DEFAULT_OVERLAY}
          guest={guest}
          inkName={ink}
        />
      ) : (
        <DesignPreview
          mode="invitation"
          design={{
            theme_color: theme,
            accent_color: accent,
            background_color: "#FFFFFF",
            text_color: inv.text_color || "#FFFFFF",
            heading_font: inv.font_family || "Cairo",
            body_font: inv.body_font || inv.font_family || "Cairo",
            layout_style: inv.layout_style || "classic",
            ornament_style: inv.ornament_style || "none",
            background_image_url: inv.background_image_url || inv.cover_image_url || null,
            ...(inv.design_extras || {}),
          }}
          title={inv.title}
          subtitle={inv.host_name ? `يتشرف بدعوتكم · ${inv.host_name}` : "دعوة كريمة"}
          body={inv.custom_message || undefined}
          guestName={guestName}
          inkName={ink}
        />
      )}
      {/* ختم التأكيد: رد الضيف يُختم على بطاقته */}
      <AnimatePresence>
        {confirmed && (
          <motion.div
            key="stamp"
            className="pointer-events-none absolute bottom-[3.5%] left-[4.5%] z-30 w-[21%] max-w-[88px]"
            initial={reduce ? false : { opacity: 0, scale: 1.9, rotate: -26 }}
            animate={{ opacity: 1, scale: 1, rotate: -9 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 420, damping: 24, delay: 0.15 }}
            style={{ filter: "drop-shadow(0 3px 4px rgb(30 8 18 / .45))" }}
          >
            <WaxSeal color="#C49A55" emblem="check" className="block h-auto w-full" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  const back = (
    <EntryFace
      theme={theme}
      accent={accent}
      guestName={guestName}
      title={inv.title}
      qrValue={qrValue}
      companions={guest.companions_count || 0}
      checkedInAt={guest.checked_in_at ? formatTime(guest.checked_in_at) : null}
    />
  );

  // ===== الرد =====
  const rsvp = (
    <Panel>
      <AnimatePresence mode="wait" initial={false}>
        {confirmed ? (
          <motion.div key="confirmed" {...swap(reduce)} className="text-center">
            <p className="text-[17px] font-bold" style={{ color: theme }}>حضورك مؤكد</p>
            <p className={cn("mt-1 text-balance text-[13px] leading-relaxed", MUTED)}>
              نتشرف باستقبالك {when}
              {guest.companions_count > 0 && <span className="block">{companionsLine(guest.companions_count)}</span>}
            </p>
            {guest.checked_in_at && (
              <p className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold text-white" style={{ background: theme }}>
                <Check className="h-3.5 w-3.5" /> تم استخدام الدعوة للدخول {formatTime(guest.checked_in_at)}
              </p>
            )}
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: theme }}
              >
                <QrCode className="h-4 w-4" aria-hidden />
                {flipped ? "عرض الدعوة" : "رمز الدخول"}
              </button>
              {!guest.checked_in_at && (
                <button type="button" onClick={changeReply} className={cn("h-10 rounded-xl px-4 text-[13px] font-semibold underline-offset-4 hover:underline", MUTED)}>
                  تغيير الرد
                </button>
              )}
            </div>
          </motion.div>
        ) : declined ? (
          <motion.div key="declined" {...swap(reduce)} className="text-center">
            <p className="text-[17px] font-bold text-[#1C1524]">تم تسجيل اعتذارك</p>
            <p className={cn("mt-1 text-[13px] leading-relaxed", MUTED)}>نشكر لك ردّك، ونتمنى رؤيتك في مناسبة قادمة.</p>
            <button type="button" onClick={changeReply} className={cn("mt-2 h-10 rounded-xl px-4 text-[13px] font-semibold underline-offset-4 hover:underline", MUTED)}>
              تغيير الرد
            </button>
          </motion.div>
        ) : (
          <motion.div key="ask" {...swap(reduce)}>
            <div className={cn("space-y-1.5 border-b border-[#F0EDF3] pb-3 text-[13px]", MUTED)}>
              <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 flex-none" style={{ color: theme }} />{when}</p>
              {inv.venue_name && (
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 flex-none" style={{ color: theme }} />{inv.venue_name}</p>
              )}
            </div>
            <p className="mt-3 text-center text-[15px] font-bold">هل ستشرفنا بحضورك؟</p>
            {maxCompanions > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-[#F6F5F8] px-3 py-2">
                <span className={cn("text-[13px]", MUTED)}>
                  المرافقون <span className="text-[11px] opacity-80">(حتى {maxCompanions})</span>
                </span>
                <div className="flex items-center gap-3">
                  <Stepper label="إنقاص مرافق" disabled={companions <= 0} onClick={() => setCompanions(companions - 1)}>
                    <Minus className="h-3.5 w-3.5" />
                  </Stepper>
                  <span className="w-4 text-center font-inter text-[15px] font-bold tabular-nums">{companions}</span>
                  <Stepper label="زيادة مرافق" disabled={companions >= maxCompanions} onClick={() => setCompanions(companions + 1)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Stepper>
                </div>
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => respond("confirmed")}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: theme }}
              >
                <Check className="h-4 w-4" aria-hidden /> سأحضر
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => respond("declined")}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#E7E2EC] text-sm font-bold text-[#1C1524]/80 transition-colors hover:bg-[#F6F5F8] disabled:opacity-60"
              >
                <X className="h-4 w-4" aria-hidden /> أعتذر
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );

  return (
    <div
      dir="rtl"
      className="min-h-screen font-cairo text-[#1C1524]"
      style={{ background: `radial-gradient(90% 60% at 50% 30%, #FFFFFF, ${canvas} 72%) top center / 100% 100svh no-repeat, ${canvas}` }}
    >
      <main className="mx-auto w-full max-w-md px-6 pb-10">
        <section style={{ paddingTop: "max(1.75rem, calc((100svh - 41rem) / 2))" }}>
          <motion.p
            className="mb-6 text-center text-[13px]"
            style={{ color: alpha(theme, 0.72) }}
            initial={false}
            animate={{ opacity: phase === "sealed" ? 1 : 0 }}
            transition={{ duration: 0.4 }}
          >
            دعوة خاصة {inv.host_name ? <>من <b className="font-bold">{inv.host_name}</b></> : "لك"}
          </motion.p>

          <div className="mx-auto w-full max-w-[21.25rem]">
            <SealedEnvelope phase={phase} onPhaseChange={changePhase} guestName={guestName} theme={theme} accent={accent}>
              <CardFlip flipped={flipped} front={front} back={back} />
            </SealedEnvelope>
          </div>

          {/* أسفل البطاقة: تلميح الفتح ثم الرد — بارتفاع ثابت حتى لا تقفز البطاقة */}
          <div className="mt-7 min-h-[10.5rem]">
            {sealed ? (
              <motion.p
                className="pt-1 text-center text-[13px] font-semibold"
                style={{ color: alpha(theme, 0.8) }}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: phase === "sealed" ? 1 : 0 }}
                transition={phase === "sealed" ? { delay: 0.9, duration: 0.5 } : { duration: 0.25 }}
              >
                اضغط على الختم لتفتح دعوتك
              </motion.p>
            ) : (
              <motion.div className="space-y-3" {...reveal(0.5)}>
                {cancelled ? (
                  <Panel className="text-center">
                    <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#FBECEE] text-[#A03C4A]">
                      <X className="h-5 w-5" />
                    </span>
                    <p className="mt-2 text-[16px] font-bold text-[#A03C4A]">نعتذر منكم — تم إلغاء المناسبة</p>
                    {inv.cancel_reason && <p className="mt-1 text-[13px] leading-relaxed text-[#A03C4A]/85">السبب: {inv.cancel_reason}</p>}
                    <p className={cn("mt-2 text-[12px] leading-relaxed", MUTED)}>
                      نشكر تفهمكم ونعتذر عن أي إزعاج، ونتطلع للقائكم في مناسبة قادمة بإذن الله.
                    </p>
                  </Panel>
                ) : (
                  <>
                    {inv.rescheduled_from && (
                      <Notice icon={Clock} tone="#B7791F" title="تنبيه: تم تغيير موعد المناسبة" body={inv.reschedule_note || `الموعد الجديد: ${when}`} />
                    )}
                    {reminderActive && (
                      <Notice
                        icon={Clock}
                        tone={theme}
                        title={`تذكير: مناسبتك تبدأ ${hoursLeft > 0 ? inHours(hoursLeft) : inMinutes(minsLeft)}`}
                        body={`${when} — نتشرف بحضورك في الموعد`}
                      />
                    )}
                    {rsvp}
                  </>
                )}
              </motion.div>
            )}
          </div>
        </section>

        {!sealed && (
          <motion.div className="mt-4 space-y-4" {...reveal(0.8)}>
            {/* التفاصيل */}
            <Panel className="py-1">
              <InfoRow icon={CalendarDays} theme={theme} label="الموعد" first>
                {when}
              </InfoRow>
              {inv.venue_name && (
                <InfoRow
                  icon={MapPin}
                  theme={theme}
                  label="المكان"
                  action={inv.venue_map_url ? <ActionLink href={inv.venue_map_url}>الخريطة</ActionLink> : null}
                >
                  {inv.venue_name}
                  {inv.venue_address && <span className={cn("block text-[12px] font-normal", MUTED)}>{inv.venue_address}</span>}
                </InfoRow>
              )}
              {inv.dress_code && (
                <InfoRow icon={Shirt} theme={theme} label="الزي المطلوب">
                  {inv.dress_code}
                </InfoRow>
              )}
              {(inv.contact_whatsapp || inv.contact_phone || inv.contact_email) && (
                <InfoRow icon={Phone} theme={theme} label="للتواصل">
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {inv.contact_whatsapp && (
                      <Chip href={`https://wa.me/${inv.contact_whatsapp.replace(/\D/g, "")}`} icon={MessageCircle} className="bg-[#E8F5EE] text-[#1E7A4C]">
                        واتساب
                      </Chip>
                    )}
                    {inv.contact_phone && (
                      <Chip href={`tel:${inv.contact_phone}`} icon={Phone} className="bg-[#F1ECF5] text-[#492C5A]">
                        <bdi>{inv.contact_phone}</bdi>
                      </Chip>
                    )}
                    {inv.contact_email && (
                      <Chip href={`mailto:${inv.contact_email}`} icon={Mail} className="bg-[#F6F5F8] text-[#1C1524]">
                        {inv.contact_email}
                      </Chip>
                    )}
                  </span>
                </InfoRow>
              )}
            </Panel>

            {/* المرفقات — ملفات ومحتويات المناسبة في مكان منظم */}
            {attachments.length > 0 && (
              <Panel>
                <p className="flex items-center gap-2 text-[14px] font-bold">
                  <Paperclip className="h-4 w-4" style={{ color: theme }} /> مرفقات المناسبة
                </p>
                <div className="mt-3 space-y-2">
                  {attachments.map((a, i) => (
                    <a
                      key={i}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl bg-[#F6F5F8] px-3 py-2.5 text-[13px] transition-colors hover:bg-[#F1ECF5]"
                    >
                      <IconTile icon={ExternalLink} theme={theme} />
                      <span className="flex-1 truncate font-semibold">{a.name}</span>
                      {a.size ? <span className="font-inter text-[11px] text-[#736D7C]">{(a.size / 1024).toFixed(0)} KB</span> : null}
                    </a>
                  ))}
                </div>
              </Panel>
            )}

            {/* الهدايا — قسم مطوي مختصر يُفتح عند الحاجة فقط */}
            {(inv.gift_notes || giftTypes.length > 0) && (
              <Panel className="p-0">
                <button type="button" onClick={() => setGiftOpen(!giftOpen)} aria-expanded={giftOpen} className="flex w-full items-center gap-3 px-5 py-4 text-right">
                  <IconTile icon={Gift} theme={theme} />
                  <span className="flex-1">
                    <span className="block text-[14px] font-bold">الهدايا</span>
                    {giftTypes.length > 0 && !giftOpen && (
                      <span className={cn("block text-[12px]", MUTED)}>{optionsLabel(giftTypes.length)} — اضغط للاطلاع</span>
                    )}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", giftOpen && "rotate-180")} style={{ color: theme }} />
                </button>
                {giftOpen && (
                  <div className="px-5 pb-5">
                    {giftTypes.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {giftTypes.map((t) => {
                          const meta = GIFT_META[t];
                          if (!meta) return null;
                          const active = giftPick === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setGiftPick(active ? null : t)}
                              className={cn("rounded-xl border-2 bg-[#F6F5F8] px-1 py-2 text-center transition-colors", !active && "border-transparent")}
                              style={active ? { borderColor: theme, background: "#FFFFFF" } : undefined}
                            >
                              <span className="block text-lg">{meta.emoji || "•"}</span>
                              <span className="block text-xs font-bold" style={{ color: theme }}>{meta.label}</span>
                              <span className="mt-0.5 block text-[10px] text-[#736D7C]">{meta.amount ? `${meta.amount} ريال` : "باختيارك"}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {giftPick && GIFT_META[giftPick] && (
                      <div className="mt-3 space-y-2 rounded-xl bg-[#F6F5F8] p-3">
                        {GIFT_META[giftPick].amount ? (
                          <p className="text-sm font-bold">
                            {GIFT_META[giftPick].emoji} قيمة الهدية: {GIFT_META[giftPick].amount} ريال
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">نوع الهدية</Label>
                              <Input value={giftOtherType} onChange={(e) => setGiftOtherType(e.target.value)} placeholder="مثال: عطر" className="mt-1 bg-white" />
                            </div>
                            <div>
                              <Label className="text-xs">القيمة (ريال)</Label>
                              <Input type="number" min={1} dir="ltr" value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)} className="mt-1 bg-white" />
                            </div>
                          </div>
                        )}
                        {giftPayMethods.length > 0 && (
                          <div>
                            <p className={cn("mb-1 text-[11px]", MUTED)}>طرق الدفع المقبولة:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {giftPayMethods.map((m) => (
                                <span key={m} className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: theme }}>
                                  {PAY_METHOD_LABELS[m] || m}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {inv.gift_notes && <p className="mt-2 text-sm text-[#1C1524]/80">{inv.gift_notes}</p>}
                  </div>
                )}
              </Panel>
            )}

            <p className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-[#736D7C]">
              <BrandMark className="h-3.5 w-3.5" />
              دعوة عبر نكفيك
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

const swap = (reduce: boolean | null) => ({
  initial: reduce ? false : { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: reduce ? undefined : { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
});

const Stepper = ({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className="grid h-7 w-7 place-items-center rounded-full border border-[#E7E2EC] bg-white text-[#492C5A] transition-colors hover:bg-[#F1ECF5] disabled:opacity-35"
  >
    {children}
  </button>
);

const Notice = ({ icon: Icon, tone, title, body }: { icon: IconType; tone: string; title: string; body?: string | null }) => (
  <div className="flex items-start gap-3 rounded-[18px] px-4 py-3" style={{ background: alpha(tone, 0.1) }}>
    <span className="mt-0.5" style={{ color: tone }}>
      <Icon className="h-5 w-5" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-[14px] font-bold" style={{ color: tone }}>{title}</p>
      {body && <p className={cn("mt-0.5 text-[12px] leading-relaxed", MUTED)}>{body}</p>}
    </div>
  </div>
);

const InfoRow = ({
  icon, theme, label, action, first, children,
}: { icon: IconType; theme: string; label: string; action?: ReactNode; first?: boolean; children: ReactNode }) => (
  <div className={cn("flex items-center gap-3 py-3", !first && "border-t border-[#F0EDF3]")}>
    <IconTile icon={icon} theme={theme} />
    <div className="min-w-0 flex-1">
      <p className="text-[12px] text-[#736D7C]">{label}</p>
      <div className="text-[14px] font-semibold">{children}</div>
    </div>
    {action}
  </div>
);

const ActionLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="flex-none rounded-lg bg-[#F1ECF5] px-2.5 py-1.5 text-[12px] font-bold text-[#492C5A]">
    {children}
  </a>
);

const Chip = ({ href, icon: Icon, className, children }: { href: string; icon: IconType; className: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold", className)}>
    <Icon className="h-3.5 w-3.5" />
    {children}
  </a>
);

export default PrivateInvitation;
