// توليد بطاقة Apple Wallet (ملف .pkpass) لتذكرة المستخدم في فعالية محددة.
// كل فعالية = بطاقة مستقلة بهويتها (اسم، ألوان حسب التصنيف، بيانات الفعالية)
// مع بيانات المستخدم الثابتة (الاسم، التصنيف، رمز QR للدخول).
//
// يتطلب التفعيل شهادة مطور Apple في أسرار الدالة:
//   APPLE_PASS_CERT      شهادة Pass Type ID بصيغة PEM
//   APPLE_PASS_KEY       المفتاح الخاص للشهادة بصيغة PEM
//   APPLE_WWDR_CERT      شهادة Apple WWDR الوسيطة بصيغة PEM
//   APPLE_PASS_TYPE_ID   مثال: pass.sa.nakfeek.ticket
//   APPLE_TEAM_ID        معرف فريق مطور Apple

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import forge from "https://esm.sh/node-forge@1.3.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// أيقونات البطاقة (بنفسجي نكفيك) — مضمّنة كي لا تحتاج الدالة أي ملفات خارجية
const ICON_B64 = "iVBORw0KGgoAAAANSUhEUgAAAB0AAAAdCAIAAADZ8fBYAAAAJklEQVR42mPw1ImiBWIYNXfU3FFzR80dNXfU3FFzR80dNXdQmQsAG6WoJuL3kS8AAAAASUVORK5CYII=";
const ICON2X_B64 = "iVBORw0KGgoAAAANSUhEUgAAADoAAAA6CAIAAABu2d1/AAAARklEQVR42u3OAQkAAAgDsAeyiBXsH8Qch8ECLDtXJLq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6PR6rl6Cz6dNb3QAAAABJRU5ErkJggg==";

type Tier = "vvip" | "vip" | "speaker" | "organizer" | "regular";
const classify = (nameAr?: string | null, nameEn?: string | null, type?: string | null): Tier => {
  const n = `${nameAr || ""} ${nameEn || ""}`.toUpperCase();
  if (n.includes("VVIP")) return "vvip";
  if (n.includes("متحدث") || n.includes("SPEAKER")) return "speaker";
  if (n.includes("منظم") || n.includes("ORGANIZER") || n.includes("STAFF")) return "organizer";
  if (type === "vip" || n.includes("VIP")) return "vip";
  return "regular";
};

