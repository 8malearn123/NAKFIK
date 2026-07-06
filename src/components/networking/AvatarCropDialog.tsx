import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, RotateCw, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropped: (blob: Blob) => Promise<void> | void;
}

async function getCroppedBlob(src: string, area: Area, rotation: number): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // Fill (in case of rotation gaps)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  if (rotation) {
    // draw rotated then crop via temp canvas
    const tmp = document.createElement("canvas");
    const rad = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    tmp.width = img.width * cos + img.height * sin;
    tmp.height = img.width * sin + img.height * cos;
    const tctx = tmp.getContext("2d")!;
    tctx.translate(tmp.width / 2, tmp.height / 2);
    tctx.rotate(rad);
    tctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.drawImage(tmp, area.x, area.y, area.width, area.height, 0, 0, size, size);
  } else {
    ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  }
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92));
}

export default function AvatarCropDialog({ open, imageSrc, onClose, onCropped }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const handleSave = async () => {
    if (!imageSrc || !area) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, area, rotation);
      await onCropped(blob);
      onClose();
      // reset state for next time
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-w-md font-cairo" dir="rtl">
        <DialogHeader>
          <DialogTitle>اقتطاع صورة البطاقة</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-72 bg-muted rounded-xl overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
            <Slider value={[zoom]} min={1} max={3} step={0.05} onValueChange={(v) => setZoom(v[0])} />
          </div>
          <div className="flex items-center gap-3">
            <RotateCw className="w-4 h-4 text-muted-foreground" />
            <Slider value={[rotation]} min={0} max={360} step={1} onValueChange={(v) => setRotation(v[0])} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 ms-2 animate-spin" /> : null}
            حفظ الصورة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
