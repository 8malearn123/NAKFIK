import { useAuth } from "@/contexts/AuthContext";
import { PUBLIC_EVENTS_ENABLED } from "@/lib/phase";

// نظام الباقات للمنظمين:
// private = الدعوات الخاصة فقط، public = الفعاليات العامة فقط، both = الاثنتان معاً.
// تُحفظ في organizations.plan_scope وتتحكم تلقائياً في القوائم والمسارات.
export type PlanScope = "private" | "public" | "both";

export const PLAN_SCOPE_META: Record<PlanScope, { label: string; desc: string }> = {
  private: {
    label: "باقة الدعوات الخاصة",
    desc: "إدارة الدعوات الخاصة والمدعوين فقط — بدون فعاليات عامة أو بيع تذاكر",
  },
  public: {
    label: "باقة الفعاليات العامة",
    desc: "إنشاء الفعاليات العامة وبيع التذاكر وإدارة الحجوزات — بدون دعوات خاصة",
  },
  both: {
    label: "الباقة الشاملة",
    desc: "الفعاليات العامة والدعوات الخاصة معاً — كل الميزات بدون قيود",
  },
};

export function normalizeScope(v: unknown): PlanScope {
  return v === "private" || v === "public" ? v : "both";
}

export function usePlanScope() {
  const { organization, isSuperAdmin, loading } = useAuth();
  // السوبر أدمن بلا قيود؛ وقبل تنفيذ ملف SQL (العمود غير موجود) تُعامل كل الحسابات كباقة شاملة
  const scope: PlanScope = isSuperAdmin ? "both" : normalizeScope((organization as any)?.plan_scope);
  return {
    scope,
    // المرحلة الأولى: الفعاليات العامة معطلة الظهور للجميع بغض النظر عن الباقة
    canPublic: PUBLIC_EVENTS_ENABLED && scope !== "private",
    canPrivate: scope !== "public",
    loading,
  };
}
