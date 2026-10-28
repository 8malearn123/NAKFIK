import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import SectionHeader, { SECTION_SPACING } from "./SectionHeader";
import { OCCASION_PHOTOS } from "./photos";
import type { InvitationDemo } from "./invitationDemo";

// معرض المناسبات بصور حقيقية: الضغط على صورة يضع المناسبة على البطاقة التجريبية
// فتتبعها بقية الأقسام (رسالة واتساب، قائمة الردود، البوابة).

type Props = { demo: InvitationDemo };

const OccasionsSection = ({ demo }: Props) => {
  const { copy, occasion, setOccasion } = demo;
  const { gallery } = copy;

  return (
    <section className={SECTION_SPACING}>
      <div className="container mx-auto px-4">
        <SectionHeader title={gallery.title} lede={gallery.lede} />

        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0">
          {copy.occasions.map((o, i) => {
            const item = gallery.items[o.key as keyof typeof gallery.items];
            const active = o.key === occasion.key;
            return (
              <motion.li
                key={o.key}
                className="w-[68%] shrink-0 snap-start sm:w-[40%] lg:w-auto"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setOccasion(o.key)}
                  className={cn(
                    "group relative block aspect-[3/4] w-full overflow-hidden rounded-[1.75rem] text-start shadow-[0_24px_50px_-28px_rgb(42_26_48/0.7)] transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4",
                    active && "ring-2 ring-brand-gold ring-offset-4 ring-offset-background",
                  )}
                >
                  <img
                    src={OCCASION_PHOTOS[o.key]}
                    alt={item.alt}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.07]"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/25 via-45% to-transparent" />
                  {/* ومضة ضوء تعبر الصورة عند المرور عليها */}
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-full motion-reduce:hidden" />
                  {active && (
                    <span className="absolute start-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-primary backdrop-blur">
                      {gallery.shown}
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <span className="block font-kufi text-[1.625rem] font-bold leading-tight">{o.label}</span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-white/75">{item.blurb}</span>
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default OccasionsSection;
