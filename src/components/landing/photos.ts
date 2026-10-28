import closingHall from "@/assets/landing/closing-hall.webp";
import featureDoor from "@/assets/landing/feature-door.webp";
import heroHall from "@/assets/landing/hero-hall.webp";
import forum from "@/assets/landing/occasion-forum.webp";
import graduation from "@/assets/landing/occasion-graduation.webp";
import milka from "@/assets/landing/occasion-milka.webp";
import opening from "@/assets/landing/occasion-opening.webp";
import wedding from "@/assets/landing/occasion-wedding.webp";

// صور حقيقية من Unsplash برخصة Unsplash (استخدام تجاري مجاني بلا إذن مسبق)،
// مقصوصة ومضغوطة للصفحة. تُستبدل بصور فعاليات نكفيك متى توفرت: نفس اسم الملف يكفي.

// ISKRA Photography — https://unsplash.com/photos/iXTkKQyVqbM
export const HERO_PHOTO = heroHall;

// Alessia Cocconi — https://unsplash.com/photos/vf8vmRXy3Jk
export const CLOSING_PHOTO = closingHall;

// Franco Debartolo — https://unsplash.com/photos/Glzj5O1g9EA
export const DOOR_PHOTO = featureDoor;

export const OCCASION_PHOTOS: Record<string, string> = {
  // Omar Rodriguez — https://unsplash.com/photos/XYuNwlYtfLI
  wedding,
  // L Photography — https://unsplash.com/photos/URncnSvN6Kw
  milka,
  // RUT MIIT — https://unsplash.com/photos/oTglG1D4hRA
  graduation,
  // أخٌ في الله — https://unsplash.com/photos/TVvRvRncfPI
  opening,
  // AMONWAT DUMKRUT — https://unsplash.com/photos/pzwF2j9aYxk
  forum,
};
