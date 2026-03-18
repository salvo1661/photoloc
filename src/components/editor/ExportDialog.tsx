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
import type { Messages } from "@/i18n";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: string, quality: number) => void;
  messages: Messages;
}

export function ExportDialog({ open, onClose, onExport, messages }: ExportDialogProps) {
  const [format, setFormat] = useState("png");
  const [quality, setQuality] = useState(92);

  const isLossy = format === "jpeg" || format === "webp";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-border bg-card sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">{messages.ui.dialogs.export.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">
              {messages.ui.dialogs.export.format}
            </label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">{messages.ui.dialogs.export.formatPngLossless}</SelectItem>
                <SelectItem value="jpeg">{messages.ui.dialogs.export.formatJpeg}</SelectItem>
                <SelectItem value="webp">{messages.ui.dialogs.export.formatWebp}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLossy && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs text-muted-foreground">{messages.ui.dialogs.export.quality}</label>
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
              {messages.ui.dialogs.export.cancel}
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                onExport(format, isLossy ? quality : 100);
                onClose();
              }}
            >
              {messages.ui.dialogs.export.download}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
