// قوائم مسارات التطبيق المستخدمة في اختبارات الصفحات (e2e/pages.spec.ts).
// قاعدة العمل: أي صفحة جديدة تُضاف في src/App.tsx يجب إضافتها هنا أيضاً،
// وإلا فلن يشملها الاختبار.

type RouteEntry = { path: string; name: string };

// صفحات عامة تفتح بدون تسجيل دخول ويجب أن تعرض محتواها كاملاً.
export const PUBLIC_ROUTES: RouteEntry[] = [
  { path: "/", name: "الصفحة الرئيسية" },
  { path: "/events", name: "سوق الفعاليات" },
  { path: "/favorites", name: "المفضلة" },
  { path: "/login", name: "تسجيل الدخول" },
  { path: "/register", name: "إنشاء حساب" },
  { path: "/forgot-password", name: "استعادة كلمة المرور" },
  { path: "/reset-password", name: "تعيين كلمة مرور جديدة" },
  { path: "/register-provider", name: "تسجيل مزود خدمة" },
];

// صفحات عامة تعتمد على معرّف/رمز في الرابط. نزورها بقيم وهمية ونتأكد
// أنها تعرض حالة لطيفة (غير موجود / رمز غير صالح) بدل الانهيار.
export const PUBLIC_PARAM_ROUTES: RouteEntry[] = [
  { path: "/events/00000000-0000-0000-0000-000000000000", name: "تفاصيل فعالية غير موجودة" },
  { path: "/o/00000000-0000-0000-0000-000000000000", name: "ملف منظّم غير موجود" },
  { path: "/rsvp/invalid-test-token", name: "تأكيد حضور برمز غير صالح" },
  { path: "/connect/invalid-test-code", name: "بطاقة تواصل برمز غير صالح" },
  { path: "/invite/invalid-test-token", name: "دعوة خاصة برمز غير صالح" },
  { path: "/certificate/invalid-test-token", name: "شهادة برمز غير صالح" },
];

// صفحات محمية: زيارتها بدون تسجيل دخول يجب أن تعيد التوجيه إلى /login.
export const PROTECTED_ROUTES: RouteEntry[] = [
  // صفحات الحضور
  { path: "/my-tickets", name: "تذاكري" },
  { path: "/my/profile", name: "ملفي الشخصي" },
  { path: "/my/profile/networking", name: "ملف التواصل" },
  { path: "/my/connections", name: "معارفي" },
  { path: "/my/notifications", name: "إشعاراتي" },
  // لوحة المنظّم
  { path: "/dashboard", name: "لوحة المنظّم" },
  { path: "/dashboard/events", name: "فعالياتي" },
  { path: "/dashboard/events/create", name: "إنشاء فعالية" },
  { path: "/dashboard/events/test-id/edit", name: "تعديل فعالية" },
  { path: "/dashboard/events/test-id/guests", name: "ضيوف الفعالية" },
  { path: "/dashboard/events/test-id/checkpoints", name: "نقاط التحقق" },
  { path: "/dashboard/events/test-id/heatmap", name: "خريطة الحضور" },
  { path: "/dashboard/events/test-id/featured-cards", name: "البطاقات المميزة" },
  { path: "/dashboard/check-in", name: "تسجيل الدخول للفعالية" },
  { path: "/dashboard/settings", name: "إعدادات المنظّم" },
  { path: "/dashboard/notifications", name: "إشعارات المنظّم" },
  { path: "/dashboard/team", name: "فريق العمل" },
  { path: "/dashboard/reports", name: "التقارير" },
  { path: "/dashboard/earnings", name: "الأرباح" },
  { path: "/dashboard/subscription", name: "الاشتراك" },
  { path: "/dashboard/services", name: "سوق الخدمات" },
  { path: "/dashboard/discounts", name: "خصومات الشركاء" },
  { path: "/dashboard/invitations", name: "الدعوات الخاصة" },
  { path: "/dashboard/guest-lists", name: "قوائم الضيوف" },
  { path: "/dashboard/certificates", name: "تصاميم الشهادات" },
  // لوحة الأدمن
  { path: "/admin", name: "لوحة الأدمن" },
  { path: "/admin/pending", name: "الفعاليات المعلقة" },
  { path: "/admin/events", name: "كل الفعاليات" },
  { path: "/admin/events/create", name: "إنشاء فعالية (أدمن)" },
  { path: "/admin/organizers", name: "المنظّمون" },
  { path: "/admin/organizers/test-id/events", name: "فعاليات منظّم" },
  { path: "/admin/users", name: "كل المستخدمين" },
  { path: "/admin/users/invite", name: "دعوة مستخدم" },
  { path: "/admin/team", name: "فريق الأدمن" },
  { path: "/admin/subscriptions", name: "الاشتراكات" },
  { path: "/admin/analytics", name: "التحليلات" },
  { path: "/admin/announcements", name: "التعميمات" },
  { path: "/admin/finance", name: "المالية" },
  { path: "/admin/heatmap", name: "خريطة الحضور (أدمن)" },
  { path: "/admin/provider-categories", name: "تصنيفات المزودين" },
  { path: "/admin/service-providers", name: "مزودو الخدمات" },
  { path: "/admin/service-requests", name: "طلبات الخدمات" },
  { path: "/admin/partner-brands", name: "العلامات الشريكة" },
  { path: "/admin/featured-services", name: "الخدمات المميزة" },
  { path: "/admin/private-invitations", name: "الدعوات الخاصة (أدمن)" },
];
