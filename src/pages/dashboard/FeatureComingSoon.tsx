// صفحة بديلة للميزات المعطّلة مؤقتاً (مثل الشهادات) — الكود الأصلي محفوظ ويُعاد ربطه عند التفعيل
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Award, ArrowRight } from "lucide-react";

const FeatureComingSoon = ({ title = "الشهادات" }: { title?: string }) => (
  <DashboardLayout>
    <div className="space-y-6">
      <PageHeader title={title} />
      <div className="rounded-2xl bg-card shadow-soft">
        <EmptyState
          icon={Award}
          title="هذه الميزة غير متاحة حالياً"
          description="نعمل على تجهيزها وستتوفر قريباً."
          action={
            <Button asChild variant="outline">
              <Link to="/dashboard"><ArrowRight className="h-4 w-4" /> العودة للوحة التحكم</Link>
            </Button>
          }
        />
      </div>
    </div>
  </DashboardLayout>
);

export default FeatureComingSoon;
