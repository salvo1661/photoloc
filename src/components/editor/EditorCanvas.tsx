import { useRef, useCallback, useState, useEffect } from "react";
import { Upload, ImageIcon } from "lucide-react";
import type { CropRect, ActiveTool, SelectionData } from "@/hooks/useImageEditor";
import type { Messages } from "@/i18n";
import { drawStrokePath } from "@/lib/brush";
import type { BrushMode } from "@/lib/brush";

interface EditorCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  hasImage: boolean;
  zoom: number;
  filterStyle: string;
  activeTool: ActiveTool;
  imageWidth: number;
  imageHeight: number;
  messages: Messages;
  isLoading: boolean;
  cropRect: CropRect | null;
  onCropChange: (rect: CropRect | null) => void;
  onLoadImage: (file: File) => void;
  selectionRect: CropRect | null;
  onSelectionChange: (rect: CropRect | null) => void;
  floatingSelection: SelectionData | null;
  onMoveFloatingSelection: (x: number, y: number) => void;
  onResizeFloatingSelection: (rect: CropRect) => void;
  brushColor: string;
  brushSize: number;
  brushSpread: number;
  onDrawStroke: (points: Array<{ x: number; y: number }>, mode: BrushMode) => void;
  onAddText: (x: number, y: number) => void;
}

const isSupportedUploadFile = (file: File): boolean => {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".psd") || lowerName.endsWith(".psb")) return true;
  return file.type.startsWith("image/");
};

