import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calendar, Ticket, Users, ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const HeroSection = () => {
  const { t, lang } = useLanguage();
  const words = (lang === "ar" ? ["فعالياتك", "مؤتمراتك", "ورش عملك", "معارضك", "حفلاتك"] : ["your events", "your conferences", "your workshops", "your exhibitions", "your concerts"]);
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center gradient-hero overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }} />
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 80, repeat: Infinity, ease: "linear" }} className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full border border-primary-foreground/5" />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 100, repeat: Infinity, ease: "linear" }} className="absolute -bottom-60 -left-40 w-[600px] h-[600px] rounded-full border border-primary-foreground/5" />
        <div className="absolute top-24 left-[15%] w-20 h-20 rounded-full bg-accent/15 blur-xl animate-float" />
        <div className="absolute top-40 right-[10%] w-16 h-16 rounded-full bg-teal/15 blur-xl animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute bottom-32 left-[30%] w-12 h-12 rounded-full bg-gold/20 blur-lg animate-float" style={{ animationDelay: "2.5s" }} />
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-purple-glow/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-accent/8 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-5 py-2 mb-8 border border-primary-foreground/20">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-primary-foreground/90 text-sm font-cairo">{t("hero.badge")}</span>
          </motion.div>

          <h1 className="font-cairo font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-primary-foreground leading-tight mb-6">
            <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
              {t("hero.headline")}
            </motion.span>
            <span className="block h-[1.2em] mt-2 relative overflow-hidden">
              {words.map((word, i) => (
                <motion.span key={word} className="absolute inset-0 text-gradient inline-block" initial={{ y: "100%", opacity: 0 }} animate={{ y: ["100%", "0%", "0%", "-100%"], opacity: [0, 1, 1, 0] }} transition={{ duration: 3, delay: i * 3, repeat: Infinity, repeatDelay: (words.length - 1) * 3, ease: [0.22, 1, 0.36, 1], times: [0, 0.12, 0.88, 1] }}>
                  {word}
                </motion.span>
              ))}
            </span>
          </h1>

          <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }} className="text-primary-foreground/70 text-lg sm:text-xl max-w-2xl mx-auto mb-10 font-cairo leading-relaxed">
            {t("hero.description")}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button variant="hero" size="xl" asChild>
              <Link to="/register" className="group">
                {t("hero.cta")}
                <Arrow className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/events">{t("hero.browseEvents")}</Link>
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.6 }} className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { icon: Calendar, value: "+500", label: t("hero.statsEvent") },
              { icon: Users, value: "+50K", label: t("hero.statsAttendee") },
              { icon: Ticket, value: "+100K", label: t("hero.statsTicket") },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.1 + i * 0.15, duration: 0.4 }} className="text-center">
                <stat.icon className="w-5 h-5 text-accent mx-auto mb-2" />
                <div className="font-cairo font-bold text-2xl text-primary-foreground">{stat.value}</div>
                <div className="text-primary-foreground/60 text-sm font-cairo">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
