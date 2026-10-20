import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Copy, Download, X, ArrowRight, User, CalendarDays, MapPin, QrCode, Phone, Mail, Globe } from "lucide-react";
import BrandLogo, { brandLogoSrc } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";

/* دليل الهوية البصرية — Ticket by Nakfeek Commercial */

const colors = [
  { name: "بنفسجي تيكت", role: "اللون الأساسي — كلمة ticket", hex: "#492C5A", rgb: "73 · 44 · 90", cls: "bg-[#492C5A] text-white" },
  { name: "الذهبي", role: "الضربة المميزة على حرف k", hex: "#CC8E3D", rgb: "204 · 142 · 61", cls: "bg-[#CC8E3D] text-white" },
  { name: "العنابي", role: "سطر By Nakfeek Commercial", hex: "#A03C4A", rgb: "160 · 60 · 74", cls: "bg-[#A03C4A] text-white" },
  { name: "الليلي", role: "الخلفيات الداكنة والقوائم", hex: "#24132F", rgb: "36 · 19 · 47", cls: "bg-[#24132F] text-white" },
  { name: "الوردي الفاتح", role: "السطر الفرعي على الداكن", hex: "#E9C3C9", rgb: "233 · 195 · 201", cls: "bg-[#E9C3C9] text-[#492C5A]" },
  { name: "الخلفية", role: "خلفية الواجهات الفاتحة", hex: "#FAF8FC", rgb: "250 · 248 · 252", cls: "bg-[#FAF8FC] text-[#492C5A] border border-border" },
];

const logos = [
  { title: "الشعار الكامل", note: "الاستخدام الافتراضي على الخلفيات الفاتحة", src: brandLogoSrc.full.color, file: "ticket-full.svg", dark: false, h: "h-24" },
  { title: "الشعار الكامل — أبيض", note: "للخلفيات البنفسجية والداكنة والصور", src: brandLogoSrc.full.white, file: "ticket-full-white.svg", dark: true, h: "h-24" },
  { title: "الكلمة فقط", note: "للمساحات الأفقية الضيقة كشريط التنقل", src: brandLogoSrc.wordmark.color, file: "ticket-wordmark.svg", dark: false, h: "h-16" },
  { title: "الكلمة فقط — أبيض", note: "للقوائم الجانبية والعناوين الداكنة", src: brandLogoSrc.wordmark.white, file: "ticket-wordmark-white.svg", dark: true, h: "h-16" },
  { title: "أيقونة التطبيق", note: "الأيقونة والصورة الرمزية والقوائم المطوية", src: brandLogoSrc.mark.color, file: "ticket-mark.svg", dark: false, h: "h-24" },
  { title: "الرمز بدون خلفية", note: "للختم والعلامة المائية والطباعة الصغيرة", src: brandLogoSrc.markPlain.color, file: "ticket-mark-plain.svg", dark: false, h: "h-24" },
];

const donts: { label: string; style: React.CSSProperties; busy?: boolean }[] = [
  { label: "لا تمطّ الشعار أو تضغطه", style: { transform: "scaleX(1.45)" } },
  { label: "لا تغيّر ألوان الشعار", style: { filter: "hue-rotate(140deg) saturate(1.6)" } },
  { label: "لا تُدِر الشعار", style: { transform: "rotate(-14deg)" } },
  { label: "لا تضع الشعار الملوّن على خلفية مزدحمة", busy: true, style: {} },
];

const Section = ({ id, kicker, title, desc, children }: { id: string; kicker: string; title: string; desc?: string; children: React.ReactNode }) => (
  <section id={id} className="py-16 md:py-20 border-t border-border/60">
    <div className="container mx-auto px-4 max-w-6xl">
      <div className="mb-10 max-w-2xl">
        <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-accent">
          <span className="inline-block w-6 h-1 rounded-full bg-accent -rotate-[31deg]" />
          {kicker}
        </span>
        <h2 className="font-display text-3xl md:text-4xl text-primary mt-3">{title}</h2>
        {desc && <p className="text-muted-foreground mt-3 leading-relaxed">{desc}</p>}
      </div>
      {children}
    </div>
  </section>
);

