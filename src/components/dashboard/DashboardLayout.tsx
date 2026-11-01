import { useNavigate } from "react-router-dom";
import { Award, BarChart3, Bell, Calendar, ClipboardCheck, CreditCard, Database, LayoutDashboard, Mail, PlusCircle, ScanLine, Settings, ShoppingBag, Tag, Users, Wallet } from "lucide-react";
import AppShell, { type ShellLink, type ShellSection } from "@/components/app/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { usePlanScope } from "@/hooks/usePlanScope";

type ScopedLink = ShellLink & { scope?: "public" | "private" };

const REVIEW = "status=pending_review";

const NAV: { label?: string; items: ScopedLink[] }[] = [
  { items: [{ icon: LayoutDashboard, label: "لوحة التحكم", path: "/dashboard" }] },
  {
    label: "الدعوات",
    items: [
      { icon: Mail, label: "الدعوات الخاصة", path: "/dashboard/invitations", scope: "private" },
      { icon: Database, label: "قواعد بيانات المدعوين", path: "/dashboard/guest-lists", scope: "private" },
    ],
  },
  {
    label: "الفعاليات",
    items: [
      { icon: PlusCircle, label: "إنشاء فعالية", path: "/dashboard/events/create", scope: "public" },
      {
        icon: Calendar,
        label: "جميع الفعاليات",
        path: "/dashboard/events",
        scope: "public",
        isActive: (p, s) => p === "/dashboard/events" && !s.includes(REVIEW),
      },
      {
        icon: ClipboardCheck,
        label: "مراجعة الفعاليات",
        path: `/dashboard/events?${REVIEW}`,
        scope: "public",
        isActive: (p, s) => p === "/dashboard/events" && s.includes(REVIEW),
      },
    ],
  },
  {
    label: "التشغيل",
    items: [
      { icon: ScanLine, label: "تسجيل الحضور", path: "/dashboard/check-in" },
      { icon: Users, label: "إدارة الفريق", path: "/dashboard/team" },
      { icon: BarChart3, label: "التقارير", path: "/dashboard/reports" },
      { icon: Wallet, label: "الأرباح والتسويات", path: "/dashboard/earnings", scope: "public" },
    ],
  },
  {
    label: "الخدمات",
    items: [
      { icon: ShoppingBag, label: "سوق الخدمات", path: "/dashboard/services" },
      { icon: Tag, label: "خصومات الشركاء", path: "/dashboard/discounts" },
    ],
  },
  {
    label: "الحساب",
    items: [
      { icon: CreditCard, label: "الاشتراك", path: "/dashboard/subscription" },
      { icon: Award, label: "الشهادات", path: "/dashboard/certificates", soon: true },
      { icon: Bell, label: "الإشعارات", path: "/dashboard/notifications" },
      { icon: Settings, label: "الإعدادات", path: "/dashboard/settings" },
    ],
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { signOut, profile, organization } = useAuth();
  const { stopImpersonation } = useImpersonation();
  const { effectiveProfile, effectiveOrganization } = useEffectiveUser();
  const { canPublic, canPrivate } = usePlanScope();

  // إخفاء العناصر خارج نطاق الباقة نهائياً (وليس تعطيلها فقط)
  const scopeAllows = (scope?: "public" | "private") => !scope || (scope === "public" ? canPublic : canPrivate);
  const sections: ShellSection[] = NAV.map((s) => ({ label: s.label, entries: s.items.filter((i) => scopeAllows(i.scope)) })).filter((s) => s.entries.length > 0);

  const handleSignOut = async () => {
    stopImpersonation();
    await signOut();
    navigate("/login");
  };

  return (
    <AppShell
      sections={sections}
      userName={effectiveProfile?.full_name || profile?.full_name || "منظم"}
      userSubtitle={effectiveOrganization?.name || organization?.name || "حساب منظم"}
      notificationsPath="/dashboard/notifications"
      onSignOut={handleSignOut}
    >
      {children}
    </AppShell>
  );
};

export default DashboardLayout;
