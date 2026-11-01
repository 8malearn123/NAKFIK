import { FlaskConical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isDemoMode } from "@/integrations/supabase/demo";

/** شارة تظهر أثناء الوضع التجريبي لتوضيح أن البيانات وهمية ومحفوظة في المتصفح فقط */
const DemoModeBanner = () => {
  const { user } = useAuth();
  if (!user || !isDemoMode()) return null;
  return (
    <div className="fixed bottom-3 end-3 z-[60] flex items-center gap-1.5 rounded-full bg-[#FDF3E3] text-[#9A5F12] px-3 py-1 text-xs font-semibold shadow-soft pointer-events-none" dir="rtl">
      <FlaskConical className="w-3.5 h-3.5" />
      وضع تجريبي: البيانات وهمية
    </div>
  );
};

export default DemoModeBanner;
