import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw, Check, History } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayerPanel } from "@/components/editor/LayerPanel";
import type { Adjustments, HistoryEntry, Layer } from "@/hooks/useImageEditor";

interface RightSidebarProps {
  adjustments: Adjustments;
  hasImage: boolean;
  history: HistoryEntry[];
  historyIndex: number;
  backgroundColor: string;
  layers: Layer[];
  activeLayerId: string;
  onAdjustmentChange: (key: keyof Adjustments, value: number) => void;
  onResetAdjustments: () => void;
  onApplyAdjustments: () => void;
  onRestoreHistory: (index: number) => void;
  onBackgroundColorChange: (color: string) => void;
  onSelectLayer: (id: string) => void;
  onToggleLayerVisibility: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onAddLayer: () => void;
  onSetLayerOpacity: (id: string, opacity: number) => void;
  onReorderLayers: (from: number, to: number) => void;
  onMergeDown: (id: string) => void;
}

const adjustmentConfig: {
  key: keyof Adjustments;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
}[] = [
  { key: "brightness", label: "Brightness", min: 0, max: 200, step: 1, default: 100, unit: "%" },
  { key: "contrast", label: "Contrast", min: 0, max: 200, step: 1, default: 100, unit: "%" },
  { key: "saturation", label: "Saturation", min: 0, max: 200, step: 1, default: 100, unit: "%" },
  { key: "hue", label: "Hue Rotate", min: 0, max: 360, step: 1, default: 0, unit: "°" },
  { key: "sepia", label: "Sepia", min: 0, max: 100, step: 1, default: 0, unit: "%" },
  { key: "grayscale", label: "Grayscale", min: 0, max: 100, step: 1, default: 0, unit: "%" },
  { key: "blur", label: "Blur", min: 0, max: 20, step: 0.1, default: 0, unit: "px" },
];

export function RightSidebar({
  adjustments,
  hasImage,
  history,
  historyIndex,
  backgroundColor,
  layers,
  activeLayerId,
  onAdjustmentChange,
  onResetAdjustments,
  onApplyAdjustments,
  onRestoreHistory,
  onBackgroundColorChange,
  onSelectLayer,
  onToggleLayerVisibility,
  onDeleteLayer,
  onAddLayer,
  onSetLayerOpacity,
  onReorderLayers,
  onMergeDown,
}: RightSidebarProps) {
  const hasChanges = adjustmentConfig.some(
    (c) => adjustments[c.key] !== c.default
  );

  return (
    <div className="flex w-56 flex-col border-l border-border bg-editor-panel">
      {/* Adjustments */}
      <div className="flex-shrink overflow-hidden">
        <div className="flex h-8 items-center justify-between border-b border-border bg-editor-panel-header px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Adjustments
          </span>
          <div className="flex gap-0.5">
            {hasChanges && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-foreground"
                  onClick={onResetAdjustments}
                  title="Reset"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-editor-success hover:text-editor-success"
                  onClick={onApplyAdjustments}
                  title="Apply"
                >
                  <Check className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-64">
          <div className="space-y-3 p-3">
            {adjustmentConfig.map((config) => (
              <div key={config.key}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-secondary-foreground">
                    {config.label}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {config.key === "blur"
                      ? adjustments[config.key].toFixed(1)
                      : Math.round(adjustments[config.key])}
                    {config.unit}
                  </span>
                </div>
                <Slider
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  value={[adjustments[config.key]]}
                  onValueChange={([v]) => onAdjustmentChange(config.key, v)}
                  disabled={!hasImage}
                  className="cursor-pointer"
                />
              </div>
            ))}

            {/* Background Color */}
            <div className="border-t border-border pt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] text-secondary-foreground">Background</span>
              </div>
              <div className="flex items-center gap-2">
                <label
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-border"
                  style={{ backgroundColor }}
                >
                  <input
                    type="color"
                    value={backgroundColor === "transparent" ? "#ffffff" : backgroundColor}
                    onChange={(e) => onBackgroundColorChange(e.target.value)}
                    className="invisible h-0 w-0"
                  />
                </label>
                <span className="font-mono text-[10px] text-muted-foreground uppercase">
                  {backgroundColor}
                </span>
                <div className="ml-auto flex gap-1">
                  {["#ffffff", "#000000", "#808080", "transparent"].map((c) => (
                    <button
                      key={c}
                      className={`h-4 w-4 rounded-sm border border-border ${c === "transparent" ? "bg-[repeating-conic-gradient(#808080_0%_25%,#fff_0%_50%)] bg-[length:8px_8px]" : ""}`}
                      style={c !== "transparent" ? { backgroundColor: c } : {}}
                      onClick={() => onBackgroundColorChange(c === "transparent" ? "transparent" : c)}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Layers */}
      <LayerPanel
        layers={layers}
        activeLayerId={activeLayerId}
        hasImage={hasImage}
        onSelectLayer={onSelectLayer}
        onToggleVisibility={onToggleLayerVisibility}
        onDeleteLayer={onDeleteLayer}
        onAddLayer={onAddLayer}
        onSetOpacity={onSetLayerOpacity}
        onReorder={onReorderLayers}
        onMergeDown={onMergeDown}
      />

      {/* History */}
      <div className="border-t border-border">
        <div className="flex h-8 items-center gap-1.5 border-b border-border bg-editor-panel-header px-3">
          <History className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            History
          </span>
        </div>
        <ScrollArea className="h-28">
          <div className="p-1">
            {history.map((entry, i) => (
              <button
                key={i}
                className={`w-full rounded-sm px-2 py-1 text-left text-[11px] transition-colors ${
                  i === historyIndex
                    ? "bg-editor-active/20 text-editor-active"
                    : i > historyIndex
                    ? "text-muted-foreground/40 hover:bg-editor-hover"
                    : "text-secondary-foreground hover:bg-editor-hover"
                }`}
                onClick={() => onRestoreHistory(i)}
              >
                {entry.label}
              </button>
            ))}
            {history.length === 0 && (
              <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
                No history yet
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
