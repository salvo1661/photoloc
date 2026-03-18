import { Eye, EyeOff, Trash2, Plus, ChevronUp, ChevronDown, Merge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Layer } from "@/hooks/useImageEditor";
import { formatLayerName } from "@/i18n";
import type { Messages } from "@/i18n";

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  hasImage: boolean;
  messages: Messages;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onAddLayer: () => void;
  onSetOpacity: (id: string, opacity: number) => void;
  onReorder: (from: number, to: number) => void;
  onMergeDown: (id: string) => void;
}

export function LayerPanel({
  layers,
  activeLayerId,
  hasImage,
  messages,
  onSelectLayer,
  onToggleVisibility,
  onDeleteLayer,
  onAddLayer,
  onSetOpacity,
  onReorder,
  onMergeDown,
}: LayerPanelProps) {
  // Show layers in reverse (top layer first)
  const reversedLayers = [...layers].reverse();

  return (
    <div className="border-t border-border">
      <div className="flex h-8 items-center justify-between border-b border-border bg-editor-panel-header px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {messages.ui.right.layers}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-foreground"
          onClick={onAddLayer}
          disabled={!hasImage}
          title={messages.ui.right.addLayer}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <ScrollArea className="h-48">
        <div className="p-1 space-y-0.5">
          {reversedLayers.map((layer, reversedIdx) => {
            const realIndex = layers.length - 1 - reversedIdx;
            const isActive = layer.id === activeLayerId;

            return (
              <div
                key={layer.id}
                className={cn(
                  "group flex items-center gap-1 rounded-sm px-1.5 py-1 cursor-pointer transition-colors",
                  isActive
                    ? "bg-editor-active/20 border border-editor-active/40"
                    : "hover:bg-editor-hover border border-transparent"
                )}
                onClick={() => onSelectLayer(layer.id)}
              >
                {/* Visibility toggle */}
                <button
                  className="flex-shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(layer.id);
                  }}
                  title={layer.visible ? messages.ui.right.hideLayer : messages.ui.right.showLayer}
                >
                  {layer.visible ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3 opacity-40" />
                  )}
                </button>

                {/* Layer thumbnail + name */}
                <div
                  className={cn(
                    "h-6 w-8 flex-shrink-0 rounded-sm border bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,hsl(var(--background))_0%_50%)] bg-[length:8px_8px]",
                    isActive ? "border-editor-active/60" : "border-border"
                  )}
                  style={{
                    backgroundImage: `url(${layer.imageData})`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                  }}
                />

                <span
                  className={cn(
                    "flex-1 truncate text-[11px]",
                    isActive ? "text-editor-active" : "text-secondary-foreground",
                    !layer.visible && "opacity-40"
                  )}
                >
                  {formatLayerName(messages, layer)}
                </span>

                {/* Opacity indicator */}
                <span className="flex-shrink-0 font-mono text-[9px] text-muted-foreground">
                  {Math.round(layer.opacity * 100)}%
                </span>

                {/* Actions (visible on hover/active) */}
                <div className="flex-shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {realIndex > 0 && (
                    <button
                      className="p-0.5 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReorder(realIndex, realIndex - 1);
                      }}
                      title={messages.ui.right.moveDown}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  )}
                  {realIndex < layers.length - 1 && (
                    <button
                      className="p-0.5 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReorder(realIndex, realIndex + 1);
                      }}
                      title={messages.ui.right.moveUp}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                  )}
                  {realIndex > 0 && (
                    <button
                      className="p-0.5 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMergeDown(layer.id);
                      }}
                      title={messages.ui.right.mergeDown}
                    >
                      <Merge className="h-3 w-3" />
                    </button>
                  )}
                  {layers.length > 1 && (
                    <button
                      className="p-0.5 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLayer(layer.id);
                      }}
                      title={messages.ui.right.deleteLayer}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {layers.length === 0 && (
            <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
              {messages.ui.right.noLayers}
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Active layer opacity slider */}
      {hasImage && activeLayerId && (
        <div className="border-t border-border px-3 py-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{messages.ui.right.opacity}</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {Math.round((layers.find((l) => l.id === activeLayerId)?.opacity ?? 1) * 100)}%
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[Math.round((layers.find((l) => l.id === activeLayerId)?.opacity ?? 1) * 100)]}
            onValueChange={([v]) => onSetOpacity(activeLayerId, v / 100)}
            className="cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
