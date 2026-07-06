import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// If the app crashes before rendering anything, show the error on screen
// instead of a blank page so failures are diagnosable in production.
const showFatalError = (message: string) => {
  const root = document.getElementById("root");
  if (!root || !document.getElementById("boot-splash")) return;
  root.innerHTML = `
    <div dir="rtl" style="min-height:100vh;padding:32px;background:#fef2f2;color:#7f1d1d;font-family:Cairo,sans-serif">
      <h2 style="margin:0 0 12px;font-size:20px">تعذّر تشغيل التطبيق</h2>
      <p style="margin:0 0 16px">أرسل لقطة من هذه الرسالة للدعم الفني:</p>
      <pre dir="ltr" style="text-align:left;white-space:pre-wrap;background:#fff;padding:16px;border-radius:8px;font-size:13px;overflow:auto">${message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</pre>
    </div>`;
};

window.addEventListener("error", (e) =>
  showFatalError(String(e.error?.stack ?? e.message)),
);
window.addEventListener("unhandledrejection", (e) =>
  showFatalError(String((e.reason as Error)?.stack ?? e.reason)),
);

try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (err) {
  showFatalError(err instanceof Error ? (err.stack ?? err.message) : String(err));
}
