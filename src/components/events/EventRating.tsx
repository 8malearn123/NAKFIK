import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getRatingSummary,
  getUserRating,
  saveRating,
  type EventRating as RatingEntry,
} from "@/lib/ratings";

interface Props {
  eventId: string;
  attended: boolean;
  userId?: string;
}

// صيغة عدد المقيمين بالعربية الصحيحة
const formatCount = (count: number, lang: string): string => {
  if (lang !== "ar") return count === 1 ? "1 rating" : `${count} ratings`;
  if (count === 1) return "تقييم واحد";
  if (count === 2) return "تقييمان";
  if (count <= 10) return `${count} تقييمات`;
  return `${count} تقييماً`;
};

const Stars = ({
  value,
  onSelect,
  size = "w-6 h-6",
}: {
  value: number;
  onSelect?: (v: number) => void;
  size?: string;
}) => (
  <div className="flex items-center gap-1" dir="ltr">
    {[1, 2, 3, 4, 5].map((s) => (
      <button
        key={s}
        type="button"
        disabled={!onSelect}
        onClick={() => onSelect?.(s)}
        className={onSelect ? "transition-transform hover:scale-110" : "cursor-default"}
        aria-label={`${s}/5`}
      >
        <Star
          className={`${size} transition-colors ${
            s <= value ? "fill-primary text-primary" : "text-muted-foreground/30"
          }`}
        />
      </button>
    ))}
  </div>
);

const EventRatingSection = ({ eventId, attended, userId }: Props) => {
  const { t, lang } = useLanguage();
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [myRating, setMyRating] = useState<RatingEntry | null>(null);
  const [editing, setEditing] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    setSummary(getRatingSummary(eventId));
    if (userId) {
      const mine = getUserRating(eventId, userId);
      setMyRating(mine);
      if (mine) {
        setStars(mine.stars);
        setComment(mine.comment);
      }
    }
  }, [eventId, userId]);

  const handleSubmit = () => {
    if (!userId) return;
    if (stars < 1) {
      toast.error(t("pgEventDetail.selectStars"));
      return;
    }
    const isUpdate = !!myRating;
    const saved = saveRating(eventId, userId, stars, comment);
    setMyRating(saved);
    setSummary(getRatingSummary(eventId));
    setEditing(false);
    toast.success(isUpdate ? t("pgEventDetail.ratingUpdated") : t("pgEventDetail.ratingSaved"));
  };

  const showForm = attended && userId && (!myRating || editing);
  const showMyRating = attended && userId && myRating && !editing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-background rounded-2xl border border-border/50 p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-primary" />
        <h2 className="font-bold text-foreground">{t("pgEventDetail.ratingTitle")}</h2>
      </div>

      {/* المتوسط وعدد المقيمين */}
      {summary.count > 0 ? (
        <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
          <Stars value={Math.round(summary.average)} size="w-5 h-5" />
          <span className="font-bold text-foreground text-lg" dir="ltr">
            {summary.average}
          </span>
          <span className="text-xs text-muted-foreground">
            ({formatCount(summary.count, lang)})
          </span>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("pgEventDetail.noRatingsYet")}</p>
      )}

      {/* نموذج التقييم — للحضور فقط */}
      {showForm && (
        <div className="space-y-3 pt-1">
          <p className="text-sm font-semibold text-foreground">
            {t("pgEventDetail.yourRating")}
          </p>
          <Stars value={stars} onSelect={setStars} />
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("pgEventDetail.commentPlaceholder")}
            maxLength={300}
            rows={3}
            className="rounded-xl"
          />
          <Button className="rounded-full" onClick={handleSubmit}>
            {myRating
              ? t("pgEventDetail.updateRating")
              : t("pgEventDetail.submitRating")}
          </Button>
        </div>
      )}

      {/* تقييمي المحفوظ */}
      {showMyRating && (
        <div className="space-y-2 pt-1">
          <p className="text-sm font-semibold text-foreground">
            {t("pgEventDetail.yourRating")}
          </p>
          <div className="flex items-center justify-between gap-3 bg-primary/5 border border-primary/10 rounded-xl p-3">
            <div className="space-y-1 min-w-0">
              <Stars value={myRating.stars} size="w-4 h-4" />
              {myRating.comment && (
                <p className="text-sm text-muted-foreground break-words">{myRating.comment}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full shrink-0"
              onClick={() => setEditing(true)}
            >
              {t("pgEventDetail.editRating")}
            </Button>
          </div>
        </div>
      )}

      {/* غير الحضور */}
      {!attended && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-3 text-center">
          {t("pgEventDetail.attendeesOnly")}
        </p>
      )}
    </motion.div>
  );
};

export default EventRatingSection;
