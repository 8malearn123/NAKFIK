import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import InAppNotifications from "@/components/notifications/InAppNotifications";
import PageHeader from "@/components/app/PageHeader";
import { useLanguage } from "@/contexts/LanguageContext";

const MyNotifications = () => {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col bg-background font-cairo">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-24">
        <div className="space-y-6">
          <PageHeader title={t("pgMyNotifications.title")} description={t("pgMyNotifications.subtitle")} />
          <InAppNotifications />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyNotifications;
