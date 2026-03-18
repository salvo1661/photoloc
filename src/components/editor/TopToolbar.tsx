import {
  Upload,
  Download,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Messages } from "@/i18n";

interface TopToolbarProps {
  hasImage: boolean;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  messages: Messages;
  onUpload: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
}

export function TopToolbar({
  hasImage,
  canUndo,
  canRedo,
  zoom,
  messages,
  onUpload,
  onExport,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomFit,
}: TopToolbarProps) {
  return (
    <div className="flex h-11 items-center gap-1 border-b border-border bg-editor-toolbar px-3">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-foreground hover:bg-editor-hover"
          onClick={onUpload}
        >
          <Upload className="h-3.5 w-3.5" />
          {messages.ui.toolbar.open}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-foreground hover:bg-editor-hover"
          onClick={onExport}
          disabled={!hasImage}
        >
          <Download className="h-3.5 w-3.5" />
          {messages.ui.toolbar.export}
        </Button>
      </div>

      <Separator orientation="vertical" className="mx-1 h-5 bg-border" />

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-foreground hover:bg-editor-hover"
          onClick={onUndo}
          disabled={!canUndo}
          title={messages.ui.toolbar.undoTitle}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-foreground hover:bg-editor-hover"
          onClick={onRedo}
          disabled={!canRedo}
          title={messages.ui.toolbar.redoTitle}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Separator orientation="vertical" className="mx-1 h-5 bg-border" />

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-foreground hover:bg-editor-hover"
          onClick={onZoomOut}
          disabled={!hasImage}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-[3rem] text-center font-mono text-xs text-muted-foreground">
          {zoom}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-foreground hover:bg-editor-hover"
          onClick={onZoomIn}
          disabled={!hasImage}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-foreground hover:bg-editor-hover"
          onClick={onZoomFit}
          disabled={!hasImage}
          title={messages.ui.toolbar.fitToScreen}
        >
          <Maximize className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="ml-auto">
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
          {messages.ui.toolbar.imageEditor}
        </span>
      </div>
    </div>
  );
}
