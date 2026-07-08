import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const NotFound = () => {
  const { t, dir } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted font-cairo" dir={dir}>
      <div className="text-center space-y-4">
        <div className="text-7xl font-bold text-primary">404</div>
        <h1 className="text-2xl font-bold text-foreground">{t("notFound.title")}</h1>
        <p className="text-muted-foreground max-w-md">
          {t("notFound.description")}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
        >
          {t("notFound.backHome")}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
