import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Unlock } from "lucide-react";

interface ResizeDialogProps {
  open: boolean;
  imageWidth: number;
  imageHeight: number;
  onClose: () => void;
  onApply: (w: number, h: number) => void;
}

export function ResizeDialog({
  open,
  imageWidth,
  imageHeight,
  onClose,
  onApply,
}: ResizeDialogProps) {
  const [width, setWidth] = useState(imageWidth);
  const [height, setHeight] = useState(imageHeight);
  const [lockRatio, setLockRatio] = useState(true);
  const ratio = imageWidth / imageHeight;

  useEffect(() => {
    setWidth(imageWidth);
    setHeight(imageHeight);
  }, [imageWidth, imageHeight, open]);

  const handleWidthChange = (v: number) => {
    setWidth(v);
    if (lockRatio) setHeight(Math.round(v / ratio));
  };

  const handleHeightChange = (v: number) => {
    setHeight(v);
    if (lockRatio) setWidth(Math.round(v * ratio));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-border bg-card sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm">Resize Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                Width
              </label>
              <Input
                type="number"
                min={1}
                value={width}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setLockRatio(!lockRatio)}
              title={lockRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
            >
              {lockRatio ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <Unlock className="h-3.5 w-3.5" />
              )}
            </Button>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                Height
              </label>
              <Input
                type="number"
                min={1}
                value={height}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <p className="text-center font-mono text-[10px] text-muted-foreground">
            {imageWidth} × {imageHeight} → {width} × {height}
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                if (width > 0 && height > 0) {
                  onApply(width, height);
                  onClose();
                }
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
