import { MotionConfig } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import OccasionsSection from "@/components/landing/OccasionsSection";
import JourneySection from "@/components/landing/JourneySection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import { useInvitationDemo } from "@/components/landing/invitationDemo";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { lang } = useLanguage();
  // اسم الضيف والمناسبة والرد في البطاقة التجريبية تتنقل بين أقسام الصفحة
  const demo = useInvitationDemo(lang);

  return (
    // حركات الصفحة تحترم إعداد "تقليل الحركة" في جهاز الزائر
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen font-cairo">
        <Navbar />
        <HeroSection demo={demo} />
        <OccasionsSection demo={demo} />
        <JourneySection demo={demo} />
        <FeaturesSection demo={demo} />
        <PricingSection />
        {/* الخاتمة والتذييل كتلة داكنة واحدة، فلا يظهر لون الصفحة الفاتح بينهما عند كسور البكسل */}
        <div className="bg-night">
          <CTASection demo={demo} />
          <Footer variant="night" />
        </div>
      </div>
    </MotionConfig>
  );
};

export default Index;
