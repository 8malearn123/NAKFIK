import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Home, LogOut, Menu, PanelRightClose, PanelRightOpen, Search, type LucideIcon } from "lucide-react";
import BrandLogo from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { cn } from "@/lib/utils";

export interface ShellLink {
  icon: LucideIcon;
  label: string;
  path: string;
  count?: number;
  // ميزة معطّلة مؤقتاً: تظهر بشارة "قريباً" وغير قابلة للنقر
  soon?: boolean;
  isActive?: (pathname: string, search: string) => boolean;
}
export interface ShellGroup {
  icon: LucideIcon;
  label: string;
  children: ShellLink[];
}
export type ShellEntry = ShellLink | ShellGroup;
export interface ShellSection {
  label?: string;
  entries: ShellEntry[];
}

interface AppShellProps {
  sections: ShellSection[];
  userName: string;
  userSubtitle: string;
  notificationsPath?: string;
  onSignOut: () => void;
  children: React.ReactNode;
}

const isGroup = (e: ShellEntry): e is ShellGroup => "children" in e;
const COLLAPSE_KEY = "nakfeek-sidebar-collapsed";

const linkBase = "flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors";
const linkIdle = "text-[#4D4656] hover:bg-secondary/60";
const linkOn = "bg-secondary font-semibold text-primary";

const CountPill = ({ value }: { value: number }) => (
  <span className="ms-auto grid h-[22px] min-w-[22px] place-items-center rounded-full bg-secondary px-1.5 text-xs font-semibold text-primary">{value}</span>
);

