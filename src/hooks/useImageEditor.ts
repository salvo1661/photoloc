import { useState, useRef, useCallback, useEffect } from "react";
import type { HistoryLabelKey, HistoryLabelParams, LayerNameKey } from "@/i18n";

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
}

export interface HistoryEntry {
  labelKey: HistoryLabelKey;
  labelParams?: HistoryLabelParams;
  layers: Layer[];
  activeLayerId: string;
  canvasWidth: number;
  canvasHeight: number;
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

export type ActiveTool = "select" | "crop" | "resize" | "rotate" | "marquee" | "pen";
export type StrokePoint = { x: number; y: number };

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

  // Layer state
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>("");

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
      canvas.width = cw;
      canvas.height = ch;
      setImageWidth(cw);
      setImageHeight(ch);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, cw, ch);

      let remaining = layerList.filter((l) => l.visible).length;
      if (remaining === 0) return;

      const sortedLayers = [...layerList].filter((l) => l.visible);
      const loadedImages: Map<string, HTMLImageElement> = new Map();

      sortedLayers.forEach((layer) => {
        const img = new Image();
        img.onload = () => {
          loadedImages.set(layer.id, img);
          if (loadedImages.size === remaining) {
            // Draw in order
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
    []
  );

  // Push history with current layer state
  const pushHistory = useCallback(
    (labelKey: HistoryLabelKey, newLayers: Layer[], activeId: string, cw: number, ch: number, labelParams?: HistoryLabelParams) => {
      const newEntry: HistoryEntry = {
        labelKey,
        labelParams,
        layers: newLayers.map((l) => ({ ...l })),
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
          };

          const newLayers = [newLayer];
          setLayers(newLayers);
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
              layers: [{ ...newLayer }],
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
    []
  );

  // Restore from history entry
  const restoreFromEntry = useCallback(
    (entry: HistoryEntry) => {
      setLayers(entry.layers.map((l) => ({ ...l })));
      setActiveLayerId(entry.activeLayerId);
      setAdjustments({ ...DEFAULT_ADJUSTMENTS });
      compositeAndRender(entry.layers, entry.canvasWidth, entry.canvasHeight);
    },
    [compositeAndRender]
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
            ? { ...l, imageData: newImageData, width: result.w, height: result.h }
            : l
        );
        setLayers(newLayers);
        pushHistory(labelKey, newLayers, activeLayerId, imageWidth, imageHeight, labelParams);
        compositeAndRender(newLayers, imageWidth, imageHeight);
      };
      img.src = layerData;
    },
    [getActiveLayerData, layers, activeLayerId, pushHistory, compositeAndRender, imageWidth, imageHeight]
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
        pushHistory("resizeTo", newLayers, activeLayerId, newWidth, newHeight, {
          width: newWidth,
          height: newHeight,
        });
        compositeAndRender(newLayers, newWidth, newHeight);
      });
    },
    [layers, activeLayerId, pushHistory, compositeAndRender]
  );

  const drawStroke = useCallback(
    (points: StrokePoint[]) => {
      if (!points.length) return;
      const layerData = getActiveLayerData();
      if (!layerData) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = imageWidth;
        canvas.height = imageHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
        ctx.strokeStyle = brushColor;
        ctx.fillStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (brushSpread > 0) {
          ctx.shadowColor = brushColor;
          ctx.shadowBlur = brushSpread;
        }

        if (points.length === 1) {
          ctx.beginPath();
          ctx.arc(points[0].x, points[0].y, Math.max(brushSize / 2, 1), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i += 1) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.stroke();
        }

        ctx.shadowBlur = 0;

        const newImageData = canvas.toDataURL("image/png");
        const newLayers = layers.map((l) =>
          l.id === activeLayerId
            ? {
                ...l,
                imageData: newImageData,
                width: imageWidth,
                height: imageHeight,
              }
            : l
        );
        setLayers(newLayers);
        pushHistory("drawStroke", newLayers, activeLayerId, imageWidth, imageHeight);
        compositeAndRender(newLayers, imageWidth, imageHeight);
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
    ]
  );

  // Export - composite all visible layers
  const exportImage = useCallback(
    (format: string, quality: number) => {
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
    [layers, imageWidth, imageHeight, fileName]
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
        l.id === activeLayerId ? { ...l, imageData: newImageData } : l
      );
      setLayers(newLayers);
      pushHistory("cutSelection", newLayers, activeLayerId, imageWidth, imageHeight);
      compositeAndRender(newLayers, imageWidth, imageHeight);
    };
    img.src = layerData;
  }, [selectionRect, getActiveLayerData, layers, activeLayerId, pushHistory, compositeAndRender, imageWidth, imageHeight, backgroundColor]);

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
      };

      const newLayers = [...layers, newLayer];
      setLayers(newLayers);
      setActiveLayerId(pastedLayerId);
      pushHistory("pasteAsLayer", newLayers, pastedLayerId, imageWidth, imageHeight);
      compositeAndRender(newLayers, imageWidth, imageHeight);
      setFloatingSelection(null);
      setSelectionRect(null);
    };
    img.src = floatingSelection.imageData;
  }, [floatingSelection, layers, imageWidth, imageHeight, pushHistory, compositeAndRender]);

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
      };
      const newLayers = [...layers, newLayer];
      setLayers(newLayers);
      setActiveLayerId(id);
      pushHistory("addLayer", newLayers, id, imageWidth, imageHeight);
      compositeAndRender(newLayers, imageWidth, imageHeight);
    },
    [layers, imageWidth, imageHeight, pushHistory, compositeAndRender]
  );

  const deleteLayer = useCallback(
    (layerId: string) => {
      if (layers.length <= 1) return; // Can't delete last layer
      const newLayers = layers.filter((l) => l.id !== layerId);
      const newActiveId = activeLayerId === layerId ? newLayers[newLayers.length - 1].id : activeLayerId;
      setLayers(newLayers);
      setActiveLayerId(newActiveId);
      pushHistory("deleteLayer", newLayers, newActiveId, imageWidth, imageHeight);
      compositeAndRender(newLayers, imageWidth, imageHeight);
    },
    [layers, activeLayerId, imageWidth, imageHeight, pushHistory, compositeAndRender]
  );

  const toggleLayerVisibility = useCallback(
    (layerId: string) => {
      const newLayers = layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      );
      setLayers(newLayers);
      compositeAndRender(newLayers, imageWidth, imageHeight);
    },
    [layers, imageWidth, imageHeight, compositeAndRender]
  );

  const setLayerOpacity = useCallback(
    (layerId: string, opacity: number) => {
      const newLayers = layers.map((l) =>
        l.id === layerId ? { ...l, opacity } : l
      );
      setLayers(newLayers);
      compositeAndRender(newLayers, imageWidth, imageHeight);
    },
    [layers, imageWidth, imageHeight, compositeAndRender]
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
      pushHistory("reorderLayers", newLayers, activeLayerId, imageWidth, imageHeight);
      compositeAndRender(newLayers, imageWidth, imageHeight);
    },
    [layers, activeLayerId, imageWidth, imageHeight, pushHistory, compositeAndRender]
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
        setActiveLayerId(mergedLayer.id);
        pushHistory("mergeDown", newLayers, mergedLayer.id, imageWidth, imageHeight);
        compositeAndRender(newLayers, imageWidth, imageHeight);
      };

      topImg.onload = () => { loaded++; if (loaded === 2) onBothLoaded(); };
      bottomImg.onload = () => { loaded++; if (loaded === 2) onBothLoaded(); };
      topImg.src = topLayer.imageData;
      bottomImg.src = bottomLayer.imageData;
    },
    [layers, imageWidth, imageHeight, pushHistory, compositeAndRender]
  );

  // Re-render when canvas remounts
  useEffect(() => {
    if (layers.length > 0 && imageWidth > 0) {
      compositeAndRender(layers, imageWidth, imageHeight);
    }
  }, [layers.length > 0 && imageWidth > 0 ? "render" : "skip"]);

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
  }, [historyIndex]);

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
