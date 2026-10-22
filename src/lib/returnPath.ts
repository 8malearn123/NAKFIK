// مسار الرجوع بعد تسجيل الدخول/إنشاء الحساب (?return=/...) — مسارات داخلية فقط
export const getReturnPath = (search: string): string | null => {
  const value = new URLSearchParams(search).get("return");
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
};