export function EditorCanvas({
  canvasRef,
  hasImage,
  zoom,
  filterStyle,
  activeTool,
  imageWidth,
  imageHeight,
  messages,
  isLoading,
  cropRect,
  onCropChange,
  onLoadImage,
  selectionRect,
  onSelectionChange,
  floatingSelection,
  onMoveFloatingSelection,
  onResizeFloatingSelection,
  brushColor,
  brushSize,
  brushSpread,
  onDrawStroke,
  onAddText,
}: EditorCanvasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingFloat, setIsDraggingFloat] = useState(false);
  const [floatDragOffset, setFloatDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; rect: CropRect } | null>(null);
  const [isResizingFloat, setIsResizingFloat] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const strokePointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && isSupportedUploadFile(file)) {
        onLoadImage(file);
      }
    },
    [onLoadImage]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onLoadImage(file);
    },
    [onLoadImage]
  );

  const scale = zoom / 100;

  useEffect(() => {
    if (!hasImage) return;
    const container = containerRef.current;
    if (!container) return;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    if (maxScrollLeft > 0) container.scrollLeft = Math.max(0, maxScrollLeft / 2);
    if (maxScrollTop > 0) container.scrollTop = Math.max(0, maxScrollTop / 2);
  }, [hasImage, zoom, imageWidth, imageHeight]);

  // Crop interaction
  const getImageCoords = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      return {
        x: Math.max(0, Math.min(imageWidth, Math.round(x))),
        y: Math.max(0, Math.min(imageHeight, Math.round(y))),
      };
    },
    [canvasRef, scale, imageWidth, imageHeight]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "crop") return;
      const coords = getImageCoords(e);
      if (!coords) return;
      setCropStart(coords);
      onCropChange(null);
    },
    [activeTool, getImageCoords, onCropChange]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "crop" || !cropStart) return;
      const coords = getImageCoords(e);
      if (!coords) return;

      const x = Math.min(cropStart.x, coords.x);
      const y = Math.min(cropStart.y, coords.y);
      const w = Math.abs(coords.x - cropStart.x);
      const h = Math.abs(coords.y - cropStart.y);

      if (w > 2 && h > 2) {
        onCropChange({ x, y, width: w, height: h });
      }
    },
    [activeTool, cropStart, getImageCoords, onCropChange]
  );

  const handleMouseUp = useCallback(() => {
    setCropStart(null);
  }, []);

  const renderPreviewStroke = useCallback(
    (points: Array<{ x: number; y: number }>) => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isEraser = activeTool === "eraser";
      ctx.save();
      ctx.globalAlpha = isEraser ? 0.42 : 1;
      drawStrokePath(ctx, points, {
        color: isEraser ? "#ffffff" : brushColor,
        size: brushSize,
        spread: brushSpread,
      });
      ctx.restore();
    },
    [activeTool, brushColor, brushSize, brushSpread]
  );

  const clearPreviewStroke = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    previewCanvas.width = imageWidth;
    previewCanvas.height = imageHeight;
    clearPreviewStroke();
  }, [imageWidth, imageHeight, clearPreviewStroke]);

  useEffect(() => {
    if (!isDrawing) return;
    renderPreviewStroke(strokePointsRef.current);
  }, [isDrawing, renderPreviewStroke, brushColor, brushSize, brushSpread]);

  const commitBrushStroke = useCallback(() => {
    if (!isDrawing || (activeTool !== "pen" && activeTool !== "eraser")) return;
    setIsDrawing(false);
    const points = [...strokePointsRef.current];
    strokePointsRef.current = [];
    clearPreviewStroke();
    onDrawStroke(points, activeTool === "eraser" ? "erase" : "draw");
  }, [activeTool, isDrawing, clearPreviewStroke, onDrawStroke]);

  useEffect(() => {
    return () => {
      clearPreviewStroke();
    };
  }, [clearPreviewStroke]);

  if (!hasImage) {
    return (
      <div
        className="relative flex flex-1 items-center justify-center bg-editor-workspace"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.psd,.psb"
          className="hidden"
          onChange={handleFileChange}
        />
        <div
          className={`flex cursor-pointer flex-col items-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors ${
            isDragging
              ? "border-editor-active bg-editor-active/5"
              : "border-border hover:border-muted-foreground"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            {isDragging ? (
              <Upload className="h-8 w-8 text-editor-active" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {messages.ui.canvas.dropHere}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {messages.ui.canvas.supports}
            </p>
          </div>
        </div>
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-editor-workspace/80">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card/90 px-5 py-4 shadow-lg">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-editor-active" />
              <p className="text-sm text-muted-foreground">{messages.ui.canvas.loading}</p>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-1 select-none overflow-auto bg-editor-workspace ${
        activeTool === "select" && hasImage
          ? (isPanning ? "cursor-grabbing" : "cursor-grab")
          : activeTool === "text"
          ? "cursor-text"
          : activeTool === "pen" || activeTool === "eraser"
          ? "cursor-crosshair"
          : ""
      }`}
      style={{ justifyContent: "center", alignItems: "center" }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onMouseDown={(e) => {
        if (activeTool === "select" && hasImage && e.button === 0) {
          setIsPanning(true);
          setPanStart({
            x: e.clientX,
            y: e.clientY,
            scrollLeft: containerRef.current?.scrollLeft ?? 0,
            scrollTop: containerRef.current?.scrollTop ?? 0,
          });
          e.preventDefault();
        }
      }}
      onMouseMove={(e) => {
        if (isPanning && panStart && containerRef.current) {
          e.preventDefault();
          containerRef.current.scrollLeft = panStart.scrollLeft - (e.clientX - panStart.x);
          containerRef.current.scrollTop = panStart.scrollTop - (e.clientY - panStart.y);
        }
      }}
      onMouseUp={() => {
        setIsPanning(false);
        setPanStart(null);
      }}
      onMouseLeave={() => {
        setIsPanning(false);
        setPanStart(null);
      }}
      onWheel={(e) => {
        // Allow Ctrl+wheel to zoom (handled elsewhere) but don't interfere with normal scroll
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.psd,.psb"
        className="hidden"
        onChange={handleFileChange}
      />
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-editor-workspace/80">
          <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-editor-active p-8">
            <Upload className="h-8 w-8 text-editor-active" />
            <p className="text-sm text-editor-active">{messages.ui.canvas.dropToReplace}</p>
          </div>
        </div>
      )}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-editor-workspace/80">
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card/90 px-5 py-4 shadow-lg">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-editor-active" />
            <p className="text-sm text-muted-foreground">{messages.ui.canvas.loading}</p>
          </div>
        </div>
      )}

      <div
        className="relative flex-shrink-0 select-none"
        style={{
          width: imageWidth * scale,
          height: imageHeight * scale,
          margin: "20px",
        }}
      >
        <div
          className="relative select-none"
          style={{
            width: imageWidth,
            height: imageHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
          onDragStart={(e) => e.preventDefault()}
          onMouseDown={(e) => {
            if (activeTool === "crop") {
              e.preventDefault();
              handleMouseDown(e);
              e.stopPropagation();
            } else if (activeTool === "pen" || activeTool === "eraser") {
              e.preventDefault();
              const coords = getImageCoords(e);
              if (!coords) return;
              setIsDrawing(true);
              strokePointsRef.current = [coords];
              renderPreviewStroke(strokePointsRef.current);
              e.stopPropagation();
            } else if (activeTool === "marquee") {
              e.preventDefault();
              e.stopPropagation();
              if (floatingSelection) {
                const coords = getImageCoords(e);
                if (!coords) return;
                // Check resize handles on floating selection
                const handleSize = 8 / scale;
                const r = floatingSelection.rect;
                const fHandles: Record<string, { x: number; y: number }> = {
                  nw: { x: r.x, y: r.y },
                  ne: { x: r.x + r.width, y: r.y },
                  sw: { x: r.x, y: r.y + r.height },
                  se: { x: r.x + r.width, y: r.y + r.height },
                  n: { x: r.x + r.width / 2, y: r.y },
                  s: { x: r.x + r.width / 2, y: r.y + r.height },
                  w: { x: r.x, y: r.y + r.height / 2 },
                  e: { x: r.x + r.width, y: r.y + r.height / 2 },
                };
                for (const [key, pos] of Object.entries(fHandles)) {
                  if (Math.abs(coords.x - pos.x) <= handleSize && Math.abs(coords.y - pos.y) <= handleSize) {
                    setResizeHandle(key);
                    setResizeStart({ x: coords.x, y: coords.y, rect: { ...r } });
                    setIsResizingFloat(true);
                    return;
                  }
                }
                // Check if clicking inside floating to drag
                if (r.x <= coords.x && coords.x <= r.x + r.width &&
                    r.y <= coords.y && coords.y <= r.y + r.height) {
                  setIsDraggingFloat(true);
                  setFloatDragOffset({ x: coords.x - r.x, y: coords.y - r.y });
                  return;
                }
              }
              // Check if clicking a resize handle
              if (selectionRect && !floatingSelection) {
                const coords = getImageCoords(e);
                if (coords) {
                  const handleSize = 8 / scale;
                  const r = selectionRect;
                  const handles: Record<string, { x: number; y: number }> = {
                    nw: { x: r.x, y: r.y },
                    ne: { x: r.x + r.width, y: r.y },
                    sw: { x: r.x, y: r.y + r.height },
                    se: { x: r.x + r.width, y: r.y + r.height },
                    n: { x: r.x + r.width / 2, y: r.y },
                    s: { x: r.x + r.width / 2, y: r.y + r.height },
                    w: { x: r.x, y: r.y + r.height / 2 },
                    e: { x: r.x + r.width, y: r.y + r.height / 2 },
                  };
                  for (const [key, pos] of Object.entries(handles)) {
                    if (Math.abs(coords.x - pos.x) <= handleSize && Math.abs(coords.y - pos.y) <= handleSize) {
                      setResizeHandle(key);
                      setResizeStart({ x: coords.x, y: coords.y, rect: { ...r } });
                      return;
                    }
                  }
                }
              }
              const coords = getImageCoords(e);
              if (!coords) return;
              setMarqueeStart(coords);
              onSelectionChange(null);
            } else if (activeTool === "text") {
              e.preventDefault();
              const coords = getImageCoords(e);
              if (!coords) return;
              onAddText(coords.x, coords.y);
              e.stopPropagation();
            }
          }}
          onMouseMove={(e) => {
            if (activeTool === "crop") {
              handleMouseMove(e);
            } else if (activeTool === "pen" || activeTool === "eraser") {
              if (!isDrawing) return;
              const coords = getImageCoords(e);
              if (!coords) return;
              strokePointsRef.current.push(coords);
              renderPreviewStroke(strokePointsRef.current);
            } else if (activeTool === "marquee") {
              if (isDraggingFloat && floatDragOffset) {
                const coords = getImageCoords(e);
                if (coords) {
                  onMoveFloatingSelection(coords.x - floatDragOffset.x, coords.y - floatDragOffset.y);
                }
              } else if (isResizingFloat && resizeHandle && resizeStart) {
                const coords = getImageCoords(e);
                if (!coords) return;
                const orig = resizeStart.rect;
                let newX = orig.x, newY = orig.y, newW = orig.width, newH = orig.height;
                if (resizeHandle.includes("e")) { newW = Math.max(4, orig.width + (coords.x - resizeStart.x)); }
                if (resizeHandle.includes("w")) { newW = Math.max(4, orig.width - (coords.x - resizeStart.x)); newX = orig.x + (coords.x - resizeStart.x); }
                if (resizeHandle.includes("s")) { newH = Math.max(4, orig.height + (coords.y - resizeStart.y)); }
                if (resizeHandle.includes("n")) { newH = Math.max(4, orig.height - (coords.y - resizeStart.y)); newY = orig.y + (coords.y - resizeStart.y); }
                onResizeFloatingSelection({ x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) });
              } else if (resizeHandle && resizeStart) {
                const coords = getImageCoords(e);
                if (!coords) return;
                const orig = resizeStart.rect;
                let newX = orig.x, newY = orig.y, newW = orig.width, newH = orig.height;
                if (resizeHandle.includes("e")) { newW = Math.max(4, orig.width + (coords.x - resizeStart.x)); }
                if (resizeHandle.includes("w")) { newW = Math.max(4, orig.width - (coords.x - resizeStart.x)); newX = orig.x + (coords.x - resizeStart.x); }
                if (resizeHandle.includes("s")) { newH = Math.max(4, orig.height + (coords.y - resizeStart.y)); }
                if (resizeHandle.includes("n")) { newH = Math.max(4, orig.height - (coords.y - resizeStart.y)); newY = orig.y + (coords.y - resizeStart.y); }
                onSelectionChange({ x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) });
              } else if (marqueeStart) {
                const coords = getImageCoords(e);
                if (!coords) return;
                const x = Math.min(marqueeStart.x, coords.x);
                const y = Math.min(marqueeStart.y, coords.y);
                const w = Math.abs(coords.x - marqueeStart.x);
                const h = Math.abs(coords.y - marqueeStart.y);
                if (w > 2 && h > 2) {
                  onSelectionChange({ x, y, width: w, height: h });
                }
              }
            }
          }}
          onMouseUp={() => {
            if (activeTool === "crop") {
              handleMouseUp();
            } else if (activeTool === "pen" || activeTool === "eraser") {
              commitBrushStroke();
            } else if (activeTool === "marquee") {
              setMarqueeStart(null);
              setIsDraggingFloat(false);
              setFloatDragOffset(null);
              setResizeHandle(null);
              setResizeStart(null);
              setIsResizingFloat(false);
            }
          }}
          onMouseLeave={() => {
            if (activeTool === "crop") {
              handleMouseUp();
            } else if (activeTool === "pen" || activeTool === "eraser") {
              commitBrushStroke();
            } else if (activeTool === "marquee") {
              setMarqueeStart(null);
              setIsDraggingFloat(false);
              setFloatDragOffset(null);
              setResizeHandle(null);
              setResizeStart(null);
              setIsResizingFloat(false);
            }
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ filter: filterStyle, imageRendering: zoom > 200 ? "pixelated" : "auto" }}
            className="block select-none shadow-2xl"
            draggable={false}
          />
          <canvas
            ref={previewCanvasRef}
            width={imageWidth}
            height={imageHeight}
            style={{ filter: filterStyle, imageRendering: zoom > 200 ? "pixelated" : "auto" }}
            className="pointer-events-none absolute left-0 top-0"
          />

          {/* Crop overlay */}
          {activeTool === "crop" && cropRect && (
            <>
              <div
                className="pointer-events-none absolute inset-0 bg-black/50"
                style={{
                  clipPath: `polygon(
                    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                    ${cropRect.x}px ${cropRect.y}px,
                    ${cropRect.x}px ${cropRect.y + cropRect.height}px,
                    ${cropRect.x + cropRect.width}px ${cropRect.y + cropRect.height}px,
                    ${cropRect.x + cropRect.width}px ${cropRect.y}px,
                    ${cropRect.x}px ${cropRect.y}px
                  )`,
                }}
              />
              <div
                className="pointer-events-none absolute border border-white/80"
                style={{
                  left: cropRect.x,
                  top: cropRect.y,
                  width: cropRect.width,
                  height: cropRect.height,
                }}
              >
                <div className="absolute left-1/3 top-0 h-full w-px bg-white/30" />
                <div className="absolute left-2/3 top-0 h-full w-px bg-white/30" />
                <div className="absolute left-0 top-1/3 h-px w-full bg-white/30" />
                <div className="absolute left-0 top-2/3 h-px w-full bg-white/30" />
                {[
                  "top-0 left-0 -translate-x-1/2 -translate-y-1/2",
                  "top-0 right-0 translate-x-1/2 -translate-y-1/2",
                  "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
                  "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
                ].map((pos, i) => (
                  <div
                    key={i}
                    className={`absolute h-2.5 w-2.5 rounded-sm border-2 border-white bg-editor-active ${pos}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Marquee selection overlay with resize handles */}
          {activeTool === "marquee" && selectionRect && !floatingSelection && (
            <div
              className="absolute border-2 border-dashed border-editor-active"
              style={{
                left: selectionRect.x,
                top: selectionRect.y,
                width: selectionRect.width,
                height: selectionRect.height,
                pointerEvents: "none",
              }}
            >
              {/* Resize handles */}
              {[
                { pos: "nw", style: { top: -4, left: -4, cursor: "nw-resize" } },
                { pos: "ne", style: { top: -4, right: -4, cursor: "ne-resize" } },
                { pos: "sw", style: { bottom: -4, left: -4, cursor: "sw-resize" } },
                { pos: "se", style: { bottom: -4, right: -4, cursor: "se-resize" } },
                { pos: "n", style: { top: -4, left: "calc(50% - 4px)", cursor: "n-resize" } },
                { pos: "s", style: { bottom: -4, left: "calc(50% - 4px)", cursor: "s-resize" } },
                { pos: "w", style: { top: "calc(50% - 4px)", left: -4, cursor: "w-resize" } },
                { pos: "e", style: { top: "calc(50% - 4px)", right: -4, cursor: "e-resize" } },
              ].map((h) => (
                <div
                  key={h.pos}
                  className="absolute h-2 w-2 rounded-sm border border-white bg-editor-active"
                  style={{ ...h.style, pointerEvents: "auto" } as React.CSSProperties}
                />
              ))}
            </div>
          )}

          {/* Floating selection with resize handles */}
          {activeTool === "marquee" && floatingSelection && (
            <div
              className="absolute cursor-move border-2 border-dashed border-accent"
              style={{
                left: floatingSelection.rect.x,
                top: floatingSelection.rect.y,
                width: floatingSelection.rect.width,
                height: floatingSelection.rect.height,
              }}
            >
              <img
                src={floatingSelection.imageData}
                alt="selection"
                className="pointer-events-none h-full w-full"
                style={{ objectFit: "fill" }}
                draggable={false}
              />
              {/* Resize handles */}
              {[
                { pos: "nw", style: { top: -4, left: -4, cursor: "nw-resize" } },
                { pos: "ne", style: { top: -4, right: -4, cursor: "ne-resize" } },
                { pos: "sw", style: { bottom: -4, left: -4, cursor: "sw-resize" } },
                { pos: "se", style: { bottom: -4, right: -4, cursor: "se-resize" } },
                { pos: "n", style: { top: -4, left: "calc(50% - 4px)", cursor: "n-resize" } },
                { pos: "s", style: { bottom: -4, left: "calc(50% - 4px)", cursor: "s-resize" } },
                { pos: "w", style: { top: "calc(50% - 4px)", left: -4, cursor: "w-resize" } },
                { pos: "e", style: { top: "calc(50% - 4px)", right: -4, cursor: "e-resize" } },
              ].map((h) => (
                <div
                  key={h.pos}
                  className="absolute h-2 w-2 rounded-sm border border-white bg-accent"
                  style={{ ...h.style, pointerEvents: "auto" } as React.CSSProperties}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
