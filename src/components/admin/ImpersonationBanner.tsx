import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useNavigate } from "react-router-dom";
import { LogOut, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const ImpersonationBanner = () => {
  const { isImpersonating, impersonatedUser, stopImpersonation } = useImpersonation();
  const navigate = useNavigate();

  if (!isImpersonating || !impersonatedUser) return null;

  const accountTypeLabels: Record<string, string> = {
    organizer: "منظّم فعاليات",
    venue_owner: "صاحب مكان",
    attendee: "حاضر",
  };

  const handleExit = () => {
    stopImpersonation();
    navigate("/admin");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 h-10 flex items-center justify-center gap-4 text-sm font-semibold shadow-lg font-cairo" dir="rtl">
      <Eye className="w-4 h-4" />
      <span>
        أنت تتصفح كـ: {impersonatedUser.full_name || impersonatedUser.email || "مستخدم"} ({accountTypeLabels[impersonatedUser.account_type] || impersonatedUser.account_type})
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={handleExit}
        className="h-7 text-xs bg-amber-600 border-amber-700 text-white hover:bg-amber-700 gap-1.5"
      >
        <LogOut className="w-3 h-3" />
        الخروج والعودة للإدارة
      </Button>
    </div>
  );
};

export default ImpersonationBanner;
