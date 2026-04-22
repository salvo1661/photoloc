import { useState, useRef, useCallback, useEffect } from "react";
import { readPsd, writePsd, type Layer as PsdLayer, type Psd } from "ag-psd";
import type { HistoryLabelKey, HistoryLabelParams, LayerNameKey } from "@/i18n";
import { drawStrokePath, type BrushMode, type StrokePoint } from "@/lib/brush";
import {
  TEXT_FONT_OPTIONS,
  ensureGoogleFontLoaded,
  getDefaultFontForLanguage,
} from "@/lib/textFonts";

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  sepia: number;
  grayscale: number;
  blur: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Layer {
  id: string;
  name: string;
  nameKey?: LayerNameKey;
  nameParams?: { index?: number };
  imageData: string;
  width: number;
  height: number;
  visible: boolean;
  opacity: number;
  type?: "bitmap" | "text";
  textData?: TextLayerData;
}

export interface HistoryEntry {
  labelKey: HistoryLabelKey;
  labelParams?: HistoryLabelParams;
  layers: Layer[];
  activeLayerId: string;
  canvasWidth: number;
  canvasHeight: number;
}

export interface TextToolSettings {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  fontWeight: number;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export interface TextLayerData extends TextToolSettings {
  x: number;
  y: number;
  boxWidth: number;
  boxHeight: number;
}

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  sepia: 0,
  grayscale: 0,
  blur: 0,
};

export type BrushTool = "pen" | "eraser";
export type ActiveTool = "select" | "crop" | "resize" | "rotate" | "marquee" | "text" | BrushTool;

export interface SelectionData {
  rect: CropRect;
  imageData: string;
  originalX: number;
  originalY: number;
}

let layerIdCounter = 0;
function newLayerId() {
  return `layer_${++layerIdCounter}`;
}

const PSD_MIME_TYPES = new Set([
  "image/vnd.adobe.photoshop",
  "application/vnd.adobe.photoshop",
  "application/photoshop",
  "application/x-photoshop",
]);

const isPsdFile = (file: File): boolean => {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".psd") || lowerName.endsWith(".psb")) return true;
  return PSD_MIME_TYPES.has(file.type);
};

const collectLeafPsdLayers = (layers: PsdLayer[] | undefined, out: PsdLayer[] = []): PsdLayer[] => {
  if (!layers) return out;
  layers.forEach((layer) => {
    if (layer.children?.length) {
      collectLeafPsdLayers(layer.children, out);
      return;
    }
    out.push(layer);
  });
  return out;
};

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });

const DEFAULT_TEXT_SETTINGS: TextToolSettings = {
  content: "Text",
  fontFamily: "Noto Sans",
  fontSize: 48,
  fontColor: "#111111",
  fontWeight: 500,
  align: "left",
  lineHeight: 1.35,
  letterSpacing: 0,
  strokeColor: "#000000",
  strokeWidth: 0,
  shadowColor: "#00000066",
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
};

const getLineWidth = (ctx: CanvasRenderingContext2D, line: string, letterSpacing: number): number => {
  if (!line.length) return 0;
  const base = ctx.measureText(line).width;
  return base + letterSpacing * Math.max(0, line.length - 1);
};

const drawLine = (
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  letterSpacing: number,
  mode: "fill" | "stroke"
) => {
  if (letterSpacing === 0) {
    if (mode === "stroke") ctx.strokeText(line, x, y);
    else ctx.fillText(line, x, y);
    return;
  }
  let cursor = x;
  for (const char of line) {
    if (mode === "stroke") ctx.strokeText(char, cursor, y);
    else ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + letterSpacing;
  }
};

