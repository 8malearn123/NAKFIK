import { beforeEach, describe, expect, it, vi } from "vitest";

const BASE = "https://project.supabase.co";
const TOKEN_URL = `${BASE}/auth/v1/token?grant_type=password`;
const realFetch = vi.fn<typeof fetch>();

const memoryStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => void items.set(k, v),
    removeItem: (k: string) => void items.delete(k),
  };
};

// كل تحميل جديد للوحدة يمثل تبويباً جديداً: ذاكرة فارغة مع نفس localStorage
const openTab = async () => {
  vi.resetModules();
  const demo = await import("./demo");
  return { demo, demoFetch: demo.createDemoAwareFetch(BASE) };
};

type DemoFetch = ReturnType<Awaited<ReturnType<typeof openTab>>["demo"]["createDemoAwareFetch"]>;

const signIn = (demoFetch: DemoFetch, email: string, password = "Demo@12345") =>
  demoFetch(TOKEN_URL, { method: "POST", body: JSON.stringify({ email, password }) });

const select = async (demoFetch: DemoFetch, query: string) =>
  (await demoFetch(`${BASE}/rest/v1/${query}`, { method: "GET" })).json();

const rpc = async (demoFetch: DemoFetch, name: string, args: unknown) =>
  (await demoFetch(`${BASE}/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) })).json();

describe("الوضع التجريبي", () => {
  beforeEach(() => {
    realFetch.mockReset();
    realFetch.mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", realFetch);
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("حساب ديمو مع خادم غير متاح: جلسة تجريبية وبيانات محلية", async () => {
    const { demo, demoFetch } = await openTab();

    const res = await signIn(demoFetch, "org1@nakfeek.sa");
    expect(res.ok).toBe(true);
    expect(demo.isDemoMode()).toBe(true);

    realFetch.mockClear();
    const invitations = await select(demoFetch, "private_invitations?select=*");
    expect(invitations.length).toBeGreaterThan(0);
    expect(realFetch).not.toHaveBeenCalled();
  });

  it("الربط لاحقاً: الحساب الحقيقي يمر للخادم ولا يدخل الوضع التجريبي", async () => {
    realFetch.mockResolvedValue(new Response("{}", { status: 200 }));
    const { demo, demoFetch } = await openTab();

    await signIn(demoFetch, "real.user@example.com", "secret-password");
    expect(realFetch).toHaveBeenCalledTimes(1);
    expect(demo.isDemoMode()).toBe(false);

    await select(demoFetch, "profiles?select=*");
    expect(realFetch).toHaveBeenCalledTimes(2);
  });

  it("الربط لاحقاً: حساب ديمو موجود في الخادم يستخدم الجلسة الحقيقية", async () => {
    realFetch.mockResolvedValue(new Response(JSON.stringify({ access_token: "real" }), { status: 200 }));
    const { demo, demoFetch } = await openTab();

    const res = await signIn(demoFetch, "org1@nakfeek.sa");
    expect(await res.json()).toEqual({ access_token: "real" });
    expect(demo.isDemoMode()).toBe(false);
  });

  it("تسجيل الخروج يعيد الطلبات للخادم الحقيقي", async () => {
    const { demo, demoFetch } = await openTab();
    await signIn(demoFetch, "org1@nakfeek.sa");

    await demoFetch(`${BASE}/auth/v1/logout`, { method: "POST" });
    expect(demo.isDemoMode()).toBe(false);
  });

  it("رابط الدعوة يبقى صالحاً في تبويب جديد", async () => {
    const first = await openTab();
    await signIn(first.demoFetch, "org1@nakfeek.sa");
    const [guest] = await select(first.demoFetch, "private_invitation_guests?select=*");

    const second = await openTab();
    const data = await rpc(second.demoFetch, "get_invitation_by_token", { _token: guest.token });
    expect(data.guest.id).toBe(guest.id);
    expect(data.invitation.id).toBe(guest.invitation_id);
  });

  it("تأكيد الحضور يُحفظ ويلتزم بالحد الأقصى للمرافقين", async () => {
    const { demoFetch } = await openTab();
    await signIn(demoFetch, "org1@nakfeek.sa");
    const [guest] = await select(demoFetch, "private_invitation_guests?select=*");

    const result = await rpc(demoFetch, "confirm_invitation_rsvp", { _token: guest.token, _status: "confirmed", _companions: 99 });
    expect(result).toMatchObject({ rsvp_status: "confirmed", companions_count: 2 });

    const [saved] = await select(demoFetch, `private_invitation_guests?select=*&id=eq.${guest.id}`);
    expect(saved).toMatchObject({ rsvp_status: "confirmed", companions_count: 2 });
  });

  it("استيراد قائمة يضيف الجهات الجديدة مرة واحدة ويعرض عددها", async () => {
    const { demoFetch } = await openTab();
    await signIn(demoFetch, "org1@nakfeek.sa");
    const [list] = await select(demoFetch, "guest_lists?select=id,name,guest_list_contacts(count)");
    const [invitation] = await select(demoFetch, "private_invitations?select=*");
    const args = { _list_id: list.id, _invitation_id: invitation.id };

    expect(list.guest_list_contacts).toEqual([{ count: 6 }]);
    expect(await rpc(demoFetch, "import_list_to_invitation", args)).toBe(6);
    expect(await rpc(demoFetch, "import_list_to_invitation", args)).toBe(0);
  });
});
