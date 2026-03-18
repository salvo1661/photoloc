import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: string, quality: number) => void;
}

export function ExportDialog({ open, onClose, onExport }: ExportDialogProps) {
  const [format, setFormat] = useState("png");
  const [quality, setQuality] = useState(92);

  const isLossy = format === "jpeg" || format === "webp";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-border bg-card sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Export Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">
              Format
            </label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG (Lossless)</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLossy && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Quality</label>
                <span className="font-mono text-xs text-muted-foreground">
                  {quality}%
                </span>
              </div>
              <Slider
                min={10}
                max={100}
                step={1}
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
              />
            </div>
          )}

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
                onExport(format, isLossy ? quality : 100);
                onClose();
              }}
            >
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