const renderTextLayerToCanvas = async (
  textData: TextLayerData,
  canvasWidth: number,
  canvasHeight: number
): Promise<{ canvas: HTMLCanvasElement; boxWidth: number; boxHeight: number }> => {
  ensureGoogleFontLoaded(textData.fontFamily);
  try {
    if ("fonts" in document) {
      await document.fonts.load(`${textData.fontWeight} ${textData.fontSize}px "${textData.fontFamily}"`);
    }
  } catch {
    // no-op
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, boxWidth: 0, boxHeight: 0 };

  ctx.font = `${textData.fontWeight} ${textData.fontSize}px "${textData.fontFamily}", sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillStyle = textData.fontColor;
  ctx.strokeStyle = textData.strokeColor;
  ctx.lineWidth = textData.strokeWidth;

  const lines = textData.content.split("\n");
  const linePx = Math.max(1, Math.round(textData.fontSize * textData.lineHeight));
  const maxWidth = lines.reduce((max, line) => Math.max(max, getLineWidth(ctx, line, textData.letterSpacing)), 0);
  const boxHeight = Math.max(linePx, lines.length * linePx);
  const alignOffset =
    textData.align === "center" ? maxWidth / 2 : textData.align === "right" ? maxWidth : 0;

  ctx.shadowColor = textData.shadowColor;
  ctx.shadowBlur = textData.shadowBlur;
  ctx.shadowOffsetX = textData.shadowOffsetX;
  ctx.shadowOffsetY = textData.shadowOffsetY;

  lines.forEach((line, index) => {
    const y = textData.y + index * linePx;
    const x = textData.x - alignOffset;
    if (textData.strokeWidth > 0) {
      drawLine(ctx, line, x, y, textData.letterSpacing, "stroke");
    }
    drawLine(ctx, line, x, y, textData.letterSpacing, "fill");
  });

  return { canvas, boxWidth: Math.max(1, Math.round(maxWidth)), boxHeight };
};

const cloneLayer = (layer: Layer): Layer => ({
  ...layer,
  textData: layer.textData ? { ...layer.textData } : undefined,
});

export function useImageEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [adjustments, setAdjustments] = useState<Adjustments>({ ...DEFAULT_ADJUSTMENTS });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [fileName, setFileName] = useState("");
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [selectionRect, setSelectionRect] = useState<CropRect | null>(null);
  const [floatingSelection, setFloatingSelection] = useState<SelectionData | null>(null);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [isLoading, setIsLoading] = useState(false);
  const [brushColor, setBrushColor] = useState("#111111");
  const [brushSize, setBrushSize] = useState(8);
  const [brushSpread, setBrushSpread] = useState(0);
  const [textSettings, setTextSettings] = useState<TextToolSettings>({ ...DEFAULT_TEXT_SETTINGS });

  // Layer state
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>("");
  const layerCanvasCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const syncLayerCanvasCache = useCallback((layerList: Layer[]) => {
    const nextIds = new Set(layerList.map((layer) => layer.id));
    layerCanvasCacheRef.current.forEach((_, layerId) => {
      if (!nextIds.has(layerId)) {
        layerCanvasCacheRef.current.delete(layerId);
      }
    });
  }, []);

  const cacheLayerCanvas = useCallback(
    (layerId: string, source: CanvasImageSource, width: number, height: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(source, 0, 0, width, height);
      layerCanvasCacheRef.current.set(layerId, canvas);
    },
    []
  );

  const buildFilterString = (adj: Adjustments) => {
    return `brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%) hue-rotate(${adj.hue}deg) sepia(${adj.sepia}%) grayscale(${adj.grayscale}%) blur(${adj.blur}px)`;
  };

  const getCanvasFilterStyle = useCallback(() => {
    return buildFilterString(adjustments);
  }, [adjustments]);

  // Composite all visible layers onto the main canvas
  const compositeAndRender = useCallback(
    (layerList: Layer[], cw: number, ch: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const needsResize = canvas.width !== cw || canvas.height !== ch;
      if (needsResize) {
        canvas.width = cw;
        canvas.height = ch;
      }
      setImageWidth(cw);
      setImageHeight(ch);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const sortedLayers = [...layerList].filter((l) => l.visible);
      if (sortedLayers.length === 0) {
        ctx.clearRect(0, 0, cw, ch);
        return;
      }

      const canDrawFromCache = sortedLayers.every((layer) => {
        const cached = layerCanvasCacheRef.current.get(layer.id);
        return cached && cached.width === cw && cached.height === ch;
      });

      if (canDrawFromCache) {
        ctx.clearRect(0, 0, cw, ch);
        sortedLayers.forEach((layer) => {
          const cached = layerCanvasCacheRef.current.get(layer.id);
          if (!cached) return;
          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(cached, 0, 0);
          ctx.globalAlpha = 1;
        });
        return;
      }

      const loadedImages: Map<string, HTMLImageElement> = new Map();
      const remaining = sortedLayers.length;

      sortedLayers.forEach((layer) => {
        const img = new Image();
        img.onload = () => {
          cacheLayerCanvas(layer.id, img, cw, ch);
          loadedImages.set(layer.id, img);
          if (loadedImages.size === remaining) {
            ctx.clearRect(0, 0, cw, ch);
            sortedLayers.forEach((l) => {
              const lImg = loadedImages.get(l.id);
              if (lImg) {
                ctx.globalAlpha = l.opacity;
                ctx.drawImage(lImg, 0, 0);
                ctx.globalAlpha = 1;
              }
            });
          }
        };
        img.src = layer.imageData;
      });
    },
    [cacheLayerCanvas]
  );

  // Push history with current layer state
  const pushHistory = useCallback(
    (labelKey: HistoryLabelKey, newLayers: Layer[], activeId: string, cw: number, ch: number, labelParams?: HistoryLabelParams) => {
      const newEntry: HistoryEntry = {
        labelKey,
        labelParams,
        layers: newLayers.map(cloneLayer),
        activeLayerId: activeId,
        canvasWidth: cw,
        canvasHeight: ch,
      };
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newEntry);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  // Get active layer's image data
  const getActiveLayerData = useCallback((): string | null => {
    const layer = layers.find((l) => l.id === activeLayerId);
    return layer?.imageData ?? null;
  }, [layers, activeLayerId]);

  // Update a specific layer's image data and push history
  const updateActiveLayer = useCallback(
    (labelKey: HistoryLabelKey, newImageData: string, newW: number, newH: number, labelParams?: HistoryLabelParams) => {
      const newLayers = layers.map((l) =>
        l.id === activeLayerId
          ? { ...l, imageData: newImageData, width: newW, height: newH }
          : l
      );
      setLayers(newLayers);
      // For operations that change canvas size (like crop/resize), update canvas dimensions
      const cw = newW;
      const ch = newH;
      pushHistory(labelKey, newLayers, activeLayerId, cw, ch, labelParams);
      compositeAndRender(newLayers, cw, ch);
    },
    [layers, activeLayerId, pushHistory, compositeAndRender]
  );

  // Load image from file
  const loadImage = useCallback(
    (file: File) => {
      setIsLoading(true);
      const finishLoading = () => setIsLoading(false);

      if (isPsdFile(file)) {
        file
          .arrayBuffer()
          .then((buffer) => {
            const psd = readPsd(buffer);
            const docWidth = psd.width;
            const docHeight = psd.height;

            const flattenedLayers = collectLeafPsdLayers(psd.children);
            const prepared = flattenedLayers
              .map((layer, index) => {
                if (!layer.canvas) return null;
                const fullCanvas = document.createElement("canvas");
                fullCanvas.width = docWidth;
                fullCanvas.height = docHeight;
                const fullCtx = fullCanvas.getContext("2d");
                if (!fullCtx) return null;
                fullCtx.clearRect(0, 0, docWidth, docHeight);
                fullCtx.drawImage(layer.canvas, layer.left ?? 0, layer.top ?? 0);

                const layerId = newLayerId();
                const editorLayer: Layer = {
                  id: layerId,
                  name: layer.name || `Layer ${index + 1}`,
                  imageData: fullCanvas.toDataURL("image/png"),
                  width: docWidth,
                  height: docHeight,
                  visible: !layer.hidden,
                  opacity: layer.opacity ?? 1,
                  type: "bitmap",
                };
                return { layer: editorLayer, canvas: fullCanvas };
              })
              .filter((item): item is { layer: Layer; canvas: HTMLCanvasElement } => item !== null)
              .reverse();

            if (!prepared.length && psd.canvas) {
              const baseCanvas = document.createElement("canvas");
              baseCanvas.width = docWidth;
              baseCanvas.height = docHeight;
              const baseCtx = baseCanvas.getContext("2d");
              if (baseCtx) {
                baseCtx.drawImage(psd.canvas, 0, 0);
                const layerId = newLayerId();
                prepared.push({
                  layer: {
                    id: layerId,
                    name: "Background",
                    nameKey: "background",
                    imageData: baseCanvas.toDataURL("image/png"),
                    width: docWidth,
                    height: docHeight,
                    visible: true,
                    opacity: 1,
                    type: "bitmap",
                  },
                  canvas: baseCanvas,
                });
              }
            }

            if (!prepared.length) {
              finishLoading();
              return;
            }

            setFileName(file.name);
            setAdjustments({ ...DEFAULT_ADJUSTMENTS });

            const canvas = canvasRef.current;
            if (!canvas) {
              finishLoading();
              return;
            }

            const newLayers = prepared.map((item) => item.layer);
            setLayers(newLayers);
            syncLayerCanvasCache(newLayers);
            prepared.forEach((item) => {
              cacheLayerCanvas(item.layer.id, item.canvas, docWidth, docHeight);
            });

            const topLayer = newLayers[newLayers.length - 1];
            setActiveLayerId(topLayer.id);
            setImageWidth(docWidth);
            setImageHeight(docHeight);

            const container = canvas.parentElement;
            if (container) {
              const maxW = container.clientWidth - 40;
              const maxH = container.clientHeight - 40;
              const scale = Math.min(maxW / docWidth, maxH / docHeight, 1);
              setZoom(Math.round(scale * 100));
            }

            compositeAndRender(newLayers, docWidth, docHeight);

            setHistory([
              {
                labelKey: "openImage",
                layers: newLayers.map(cloneLayer),
                activeLayerId: topLayer.id,
                canvasWidth: docWidth,
                canvasHeight: docHeight,
              },
            ]);
            setHistoryIndex(0);
            setActiveTool("select");
            setCropRect(null);
            setIsCropping(false);
            setSelectionRect(null);
            setFloatingSelection(null);
            finishLoading();
          })
          .catch(() => {
            finishLoading();
          });
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => {
        finishLoading();
      };
      reader.onload = (e) => {
        const result = e.target?.result;
        if (!result) {
          finishLoading();
          return;
        }
        const img = new Image();
        img.onerror = () => {
          finishLoading();
        };
        img.onload = () => {
          setFileName(file.name);
          setAdjustments({ ...DEFAULT_ADJUSTMENTS });

          const canvas = canvasRef.current;
          if (!canvas) {
            finishLoading();
            return;
          }

          // Create temp canvas to get data URL
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          const tempCtx = tempCanvas.getContext("2d");
          if (!tempCtx) {
            finishLoading();
            return;
          }
          tempCtx.drawImage(img, 0, 0);
          const imageData = tempCanvas.toDataURL("image/png");

          const layerId = newLayerId();
          const newLayer: Layer = {
            id: layerId,
            name: "Background",
            nameKey: "background",
            imageData,
            width: img.width,
            height: img.height,
            visible: true,
            opacity: 1,
            type: "bitmap",
          };

          const newLayers = [newLayer];
          setLayers(newLayers);
          syncLayerCanvasCache(newLayers);
          cacheLayerCanvas(layerId, tempCanvas, img.width, img.height);
          setActiveLayerId(layerId);
          setImageWidth(img.width);
          setImageHeight(img.height);

          // Calculate initial zoom
          const container = canvas.parentElement;
          if (container) {
            const maxW = container.clientWidth - 40;
            const maxH = container.clientHeight - 40;
            const scale = Math.min(maxW / img.width, maxH / img.height, 1);
            setZoom(Math.round(scale * 100));
          }

          // Render
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.drawImage(img, 0, 0);

          // Push initial history
          setHistory([
            {
              labelKey: "openImage",
              layers: [cloneLayer(newLayer)],
              activeLayerId: layerId,
              canvasWidth: img.width,
              canvasHeight: img.height,
            },
          ]);
          setHistoryIndex(0);
          setActiveTool("select");
          setCropRect(null);
          setIsCropping(false);
          setSelectionRect(null);
          setFloatingSelection(null);
          finishLoading();
        };
        img.src = result as string;
      };
      reader.readAsDataURL(file);
    },
    [cacheLayerCanvas, compositeAndRender, syncLayerCanvasCache]
  );

  // Restore from history entry
  const restoreFromEntry = useCallback(
    (entry: HistoryEntry) => {
      setLayers(entry.layers.map(cloneLayer));
      syncLayerCanvasCache(entry.layers);
      setActiveLayerId(entry.activeLayerId);
      setAdjustments({ ...DEFAULT_ADJUSTMENTS });
      compositeAndRender(entry.layers, entry.canvasWidth, entry.canvasHeight);
    },
    [compositeAndRender, syncLayerCanvasCache]
  );

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    restoreFromEntry(history[newIndex]);
  }, [historyIndex, history, restoreFromEntry]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    restoreFromEntry(history[newIndex]);
  }, [historyIndex, history, restoreFromEntry]);

  const restoreHistory = useCallback(
    (index: number) => {
      if (index < 0 || index >= history.length) return;
      setHistoryIndex(index);
      restoreFromEntry(history[index]);
    },
    [history, restoreFromEntry]
  );

  // Helper: apply operation to active layer
  const applyToActiveLayer = useCallback(
    (
      labelKey: HistoryLabelKey,
      operation: (img: HTMLImageElement) => { canvas: HTMLCanvasElement; w: number; h: number } | null,
      labelParams?: HistoryLabelParams
    ) => {
      const layerData = getActiveLayerData();
      if (!layerData) return;

      const img = new Image();
      img.onload = () => {
        const result = operation(img);
        if (!result) return;
        const newImageData = result.canvas.toDataURL("image/png");
        const newLayers = layers.map((l) =>
          l.id === activeLayerId
            ? { ...l, imageData: newImageData, width: result.w, height: result.h, type: "bitmap", textData: undefined }
            : l
        );
        setLayers(newLayers);
        syncLayerCanvasCache(newLayers);
        cacheLayerCanvas(activeLayerId, result.canvas, result.w, result.h);
        pushHistory(labelKey, newLayers, activeLayerId, imageWidth, imageHeight, labelParams);
        compositeAndRender(newLayers, imageWidth, imageHeight);
      };
      img.src = layerData;
    },
    [getActiveLayerData, layers, activeLayerId, pushHistory, compositeAndRender, imageWidth, imageHeight, cacheLayerCanvas, syncLayerCanvasCache]
  );

  // Flatten adjustments into active layer
  const flattenAdjustments = useCallback(() => {
    applyToActiveLayer("applyAdjustments", (img) => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.filter = buildFilterString(adjustments);
      ctx.drawImage(img, 0, 0);
      setAdjustments({ ...DEFAULT_ADJUSTMENTS });
      return { canvas, w: canvas.width, h: canvas.height };
    });
  }, [applyToActiveLayer, adjustments]);

  // Rotate active layer
  const rotate = useCallback(
    (direction: "cw" | "ccw") => {
      applyToActiveLayer(direction === "cw" ? "rotateCw" : "rotateCcw", (img) => {
        const canvas = document.createElement("canvas");
        canvas.width = img.height;
        canvas.height = img.width;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(direction === "cw" ? Math.PI / 2 : -Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        return { canvas, w: canvas.width, h: canvas.height };
      });
    },
    [applyToActiveLayer]
  );

  // Flip active layer
  const flip = useCallback(
    (direction: "horizontal" | "vertical") => {
      applyToActiveLayer(direction === "horizontal" ? "flipHorizontal" : "flipVertical", (img) => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        if (direction === "horizontal") {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        } else {
          ctx.translate(0, canvas.height);
          ctx.scale(1, -1);
        }
        ctx.drawImage(img, 0, 0);
        return { canvas, w: canvas.width, h: canvas.height };
      });
    },
    [applyToActiveLayer]
  );

  // Crop active layer
  const applyCrop = useCallback(() => {
    if (!cropRect) return;
    applyToActiveLayer("crop", (img) => {
      const canvas = document.createElement("canvas");
      canvas.width = cropRect.width;
      canvas.height = cropRect.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height);
      setCropRect(null);
      setIsCropping(false);
      setActiveTool("select");
      return { canvas, w: canvas.width, h: canvas.height };
    });
  }, [cropRect, applyToActiveLayer]);

  // Resize the whole document (all layers + canvas)
  const applyResize = useCallback(
    (newWidth: number, newHeight: number) => {
      if (!layers.length) return;

      const resizeLayer = (layer: Layer) =>
        new Promise<Layer>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve({ ...layer, width: newWidth, height: newHeight });
              return;
            }
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            resolve({
              ...layer,
              imageData: canvas.toDataURL("image/png"),
              width: newWidth,
              height: newHeight,
            });
          };
          img.onerror = () => {
            resolve({ ...layer, width: newWidth, height: newHeight });
          };
          img.src = layer.imageData;
        });

      Promise.all(layers.map(resizeLayer)).then((newLayers) => {
        setLayers(newLayers);
        syncLayerCanvasCache(newLayers);
        pushHistory("resizeTo", newLayers, activeLayerId, newWidth, newHeight, {
          width: newWidth,
          height: newHeight,
        });
        compositeAndRender(newLayers, newWidth, newHeight);
      });
    },
    [layers, activeLayerId, pushHistory, compositeAndRender, syncLayerCanvasCache]
  );

  const drawStroke = useCallback(
    (points: StrokePoint[], mode: BrushMode = "draw") => {
      if (!points.length) return;
      const commitStroke = (base: CanvasImageSource) => {
        const canvas = document.createElement("canvas");
        canvas.width = imageWidth;
        canvas.height = imageHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(base, 0, 0, imageWidth, imageHeight);
        drawStrokePath(ctx, points, {
          color: brushColor,
          size: brushSize,
          spread: brushSpread,
        }, mode);
        const newImageData = canvas.toDataURL("image/png");
        const newLayers = layers.map((l) =>
          l.id === activeLayerId
            ? {
                ...l,
                imageData: newImageData,
                width: imageWidth,
                height: imageHeight,
                type: "bitmap",
                textData: undefined,
              }
            : l
        );
        setLayers(newLayers);
        syncLayerCanvasCache(newLayers);
        cacheLayerCanvas(activeLayerId, canvas, imageWidth, imageHeight);
        pushHistory(mode === "erase" ? "eraseStroke" : "drawStroke", newLayers, activeLayerId, imageWidth, imageHeight);
        compositeAndRender(newLayers, imageWidth, imageHeight);
      };

      const cachedLayer = layerCanvasCacheRef.current.get(activeLayerId);
      if (cachedLayer) {
        commitStroke(cachedLayer);
        return;
      }

      const layerData = getActiveLayerData();
      if (!layerData) return;

      const img = new Image();
      img.onload = () => {
        commitStroke(img);
      };
      img.src = layerData;
    },
    [
      getActiveLayerData,
      imageWidth,
      imageHeight,
      brushColor,
      brushSize,
      brushSpread,
      layers,
      activeLayerId,
      pushHistory,
      compositeAndRender,
      cacheLayerCanvas,
      syncLayerCanvasCache,
    ]
  );

  const setTextLanguage = useCallback((lang: string) => {
    const family = getDefaultFontForLanguage(lang);
    ensureGoogleFontLoaded(family);
    setTextSettings((prev) => ({ ...prev, fontFamily: family }));
  }, []);

  const setTextFontFamily = useCallback((fontFamily: string) => {
    ensureGoogleFontLoaded(fontFamily);
    setTextSettings((prev) => ({ ...prev, fontFamily }));
  }, []);

  const updateTextSettings = useCallback(
    (patch: Partial<TextToolSettings>) => {
      const next = { ...textSettings, ...patch };
      setTextSettings(next);
      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (!activeLayer || activeLayer.type !== "text" || !activeLayer.textData) return;
      const nextTextData: TextLayerData = { ...activeLayer.textData, ...next };
      void renderTextLayerToCanvas(nextTextData, imageWidth, imageHeight).then(({ canvas, boxWidth, boxHeight }) => {
        const newLayers = layers.map((l) =>
          l.id === activeLayerId
            ? {
                ...l,
                imageData: canvas.toDataURL("image/png"),
                textData: { ...nextTextData, boxWidth, boxHeight },
              }
            : l
        );
        setLayers(newLayers);
        syncLayerCanvasCache(newLayers);
        cacheLayerCanvas(activeLayerId, canvas, imageWidth, imageHeight);
        compositeAndRender(newLayers, imageWidth, imageHeight);
      });
    },
    [textSettings, layers, activeLayerId, imageWidth, imageHeight, cacheLayerCanvas, compositeAndRender, syncLayerCanvasCache]
  );

  const addTextAt = useCallback(
    (x: number, y: number) => {
      const text = textSettings.content.trim();
      if (!text || !layers.length) return;
      const layerId = newLayerId();
      const textData: TextLayerData = {
        ...textSettings,
        x,
        y,
        boxWidth: 1,
        boxHeight: Math.max(1, Math.round(textSettings.fontSize * textSettings.lineHeight)),
      };
      void renderTextLayerToCanvas(textData, imageWidth, imageHeight).then(({ canvas, boxWidth, boxHeight }) => {
        const newLayer: Layer = {
          id: layerId,
          name: `Text ${layers.length}`,
          imageData: canvas.toDataURL("image/png"),
          width: imageWidth,
          height: imageHeight,
          visible: true,
          opacity: 1,
          type: "text",
          textData: { ...textData, boxWidth, boxHeight },
        };
        const newLayers = [...layers, newLayer];
        setLayers(newLayers);
        syncLayerCanvasCache(newLayers);
        cacheLayerCanvas(layerId, canvas, imageWidth, imageHeight);
        setActiveLayerId(layerId);
        pushHistory("addText", newLayers, layerId, imageWidth, imageHeight);
        compositeAndRender(newLayers, imageWidth, imageHeight);
      });
    },
    [textSettings, layers, imageWidth, imageHeight, pushHistory, compositeAndRender, cacheLayerCanvas, syncLayerCanvasCache]
  );

  const pickTextLayerAt = useCallback(
    (x: number, y: number) => {
      const hit = [...layers]
        .reverse()
        .find((layer) => {
          if (!layer.visible || layer.type !== "text" || !layer.textData) return false;
          const t = layer.textData;
          const alignOffset = t.align === "center" ? t.boxWidth / 2 : t.align === "right" ? t.boxWidth : 0;
          const left = t.x - alignOffset;
          const top = t.y;
          return x >= left && x <= left + t.boxWidth && y >= top && y <= top + t.boxHeight;
        });
      if (!hit?.textData) return;
      setActiveLayerId(hit.id);
      setActiveTool("text");
      setTextSettings({
        content: hit.textData.content,
        fontFamily: hit.textData.fontFamily,
        fontSize: hit.textData.fontSize,
        fontColor: hit.textData.fontColor,
        fontWeight: hit.textData.fontWeight,
        align: hit.textData.align,
        lineHeight: hit.textData.lineHeight,
        letterSpacing: hit.textData.letterSpacing,
        strokeColor: hit.textData.strokeColor,
        strokeWidth: hit.textData.strokeWidth,
        shadowColor: hit.textData.shadowColor,
        shadowBlur: hit.textData.shadowBlur,
        shadowOffsetX: hit.textData.shadowOffsetX,
        shadowOffsetY: hit.textData.shadowOffsetY,
      });
    },
    [layers]
  );

  // Export - composite all visible layers
  const exportImage = useCallback(
    (format: string, quality: number) => {
      if (format === "psd") {
        const layersForPsd = [...layers].reverse();
        Promise.all(
          layersForPsd.map(async (layer) => {
            const img = await loadImageElement(layer.imageData);
            const layerCanvas = document.createElement("canvas");
            layerCanvas.width = imageWidth;
            layerCanvas.height = imageHeight;
            const layerCtx = layerCanvas.getContext("2d");
            if (!layerCtx) return null;
            layerCtx.clearRect(0, 0, imageWidth, imageHeight);
            layerCtx.drawImage(img, 0, 0, imageWidth, imageHeight);
            return {
              name: layer.name,
              canvas: layerCanvas,
              hidden: !layer.visible,
              opacity: layer.opacity,
            };
          })
        )
          .then((children) => {
            const psdDoc: Psd = {
              width: imageWidth,
              height: imageHeight,
              children: children.filter((layer): layer is NonNullable<typeof layer> => layer !== null),
            };
            const output = writePsd(psdDoc);
            const blob = new Blob([output], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const baseName = fileName ? fileName.replace(/\.[^.]+$/, "") : "edited";
            link.download = `${baseName}.psd`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
          })
          .catch(() => {
            // no-op: keep editor responsive even if export fails
          });
        return;
      }

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = imageWidth;
      tempCanvas.height = imageHeight;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return;
      ctx.filter = buildFilterString(adjustments);

      const visibleLayers = layers.filter((l) => l.visible);
      let loaded = 0;
      const imgs: Map<string, HTMLImageElement> = new Map();

      visibleLayers.forEach((layer) => {
        const img = new Image();
        img.onload = () => {
          imgs.set(layer.id, img);
          loaded++;
          if (loaded === visibleLayers.length) {
            ctx.clearRect(0, 0, imageWidth, imageHeight);
            visibleLayers.forEach((l) => {
              const lImg = imgs.get(l.id);
              if (lImg) {
                ctx.globalAlpha = l.opacity;
                ctx.drawImage(lImg, 0, 0);
                ctx.globalAlpha = 1;
              }
            });

            const mimeType = `image/${format}`;
            const dataUrl = tempCanvas.toDataURL(mimeType, quality / 100);
            const link = document.createElement("a");
            const ext = format === "jpeg" ? "jpg" : format;
            const baseName = fileName ? fileName.replace(/\.[^.]+$/, "") : "edited";
            link.download = `${baseName}.${ext}`;
            link.href = dataUrl;
            link.click();
          }
        };
        img.src = layer.imageData;
      });
    },
    [adjustments, layers, imageWidth, imageHeight, fileName]
  );

  // Marquee selection: copy from active layer
  const copySelection = useCallback(() => {
    if (!selectionRect) return;
    const layerData = getActiveLayerData();
    if (!layerData) return;

    const img = new Image();
    img.onload = () => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = selectionRect.width;
      tempCanvas.height = selectionRect.height;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height, 0, 0, selectionRect.width, selectionRect.height);
      setFloatingSelection({
        rect: { ...selectionRect },
        imageData: tempCanvas.toDataURL("image/png"),
        originalX: selectionRect.x,
        originalY: selectionRect.y,
      });
    };
    img.src = layerData;
  }, [selectionRect, getActiveLayerData]);

  // Marquee selection: cut from active layer
  const cutSelection = useCallback(() => {
    if (!selectionRect) return;
    const layerData = getActiveLayerData();
    if (!layerData) return;

    const img = new Image();
    img.onload = () => {
      // Extract selection
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = selectionRect.width;
      tempCanvas.height = selectionRect.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;
      tempCtx.drawImage(img, selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height, 0, 0, selectionRect.width, selectionRect.height);
      setFloatingSelection({
        rect: { ...selectionRect },
        imageData: tempCanvas.toDataURL("image/png"),
        originalX: selectionRect.x,
        originalY: selectionRect.y,
      });

      // Erase from active layer
      const eraseCanvas = document.createElement("canvas");
      eraseCanvas.width = img.width;
      eraseCanvas.height = img.height;
      const eraseCtx = eraseCanvas.getContext("2d");
      if (!eraseCtx) return;
      eraseCtx.drawImage(img, 0, 0);
      if (backgroundColor === "transparent") {
        eraseCtx.clearRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
      } else {
        eraseCtx.fillStyle = backgroundColor;
        eraseCtx.fillRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
      }

      const newImageData = eraseCanvas.toDataURL("image/png");
      const newLayers = layers.map((l) =>
        l.id === activeLayerId ? { ...l, imageData: newImageData, type: "bitmap", textData: undefined } : l
      );
      setLayers(newLayers);
      syncLayerCanvasCache(newLayers);
      cacheLayerCanvas(activeLayerId, eraseCanvas, imageWidth, imageHeight);
      pushHistory("cutSelection", newLayers, activeLayerId, imageWidth, imageHeight);
      compositeAndRender(newLayers, imageWidth, imageHeight);
    };
    img.src = layerData;
  }, [selectionRect, getActiveLayerData, layers, activeLayerId, pushHistory, compositeAndRender, imageWidth, imageHeight, backgroundColor, cacheLayerCanvas, syncLayerCanvasCache]);

  // Paste floating selection as new layer
  const pasteSelection = useCallback(() => {
    if (!floatingSelection) return;

    // Create a canvas with the full image dimensions, place the selection at its position
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = imageWidth;
    tempCanvas.height = imageHeight;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, floatingSelection.rect.x, floatingSelection.rect.y, floatingSelection.rect.width, floatingSelection.rect.height);
      const pastedLayerId = newLayerId_();
      const newLayer: Layer = {
        id: pastedLayerId,
        name: `Layer ${layers.length}`,
        nameKey: "layer",
        nameParams: { index: layers.length },
        imageData: tempCanvas.toDataURL("image/png"),
        width: imageWidth,
        height: imageHeight,
        visible: true,
        opacity: 1,
        type: "bitmap",
      };

      const newLayers = [...layers, newLayer];
      setLayers(newLayers);
      syncLayerCanvasCache(newLayers);
      cacheLayerCanvas(pastedLayerId, tempCanvas, imageWidth, imageHeight);
      setActiveLayerId(pastedLayerId);
      pushHistory("pasteAsLayer", newLayers, pastedLayerId, imageWidth, imageHeight);
      compositeAndRender(newLayers, imageWidth, imageHeight);
      setFloatingSelection(null);
      setSelectionRect(null);
    };
    img.src = floatingSelection.imageData;
  }, [floatingSelection, layers, imageWidth, imageHeight, pushHistory, compositeAndRender, cacheLayerCanvas, syncLayerCanvasCache]);

  const moveFloatingSelection = useCallback((newX: number, newY: number) => {
    setFloatingSelection((prev) => {
      if (!prev) return prev;
      return { ...prev, rect: { ...prev.rect, x: newX, y: newY } };
    });
  }, []);

  const resizeFloatingSelection = useCallback((newRect: CropRect) => {
    setFloatingSelection((prev) => {
      if (!prev) return prev;
      return { ...prev, rect: newRect };
    });
  }, []);

  const cancelSelection = useCallback(() => {
    setFloatingSelection(null);
    setSelectionRect(null);
  }, []);

  const resetAdjustments = useCallback(() => {
    setAdjustments({ ...DEFAULT_ADJUSTMENTS });
  }, []);

  // Layer operations
  const addLayer = useCallback(
    (name?: string) => {
      const id = newLayerId();
      // Create transparent layer
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = imageWidth || 800;
      tempCanvas.height = imageHeight || 600;
      const index = layers.length;
      const newLayer: Layer = {
        id,
        name: name || `Layer ${index}`,
        nameKey: name ? undefined : "layer",
        nameParams: name ? undefined : { index },
        imageData: tempCanvas.toDataURL("image/png"),
        width: tempCanvas.width,
        height: tempCanvas.height,
        visible: true,
        opacity: 1,
        type: "bitmap",
      };
      const newLayers = [...layers, newLayer];
      setLayers(newLayers);
      syncLayerCanvasCache(newLayers);
      cacheLayerCanvas(id, tempCanvas, tempCanvas.width, tempCanvas.height);
      setActiveLayerId(id);
      pushHistory("addLayer", newLayers, id, imageWidth, imageHeight);
      compositeAndRender(newLayers, imageWidth, imageHeight);
    },
    [layers, imageWidth, imageHeight, pushHistory, compositeAndRender, cacheLayerCanvas, syncLayerCanvasCache]
  );

  const deleteLayer = useCallback(
    (layerId: string) => {
      if (layers.length <= 1) return; // Can't delete last layer
      const newLayers = layers.filter((l) => l.id !== layerId);
      const newActiveId = activeLayerId === layerId ? newLayers[newLayers.length - 1].id : activeLayerId;
      setLayers(newLayers);
      syncLayerCanvasCache(newLayers);
      setActiveLayerId(newActiveId);
      pushHistory("deleteLayer", newLayers, newActiveId, imageWidth, imageHeight);
      compositeAndRender(newLayers, imageWidth, imageHeight);
    },
    [layers, activeLayerId, imageWidth, imageHeight, pushHistory, compositeAndRender, syncLayerCanvasCache]
  );

  const toggleLayerVisibility = useCallback(
    (layerId: string) => {
      const newLayers = layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      );
      setLayers(newLayers);
      syncLayerCanvasCache(newLayers);
      compositeAndRender(newLayers, imageWidth, imageHeight);
    },
    [layers, imageWidth, imageHeight, compositeAndRender, syncLayerCanvasCache]
  );

  const setLayerOpacity = useCallback(
    (layerId: string, opacity: number) => {
      const newLayers = layers.map((l) =>
        l.id === layerId ? { ...l, opacity } : l
      );
      setLayers(newLayers);
      syncLayerCanvasCache(newLayers);
      compositeAndRender(newLayers, imageWidth, imageHeight);
    },
    [layers, imageWidth, imageHeight, compositeAndRender, syncLayerCanvasCache]
  );

  const renameLayer = useCallback(
    (layerId: string, name: string) => {
      setLayers((prev) =>
        prev.map((l) =>
          l.id === layerId ? { ...l, name, nameKey: undefined, nameParams: undefined } : l
        )
      );
    },
    []
  );

  const reorderLayers = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newLayers = [...layers];
      const [moved] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, moved);
      setLayers(newLayers);
      syncLayerCanvasCache(newLayers);
      pushHistory("reorderLayers", newLayers, activeLayerId, imageWidth, imageHeight);
      compositeAndRender(newLayers, imageWidth, imageHeight);
    },
    [layers, activeLayerId, imageWidth, imageHeight, pushHistory, compositeAndRender, syncLayerCanvasCache]
  );

  const mergeDown = useCallback(
    (layerId: string) => {
      const idx = layers.findIndex((l) => l.id === layerId);
      if (idx <= 0) return; // Can't merge bottom layer

      const topLayer = layers[idx];
      const bottomLayer = layers[idx - 1];

      const topImg = new Image();
      const bottomImg = new Image();
      let loaded = 0;

      const onBothLoaded = () => {
        const canvas = document.createElement("canvas");
        canvas.width = imageWidth;
        canvas.height = imageHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.globalAlpha = bottomLayer.opacity;
        ctx.drawImage(bottomImg, 0, 0);
        ctx.globalAlpha = topLayer.opacity;
        ctx.drawImage(topImg, 0, 0);
        ctx.globalAlpha = 1;

        const mergedLayer: Layer = {
          ...bottomLayer,
          imageData: canvas.toDataURL("image/png"),
          opacity: 1,
        };

        const newLayers = layers.filter((_, i) => i !== idx).map((l) =>
          l.id === bottomLayer.id ? mergedLayer : l
        );
        setLayers(newLayers);
        syncLayerCanvasCache(newLayers);
        cacheLayerCanvas(bottomLayer.id, canvas, imageWidth, imageHeight);
        setActiveLayerId(mergedLayer.id);
        pushHistory("mergeDown", newLayers, mergedLayer.id, imageWidth, imageHeight);
        compositeAndRender(newLayers, imageWidth, imageHeight);
      };

      topImg.onload = () => { loaded++; if (loaded === 2) onBothLoaded(); };
      bottomImg.onload = () => { loaded++; if (loaded === 2) onBothLoaded(); };
      topImg.src = topLayer.imageData;
      bottomImg.src = bottomLayer.imageData;
    },
    [layers, imageWidth, imageHeight, pushHistory, compositeAndRender, cacheLayerCanvas, syncLayerCanvasCache]
  );

  // Re-render when canvas remounts
  useEffect(() => {
    if (layers.length > 0 && imageWidth > 0) {
      compositeAndRender(layers, imageWidth, imageHeight);
    }
  }, [layers, imageWidth, imageHeight, compositeAndRender]);

  useEffect(() => {
    const active = layers.find((layer) => layer.id === activeLayerId);
    if (active?.type !== "text" || !active.textData) return;
    setTextSettings({
      content: active.textData.content,
      fontFamily: active.textData.fontFamily,
      fontSize: active.textData.fontSize,
      fontColor: active.textData.fontColor,
      fontWeight: active.textData.fontWeight,
      align: active.textData.align,
      lineHeight: active.textData.lineHeight,
      letterSpacing: active.textData.letterSpacing,
      strokeColor: active.textData.strokeColor,
      strokeWidth: active.textData.strokeWidth,
      shadowColor: active.textData.shadowColor,
      shadowBlur: active.textData.shadowBlur,
      shadowOffsetX: active.textData.shadowOffsetX,
      shadowOffsetY: active.textData.shadowOffsetY,
    });
  }, [layers, activeLayerId]);

  // Also re-render on history restore with canvas check
  useEffect(() => {
    if (historyIndex >= 0 && history[historyIndex]) {
      const entry = history[historyIndex];
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (canvas.width !== entry.canvasWidth || canvas.height !== entry.canvasHeight ||
          !canvas.getContext("2d")?.getImageData(0, 0, 1, 1).data[3]) {
        compositeAndRender(entry.layers, entry.canvasWidth, entry.canvasHeight);
      }
    }
  }, [history, historyIndex, compositeAndRender]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const hasImage = layers.length > 0;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    canvasRef,
    imageWidth,
    imageHeight,
    zoom,
    setZoom,
    activeTool,
    setActiveTool,
    adjustments,
    setAdjustments,
    history,
    historyIndex,
    fileName,
    cropRect,
    setCropRect,
    isCropping,
    setIsCropping,
    selectionRect,
    setSelectionRect,
    floatingSelection,
    setFloatingSelection,
    backgroundColor,
    setBackgroundColor,
    isLoading,
    brushColor,
    setBrushColor,
    brushSize,
    setBrushSize,
    brushSpread,
    setBrushSpread,
    textSettings,
    setTextSettings,
    updateTextSettings,
    setTextFontFamily,
    setTextLanguage,
    textFontOptions: TEXT_FONT_OPTIONS,
    layers,
    activeLayerId,
    setActiveLayerId,
    hasImage,
    canUndo,
    canRedo,
    loadImage,
    undo,
    redo,
    restoreHistory,
    rotate,
    flip,
    applyCrop,
    applyResize,
    drawStroke,
    addTextAt,
    pickTextLayerAt,
    exportImage,
    flattenAdjustments,
    resetAdjustments,
    getCanvasFilterStyle,
    copySelection,
    cutSelection,
    pasteSelection,
    moveFloatingSelection,
    resizeFloatingSelection,
    cancelSelection,
    addLayer,
    deleteLayer,
    toggleLayerVisibility,
    setLayerOpacity,
    renameLayer,
    reorderLayers,
    mergeDown,
    DEFAULT_ADJUSTMENTS,
  };
}

// Fix: separate function to avoid name conflict
function newLayerId_() {
  return `layer_${++layerIdCounter}`;
}

export { DEFAULT_ADJUSTMENTS };
