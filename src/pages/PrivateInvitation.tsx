import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  Calendar, MapPin, Shirt, Phone, Gift, CheckCircle2, X, Copy,
  MessageCircle, Mail, ExternalLink, Clock, HeartHandshake,
} from "lucide-react";
import DesignPreview from "@/components/design/DesignPreview";
import CustomTemplateRender from "@/components/design/CustomTemplateRender";
import { DEFAULT_OVERLAY } from "@/components/design/CustomTemplateDesigner";

const PrivateInvitation = () => {
  const { token } = useParams<{ token: string }>();
  const [guest, setGuest] = useState<any>(null);
  const [inv, setInv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [companions, setCompanions] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) { setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_invitation_by_token", { _token: token });
      if (error || !data) { setLoading(false); return; }
      const payload = data as any;
      setGuest(payload.guest);
      setInv(payload.invitation);
      setCompanions(payload.guest?.companions_count || 0);
      setLoading(false);
      // ختم أول فتح للدعوة (يتجاهل الخطأ بصمت إن لم تُفعّل الدالة بعد)
      supabase.rpc("mark_invitation_opened" as any, { _token: token }).then(() => {});
    };
    load();
  }, [token]);

  useEffect(() => {
    if (inv) document.title = inv.title + " | دعوة خاصة";
  }, [inv]);

  const confirm = async (status: "confirmed" | "declined") => {
    if (!guest) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("confirm_invitation_rsvp", {
      _token: guest.token,
      _status: status,
      _companions: status === "confirmed" ? companions : 0,
    });
    setSubmitting(false);
    if (error || !data) return toast.error("تعذر حفظ ردك");
    if (status === "confirmed") toast.success("تم تأكيد حضورك ❤");
    else setDeclineModalOpen(true); // الاعتذار يظهر في نافذة منبثقة
    const result = data as any;
    setGuest({
      ...guest,
      rsvp_status: result.rsvp_status,
      companions_count: result.companions_count,
      confirmed_at: new Date().toISOString(),
    });
  };


  if (loading) return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  if (!guest || !inv) return (
    <div className="min-h-screen flex items-center justify-center p-6 font-cairo">
      <div className="text-center">
        <X className="w-12 h-12 text-destructive mx-auto mb-3" />
        <h1 className="font-bold text-xl">رابط الدعوة غير صحيح</h1>
        <p className="text-muted-foreground text-sm mt-2">قد تكون الدعوة محذوفة أو الرابط منتهي</p>
      </div>
    </div>
  );

  const inviteUrl = window.location.href;
  const bg = inv.background_image_url
    ? `url(${inv.background_image_url}) center/cover`
    : `linear-gradient(135deg, ${inv.theme_color}, ${inv.accent_color})`;

  const eventDate = new Date(inv.event_date);

  return (
    <div
      dir="rtl"
      className="min-h-screen py-8 px-4"
      style={{ background: bg, fontFamily: inv.font_family }}
    >
      <div className="max-w-md mx-auto">
        {/* Hero card — custom uploaded template OR generated design */}
        {inv.use_custom_template && inv.custom_template_url ? (
          <CustomTemplateRender
            templateUrl={inv.custom_template_url}
            overlay={(inv.name_overlay as any) || DEFAULT_OVERLAY}
            guest={guest}
            className="mb-4"
          />
        ) : (
          <DesignPreview
            mode="invitation"
            design={{
              theme_color: inv.theme_color,
              accent_color: inv.accent_color,
              background_color: "#FFFFFF",
              text_color: inv.text_color || "#FFFFFF",
              heading_font: inv.font_family || "Cairo",
              body_font: inv.body_font || inv.font_family || "Cairo",
              layout_style: inv.layout_style || "classic",
              ornament_style: inv.ornament_style || "none",
              background_image_url: inv.background_image_url || inv.cover_image_url || null,
              ...((inv.design_extras as any) || {}),
            }}
            title={inv.title}
            subtitle={inv.host_name ? `يتشرف بدعوتكم · ${inv.host_name}` : "دعوة كريمة"}
            body={inv.custom_message || undefined}
            guestName={guest.guest_name}
            className="mb-4"
          />
        )}

        {/* Details card */}
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl overflow-hidden">
          <div className="p-6 space-y-5">

            {/* إشعار الإلغاء — يظهر لكل مدعو فور فتح دعوته */}
            {inv.status === "cancelled" && (
              <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-center">
                <X className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="font-bold text-red-700 text-lg">نعتذر منكم — تم إلغاء المناسبة</p>
                {inv.cancel_reason && (
                  <p className="text-sm text-red-600 mt-1 leading-relaxed">السبب: {inv.cancel_reason}</p>
                )}
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  نشكر تفهمكم ونعتذر عن أي إزعاج، ونتطلع للقائكم في مناسبة قادمة بإذن الله.
                </p>
              </div>
            )}

            {/* إشعار تغيير الموعد — الموعد الجديد معروض في البطاقات أدناه تلقائياً */}
            {inv.status !== "cancelled" && inv.rescheduled_from && (
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-center">
                <Clock className="w-6 h-6 text-amber-600 mx-auto mb-1.5" />
                <p className="font-bold text-amber-800">تنبيه: تم تغيير موعد المناسبة</p>
                {inv.reschedule_note && (
                  <p className="text-xs text-amber-700 mt-1">{inv.reschedule_note}</p>
                )}
              </div>
            )}

            {/* التاريخ والوقت — بطاقتان بارزتان */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-2xl p-4 text-center border-2"
                style={{ borderColor: inv.accent_color + "55", background: inv.accent_color + "0d" }}
              >
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white shadow-md"
                  style={{ background: inv.accent_color }}
                >
                  <Calendar className="w-6 h-6" />
                </div>
                <p className="text-xs text-gray-500 mb-1">التاريخ</p>
                <p className="font-bold text-gray-800 leading-snug">
                  {eventDate.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <div
                className="rounded-2xl p-4 text-center border-2"
                style={{ borderColor: inv.accent_color + "55", background: inv.accent_color + "0d" }}
              >
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white shadow-md"
                  style={{ background: inv.accent_color }}
                >
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-xs text-gray-500 mb-1">الوقت</p>
                <p className="font-bold text-gray-800 text-lg">
                  {eventDate.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 border-t border-b py-4">
              {inv.venue_name && (
                <Row icon={<MapPin className="w-4 h-4" />} color={inv.accent_color} label="الموقع">
                  <p>{inv.venue_name}</p>
                  {inv.venue_address && <p className="text-xs text-gray-500">{inv.venue_address}</p>}
                  {inv.venue_map_url && (
                    <a href={inv.venue_map_url} target="_blank" rel="noreferrer" className="text-xs underline mt-1 inline-flex items-center gap-1" style={{ color: inv.theme_color }}>
                      <ExternalLink className="w-3 h-3" /> فتح في الخرائط
                    </a>
                  )}
                </Row>
              )}
              {inv.dress_code && (
                <Row icon={<Shirt className="w-4 h-4" />} color={inv.accent_color} label="الزي المطلوب">
                  {inv.dress_code}
                </Row>
              )}
              {(inv.contact_phone || inv.contact_whatsapp || inv.contact_email) && (
                <Row icon={<Phone className="w-4 h-4" />} color={inv.accent_color} label="للتواصل">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {inv.contact_whatsapp && (
                      <a href={`https://wa.me/${inv.contact_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 inline-flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> واتساب
                      </a>
                    )}
                    {inv.contact_phone && (
                      <a href={`tel:${inv.contact_phone}`} className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {inv.contact_phone}
                      </a>
                    )}
                    {inv.contact_email && (
                      <a href={`mailto:${inv.contact_email}`} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 inline-flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {inv.contact_email}
                      </a>
                    )}
                  </div>
                </Row>
              )}
            </div>

            {/* Gifts */}
            {(inv.gift_notes || inv.gift_iban) && (
              <div className="rounded-2xl p-4" style={{ background: inv.accent_color + "15" }}>
                <h3 className="font-bold flex items-center gap-1 text-sm" style={{ color: inv.theme_color }}>
                  <Gift className="w-4 h-4" /> الهدايا والتحويلات
                </h3>
                {inv.gift_notes && <p className="text-sm text-gray-700 mt-2">{inv.gift_notes}</p>}
                {inv.gift_iban && (
                  <div className="mt-3 bg-white rounded-xl p-3 text-xs space-y-1">
                    {inv.gift_bank_name && <p><span className="text-gray-500">البنك:</span> {inv.gift_bank_name}</p>}
                    {inv.gift_account_holder && <p><span className="text-gray-500">المستفيد:</span> {inv.gift_account_holder}</p>}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t">
                      <span dir="ltr" className="font-mono">{inv.gift_iban}</span>
                      <button onClick={() => { navigator.clipboard.writeText(inv.gift_iban); toast.success("نسخ IBAN"); }}>
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RSVP — مخفي بالكامل عند إلغاء المناسبة */}
            <div className="border-t pt-5">
              {inv.status === "cancelled" ? (
                <p className="text-center text-sm text-gray-400">أُلغيت هذه المناسبة — لا حاجة لتأكيد الحضور</p>
              ) : guest.rsvp_status === "confirmed" ? (
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 font-bold">
                    <CheckCircle2 className="w-5 h-5" /> تم تأكيد حضورك
                  </div>
                  {guest.companions_count > 0 && (
                    <p className="text-sm text-gray-600">عدد المرافقين: {guest.companions_count}</p>
                  )}
                  <div className="bg-white rounded-2xl p-4 inline-block border-2" style={{ borderColor: inv.accent_color }}>
                    <p className="text-xs text-gray-500 mb-2">QR للدخول</p>
                    <QRCodeSVG value={inviteUrl} size={160} />
                    <p className="text-[10px] text-gray-400 mt-2">يرجى إبراز هذا الرمز عند الباب</p>
                  </div>
                </div>
              ) : guest.rsvp_status === "declined" ? (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-bold">
                    <CheckCircle2 className="w-5 h-5" /> تم تسجيل اعتذارك
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-center font-bold" style={{ color: inv.theme_color }}>هل ستشرفنا بحضورك؟</p>
                  {inv.allow_companions && inv.max_companions > 0 && (
                    <div>
                      <Label className="text-xs">عدد المرافقين (الحد الأقصى {inv.max_companions})</Label>
                      <Input
                        type="number"
                        min={0}
                        max={inv.max_companions}
                        value={companions}
                        onChange={(e) => setCompanions(Math.min(inv.max_companions, Math.max(0, Number(e.target.value))))}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => confirm("confirmed")}
                      disabled={submitting}
                      className="text-white"
                      style={{ background: inv.theme_color }}
                    >
                      <CheckCircle2 className="w-4 h-4 ml-1" /> سأحضر
                    </Button>
                    <Button variant="outline" onClick={() => confirm("declined")} disabled={submitting}>
                      <X className="w-4 h-4 ml-1" /> لن أحضر
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-white/70 mt-6">دعوة عبر نكفيك تيكت</p>
      </div>

      {/* نافذة تأكيد الاعتذار */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl text-center font-cairo">
          <div className="py-4">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-white shadow-lg"
              style={{ background: inv.theme_color }}
            >
              <HeartHandshake className="w-8 h-8" />
            </div>
            <h2 className="font-bold text-xl text-gray-800 mb-2">تم تسجيل اعتذارك بنجاح</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              نشكر لك إبلاغنا، ونتمنى رؤيتك في مناسبة قادمة.
            </p>
            <Button
              className="mt-5 rounded-full px-8 text-white"
              style={{ background: inv.theme_color }}
              onClick={() => setDeclineModalOpen(false)}
            >
              حسناً
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({ icon, label, color, children }: any) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white" style={{ background: color }}>
      {icon}
    </div>
    <div className="flex-1 text-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <div className="text-gray-800">{children}</div>
    </div>
  </div>
);

export default PrivateInvitation;
