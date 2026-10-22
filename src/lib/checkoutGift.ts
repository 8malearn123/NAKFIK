// بيانات إهداء التذكرة — تُحفظ في صفحة الدفع قبل التحويل لبوابة الدفع
// وتُقرأ في صفحة نتيجة العملية لإرسالها للخادم مع رقم العملية.
// التحقق الفعلي من المستلم يتم في الخادم (verify-payment).

const GIFT_STORAGE_KEY = "nakfik_checkout_gift";

export interface PendingGift {
  eventId: string;
  ticketId: string;
  // حساب المستلم في نكفيك، أو null إن لم يكن لديه حساب (تُرسل الهدية لجواله)
  recipientId: string | null;
  recipientPhone: string | null;
  recipientName: string;
  message: string;
}

export const savePendingGift = (gift: PendingGift | null) => {
  try {
    if (gift) sessionStorage.setItem(GIFT_STORAGE_KEY, JSON.stringify(gift));
    else sessionStorage.removeItem(GIFT_STORAGE_KEY);
  } catch {
    /* التخزين غير متاح — يُكمل الشراء كتذكرة شخصية */
  }
};

export const readPendingGift = (eventId: string | null, ticketId: string | null): PendingGift | null => {
  try {
    const raw = sessionStorage.getItem(GIFT_STORAGE_KEY);
    if (!raw) return null;
    const gift = JSON.parse(raw) as PendingGift;
    return gift.eventId === eventId && gift.ticketId === ticketId ? gift : null;
  } catch {
    return null;
  }
};
