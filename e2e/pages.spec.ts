import { expect, test, type Page } from "@playwright/test";
import { DEMO_ACCOUNTS_ON_LOGIN } from "../src/lib/phase";
import { PROTECTED_ROUTES, PUBLIC_PARAM_ROUTES, PUBLIC_ROUTES } from "./routes";

// أخطاء الشبكة (مثل انقطاع الاتصال بـSupabase في بيئات معزولة) ليست
// أخطاء في الكود نفسه، فلا نُسقط الاختبار بسببها.
const isNetworkNoise = (message: string) =>
  /failed to fetch|networkerror|load failed|err_|fetch failed|abort/i.test(message);

const collectPageErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
};

// الفحص المشترك: التطبيق أقلع فعلاً (شاشة الإقلاع اختفت) ولم تظهر
// شاشة الخطأ القاتل ولا صفحة بيضاء.
const expectAppBooted = async (page: Page) => {
  await expect(page.locator("#boot-splash")).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByText("تعذّر تشغيل التطبيق")).toHaveCount(0);
  // الصفحة ليست بيضاء: فيها نص ظاهر، أو مؤشر تحميل على الأقل
  // (بعض الصفحات تبقى في حالة تحميل عندما تكون قاعدة البيانات محجوبة).
  await page.waitForFunction(
    () => {
      const root = document.getElementById("root");
      return (
        !!root &&
        (root.innerText.trim().length > 0 || !!root.querySelector(".animate-spin"))
      );
    },
    undefined,
    { timeout: 20_000 },
  );
};

test.describe("الصفحات العامة", () => {
  for (const { path, name } of PUBLIC_ROUTES) {
    test(`${name} — ${path}`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto(path);
      await expectAppBooted(page);
      expect(errors.filter((m) => !isNetworkNoise(m))).toEqual([]);
    });
  }
});

test.describe("الصفحات العامة ذات المعرّفات (بقيم غير صالحة)", () => {
  for (const { path, name } of PUBLIC_PARAM_ROUTES) {
    test(`${name} — ${path}`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto(path);
      await expectAppBooted(page);
      expect(errors.filter((m) => !isNetworkNoise(m))).toEqual([]);
    });
  }
});

test.describe("الصفحات المحمية تعيد التوجيه إلى تسجيل الدخول", () => {
  for (const { path, name } of PROTECTED_ROUTES) {
    test(`${name} — ${path}`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto(path);
      await page.waitForURL("**/login", { timeout: 20_000 });
      await expectAppBooted(page);
      expect(errors.filter((m) => !isNetworkNoise(m))).toEqual([]);
    });
  }
});

test("مسار غير معروف يعرض صفحة 404", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");
  await expectAppBooted(page);
  await expect(page.getByText("404")).toBeVisible();
});

// يُفحص على نسخة الإنتاج لأن الصندوق يظهر دائماً في التطوير المحلي،
// فلا يُكتشف اختفاؤه من الموقع الحي إلا هنا.
test("صندوق الحسابات التجريبية في صفحة الدخول يتبع مفتاحه", async ({ page }) => {
  await page.goto("/login");
  await expectAppBooted(page);
  const demoBox = page.getByText("حسابات تجريبية (للاختبار)");
  if (!DEMO_ACCOUNTS_ON_LOGIN) {
    await expect(demoBox).toHaveCount(0);
    return;
  }
  await expect(demoBox).toBeVisible();
  // ضغطة على الحساب تعبّئ بياناته، ثم الدخول يفتح لوحة المنظّم في الوضع التجريبي
  await page.getByRole("button", { name: /org-private@nakfeek\.sa/ }).click();
  await page.locator("form").getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
});
