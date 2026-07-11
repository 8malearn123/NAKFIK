import { motion } from "framer-motion";
import {
  Activity,
  CalendarPlus,
  Pencil,
  Send,
  Ticket,
  UserCheck,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/relativeTime";

// قسم "آخر الأنشطة" — نسخة واجهة أمامية فقط ببيانات تمثيلية.
// عند ربط الواجهة الخلفية لاحقاً تُستبدل القائمة بسجل الأنشطة الفعلي
// دون تغيير شكل البطاقة.

interface ActivityItem {
  icon: typeof Activity;
  color: string;
  title: string;
  desc: string;
  minutesAgo: number;
}

const DEMO_ACTIVITIES: ActivityItem[] = [
  {
    icon: Ticket,
    color: "bg-accent/10 text-accent",
    title: "بيع تذكرة",
    desc: "تذكرة VIP — مؤتمر التقنية السعودي 2026",
    minutesAgo: 5,
  },
  {
    icon: UserCheck,
    color: "bg-teal/10 text-teal",
    title: "تسجيل حضور",
    desc: "وصل ضيف جديد عبر بوابة تسجيل الدخول QR",
    minutesAgo: 42,
  },
  {
    icon: Send,
    color: "bg-primary/10 text-primary",
    title: "إرسال دعوة خاصة",
    desc: "أُرسلت 25 دعوة واتساب لقائمة كبار الضيوف",
    minutesAgo: 3 * 60,
  },
  {
    icon: Pencil,
    color: "bg-brand-brick/10 text-brand-brick",
    title: "تحديث فعالية",
    desc: "تعديل جدول الجلسات — ورشة ريادة الأعمال",
    minutesAgo: 26 * 60,
  },
  {
    icon: CalendarPlus,
    color: "bg-primary/10 text-primary",
    title: "إنشاء فعالية جديدة",
    desc: "أُنشئت فعالية «لقاء المستثمرين» كمسودة",
    minutesAgo: 2 * 24 * 60,
  },
];

const RecentActivity = () => {
  const now = new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card rounded-2xl p-5 border border-border/50"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground">آخر الأنشطة</h3>
        </div>
        <span className="text-[10px] font-semibold bg-muted text-muted-foreground rounded-full px-2 py-0.5">
          بيانات تجريبية
        </span>
      </div>

      <div className="space-y-3">
        {DEMO_ACTIVITIES.map((item, i) => {
          const when = new Date(now.getTime() - item.minutesAgo * 60_000);
          return (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
                <p className="text-muted-foreground text-xs truncate">{item.desc}</p>
              </div>
              <span className="text-muted-foreground text-[10px] whitespace-nowrap mt-1">
                {formatRelativeTime(when, now)}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default RecentActivity;