const ColorSwatch = ({ c }: { c: (typeof colors)[number] }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(c.hex).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }).catch(() => {});
  };
  return (
    <button onClick={copy} className="group text-start rounded-2xl overflow-hidden bg-card border border-border/60 shadow-sm hover:shadow-elegant transition-shadow">
      <div className={cn("h-28 p-4 flex items-start justify-between", c.cls)}>
        <span className="font-inter font-bold text-lg" dir="ltr">{c.hex}</span>
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 opacity-0 group-hover:opacity-80 transition-opacity" />}
      </div>
      <div className="p-4">
        <p className="font-bold text-foreground">{c.name}</p>
        <p className="text-xs text-muted-foreground mt-1">{c.role}</p>
        <p className="text-[11px] text-muted-foreground/80 mt-2 font-inter" dir="ltr">RGB {c.rgb}</p>
      </div>
    </button>
  );
};

/* ===== التطبيقات ===== */

const TicketMockup = () => (
  <div className="relative mx-auto w-full max-w-[560px] rounded-3xl overflow-hidden shadow-elegant flex bg-card" dir="rtl">
    <div className="relative flex-1 gradient-hero p-6 text-white overflow-hidden">
      <div className="absolute inset-0 bg-brand-pattern opacity-40" />
      <div className="brand-slash absolute -top-3 -left-10 w-3/4 h-4 opacity-90" />
      <div className="relative">
        <BrandLogo variant="wordmark" tone="white" className="h-7" />
        <p className="mt-6 text-[11px] text-white/60">تذكرة دخول</p>
        <h4 className="font-display text-2xl leading-tight mt-1">ملتقى الرياض للابتكار</h4>
        <div className="mt-5 space-y-2 text-sm text-white/85">
          <p className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-accent" /> الخميس ١٢ ديسمبر · ٧:٠٠ م</p>
          <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-accent" /> مركز الملك عبدالعزيز الدولي</p>
        </div>
        <div className="mt-5 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-bold">VIP</div>
      </div>
    </div>
    {/* خط القص */}
    <div className="w-0 my-4 border-s-2 border-dashed border-border" />
    <div className="w-40 p-5 flex flex-col items-center justify-center gap-3">
      <div className="w-24 h-24 rounded-xl border-2 border-primary/15 flex items-center justify-center">
        <QrCode className="w-16 h-16 text-primary" strokeWidth={1.4} />
      </div>
      <p className="text-[10px] text-muted-foreground font-inter" dir="ltr">TK-2026-0412</p>
      <BrandLogo variant="mark" className="h-8 w-8 rounded-lg" />
    </div>
  </div>
);

const BusinessCards = () => (
  <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
    <div className="relative w-[320px] h-[185px] rounded-2xl gradient-hero overflow-hidden shadow-elegant flex items-center justify-center">
      <div className="absolute inset-0 bg-brand-pattern opacity-30" />
      <div className="brand-slash absolute top-6 -left-12 w-2/3 h-3 opacity-80" />
      <BrandLogo tone="white" className="relative h-20" />
    </div>
    <div className="relative w-[320px] h-[185px] rounded-2xl bg-card border border-border/60 overflow-hidden shadow-elegant p-5 flex flex-col justify-between" dir="rtl">
      <div className="brand-slash absolute -bottom-2 -right-10 w-1/2 h-3 opacity-80" />
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-primary text-lg">سارة العتيبي</p>
          <p className="text-xs text-[#A03C4A] font-semibold">مديرة الشراكات</p>
        </div>
        <BrandLogo variant="mark" className="h-10 w-10 rounded-xl" />
      </div>
      <div className="space-y-1 text-[11px] text-muted-foreground font-inter" dir="ltr">
        <p className="flex items-center gap-2 justify-end">+966 5X XXX XXXX <Phone className="w-3 h-3 text-accent" /></p>
        <p className="flex items-center gap-2 justify-end">hello@nakfeek.sa <Mail className="w-3 h-3 text-accent" /></p>
        <p className="flex items-center gap-2 justify-end">nakfeek.sa <Globe className="w-3 h-3 text-accent" /></p>
      </div>
    </div>
  </div>
);

