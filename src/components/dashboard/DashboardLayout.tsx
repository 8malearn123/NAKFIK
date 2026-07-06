import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import logo from "@/assets/logo.png";
import {
  LayoutDashboard,
  Calendar,
  PlusCircle,
  Users,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Menu,
  
  ScanLine,
  Wallet,
  CreditCard,
  
  ShoppingBag,
  Tag,
  Mail,
  Database,
  Award,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
};
type NavSection = {
  section?: string;
  cta?: { icon: typeof LayoutDashboard; label: string; path: string };
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    items: [{ icon: LayoutDashboard, label: "لوحة التحكم", path: "/dashboard" }],
  },
  {
    section: "الفعاليات",
    cta: { icon: PlusCircle, label: "إنشاء فعالية", path: "/dashboard/events/create" },
    items: [
      { icon: Calendar, label: "جميع الفعاليات", path: "/dashboard/events" },
      { icon: ClipboardCheck, label: "مراجعة الفعاليات", path: "/dashboard/events?status=pending_review" },
    ],
  },
  {
    items: [
      { icon: ScanLine, label: "تسجيل الحضور", path: "/dashboard/check-in" },
      { icon: Users, label: "إدارة الفريق", path: "/dashboard/team" },
      { icon: BarChart3, label: "التقارير", path: "/dashboard/reports" },
      { icon: Wallet, label: "الأرباح والتسويات", path: "/dashboard/earnings" },
      { icon: CreditCard, label: "الاشتراك", path: "/dashboard/subscription" },
      { icon: ShoppingBag, label: "سوق الخدمات", path: "/dashboard/services" },
      { icon: Tag, label: "خصومات الشركاء", path: "/dashboard/discounts" },
      { icon: Mail, label: "الدعوات الخاصة", path: "/dashboard/invitations" },
      { icon: Database, label: "قواعد بيانات المدعوين", path: "/dashboard/guest-lists" },
      { icon: Award, label: "الشهادات", path: "/dashboard/certificates" },
      { icon: Bell, label: "الإشعارات", path: "/dashboard/notifications" },
      { icon: Settings, label: "الإعدادات", path: "/dashboard/settings" },
    ],
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { t } = useLanguage();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-muted/30 font-cairo flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 h-full z-50 bg-purple-deep text-primary-foreground flex flex-col transition-all duration-300",
          collapsed ? "w-20" : "w-64",
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-primary-foreground/10">
          <img src={logo} alt="نكفيك تيكت" className="h-10 w-10 object-contain flex-shrink-0" />
          {!collapsed && <span className="font-bold text-lg">نكفيك تيكت</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-4 px-3 overflow-y-auto">
          {navSections.map((sec, idx) => {
            const isReviewPath = (path: string) =>
              path.includes("status=pending_review") &&
              location.pathname === "/dashboard/events" &&
              location.search.includes("status=pending_review");
            const isActiveItem = (path: string) => {
              if (path.includes("?")) return isReviewPath(path);
              if (path === "/dashboard/events")
                return location.pathname === "/dashboard/events" && !location.search.includes("status=pending_review");
              return location.pathname === path;
            };
            return (
              <div key={idx} className="space-y-1">
                {sec.section && !collapsed && (
                  <div className="flex items-center justify-between px-3 pt-2 pb-1">
                    <span className="text-[11px] uppercase tracking-wider text-primary-foreground/40 font-semibold">
                      {sec.section}
                    </span>
                  </div>
                )}
                {sec.cta && (
                  <Link
                    to={sec.cta.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                      "bg-gold/90 text-purple-deep hover:bg-gold shadow-sm",
                      collapsed && "justify-center"
                    )}
                  >
                    <sec.cta.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span>{sec.cta.label}</span>}
                  </Link>
                )}
                {sec.items.map((item) => {
                  const isActive = isActiveItem(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                        isActive
                          ? "bg-primary-foreground/15 text-primary-foreground font-semibold"
                          : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
                      )}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-primary-foreground/10 space-y-1">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-all w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>

        {/* Collapse toggle - desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -left-3 top-20 w-6 h-6 rounded-full bg-primary text-primary-foreground items-center justify-center shadow-md hover:scale-110 transition-transform"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          "flex-1 transition-all duration-300",
          collapsed ? "lg:mr-20" : "lg:mr-64"
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 h-16 flex items-center px-4 lg:px-6 gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">3</span>
            </Button>
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {profile?.full_name?.charAt(0) || "م"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div dir="rtl" className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
