// ترجمة محتوى قاعدة البيانات المعروف (ميزات الباقات، أسماء التذاكر الشائعة).
// هذه النصوص يدخلها الأدمن/المنظّم بالعربية وتُخزّن كما هي؛ عند عرض الواجهة
// بالإنجليزية نترجم المطابقات المعروفة ونُبقي أي نص غير معروف كما هو.

const knownContent: Record<string, string> = {
  // ميزات باقات الاشتراك
  "فعاليات غير محدودة": "Unlimited events",
  "فعالية واحدة": "One event",
  "مسجل لكل فعالية 500": "500 registrants per event",
  "500 مسجل لكل فعالية": "500 registrants per event",
  "مسجلين غير محدود": "Unlimited registrants",
  "تقارير متقدمة": "Advanced reports",
  "تقارير أساسية": "Basic reports",
  "فريق عمل": "Team members",
  "إشعارات واتساب": "WhatsApp notifications",
  "واتساب غير محدود": "Unlimited WhatsApp",
  "كل مميزات الاحترافي": "Everything in Pro",
  "كل مميزات البداية": "Everything in Starter",
  "دعم أولوية": "Priority support",
  "دعم فني": "Technical support",
  "شهادات حضور": "Attendance certificates",
  "تسجيل دخول QR": "QR check-in",
  "دعوات خاصة": "Private invitations",
  // ميزات باقات القاعات
  "إدارة حجوزات أساسية": "Basic booking management",
  "صفحة حجز عامة": "Public booking page",
  "رسالة واتساب 50": "50 WhatsApp messages",
  "50 رسالة واتساب": "50 WhatsApp messages",
  "واتساب 500 رسالة": "500 WhatsApp messages",
  "500 رسالة واتساب": "500 WhatsApp messages",
  "حجوزات غير محدودة": "Unlimited bookings",
  "مخطط أرضية": "Floor plan",
  "طاقم عمل": "Staff members",
  "كل مميزات المتقدم": "Everything in Advanced",
  "كل مميزات الأساسي": "Everything in Basic",
  "موقع مصغر": "Mini website",
  // أسماء التذاكر الشائعة
  "تذكرة عادية": "Regular Ticket",
  "تذكرة مجانية": "Free Ticket",
  "تذكرة ذهبية": "Gold Ticket",
  "تذكرة فضية": "Silver Ticket",
  "تذكرة VIP": "VIP Ticket",
  "تذكرة كبار الشخصيات": "VIP Ticket",
  "تذكرة مبكرة": "Early Bird Ticket",
  "تذكرة طالب": "Student Ticket",
};

// يترجم نص محتوى معروفاً عند العرض بالإنجليزية، ويعيده كما هو في غير ذلك
export const translateContent = (text: string, lang: string): string => {
  if (lang === "ar" || !text) return text;
  return knownContent[text.trim()] ?? text;
};
