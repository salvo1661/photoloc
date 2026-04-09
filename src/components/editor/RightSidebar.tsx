import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw, Check, History } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayerPanel } from "@/components/editor/LayerPanel";
import type { ActiveTool, Adjustments, HistoryEntry, Layer } from "@/hooks/useImageEditor";
import { formatHistoryLabel } from "@/i18n";
import type { Messages } from "@/i18n";

interface RightSidebarProps {
  adjustments: Adjustments;
  hasImage: boolean;
  history: HistoryEntry[];
  historyIndex: number;
  backgroundColor: string;
  layers: Layer[];
  activeLayerId: string;
  activeTool: ActiveTool;
  brushColor: string;
  brushSize: number;
  brushSpread: number;
  messages: Messages;
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
  onBrushColorChange: (color: string) => void;
  onBrushSizeChange: (value: number) => void;
  onBrushSpreadChange: (value: number) => void;
}

export function RightSidebar({
  adjustments,
  hasImage,
  history,
  historyIndex,
  backgroundColor,
  layers,
  activeLayerId,
  activeTool,
  brushColor,
  brushSize,
  brushSpread,
  messages,
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
  onBrushColorChange,
  onBrushSizeChange,
  onBrushSpreadChange,
}: RightSidebarProps) {
  const adjustmentConfig: {
    key: keyof Adjustments;
    label: string;
    min: number;
    max: number;
    step: number;
    default: number;
    unit: string;
  }[] = [
    { key: "brightness", label: messages.ui.adjustments.brightness, min: 0, max: 200, step: 1, default: 100, unit: "%" },
    { key: "contrast", label: messages.ui.adjustments.contrast, min: 0, max: 200, step: 1, default: 100, unit: "%" },
    { key: "saturation", label: messages.ui.adjustments.saturation, min: 0, max: 200, step: 1, default: 100, unit: "%" },
    { key: "hue", label: messages.ui.adjustments.hueRotate, min: 0, max: 360, step: 1, default: 0, unit: messages.ui.adjustments.hueUnit },
    { key: "sepia", label: messages.ui.adjustments.sepia, min: 0, max: 100, step: 1, default: 0, unit: "%" },
    { key: "grayscale", label: messages.ui.adjustments.grayscale, min: 0, max: 100, step: 1, default: 0, unit: "%" },
    { key: "blur", label: messages.ui.adjustments.blur, min: 0, max: 20, step: 0.1, default: 0, unit: "px" },
  ];
  const hasChanges = adjustmentConfig.some(
    (c) => adjustments[c.key] !== c.default
  );

  return (
    <div className="flex w-56 flex-col border-l border-border bg-editor-panel">
      {/* Adjustments */}
      <div className="flex-shrink overflow-hidden">
        {(activeTool === "pen" || activeTool === "eraser") && (
          <div className="border-b border-border">
            <div className="flex h-8 items-center border-b border-border bg-editor-panel-header px-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {activeTool === "eraser" ? messages.ui.right.eraser : messages.ui.right.pen}
              </span>
            </div>
            <div className="space-y-3 p-3">
              {activeTool === "pen" && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] text-secondary-foreground">{messages.ui.right.brushColor}</span>
                    <span className="font-mono text-[10px] text-muted-foreground uppercase">{brushColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-border"
                      style={{ backgroundColor: brushColor }}
                    >
                      <input
                        type="color"
                        value={brushColor}
                        onChange={(e) => onBrushColorChange(e.target.value)}
                        className="invisible h-0 w-0"
                      />
                    </label>
                    <div className="ml-auto flex gap-1">
                      {["#111111", "#ffffff", "#ef4444", "#22c55e", "#3b82f6", "#f59e0b"].map((c) => (
                        <button
                          key={c}
                          className="h-4 w-4 rounded-sm border border-border"
                          style={{ backgroundColor: c }}
                          onClick={() => onBrushColorChange(c)}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-secondary-foreground">{messages.ui.right.brushSize}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{Math.round(brushSize)}px</span>
                </div>
                <Slider
                  min={1}
                  max={120}
                  step={1}
                  value={[brushSize]}
                  onValueChange={([v]) => onBrushSizeChange(v)}
                  disabled={!hasImage}
                  className="cursor-pointer"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-secondary-foreground">{messages.ui.right.brushSpread}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{brushSpread.toFixed(1)}px</span>
                </div>
                <Slider
                  min={0}
                  max={40}
                  step={0.5}
                  value={[brushSpread]}
                  onValueChange={([v]) => onBrushSpreadChange(v)}
                  disabled={!hasImage}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex h-8 items-center justify-between border-b border-border bg-editor-panel-header px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {messages.ui.right.adjustments}
          </span>
          <div className="flex gap-0.5">
            {hasChanges && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-foreground"
                  onClick={onResetAdjustments}
                  title={messages.ui.right.reset}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-editor-success hover:text-editor-success"
                  onClick={onApplyAdjustments}
                  title={messages.ui.right.apply}
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
                <span className="text-[11px] text-secondary-foreground">{messages.ui.right.background}</span>
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
        messages={messages}
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
            {messages.ui.right.history}
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
                {formatHistoryLabel(messages, entry.labelKey, entry.labelParams)}
              </button>
            ))}
            {history.length === 0 && (
              <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
                {messages.ui.right.noHistory}
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
