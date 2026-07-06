import { defineConfig, devices } from "@playwright/test";

// اختبارات الصفحات تعمل على نسخة الإنتاج المبنية (dist) عبر vite preview،
// وهي أقرب ما يكون لما ينشره Vercel فعلياً.
// التشغيل: npm run test:pages  (يبني ثم يختبر)
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    // في البيئات التي توفّر متصفحاً جاهزاً، مرِّر مساره عبر هذا المتغير.
    launchOptions: process.env.CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
      : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx vite preview --port 4173 --host 127.0.0.1 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
