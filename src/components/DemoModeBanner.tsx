import { FlaskConical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isDemoMode } from "@/integrations/supabase/demo";

/** شارة تظهر أثناء الوضع التجريبي لتوضيح أن البيانات وهمية ومحفوظة في المتصفح فقط */
const DemoModeBanner = () => {
  const { user } = useAuth();
  if (!user || !isDemoMode()) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[60] flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-4 py-2 text-xs font-bold shadow-gold font-cairo pointer-events-none" dir="rtl">
      <FlaskConical className="w-4 h-4" />
      وضع تجريبي — البيانات وهمية ومحفوظة في هذا المتصفح فقط
    </div>
  );
};

export default DemoModeBanner;
