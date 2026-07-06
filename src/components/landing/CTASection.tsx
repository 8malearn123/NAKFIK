import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const CTASection = () => {
  const { t, lang } = useLanguage();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="relative gradient-hero rounded-3xl p-10 md:p-16 text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-accent/10 translate-y-1/3 -translate-x-1/4" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-primary-foreground/80 text-sm font-cairo">{t("cta.badge")}</span>
            </div>
            <h2 className="font-cairo font-extrabold text-3xl md:text-4xl lg:text-5xl text-primary-foreground mb-5 leading-tight">
              {t("cta.title1")}
              <br />
              <span className="text-gradient">{t("cta.title2")}</span>
            </h2>
            <p className="text-primary-foreground/65 text-lg max-w-xl mx-auto mb-8 font-cairo">{t("cta.subtitle")}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/register" className="group">
                  {t("cta.primary")}
                  <Arrow className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="lg" asChild>
                <Link to="/events">{t("cta.secondary")}</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
