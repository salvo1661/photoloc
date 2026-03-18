import {
  MousePointer2,
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal2,
  FlipVertical2,
  Scaling,
  BoxSelect,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ActiveTool } from "@/hooks/useImageEditor";
import type { Messages } from "@/i18n";

interface LeftSidebarProps {
  activeTool: ActiveTool;
  hasImage: boolean;
  messages: Messages;
  onToolChange: (tool: ActiveTool) => void;
  onRotateCW: () => void;
  onRotateCCW: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
}

export function LeftSidebar({
  activeTool,
  hasImage,
  messages,
  onToolChange,
  onRotateCW,
  onRotateCCW,
  onFlipH,
  onFlipV,
}: LeftSidebarProps) {
  const tools = [
    { id: "select" as const, icon: MousePointer2, label: messages.ui.tools.selectPan },
    { id: "marquee" as const, icon: BoxSelect, label: messages.ui.tools.marqueeSelect },
    { id: "crop" as const, icon: Crop, label: messages.ui.tools.crop },
    { id: "resize" as const, icon: Scaling, label: messages.ui.tools.resize },
  ];
  return (
    <div className="flex w-10 flex-col items-center gap-0.5 border-r border-border bg-editor-panel py-2">
      {tools.map((tool) => (
        <Button
          key={tool.id}
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 text-muted-foreground hover:bg-editor-hover hover:text-foreground",
            activeTool === tool.id && "bg-editor-active/20 text-editor-active"
          )}
          onClick={() => onToolChange(tool.id)}
          disabled={!hasImage}
          title={tool.label}
        >
          <tool.icon className="h-4 w-4" />
        </Button>
      ))}

      <Separator className="my-1 w-6 bg-border" />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-editor-hover hover:text-foreground"
        onClick={onRotateCCW}
        disabled={!hasImage}
        title={messages.ui.tools.rotateCcw}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-editor-hover hover:text-foreground"
        onClick={onRotateCW}
        disabled={!hasImage}
        title={messages.ui.tools.rotateCw}
      >
        <RotateCw className="h-4 w-4" />
      </Button>

      <Separator className="my-1 w-6 bg-border" />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-editor-hover hover:text-foreground"
        onClick={onFlipH}
        disabled={!hasImage}
        title={messages.ui.tools.flipHorizontal}
      >
        <FlipHorizontal2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-editor-hover hover:text-foreground"
        onClick={onFlipV}
        disabled={!hasImage}
        title={messages.ui.tools.flipVertical}
      >
        <FlipVertical2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
