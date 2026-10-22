// وضع تجريبي لإهداء التذاكر — يعمل في المتصفح فقط بدون قاعدة بيانات أو دفع.
// بيانات الهدية تُحمل داخل رابط الاستلام نفسه حتى يفتحه المستلم من جواله.
// لا يُصدر أي تذكرة حقيقية ولا يُخصم أي مبلغ.

export const DEMO_EVENT = {
  id: "demo",
  title_ar: "مؤتمر التسويق الرقمي",
  title_en: "Digital Marketing Conference",
  start_date: "2026-11-24T16:00:00Z",
  venue_name: "فندق الريتز كارلتون",
  is_online: false,
  cover_image_url: null,
};

export const DEMO_TICKET = {
  id: "vip",
  name_ar: "تذكرة VIP",
  name_en: "VIP Ticket",
  price: 350,
};

export interface DemoGift {
  recipientName: string;
  buyerName: string;
  message: string;
}

// base64url لنص UTF-8 (العربي) حتى يكون الرابط صالحاً في واتساب
export const encodeDemoGift = (gift: DemoGift): string => {
  const bytes = new TextEncoder().encode(JSON.stringify([gift.recipientName, gift.buyerName, gift.message]));
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const decodeDemoGift = (token: string): DemoGift | null => {
  try {
    const bin = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
    const [recipientName, buyerName, message] = JSON.parse(
      new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))),
    );
    return typeof recipientName === "string" ? { recipientName, buyerName: buyerName || "", message: message || "" } : null;
  } catch {
    return null;
  }
};

// نفس نص رسالة واتساب في دالة الخادم verify-payment
export const giftWhatsAppText = (recipientName: string, buyerName: string, eventTitle: string, note: string, link: string) =>
  `مرحباً ${recipientName} 🎁\n` +
  `أهداك ${buyerName} تذكرة لحضور "${eventTitle}" عبر نكفيك.` +
  (note ? `\nرسالته: «${note}»` : "") +
  `\n\nلاستلام تذكرتك ورمز الدخول افتح الرابط وسجّل حسابك:\n${link}`;

// تحويل 05xxxxxxxx إلى 9665xxxxxxxx لروابط wa.me
export const toWhatsAppNumber = (raw: string): string => {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("05")) d = "966" + d.slice(1);
  else if (d.length === 9 && d.startsWith("5")) d = "966" + d;
  return d;
};
