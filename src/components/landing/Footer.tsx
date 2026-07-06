import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const supportItemsAr = ["مركز المساعدة", "تواصل معنا", "الأسئلة الشائعة", "الشروط والأحكام"];
const supportItemsEn = ["Help Center", "Contact Us", "FAQ", "Terms & Conditions"];

const Footer = () => {
  const { t, lang } = useLanguage();
  const supportItems = lang === "ar" ? supportItemsAr : supportItemsEn;

  return (
    <footer className="gradient-hero py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src={logo} alt={t("navbar.brand")} className="h-12 w-auto" />
            </Link>
            <p className="text-primary-foreground/60 text-sm font-cairo leading-relaxed">{t("footer.description")}</p>
          </div>

          <div>
            <h4 className="font-cairo font-bold text-primary-foreground mb-4">{t("footer.platform")}</h4>
            <ul className="space-y-2.5">
              {[
                { label: t("navbar.features"), href: "#features" },
                { label: t("navbar.pricing"), href: "#pricing" },
                { label: t("navbar.events"), href: "/events" },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.href} className="text-primary-foreground/50 hover:text-primary-foreground text-sm font-cairo transition-colors duration-200">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-cairo font-bold text-primary-foreground mb-4">{t("footer.support")}</h4>
            <ul className="space-y-2.5">
              {supportItems.map((item) => (
                <li key={item}>
                  <a href="#" className="text-primary-foreground/50 hover:text-primary-foreground text-sm font-cairo transition-colors duration-200">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-cairo font-bold text-primary-foreground mb-4">{t("footer.contact")}</h4>
            <ul className="space-y-2.5 text-sm font-cairo text-primary-foreground/50">
              <li>info@nakfeek.sa</li>
              <li dir="ltr" className="text-left">+966 50 000 0000</li>
              <li>{t("footer.location")}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-primary-foreground/40 text-sm font-cairo">
            © {new Date().getFullYear()} {t("footer.copyright")}
          </p>
          <div className="flex items-center gap-4 text-primary-foreground/30 text-xs font-cairo">
            <a href="#" className="hover:text-primary-foreground/60 transition-colors">{t("footer.privacy")}</a>
            <span>•</span>
            <a href="#" className="hover:text-primary-foreground/60 transition-colors">{t("footer.terms")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
