// صفحة بديلة للميزات المعطّلة مؤقتاً (مثل الشهادات) — الكود الأصلي محفوظ ويُعاد ربطه عند التفعيل
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Award, ArrowRight } from "lucide-react";

const FeatureComingSoon = ({ title = "الشهادات" }: { title?: string }) => (
  <DashboardLayout>
    <div className="max-w-xl mx-auto text-center py-20">
      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
        <Award className="w-10 h-10 text-primary" />
      </div>
      <h1 className="font-bold text-2xl text-foreground mb-2">{title}</h1>
      <p className="text-muted-foreground leading-relaxed mb-8">
        هذه الميزة غير متاحة حالياً — نعمل على تجهيزها وستتوفر قريباً.
      </p>
      <Button asChild variant="outline" className="rounded-full">
        <Link to="/dashboard">
          <ArrowRight className="w-4 h-4 ml-1" /> العودة للوحة التحكم
        </Link>
      </Button>
    </div>
  </DashboardLayout>
);

export default FeatureComingSoon;
