import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import InAppNotifications from "@/components/notifications/InAppNotifications";
import { Bell } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const MyNotifications = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen font-cairo">
      <Navbar />
      <section className="pt-24 pb-16 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-3xl text-foreground">{t("pgMyNotifications.title")}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">{t("pgMyNotifications.subtitle")}</p>
            </div>
          </div>
          <InAppNotifications />
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default MyNotifications;
