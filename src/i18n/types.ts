export type HistoryLabelKey =
  | "openImage"
  | "applyAdjustments"
  | "rotateCw"
  | "rotateCcw"
  | "flipHorizontal"
  | "flipVertical"
  | "crop"
  | "resizeTo"
  | "cutSelection"
  | "pasteAsLayer"
  | "addLayer"
  | "deleteLayer"
  | "reorderLayers"
  | "mergeDown"
  | "drawStroke";

export type HistoryLabelParams = {
  width?: number;
  height?: number;
};

export type LayerNameKey = "background" | "layer";

export type Messages = {
  meta: {
    title: string;
    description: string;
    home: string;
    subTitle: string;
    notFound: string;
    separator: string;
  };
  ui: {
    headerSeparator: string;
    toolbar: {
      open: string;
      export: string;
      undoTitle: string;
      redoTitle: string;
      fitToScreen: string;
      imageEditor: string;
    };
    tools: {
      selectPan: string;
      marqueeSelect: string;
      pen: string;
      crop: string;
      resize: string;
      rotateCw: string;
      rotateCcw: string;
      flipHorizontal: string;
      flipVertical: string;
    };
    canvas: {
      dropHere: string;
      supports: string;
      dropToReplace: string;
      loading: string;
    };
    right: {
      adjustments: string;
      reset: string;
      apply: string;
      background: string;
      layers: string;
      history: string;
      noHistory: string;
      noLayers: string;
      opacity: string;
      addLayer: string;
      showLayer: string;
      hideLayer: string;
      moveUp: string;
      moveDown: string;
      mergeDown: string;
      deleteLayer: string;
      pen: string;
      brushColor: string;
      brushSize: string;
      brushSpread: string;
    };
    adjustments: {
      brightness: string;
      contrast: string;
      saturation: string;
      hueRotate: string;
      sepia: string;
      grayscale: string;
      blur: string;
      hueUnit: string;
    };
    marquee: {
      copy: string;
      cut: string;
      paste: string;
      cancel: string;
      dragToMoveThenPaste: string;
    };
    crop: {
      apply: string;
      cancel: string;
    };
    dialogs: {
      export: {
        title: string;
        format: string;
        formatPngLossless: string;
        formatJpeg: string;
        formatWebp: string;
        quality: string;
        cancel: string;
        download: string;
      };
      resize: {
        title: string;
        width: string;
        height: string;
        lockAspect: string;
        unlockAspect: string;
        fromTo: string;
        cancel: string;
        apply: string;
      };
      welcome: {
        title: string;
        body: string;
        feature1Title: string;
        feature1Desc: string;
        feature2Title: string;
        feature2Desc: string;
        feature3Title: string;
        feature3Desc: string;
        getStarted: string;
      };
    };
    status: {
      dimensions: string;
    };
    symbols: {
      times: string;
      arrow: string;
    };
  };
  history: Record<HistoryLabelKey, string>;
  layers: {
    background: string;
    layer: string;
  };
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
