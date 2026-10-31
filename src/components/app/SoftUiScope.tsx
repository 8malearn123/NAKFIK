import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// الشاشات الداخلية فقط؛ الصفحات العامة تبقى بهويتها
const INTERNAL = /^\/(dashboard|admin|my(\/|-|$)|favorites)/;

/** يفعّل النمط الناعم على body حتى تشمله النوافذ والقوائم المنبثقة */
const SoftUiScope = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    document.body.classList.toggle("soft-ui", INTERNAL.test(pathname));
  }, [pathname]);
  return null;
};

export default SoftUiScope;
