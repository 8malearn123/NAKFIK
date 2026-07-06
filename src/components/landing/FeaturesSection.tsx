import { motion } from "framer-motion";
import { Calendar, QrCode, Shield, Users, BarChart3, Mail, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const icons = [Calendar, QrCode, Shield, Users, BarChart3, Mail];
const colors = [
  { color: "bg-primary/10 text-primary", borderHover: "hover:border-primary/40" },
  { color: "bg-teal/10 text-teal", borderHover: "hover:border-teal/40" },
  { color: "bg-accent/10 text-accent", borderHover: "hover:border-accent/40" },
  { color: "bg-destructive/10 text-destructive", borderHover: "hover:border-destructive/40" },
  { color: "bg-purple-glow/10 text-purple-glow", borderHover: "hover:border-purple-glow/40" },
  { color: "bg-gold/10 text-gold", borderHover: "hover:border-gold/40" },
];

const FeaturesSection = () => {
  const { t, lang } = useLanguage();
  const items = (lang === "ar"
    ? [
        { title: "إنشاء فعاليات بسهولة", desc: "أنشئ فعاليتك في دقائق مع نموذج متعدد الخطوات يشمل كل التفاصيل" },
        { title: "تسجيل حضور بـ QR", desc: "كل مسجّل يحصل على رمز QR فريد — مسح سريع وتوثيق فوري للحضور" },
        { title: "فعاليات عامة وخاصة", desc: "فعاليات عامة تُنشر في السوق أو خاصة بروابط دعوة شخصية" },
        { title: "إدارة فريق العمل", desc: "أضف فريقك بأدوار مختلفة: مدير فعاليات، موظف تسجيل حضور، مُحلّل تقارير" },
        { title: "تقارير وتحليلات", desc: "لوحة تحكم متقدمة مع رسوم بيانية للتسجيلات والإيرادات والحضور" },
        { title: "إشعارات تلقائية", desc: "رسائل تأكيد وتذكير وشهادات — عبر البريد الإلكتروني والرسائل النصية" },
      ]
    : [
        { title: "Create Events Easily", desc: "Create your event in minutes with a multi-step form covering all details" },
        { title: "QR Check-in", desc: "Each registrant gets a unique QR code — quick scan and instant attendance tracking" },
        { title: "Public & Private Events", desc: "Public events listed in the marketplace or private with personal invitation links" },
        { title: "Team Management", desc: "Add your team with different roles: event manager, check-in staff, report analyst" },
        { title: "Reports & Analytics", desc: "Advanced dashboard with charts for registrations, revenue, and attendance" },
        { title: "Auto Notifications", desc: "Confirmation, reminder, and certificate messages — via email and SMS" },
      ]);
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <section id="features" className="py-28 bg-background relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl pointer-events-none" />
      <div className="container mx-auto px-4 relative">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <span className="inline-block bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-cairo font-semibold mb-4">{t("features.badge")}</span>
          <h2 className="font-cairo font-bold text-3xl md:text-4xl text-foreground mb-4">{t("features.title")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto font-cairo">{t("features.subtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => {
            const Icon = icons[i];
            const c = colors[i];
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }} className={`group bg-card rounded-2xl p-7 border border-border/50 ${c.borderHover} hover:shadow-xl transition-all duration-300`}>
                <div className={`w-14 h-14 rounded-2xl ${c.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="font-cairo font-bold text-lg text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm font-cairo leading-relaxed">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mt-14">
          <Button variant="default" size="lg" className="rounded-full" asChild>
            <Link to="/register" className="group">
              {t("features.cta")}
              <Arrow className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