const BadgeMockup = () => (
  <div className="relative mx-auto w-[230px] rounded-3xl bg-card shadow-elegant overflow-hidden border border-border/60" dir="rtl">
    <div className="relative h-28 gradient-hero overflow-hidden flex items-start justify-center pt-4">
      <div className="absolute inset-0 bg-brand-pattern opacity-30" />
      <span className="relative w-14 h-2.5 rounded-full bg-background/90" />
      <div className="brand-slash absolute bottom-6 -left-8 w-3/4 h-3 opacity-90" />
    </div>
    <div className="-mt-10 flex justify-center relative">
      <div className="w-20 h-20 rounded-full bg-secondary border-4 border-card flex items-center justify-center text-primary"><User className="w-9 h-9" /></div>
    </div>
    <div className="p-5 pt-3 text-center">
      <p className="font-bold text-lg text-primary">محمد العمري</p>
      <p className="text-xs text-muted-foreground">متحدث</p>
      <div className="mt-3 inline-flex rounded-full bg-[#A03C4A] text-white text-[11px] font-bold px-3 py-1">SPEAKER</div>
      <div className="mt-4 pt-4 border-t border-border/60 flex justify-center">
        <BrandLogo variant="wordmark" className="h-6" />
      </div>
    </div>
  </div>
);

const SocialPost = () => (
  <div className="relative mx-auto w-[300px] h-[300px] rounded-3xl overflow-hidden shadow-elegant gradient-hero text-white p-6 flex flex-col justify-between" dir="rtl">
    <div className="absolute inset-0 bg-brand-pattern opacity-35" />
    <div className="brand-slash absolute top-[30%] -left-16 w-[120%] h-8 opacity-90" />
    <BrandLogo variant="wordmark" tone="white" className="relative h-7 self-start" />
    <div className="relative">
      <p className="text-xs text-white/70">التسجيل مفتوح الآن</p>
      <h4 className="font-display text-3xl leading-tight mt-1">نكفيك كل ما يخص <span className="text-gradient">فعاليتك</span></h4>
    </div>
  </div>
);

const AppIcon = () => (
  <div className="flex items-end justify-center gap-6">
    {[96, 64, 40, 24].map((s) => (
      <div key={s} className="flex flex-col items-center gap-2">
        <img src={brandLogoSrc.mark.color} alt="" style={{ width: s, height: s }} className="rounded-[22%] shadow-elegant" />
        <span className="text-[10px] text-muted-foreground font-inter">{s}px</span>
      </div>
    ))}
  </div>
);

