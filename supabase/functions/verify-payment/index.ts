// التحقق من الدفع وإصدار التذكرة — بوابة ميسر (Moyasar)
// المسار الآمن الوحيد لإتمام شراء تذكرة مدفوعة:
// 1) العميل يدفع عبر نموذج ميسر (مفتاح النشر العام فقط في المتصفح)
// 2) بعد التحويل يستدعي العميل هذه الدالة برقم العملية
// 3) الخادم يتحقق من ميسر مباشرة بالمفتاح السري: الحالة paid والمبلغ
//    مطابق لسعر التذكرة الحقيقي في قاعدة البيانات — لا ثقة بأي رقم من العميل
// 4) عند النجاح: إنشاء التسجيل وإصدار QR وتسجيل العملية (idempotent)

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { payment_id, event_id, ticket_id } = await req.json();
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

    // إن سبق التحقق من نفس العملية أعد النتيجة نفسها (idempotent)
    const { data: existing } = await admin
      .from("payments")
      .select("id, status, registration_id")
      .eq("provider_payment_id", payment_id)
      .maybeSingle();
    if (existing?.status === "paid" && existing.registration_id) {
      const { data: reg } = await admin
        .from("registrations")
        .select("qr_code")
        .eq("id", existing.registration_id)
        .single();
      return json({ status: "paid", qr_code: reg?.qr_code });
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
      await admin.from("payments").upsert({
        user_id: user.id,
        event_id,
        ticket_id,
        provider_payment_id: payment_id,
        amount: (payment.amount || 0) / 100,
        currency: payment.currency || "SAR",
        status: payment.status === "paid" ? "failed" : (payment.status === "failed" ? "failed" : "initiated"),
        payment_method: payment.source?.type || null,
        error_message: failReason,
        updated_at: new Date().toISOString(),
      }, { onConflict: "provider_payment_id" });
      return json({ error: failReason, gateway_message: payment.source?.message || null }, 400);
    }

    // الدفع سليم — أنشئ التسجيل (أو استخدم الموجود إن سبق التسجيل)
    let registrationId: string | null = null;
    let qrCode: string | null = null;

    const { data: prevReg } = await admin
      .from("registrations")
      .select("id, qr_code")
      .eq("event_id", event_id)
      .eq("attendee_id", user.id)
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
          attendee_id: user.id,
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

    return json({ status: "paid", qr_code: qrCode });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown_error" }, 500);
  }
});
