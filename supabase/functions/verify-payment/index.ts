// التحقق من الدفع وإصدار التذكرة — بوابة ميسر (Moyasar)
// المسار الآمن الوحيد لإتمام شراء تذكرة مدفوعة:
// 1) العميل يدفع عبر نموذج ميسر (مفتاح النشر العام فقط في المتصفح)
// 2) بعد التحويل يستدعي العميل هذه الدالة برقم العملية
// 3) الخادم يتحقق من ميسر مباشرة بالمفتاح السري: الحالة paid والمبلغ
//    مطابق لسعر التذكرة الحقيقي في قاعدة البيانات — لا ثقة بأي رقم من العميل
// 4) عند النجاح: إنشاء التسجيل وإصدار QR وتسجيل العملية (idempotent)
// 5) الإهداء: إن أُرسل gift_recipient_id تُصدر التذكرة باسم المستلم
//    ويُشعَر الطرفان — المشتري يبقى صاحب سجل الدفع
// 6) إهداء لمن لا يملك حساباً (gift_recipient_phone): تُحفظ الهدية معلّقة
//    في ticket_gifts ويُرسل رابط الاستلام لجوال المستلم عبر واتساب

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const KARZOUN_API_URL = "https://api.karzoun.app/CloudApi.php";

// توحيد رقم الجوال السعودي للصيغة الدولية: 05xxxxxxxx → 9665xxxxxxxx
const normalizePhone = (raw: string): string | null => {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("05")) d = "966" + d.slice(1);
  else if (d.length === 9 && d.startsWith("5")) d = "966" + d;
  return d.length >= 10 && d.length <= 15 ? d : null;
};