const BrandGuidelines = () => (
  <div className="min-h-screen bg-background font-cairo" dir="rtl">
    {/* Header */}
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border/50">
      <div className="container mx-auto px-4 max-w-6xl h-16 flex items-center justify-between">
        <Link to="/"><BrandLogo variant="wordmark" className="h-8" /></Link>
        <nav className="hidden md:flex gap-6 text-sm text-foreground/70">
          {[["logo", "الشعار"], ["colors", "الألوان"], ["motif", "العنصر المميز"], ["type", "الخطوط"], ["usage", "الاستخدام"], ["apps", "التطبيقات"]].map(([id, l]) => (
            <a key={id} href={`#${id}`} className="hover:text-primary transition-colors">{l}</a>
          ))}
        </nav>
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> الرئيسية
        </Link>
      </div>
    </header>

    {/* Hero */}
    <section className="relative gradient-hero overflow-hidden">
      <div className="absolute inset-0 bg-brand-pattern opacity-40" />
      <motion.div initial={{ opacity: 0, x: -120 }} animate={{ opacity: 0.95, x: 0 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} className="brand-slash absolute top-[20%] -left-[10%] w-[60%] h-7" />
      <div className="brand-slash absolute bottom-[12%] -right-[12%] w-[38%] h-4 opacity-40" />
      <div className="relative container mx-auto px-4 max-w-6xl py-24 md:py-32 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <BrandLogo tone="white" className="h-32 md:h-44 mx-auto drop-shadow-[0_18px_40px_rgba(0,0,0,0.3)]" />
          <h1 className="font-display text-3xl md:text-5xl text-white mt-10">دليل الهوية البصرية</h1>
          <p className="text-white/70 mt-4 max-w-xl mx-auto leading-relaxed">
            مرجع موحّد لاستخدام شعار <span className="font-inter font-semibold" dir="ltr">Ticket by Nakfeek Commercial</span> وألوانه وعناصره في المنصة وجميع المواد التسويقية والمطبوعات.
          </p>
        </motion.div>
      </div>
    </section>

    {/* Story */}
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4 max-w-6xl grid md:grid-cols-2 gap-10 items-center">
        <div>
          <span className="text-xs font-bold tracking-widest text-accent">فكرة الشعار</span>
          <h2 className="font-display text-3xl md:text-4xl text-primary mt-3">ضربة واحدة… تختصر التجربة</h2>
          <p className="text-muted-foreground mt-4 leading-loose">
            يقوم الشعار على كلمة <b className="text-primary font-inter">ticket</b> بحروف دائرية ودودة، تعبّر عن السهولة والقرب من الجمهور.
            وفي قلبها تعبر <b className="text-accent">الضربة الذهبية</b> حرف <b className="text-primary font-inter">k</b> كأنها علامة تأكيد ✓ وقصاصة تذكرة في آنٍ واحد —
            رمزاً للحضور المؤكد والدخول السلس. أما سطر <b className="text-[#A03C4A] font-inter">By Nakfeek Commercial</b> فيمنح العلامة جذورها وثقتها.
          </p>
        </div>
        <div className="relative rounded-3xl bg-card border border-border/60 shadow-card p-10 flex items-center justify-center overflow-hidden">
          <BrandLogo className="h-36" />
        </div>
      </div>
    </section>

    <Section id="logo" kicker="01 — الشعار" title="نسخ الشعار" desc="استخدم النسخة المناسبة للخلفية والمساحة. جميع الملفات متجهية (SVG) وتحافظ على حدّتها بأي مقاس.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {logos.map((l) => (
          <div key={l.file} className="rounded-2xl overflow-hidden border border-border/60 bg-card shadow-sm">
            <div className={cn("h-48 flex items-center justify-center p-8 relative overflow-hidden", l.dark ? "gradient-hero" : "bg-[#FAF8FC]")}>
              {l.dark && <div className="absolute inset-0 bg-brand-pattern opacity-25" />}
              <img src={l.src} alt={l.title} className={cn("relative max-w-full w-auto", l.h, l.file.includes("mark") && "rounded-2xl")} />
            </div>
            <div className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-foreground">{l.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{l.note}</p>
              </div>
              <a href={l.src} download={l.file} className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-secondary text-secondary-foreground px-3 py-1.5 text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
                <Download className="w-3.5 h-3.5" /> SVG
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-8">
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <p className="font-bold text-foreground mb-1">المساحة الآمنة</p>
          <p className="text-xs text-muted-foreground mb-5">اترك حول الشعار مسافة لا تقل عن ارتفاع حرف <span className="font-inter">t</span> الصغير، ولا يدخلها أي عنصر.</p>
          <div className="relative mx-auto w-fit p-10 border-2 border-dashed border-accent/50 rounded-xl bg-[#FAF8FC]">
            <BrandLogo className="h-20" />
            {["top-1 left-1/2 -translate-x-1/2", "bottom-1 left-1/2 -translate-x-1/2", "left-1 top-1/2 -translate-y-1/2", "right-1 top-1/2 -translate-y-1/2"].map((p) => (
              <span key={p} className={cn("absolute text-[10px] font-bold text-accent font-inter", p)}>x</span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <p className="font-bold text-foreground mb-1">الحد الأدنى للمقاس</p>
          <p className="text-xs text-muted-foreground mb-5">تحت هذه المقاسات استخدم الأيقونة بدل الشعار الكامل حتى يبقى السطر الفرعي مقروءاً.</p>
          <div className="flex items-end justify-around gap-4 py-4">
            <div className="text-center"><BrandLogo className="h-[56px] mx-auto" /><p className="text-[10px] text-muted-foreground mt-2 font-inter">Full · 120px / 30mm</p></div>
            <div className="text-center"><BrandLogo variant="wordmark" className="h-[28px] mx-auto" /><p className="text-[10px] text-muted-foreground mt-2 font-inter">Wordmark · 80px / 20mm</p></div>
            <div className="text-center"><BrandLogo variant="mark" className="h-[24px] mx-auto rounded-md" /><p className="text-[10px] text-muted-foreground mt-2 font-inter">Icon · 16px</p></div>
          </div>
        </div>
      </div>
    </Section>

    <Section id="colors" kicker="02 — الألوان" title="لوحة الألوان" desc="الألوان مستخرجة مباشرة من الشعار. البنفسجي هو لون العلامة الأساسي، والذهبي للتمييز والأزرار الرئيسية، والعنابي للتفاصيل الثانوية. اضغط على أي لون لنسخ قيمته.">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {colors.map((c) => <ColorSwatch key={c.hex} c={c} />)}
      </div>
      <div className="mt-6 h-4 rounded-full overflow-hidden flex">
        <span className="bg-[#492C5A]" style={{ flex: 6 }} />
        <span className="bg-[#24132F]" style={{ flex: 2 }} />
        <span className="bg-[#FAF8FC] border-y border-border" style={{ flex: 4 }} />
        <span className="bg-[#CC8E3D]" style={{ flex: 1.4 }} />
        <span className="bg-[#A03C4A]" style={{ flex: 0.8 }} />
      </div>
      <p className="text-xs text-muted-foreground mt-2">نسبة الاستخدام المقترحة في التصاميم</p>
    </Section>

    <Section id="motif" kicker="03 — العنصر المميز" title="الضربة الذهبية" desc="نأخذ الضربة الذهبية من حرف k ونستخدمها عنصراً تصميمياً مستقلاً بنفس الزاوية (٣١°): كخط يعبر الأغلفة، أو نمط خلفية خفيف، أو فاصل بين الأقسام.">
      <div className="grid md:grid-cols-3 gap-5">
        <div className="relative h-56 rounded-2xl gradient-hero overflow-hidden">
          <div className="brand-slash absolute top-1/2 -left-10 w-[120%] h-8 -translate-y-1/2" />
          <span className="absolute bottom-3 start-4 text-xs text-white/70">ضربة عابرة للغلاف</span>
        </div>
        <div className="relative h-56 rounded-2xl gradient-hero overflow-hidden">
          <div className="absolute inset-0 bg-brand-pattern" />
          <span className="absolute bottom-3 start-4 text-xs text-white/70">نمط الخلفية</span>
        </div>
        <div className="relative h-56 rounded-2xl bg-[#FAF8FC] border border-border/60 overflow-hidden flex flex-col items-center justify-center gap-5">
          <h4 className="font-display text-2xl text-primary">عنوان القسم</h4>
          <span className="w-14 h-1.5 rounded-full bg-accent -rotate-[31deg]" />
          <span className="absolute bottom-3 start-4 text-xs text-muted-foreground">فاصل وعلامة عنوان</span>
        </div>
      </div>
    </Section>

    <Section id="type" kicker="04 — الخطوط" title="الخطوط" desc="خط الشعار دائري هندسي مرسوم خصيصاً ولا يُكتب به نص. للنصوص نستخدم Cairo للعربية لتناغمه مع استدارة الشعار، وInter للأرقام والنص اللاتيني.">
      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-border/60 bg-card p-8">
          <p className="text-xs text-muted-foreground">العربية — Cairo</p>
          <p className="font-display text-6xl text-primary mt-4">أ ب ت</p>
          <p className="text-2xl font-bold text-foreground mt-4">نكفيك كل ما يخص فعالياتك</p>
          <p className="text-muted-foreground mt-2">عناوين: ExtraBold 800 · فرعية: Bold 700 · نص: Regular 400</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-8" dir="ltr">
          <p className="text-xs text-muted-foreground">Latin & Numerals — Inter</p>
          <p className="font-inter font-extrabold text-6xl text-primary mt-4">Aa 123</p>
          <p className="font-inter text-2xl font-bold text-foreground mt-4">Your event, handled.</p>
          <p className="font-inter text-muted-foreground mt-2">Headings: Bold 700 · Body: Regular 400</p>
        </div>
      </div>
    </Section>

    <Section id="usage" kicker="05 — الاستخدام" title="الاستخدام الصحيح والخاطئ">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="rounded-2xl border-2 border-teal/40 bg-card overflow-hidden">
          <div className="h-36 bg-[#FAF8FC] flex items-center justify-center"><BrandLogo className="h-16" /></div>
          <p className="p-3 text-sm flex items-center gap-2"><Check className="w-4 h-4 text-teal" /> الملوّن على خلفية فاتحة</p>
        </div>
        <div className="rounded-2xl border-2 border-teal/40 bg-card overflow-hidden">
          <div className="h-36 gradient-hero flex items-center justify-center"><BrandLogo tone="white" className="h-16" /></div>
          <p className="p-3 text-sm flex items-center gap-2"><Check className="w-4 h-4 text-teal" /> الأبيض على البنفسجي</p>
        </div>
        {donts.map((d) => (
          <div key={d.label} className="rounded-2xl border-2 border-destructive/30 bg-card overflow-hidden">
            <div className={cn("h-36 flex items-center justify-center overflow-hidden", d.busy ? "bg-[repeating-linear-gradient(45deg,#CC8E3D_0_14px,#A03C4A_14px_28px,#492C5A_28px_42px)]" : "bg-[#FAF8FC]")}>
              <img src={brandLogoSrc.full.color} alt="" className="h-14 w-auto" style={d.style} />
            </div>
            <p className="p-3 text-sm flex items-center gap-2"><X className="w-4 h-4 text-destructive" /> {d.label}</p>
          </div>
        ))}
      </div>
    </Section>

    <Section id="apps" kicker="06 — التطبيقات" title="الهوية على أرض الواقع" desc="نماذج لتطبيق الهوية على أهم نقاط التواصل في المنصة.">
      <div className="space-y-6">
        <div className="rounded-3xl bg-muted/40 p-6 md:p-10">
          <p className="text-sm font-bold text-foreground mb-6">تذكرة الدخول الرقمية</p>
          <TicketMockup />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-muted/40 p-6 md:p-10">
            <p className="text-sm font-bold text-foreground mb-6">بطاقة العمل</p>
            <BusinessCards />
          </div>
          <div className="rounded-3xl bg-muted/40 p-6 md:p-10 grid sm:grid-cols-2 gap-6 items-center">
            <div>
              <p className="text-sm font-bold text-foreground mb-6">بطاقة الحضور</p>
              <BadgeMockup />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-6">منشور التواصل الاجتماعي</p>
              <div className="scale-[0.8] origin-top"><SocialPost /></div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl bg-muted/40 p-6 md:p-10">
          <p className="text-sm font-bold text-foreground mb-6">أيقونة التطبيق والمتصفح</p>
          <AppIcon />
        </div>
      </div>
    </Section>

    <footer className="relative gradient-hero overflow-hidden">
      <div className="absolute inset-0 bg-brand-pattern opacity-25" />
      <div className="relative container mx-auto px-4 max-w-6xl py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <BrandLogo tone="white" className="h-14" />
        <p className="text-white/60 text-sm">© Nakfeek Commercial — دليل الهوية البصرية</p>
      </div>
    </footer>
  </div>
);

export default BrandGuidelines;
