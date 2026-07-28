// إعدادات بوابة الدفع (ميسر Moyasar)
// المفتاح هنا هو مفتاح النشر العام فقط (pk_...) — آمن للمتصفح.
// المفتاح السري (sk_...) يعيش حصراً في أسرار دالة verify-payment على الخادم.

export const MOYASAR_PUBLISHABLE_KEY: string =
  (import.meta.env.VITE_MOYASAR_PUBLISHABLE_KEY as string | undefined) || "";

export const isPaymentsConfigured = () => MOYASAR_PUBLISHABLE_KEY.startsWith("pk_");

/** تحويل السعر بالريال إلى هللات (أصغر وحدة تتعامل بها البوابة) */
export const toHalalas = (priceSar: number) => Math.round(priceSar * 100);

const MOYASAR_CDN = "https://cdn.moyasar.com/mpf/1.15.0";

let loader: Promise<void> | null = null;

/** تحميل مكتبة نموذج الدفع من CDN ميسر مرة واحدة */
export const loadMoyasar = (): Promise<void> => {
  if ((window as any).Moyasar) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `${MOYASAR_CDN}/moyasar.css`;
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = `${MOYASAR_CDN}/moyasar.js`;
    script.onload = () => resolve();
    script.onerror = () => { loader = null; reject(new Error("failed_to_load_moyasar")); };
    document.head.appendChild(script);
  });
  return loader;
};
