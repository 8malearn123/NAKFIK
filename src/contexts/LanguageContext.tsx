import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { ar } from "@/i18n/ar";
import { en } from "@/i18n/en";

type Lang = "ar" | "en";
type TranslationKeys = typeof ar;

interface LanguageContextType {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: (key: string) => string;
  toggleLang: () => void;
  setLang: (lang: Lang) => void;
}

const translations: Record<Lang, TranslationKeys> = { ar, en };

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  dir: "rtl",
  t: (key: string) => key,
  toggleLang: () => {},
  setLang: () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("nakfeek-lang");
    return (saved === "en" ? "en" : "ar") as Lang;
  });

  const dir = lang === "ar" ? "rtl" : "ltr";

  // طبّق اللغة المحفوظة على الصفحة عند التحميل (وليس فقط عند التبديل)
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang, dir]);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split(".");
      let value: any = translations[lang];
      for (const k of keys) {
        value = value?.[k];
      }
      if (typeof value === "string") return value;
      // Fallback to Arabic
      let fallback: any = translations.ar;
      for (const k of keys) {
        fallback = fallback?.[k];
      }
      return typeof fallback === "string" ? fallback : key;
    },
    [lang]
  );

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next = prev === "ar" ? "en" : "ar";
      localStorage.setItem("nakfeek-lang", next);
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = next;
      return next;
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("nakfeek-lang", l);
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = l;
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, dir, t, toggleLang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};
