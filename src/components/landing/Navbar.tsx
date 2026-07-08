import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { User, Ticket, Users, IdCard, LogOut, LayoutDashboard, Shield, Bell, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const { t, lang, toggleLang } = useLanguage();
  const { user, profile, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt={t("navbar.brand")} className="h-10 w-auto" />
          <span className="font-cairo font-bold text-lg text-foreground hidden sm:inline">{t("navbar.brand")}</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 font-cairo text-sm font-medium">
          <Link to="/" className="text-foreground/70 hover:text-foreground transition-colors">{t("navbar.home")}</Link>
          <Link to="/events" className="text-foreground/70 hover:text-foreground transition-colors">{t("navbar.events")}</Link>
          <a href="/#features" className="text-foreground/70 hover:text-foreground transition-colors">{t("navbar.features")}</a>
          <a href="/#pricing" className="text-foreground/70 hover:text-foreground transition-colors">{t("navbar.pricing")}</a>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-full text-xs font-bold"
            onClick={toggleLang}
            aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
          >
            <Globe className="w-4 h-4" />
            {lang === "ar" ? "EN" : "عربي"}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-full">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                    {profile?.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-xs">{profile?.full_name || user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{profile?.full_name || user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {profile?.account_type === "organizer" && (
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard"><LayoutDashboard className="w-4 h-4 ms-2" /> {t("navbar.dashboard")}</Link>
                  </DropdownMenuItem>
                )}
                {isSuperAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin"><Shield className="w-4 h-4 ms-2" /> {t("navbar.adminPanel")}</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/my/profile"><User className="w-4 h-4 ms-2" /> {t("navbar.myProfile")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-tickets"><Ticket className="w-4 h-4 ms-2" /> {t("navbar.myTickets")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my/profile/networking"><IdCard className="w-4 h-4 ms-2" /> {t("navbar.connectCard")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my/connections"><Users className="w-4 h-4 ms-2" /> {t("navbar.myNetwork")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my/notifications"><Bell className="w-4 h-4 ms-2" /> {t("navbar.notifications")}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 ms-2" /> {t("navbar.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">{t("navbar.login")}</Link>
              </Button>
              <Button variant="default" size="sm" className="rounded-full" asChild>
                <Link to="/register">{t("navbar.startFree")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
