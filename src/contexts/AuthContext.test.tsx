import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

const backend = vi.hoisted(() => ({
  emitAuth: (_event: string, _session: unknown) => {},
  // استعلامات profiles المعلّقة — يُنهيها الاختبار ليتحكم في ترتيب وصولها
  pendingProfiles: [] as Array<(row: unknown) => void>,
}));

vi.mock("@/integrations/supabase/client", () => {
  const query = (table: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: () =>
        table === "profiles"
          ? new Promise((resolve) => {
              backend.pendingProfiles.push((row) => resolve({ data: row }));
            })
          : Promise.resolve({ data: null }),
    };
    return builder;
  };
  return {
    supabase: {
      auth: {
        onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
          backend.emitAuth = callback;
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        getSession: () => Promise.resolve({ data: { session: null } }),
        signOut: () => Promise.resolve({ error: null }),
      },
      from: query,
    },
  };
});

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

const session = { user: { id: "user-1" } };
const profileRow = { id: "user-1", account_type: "organizer" };

const renderSignedOut = async () => {
  const view = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
};

const signIn = async () => {
  await act(async () => {
    backend.emitAuth("SIGNED_IN", session);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const finishProfile = async () => {
  await act(async () => {
    backend.pendingProfiles.shift()?.(profileRow);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

describe("AuthProvider — حالة التحميل بعد تسجيل الدخول", () => {
  beforeEach(() => {
    backend.pendingProfiles.length = 0;
  });

  it("يبقى loading حتى يكتمل ملف المستخدم الذي سجّل دخوله للتو", async () => {
    const { result } = await renderSignedOut();

    await signIn();
    expect(result.current.user).not.toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(true);

    await finishProfile();
    expect(result.current.profile).toEqual(profileRow);
    expect(result.current.loading).toBe(false);
  });

  it("تحديث التوكن أو العودة للتبويب لنفس المستخدم لا يعيد حالة التحميل", async () => {
    const { result } = await renderSignedOut();
    await signIn();
    await finishProfile();

    await act(async () => {
      backend.emitAuth("TOKEN_REFRESHED", session);
      backend.emitAuth("SIGNED_IN", session);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(backend.pendingProfiles.length).toBeGreaterThan(0);
    expect(result.current.loading).toBe(false);
  });

  it("الدخول مجدداً بنفس الحساب بعد الخروج ينتظر الملف من جديد", async () => {
    const { result } = await renderSignedOut();
    await signIn();
    await finishProfile();

    await act(async () => {
      backend.emitAuth("SIGNED_OUT", null);
    });
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);

    await signIn();
    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});