/** الهيكل المشترك للوحتي المنظم والأدمن: قائمة جانبية بيضاء وشريط علوي وبحث صفحات حقيقي */
const AppShell = ({ sections, userName, userSubtitle, notificationsPath, onSignOut, children }: AppShellProps) => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { isImpersonating } = useImpersonation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyK") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      return !v;
    });
  };

  const active = (l: ShellLink) => (l.isActive ? l.isActive(pathname, search) : pathname === l.path);
  const allLinks = sections.flatMap((s) => s.entries.flatMap((e) => (isGroup(e) ? e.children : [e]))).filter((l) => !l.soon);

  const renderLink = (l: ShellLink, nested = false) => {
    if (l.soon) {
      return (
        <div key={l.path} className={cn(linkBase, "cursor-not-allowed text-muted-foreground/70")} title="غير متاحة حالياً">
          <l.icon className="h-[18px] w-[18px] flex-none" />
          {!collapsed && (
            <>
              <span className="truncate">{l.label}</span>
              <span className="ms-auto rounded-full bg-muted px-2 text-xs leading-5">قريباً</span>
            </>
          )}
        </div>
      );
    }
    return (
      <Link
        key={l.path}
        to={l.path}
        title={collapsed ? l.label : undefined}
        onClick={() => setMobileOpen(false)}
        className={cn(linkBase, active(l) ? linkOn : linkIdle, nested && "h-9 text-[13px]", collapsed && "justify-center px-0")}
      >
        {!nested && <l.icon className="h-[18px] w-[18px] flex-none" />}
        {!collapsed && <span className="truncate">{l.label}</span>}
        {!collapsed && !!l.count && <CountPill value={l.count} />}
      </Link>
    );
  };

  const renderGroup = (g: ShellGroup) => {
    const childActive = g.children.some(active);
    const open = openGroups[g.label] ?? childActive;
    const total = g.children.reduce((sum, c) => sum + (c.count ?? 0), 0);
    if (collapsed) {
      return (
        <Link key={g.label} to={g.children[0].path} title={g.label} className={cn(linkBase, "justify-center px-0", childActive ? linkOn : linkIdle)}>
          <g.icon className="h-[18px] w-[18px] flex-none" />
        </Link>
      );
    }
    return (
      <div key={g.label}>
        <button type="button" onClick={() => setOpenGroups((s) => ({ ...s, [g.label]: !open }))} className={cn(linkBase, "w-full", childActive ? "font-semibold text-primary" : linkIdle)}>
          <g.icon className="h-[18px] w-[18px] flex-none" />
          <span className="truncate">{g.label}</span>
          {!open && total > 0 && <CountPill value={total} />}
          <ChevronDown className={cn("h-4 w-4 flex-none opacity-50 transition-transform", !(!open && total > 0) && "ms-auto", open && "rotate-180")} />
        </button>
        {open && <div className="mt-0.5 space-y-0.5 border-s border-border ps-2 ms-[20px]">{g.children.map((c) => renderLink(c, true))}</div>}
      </div>
    );
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-foreground/30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={cn(
          "fixed bottom-0 start-0 z-50 flex flex-col bg-card shadow-[0_0_0_1px_hsl(var(--border))] transition-all duration-200",
          isImpersonating ? "top-10" : "top-0",
          collapsed ? "w-[264px] lg:w-20" : "w-[264px]",
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className={cn("flex h-[68px] flex-none items-center justify-between px-5", collapsed && "lg:justify-center lg:px-0")}>
          <Link to="/" title="العودة إلى الصفحة الرئيسية">
            {collapsed ? <BrandLogo variant="mark" alt="نكفيك تيكت" className="hidden h-10 w-10 rounded-xl lg:block" /> : null}
            <BrandLogo variant="wordmark" alt="نكفيك تيكت" className={cn("h-7", collapsed && "lg:hidden")} />
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
          {sections.map((s, i) => (
            <div key={s.label ?? i} className="space-y-0.5">
              {s.label && !collapsed && <div className="px-3 pb-1.5 pt-4 text-xs font-medium leading-[18px] text-muted-foreground">{s.label}</div>}
              {s.label && collapsed && <div className="mx-3 my-2 border-t border-border" />}
              {s.entries.map((e) => (isGroup(e) ? renderGroup(e) : renderLink(e)))}
            </div>
          ))}
        </nav>

        <div className="flex-none border-t border-border p-3">
          <div className={cn("flex items-center gap-2.5", collapsed && "lg:flex-col")}>
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-secondary text-sm font-bold text-primary">{userName.trim().charAt(0) || "م"}</span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-5">{userName}</p>
                <p className="truncate text-xs leading-[18px] text-muted-foreground">{userSubtitle}</p>
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9 flex-none text-muted-foreground" title="تسجيل الخروج" aria-label="تسجيل الخروج" onClick={onSignOut}>
              <LogOut className="h-[18px] w-[18px]" />
            </Button>
          </div>
        </div>
      </aside>

      <div className={cn("transition-all duration-200", isImpersonating && "pt-10", collapsed ? "lg:ms-20" : "lg:ms-[264px]")}>
        <header className={cn("sticky z-30 flex h-[68px] items-center gap-3 bg-background/85 px-4 backdrop-blur-md lg:px-8", isImpersonating ? "top-10" : "top-0")}>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="فتح القائمة" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden lg:inline-flex" aria-label="طي القائمة" onClick={toggleCollapsed}>
            {collapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
          </Button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="ابحث عن صفحة"
            className="flex h-10 w-10 flex-none items-center justify-center gap-2.5 rounded-xl text-sm text-muted-foreground transition-colors hover:bg-card/70 sm:w-auto sm:min-w-0 sm:max-w-[360px] sm:flex-1 sm:justify-start sm:bg-card sm:px-3 sm:shadow-[0_1px_2px_rgb(36_19_47/0.04)]"
          >
            <Search className="h-[17px] w-[17px] flex-none" />
            <span className="hidden truncate sm:block">ابحث عن صفحة</span>
            <kbd className="ms-auto hidden rounded-md border border-border bg-muted/60 px-1.5 text-xs leading-[18px] sm:block">
              <bdi dir="ltr">⌘K</bdi>
            </kbd>
          </button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" asChild title="الصفحة الرئيسية" aria-label="الصفحة الرئيسية">
            <Link to="/"><Home className="h-5 w-5 text-muted-foreground" /></Link>
          </Button>
          {notificationsPath && (
            <Button variant="ghost" size="icon" asChild title="الإشعارات" aria-label="الإشعارات">
              <Link to={notificationsPath}><Bell className="h-5 w-5 text-muted-foreground" /></Link>
            </Button>
          )}
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-3 lg:px-8">{children}</main>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="ابحث عن صفحة" />
        <CommandList>
          <CommandEmpty>لا توجد صفحة بهذا الاسم</CommandEmpty>
          <CommandGroup heading="الصفحات">
            {allLinks.map((l) => (
              <CommandItem
                key={l.path}
                value={l.label}
                onSelect={() => {
                  setSearchOpen(false);
                  navigate(l.path);
                }}
              >
                <l.icon className="me-2 h-4 w-4 text-muted-foreground" />
                {l.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
};

export default AppShell;