const TIER_STYLE: Record<Tier, { label: string; bg: string; fg: string; labelColor: string }> = {
  vvip:      { label: "VVIP", bg: "rgb(146,107,10)", fg: "rgb(255,248,225)", labelColor: "rgb(255,224,130)" },
  vip:       { label: "VIP", bg: "rgb(73,44,90)", fg: "rgb(255,255,255)", labelColor: "rgb(216,180,254)" },
  speaker:   { label: "متحدث", bg: "rgb(13,94,88)", fg: "rgb(240,253,250)", labelColor: "rgb(153,246,228)" },
  organizer: { label: "منظم", bg: "rgb(30,64,175)", fg: "rgb(239,246,255)", labelColor: "rgb(191,219,254)" },
  regular:   { label: "عادي", bg: "rgb(55,35,70)", fg: "rgb(255,255,255)", labelColor: "rgb(209,196,233)" },
};

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { registration_id } = await req.json();
    if (!registration_id) return json({ error: "missing_params" }, 400);

    const certPem = Deno.env.get("APPLE_PASS_CERT");
    const keyPem = Deno.env.get("APPLE_PASS_KEY");
    const wwdrPem = Deno.env.get("APPLE_WWDR_CERT");
    const passTypeId = Deno.env.get("APPLE_PASS_TYPE_ID");
    const teamId = Deno.env.get("APPLE_TEAM_ID");
    if (!certPem || !keyPem || !wwdrPem || !passTypeId || !teamId) {
      return json({ error: "wallet_not_configured" }, 501);
    }

    // هوية المستخدم
    const authHeader = req.headers.get("Authorization") || "";
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await anon.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);
    const user = userData.user;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: reg } = await admin
      .from("registrations")
      .select("id, qr_code, attendee_id, event_id, ticket_id, checked_in_at")
      .eq("id", registration_id)
      .maybeSingle();
    if (!reg || reg.attendee_id !== user.id) return json({ error: "not_found" }, 404);

    const [{ data: event }, { data: ticket }, { data: profile }, { data: np }] = await Promise.all([
      admin.from("events").select("title_ar, title_en, start_date, venue_name, is_online").eq("id", reg.event_id).single(),
      reg.ticket_id ? admin.from("tickets").select("name_ar, name_en, type").eq("id", reg.ticket_id).maybeSingle() : Promise.resolve({ data: null }),
      admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      admin.from("networking_profiles").select("connect_code").eq("user_id", user.id).maybeSingle(),
    ]);
    if (!event) return json({ error: "event_not_found" }, 404);

    const tier = classify(ticket?.name_ar, ticket?.name_en, ticket?.type);
    const style = TIER_STYLE[tier];
    const origin = req.headers.get("origin") || "https://nakfik.vercel.app";
    // رمز الدخول: الرابط الموحد إن وُجد (يدعمه الماسح) وإلا رمز التذكرة
    const qrMessage = np?.connect_code
      ? `${origin}/connect/${np.connect_code}?event=${reg.event_id}`
      : reg.qr_code;

    const pass = {
      formatVersion: 1,
      passTypeIdentifier: passTypeId,
      teamIdentifier: teamId,
      serialNumber: reg.id,
      organizationName: "Nakfeek Ticket",
      description: event.title_ar,
      logoText: "نكفيك تيكت",
      backgroundColor: style.bg,
      foregroundColor: style.fg,
      labelColor: style.labelColor,
      relevantDate: event.start_date,
      barcodes: [{
        format: "PKBarcodeFormatQR",
        message: qrMessage,
        messageEncoding: "iso-8859-1",
        altText: style.label,
      }],
      eventTicket: {
        primaryFields: [
          { key: "event", label: "الفعالية", value: event.title_ar },
        ],
        secondaryFields: [
          { key: "date", label: "التاريخ", value: new Date(event.start_date).toLocaleDateString("ar-SA", { dateStyle: "medium" }), textAlignment: "PKTextAlignmentRight" },
          { key: "venue", label: "الموقع", value: event.is_online ? "أونلاين" : (event.venue_name || "—"), textAlignment: "PKTextAlignmentLeft" },
        ],
        auxiliaryFields: [
          { key: "name", label: "الاسم", value: profile?.full_name || "—", textAlignment: "PKTextAlignmentRight" },
          { key: "tier", label: "التصنيف", value: style.label, textAlignment: "PKTextAlignmentLeft" },
        ],
        backFields: [
          { key: "ticket", label: "التذكرة", value: ticket?.name_ar || "تذكرة" },
          { key: "status", label: "الحالة", value: reg.checked_in_at ? "تم الحضور" : "مؤكد الحضور" },
          { key: "link", label: "بطاقة التواصل", value: qrMessage },
        ],
      },
    };

    // بناء الملفات وتوقيعها
    const files: Record<string, Uint8Array> = {
      "pass.json": new TextEncoder().encode(JSON.stringify(pass)),
      "icon.png": b64ToBytes(ICON_B64),
      "icon@2x.png": b64ToBytes(ICON2X_B64),
      "logo.png": b64ToBytes(ICON2X_B64),
    };

    const manifest: Record<string, string> = {};
    for (const [name, bytes] of Object.entries(files)) {
      const md = forge.md.sha1.create();
      md.update(forge.util.binary.raw.encode(bytes), "raw" as any);
      manifest[name] = md.digest().toHex();
    }
    const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));

    // توقيع PKCS#7 منفصل على manifest.json
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(forge.util.binary.raw.encode(manifestBytes));
    const cert = forge.pki.certificateFromPem(certPem);
    const wwdr = forge.pki.certificateFromPem(wwdrPem);
    const key = forge.pki.privateKeyFromPem(keyPem);
    p7.addCertificate(wwdr);
    p7.addCertificate(cert);
    p7.addSigner({
      key,
      certificate: cert,
      digestAlgorithm: forge.pki.oids.sha1,
      authenticatedAttributes: [
        { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
        { type: forge.pki.oids.messageDigest },
        { type: forge.pki.oids.signingTime, value: new Date() as any },
      ],
    });
    p7.sign({ detached: true });
    const signatureDer = forge.asn1.toDer(p7.toAsn1()).getBytes();
    const signatureBytes = Uint8Array.from(signatureDer, (c: string) => c.charCodeAt(0));

    const zip = new JSZip();
    for (const [name, bytes] of Object.entries(files)) zip.file(name, bytes);
    zip.file("manifest.json", manifestBytes);
    zip.file("signature", signatureBytes);
    const pkpass = await zip.generateAsync({ type: "uint8array" });

    return new Response(pkpass, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="nakfeek-${reg.id}.pkpass"`,
      },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown_error" }, 500);
  }
});
