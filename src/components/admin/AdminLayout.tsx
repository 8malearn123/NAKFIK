import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Briefcase, Calendar, ClipboardCheck, ClipboardList, CreditCard, DollarSign, DoorOpen, Flame, Layers, LayoutDashboard, Mail, Megaphone, PlusCircle, Sparkles, Tag, UserPlus, UserSearch, Users } from "lucide-react";
import AppShell, { type ShellSection } from "@/components/app/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { supabase } from "@/integrations/supabase/client";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [pendingEvents, setPendingEvents] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { stopImpersonation } = useImpersonation();

  useEffect(() => {
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review")
      .then(({ count }) => setPendingEvents(count || 0));
  }, [location.pathname]);

  const handleSignOut = async () => {
    stopImpersonation();
    await signOut();
    navigate("/login");
  };

  const sections: ShellSection[] = [
    {
      entries: [
        { icon: LayoutDashboard, label: "لوحة التحكم", path: "/admin" },
        { icon: Mail, label: "الدعوات الخاصة", path: "/admin/private-invitations" },
      ],
    },
    {
      label: "التشغيل",
      entries: [
        {
          icon: Calendar,
          label: "الفعاليات",
          children: [
            { icon: ClipboardCheck, label: "مراجعة الفعاليات", path: "/admin/pending", count: pendingEvents },
            { icon: Calendar, label: "جميع الفعاليات", path: "/admin/events" },
            { icon: PlusCircle, label: "إنشاء فعالية", path: "/admin/events/create" },
            { icon: Flame, label: "الخارطة الحرارية", path: "/admin/heatmap" },
            { icon: DoorOpen, label: "تعيين البوابات", path: "/admin/gates" },
          ],
        },
        {
          icon: Users,
          label: "المستخدمون",
          children: [
            { icon: Users, label: "حسابات المنظمين", path: "/admin/organizers" },
            { icon: UserSearch, label: "جميع المستخدمين", path: "/admin/users" },
            { icon: UserPlus, label: "دعوة حساب جديد", path: "/admin/users/invite" },
            { icon: Users, label: "فريق إدارة النظام", path: "/admin/team" },
          ],
        },
        { icon: CreditCard, label: "الاشتراكات", path: "/admin/subscriptions" },
        { icon: DollarSign, label: "المالية والمحاسبة", path: "/admin/finance" },
      ],
    },
    {
      label: "النمو",
      entries: [
        { icon: BarChart3, label: "تحليلات المنصة", path: "/admin/analytics" },
        { icon: Megaphone, label: "الإعلانات", path: "/admin/announcements" },
      ],
    },
    {
      label: "السوق",
      entries: [
        {
          icon: Briefcase,
          label: "مزودو الخدمات",
          children: [
            { icon: Briefcase, label: "مزودو الخدمات", path: "/admin/service-providers" },
            { icon: Layers, label: "فئات مزودي الخدمات", path: "/admin/provider-categories" },
            { icon: Sparkles, label: "خدمات نكفيك", path: "/admin/featured-services" },
            { icon: ClipboardList, label: "طلبات سوق الخدمات", path: "/admin/service-requests" },
          ],
        },
        { icon: Tag, label: "شركاء الخصومات", path: "/admin/partner-brands" },
      ],
    },
  ];

  return (
    <AppShell sections={sections} userName={profile?.full_name || "مدير المنصة"} userSubtitle="مدير النظام" onSignOut={handleSignOut}>
      {children}
    </AppShell>
  );
};

export default AdminLayout;
