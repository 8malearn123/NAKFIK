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
    <div className="fixed inset-x-0 top-0 z-[100] flex h-10 items-center justify-center gap-3 bg-[#FDF3E3] px-4 text-sm font-semibold text-[#9A5F12] shadow-soft font-cairo" dir="rtl">
      <Eye className="hidden h-4 w-4 flex-none sm:block" />
      <span className="min-w-0 truncate">
        أنت تتصفح كـ: {impersonatedUser.full_name || impersonatedUser.email || "مستخدم"} ({accountTypeLabels[impersonatedUser.account_type] || impersonatedUser.account_type})
      </span>
      <Button size="sm" variant="outline" onClick={handleExit} className="flex-none">
        <LogOut className="h-4 w-4" />
        الخروج والعودة للإدارة
      </Button>
    </div>
  );
};

export default ImpersonationBanner;