// إرسال واتساب عبر حساب المنصة (كرزون) — false إن لم يكن مُعدّاً أو فشل
const sendPlatformWhatsApp = async (to: string, message: string): Promise<boolean> => {
  const appKey = Deno.env.get("KARZOUN_APP_KEY");
  const authKey = Deno.env.get("KARZOUN_AUTH_KEY");
  if (!appKey || !authKey) return false;
  try {
    const url = new URL(KARZOUN_API_URL);
    url.searchParams.set("appkey", appKey);
    url.searchParams.set("authkey", authKey);
    url.searchParams.set("to", to);
    url.searchParams.set("message", message);
    const res = await fetch(url.toString(), { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
};

const giftWhatsAppText = (recipientName: string, buyerName: string, eventTitle: string, note: string, link: string) =>
  `مرحباً ${recipientName} 🎁\n` +
  `أهداك ${buyerName} تذكرة لحضور "${eventTitle}" عبر نكفيك.` +
  (note ? `\nرسالته: «${note}»` : "") +
  `\n\nلاستلام تذكرتك ورمز الدخول افتح الرابط وسجّل حسابك:\n${link}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      payment_id, event_id, ticket_id,
      gift_recipient_id, gift_recipient_phone, gift_recipient_name, gift_message, app_origin,
    } = await req.json();
    if (!payment_id || !event_id || !ticket_id) {
      return json({ error: "missing_params" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const moyasarKey = Deno.env.get("MOYASAR_SECRET_KEY");
    if (!moyasarKey) return json({ error: "gateway_not_configured" }, 500);

    // هوية المستخدم من التوكن المرسل مع الطلب
    const authHeader = req.headers.get("Authorization") || "";
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const user = userData.user;

    const admin = createClient(supabaseUrl, serviceKey);

    // صاحب التذكرة: المشتري نفسه أو المستلم في حالة الإهداء
    let attendeeId = user.id;
    if (gift_recipient_id) {
      if (gift_recipient_id === user.id) return json({ error: "gift_to_self" }, 400);
      const { data: recipient } = await admin
        .from("profiles")
        .select("id")
        .eq("id", gift_recipient_id)
        .maybeSingle();
      if (!recipient) return json({ error: "gift_recipient_not_found" }, 400);
      attendeeId = recipient.id;
    }
    const giftNote = typeof gift_message === "string" ? gift_message.trim().slice(0, 300) : "";

    // إهداء لشخص بلا حساب: يُحدد بجواله واسمه، والتذكرة تصدر عند الاستلام
    let pendingGift: { phone: string; name: string } | null = null;
    if (!gift_recipient_id && gift_recipient_phone) {
      const phone = normalizePhone(String(gift_recipient_phone));
      const name = typeof gift_recipient_name === "string" ? gift_recipient_name.trim().slice(0, 80) : "";
      if (!phone || !name) return json({ error: "gift_recipient_invalid" }, 400);
      pendingGift = { phone, name };
    }
    // رابط الاستلام يُرسل من رقم المنصة — SITE_URL (إن ضُبط) يمنع توجيهه لنطاق آخر
    const origin = (Deno.env.get("SITE_URL") ||
      (typeof app_origin === "string" && /^https?:\/\//.test(app_origin)
        ? app_origin
        : `https://${req.headers.get("host")}`)).replace(/\/$/, "");
    const giftLink = (token: string) => `${origin}/gift/${token}`;

    // إن سبق التحقق من نفس العملية أعد النتيجة نفسها (idempotent)
    const { data: existing } = await admin
      .from("payments")
      .select("id, status, registration_id")
      .eq("provider_payment_id", payment_id)
      .maybeSingle();
    if (existing?.status === "paid" && existing.registration_id) {
      const { data: reg } = await admin
        .from("registrations")
        .select("qr_code, attendee_id")
        .eq("id", existing.registration_id)
        .single();
      if (reg && reg.attendee_id !== user.id) return json({ status: "paid", gifted: true });
      return json({ status: "paid", qr_code: reg?.qr_code });
    }
    if (existing?.status === "paid") {
      const { data: gift } = await admin
        .from("ticket_gifts")
        .select("claim_token, whatsapp_sent")
        .eq("provider_payment_id", payment_id)
        .maybeSingle();
      if (gift) {
        return json({
          status: "paid",
          gifted: true,
          pending: true,
          gift_link: giftLink(gift.claim_token),
          whatsapp_sent: gift.whatsapp_sent,
        });
      }
    }

    // جلب العملية من ميسر بالمفتاح السري — المصدر الوحيد للحقيقة
    const mres = await fetch(`https://api.moyasar.com/v1/payments/${payment_id}`, {
      headers: { Authorization: "Basic " + btoa(moyasarKey + ":") },
    });
    if (!mres.ok) return json({ error: "payment_not_found" }, 404);
    const payment = await mres.json();

    // سعر التذكرة الحقيقي من قاعدة البيانات
    const { data: ticket } = await admin
      .from("tickets")
      .select("id, event_id, price, is_active")
      .eq("id", ticket_id)
      .single();
    if (!ticket || ticket.event_id !== event_id) return json({ error: "ticket_mismatch" }, 400);

    const expectedHalalas = Math.round(Number(ticket.price) * 100);
    const failReason =
      payment.status !== "paid" ? `payment_status_${payment.status}` :
      payment.amount !== expectedHalalas ? "amount_mismatch" :
      (payment.currency || "SAR") !== "SAR" ? "currency_mismatch" :
      payment.metadata?.user_id && payment.metadata.user_id !== user.id ? "user_mismatch" :
      null;

    if (failReason) {
      // تسجيل المحاولة الفاشلة/الملغاة في سجل المدفوعات — بدون إنشاء أي تذكرة
      const failedStatuses = ["failed", "voided", "canceled", "cancelled"];
      await admin.from("payments").upsert({
        user_id: user.id,
        event_id,
        ticket_id,
        provider_payment_id: payment_id,
        amount: (payment.amount || 0) / 100,
        currency: payment.currency || "SAR",
        status: payment.status === "paid" || failedStatuses.includes(payment.status)
          ? "failed"
          : "initiated",
        payment_method: payment.source?.type || null,
        error_message: failReason,
        updated_at: new Date().toISOString(),
      }, { onConflict: "provider_payment_id" });
      return json({ error: failReason, gateway_message: payment.source?.message || null }, 400);
    }

    // الدفع سليم + إهداء لشخص بلا حساب: هدية معلّقة برابط استلام
    if (pendingGift) {
      await admin.from("payments").upsert({
        user_id: user.id,
        event_id,
        ticket_id,
        provider_payment_id: payment_id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: "paid",
        payment_method: payment.source?.type || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "provider_payment_id" });

      const { data: gift, error: giftErr } = await admin
        .from("ticket_gifts")
        .upsert({
          buyer_id: user.id,
          event_id,
          ticket_id,
          provider_payment_id: payment_id,
          amount_paid: ticket.price,
          recipient_name: pendingGift.name,
          recipient_phone: pendingGift.phone,
          message: giftNote || null,
        }, { onConflict: "provider_payment_id", ignoreDuplicates: false })
        .select("id, claim_token")
        .single();
      if (giftErr || !gift) return json({ error: "gift_failed", detail: giftErr?.message }, 500);

      const [{ data: evt }, { data: buyer }] = await Promise.all([
        admin.from("events").select("title_ar").eq("id", event_id).single(),
        admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      ]);
      const eventTitle = evt?.title_ar || "الفعالية";
      const buyerName = buyer?.full_name?.trim() || "أحد أصدقائك";
      const link = giftLink(gift.claim_token);
      const text = giftWhatsAppText(pendingGift.name, buyerName, eventTitle, giftNote, link);

      const sent = await sendPlatformWhatsApp(pendingGift.phone, text);
      if (sent) await admin.from("ticket_gifts").update({ whatsapp_sent: true }).eq("id", gift.id);

      await admin.from("in_app_notifications").insert({
        user_id: user.id,
        title: "تم تجهيز هديتك 🎁",
        body: sent
          ? `أرسلنا رابط استلام تذكرة "${eventTitle}" إلى ${pendingGift.name} على واتساب.`
          : `تم تأكيد دفعك — أرسل رابط استلام تذكرة "${eventTitle}" إلى ${pendingGift.name}: ${link}`,
        link: "/my-tickets",
      });

      return json({
        status: "paid",
        gifted: true,
        pending: true,
        gift_link: link,
        whatsapp_sent: sent,
        // بديل يدوي إن لم يُرسل تلقائياً: يفتح واتساب المشتري برسالة جاهزة
        share_link: `https://wa.me/${pendingGift.phone}?text=${encodeURIComponent(text)}`,
      });
    }

    // الدفع سليم — أنشئ التسجيل (أو استخدم الموجود إن سبق التسجيل)
    let registrationId: string | null = null;
    let qrCode: string | null = null;

    const { data: prevReg } = await admin
      .from("registrations")
      .select("id, qr_code")
      .eq("event_id", event_id)
      .eq("attendee_id", attendeeId)
      .maybeSingle();

    if (prevReg) {
      registrationId = prevReg.id;
      qrCode = prevReg.qr_code;
      await admin
        .from("registrations")
        .update({ payment_status: "paid", amount_paid: ticket.price, ticket_id })
        .eq("id", prevReg.id);
    } else {
      const { data: reg, error: regErr } = await admin
        .from("registrations")
        .insert({
          event_id,
          attendee_id: attendeeId,
          ticket_id,
          status: "confirmed",
          payment_status: "paid",
          amount_paid: ticket.price,
        })
        .select("id, qr_code")
        .single();
      if (regErr) return json({ error: "registration_failed", detail: regErr.message }, 500);
      registrationId = reg.id;
      qrCode = reg.qr_code;
    }

    await admin.from("payments").upsert({
      user_id: user.id,
      event_id,
      ticket_id,
      registration_id: registrationId,
      provider_payment_id: payment_id,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: "paid",
      payment_method: payment.source?.type || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider_payment_id" });

    // إرسال التذكرة للمستخدم: إشعار داخل المنصة برابط تذاكره (تحمل رمز QR)
    const { data: evt } = await admin
      .from("events")
      .select("title_ar")
      .eq("id", event_id)
      .single();
    const eventTitle = evt?.title_ar || "الفعالية";

    if (attendeeId !== user.id) {
      const { data: buyer } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      const buyerName = buyer?.full_name?.trim() || "أحد أصدقائك";
      await admin.from("in_app_notifications").insert([
        {
          user_id: attendeeId,
          title: "وصلتك تذكرة هدية 🎁",
          body: `أهداك ${buyerName} تذكرة لحضور "${eventTitle}"` +
            (giftNote ? ` — رسالته: «${giftNote}»` : "") +
            " — تجد تذكرتك ورمز QR في صفحة تذاكري.",
          link: "/my-tickets",
        },
        {
          user_id: user.id,
          title: "تم إرسال هديتك 🎁",
          body: `تم تأكيد دفعك وإصدار تذكرة "${eventTitle}" باسم المستلم، وأرسلنا له إشعاراً بها.`,
          link: "/my-tickets",
        },
      ]);
      // رمز الدخول يخص المستلم وحده — لا يُعاد للمشتري
      return json({ status: "paid", gifted: true });
    }

    await admin.from("in_app_notifications").insert({
      user_id: user.id,
      title: "تم إصدار تذكرتك 🎫",
      body: `تم تأكيد دفعك وحجز مقعدك في "${eventTitle}" — تجد تذكرتك ورمز QR في صفحة تذاكري.`,
      link: "/my-tickets",
    });

    return json({ status: "paid", qr_code: qrCode });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown_error" }, 500);
  }
});
