import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  ClipboardCheck,
  Calendar,
  Users,
  BarChart3,
  Megaphone,
  CreditCard,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Menu,
  Bell,
  UserSearch,
  DollarSign,
  UserPlus,
  PlusCircle,
  Flame,
  Briefcase,
  Tag,
  ClipboardList,
  Layers,
  Sparkles,
  Mail,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  icon: any;
  label: string;
  path: string;
  badgeKey?: "pendingEvents";
}

interface NavGroup {
  icon: any;
  label: string;
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

const isGroup = (e: NavEntry): e is NavGroup => (e as NavGroup).children !== undefined;

const navItems: NavEntry[] = [
  { icon: LayoutDashboard, label: "لوحة التحكم", path: "/admin" },
  {
    icon: Calendar,
    label: "الفعاليات",
    children: [
      { icon: ClipboardCheck, label: "مراجعة الفعاليات", path: "/admin/pending", badgeKey: "pendingEvents" },
      { icon: Calendar, label: "جميع الفعاليات", path: "/admin/events" },
      { icon: PlusCircle, label: "إنشاء فعالية", path: "/admin/events/create" },
      { icon: Flame, label: "الخارطة الحرارية", path: "/admin/heatmap" },
    ],
  },
  {
    icon: Users,
    label: "إدارة المستخدمين",
    children: [
      { icon: Users, label: "حسابات المنظمين", path: "/admin/organizers" },
      { icon: UserSearch, label: "جميع المستخدمين", path: "/admin/users" },
      { icon: UserPlus, label: "دعوة حساب جديد", path: "/admin/users/invite" },
      { icon: Users, label: "فريق إدارة النظام", path: "/admin/team" },
    ],
  },
  { icon: CreditCard, label: "إدارة الاشتراكات", path: "/admin/subscriptions" },
  { icon: BarChart3, label: "تحليلات المنصة", path: "/admin/analytics" },
  { icon: Megaphone, label: "الإعلانات", path: "/admin/announcements" },
  { icon: DollarSign, label: "المالية والمحاسبة", path: "/admin/finance" },
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
  {
    icon: Tag,
    label: "شركاء الخصومات",
    children: [
      { icon: Tag, label: "شركاء الخصومات", path: "/admin/partner-brands" },
    ],
  },
  { icon: Mail, label: "الدعوات الخاصة", path: "/admin/private-invitations" },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    const fetchCounts = async () => {
      const [eventsRes] = await Promise.all([
        supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      ]);
      setBadges({
        pendingEvents: eventsRes.count || 0,
      });
    };
    fetchCounts();
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-muted/30 font-cairo flex">
      {mobileOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed top-0 right-0 h-full z-50 flex flex-col transition-all duration-300",
          "bg-[hsl(220_40%_13%)] text-primary-foreground",
          collapsed ? "w-20" : "w-64",
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center gap-3 p-4 border-b border-primary-foreground/10">
          <img src={logo} alt="نكفيك تيكت" className="h-10 w-10 object-contain flex-shrink-0" />
          {!collapsed && (
            <div>
              <span className="font-bold text-sm">نكفيك تيكت</span>
              <span className="block text-[10px] text-primary-foreground/50">لوحة مدير النظام</span>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {navItems.map((entry, idx) => {
            if (isGroup(entry)) {
              const childActive = entry.children.some((c) => location.pathname === c.path);
              const open = openGroups[entry.label] ?? childActive;
              if (collapsed) {
                return (
                  <Link
                    key={entry.label}
                    to={entry.children[0].path}
                    onClick={() => setMobileOpen(false)}
                    title={entry.label}
                    className={cn(
                      "flex items-center justify-center px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                      childActive
                        ? "bg-destructive/20 text-primary-foreground font-semibold"
                        : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
                    )}
                  >
                    <entry.icon className="w-5 h-5" />
                  </Link>
                );
              }
              return (
                <div key={entry.label}>
                  <button
                    onClick={() =>
                      setOpenGroups((s) => ({ ...s, [entry.label]: !open }))
                    }
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                      childActive
                        ? "bg-destructive/15 text-primary-foreground font-semibold"
                        : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
                    )}
                  >
                    <entry.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-right">{entry.label}</span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform",
                        open ? "rotate-180" : ""
                      )}
                    />
                  </button>
                  {open && (
                    <div className="mt-1 mr-4 pr-3 border-r border-primary-foreground/10 space-y-1">
                      {entry.children.map((child) => {
                        const isActive = location.pathname === child.path;
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all",
                              isActive
                                ? "bg-destructive/20 text-primary-foreground font-semibold"
                                : "text-primary-foreground/55 hover:text-primary-foreground hover:bg-primary-foreground/10"
                            )}
                          >
                            <child.icon className="w-4 h-4 flex-shrink-0" />
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            const item = entry;
            const isActive = location.pathname === item.path;
            const count = item.badgeKey ? badges[item.badgeKey] || 0 : 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                  isActive
                    ? "bg-destructive/20 text-primary-foreground font-semibold"
                    : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {count > 0 && (
                  <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-primary-foreground/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-all w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -left-3 top-20 w-6 h-6 rounded-full bg-destructive text-destructive-foreground items-center justify-center shadow-md hover:scale-110 transition-transform"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      <main className={cn("flex-1 transition-all duration-300", collapsed ? "lg:mr-20" : "lg:mr-64")}>
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 h-16 flex items-center px-4 lg:px-6 gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <span className="text-xs font-semibold bg-destructive/10 text-destructive rounded-full px-3 py-1">مدير النظام</span>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
          </Button>
          <div className="w-9 h-9 rounded-full bg-destructive/20 flex items-center justify-center text-destructive font-bold text-sm">
            أ
          </div>
        </header>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
