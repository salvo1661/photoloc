import { useState, useRef, useCallback } from "react";
import { useImageEditor } from "@/hooks/useImageEditor";
import { TopToolbar } from "@/components/editor/TopToolbar";
import { LeftSidebar } from "@/components/editor/LeftSidebar";
import { RightSidebar } from "@/components/editor/RightSidebar";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { StatusBar } from "@/components/editor/StatusBar";
import { ExportDialog } from "@/components/editor/ExportDialog";
import { ResizeDialog } from "@/components/editor/ResizeDialog";
import { WelcomeDialog } from "@/components/editor/WelcomeDialog";
import { Button } from "@/components/ui/button";
import { useParams, useLocation, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supportedLanguages, languageNames, getMessages } from "../i18n";
import { Check, X, Copy, Scissors, ClipboardPaste } from "lucide-react";
import type { Adjustments } from "@/hooks/useImageEditor";

const Index = () => {
  const params = useParams();
  const currentLang = params.lang && supportedLanguages.includes(params.lang) ? params.lang : "en";
  const msgs = getMessages(currentLang);
  const location = useLocation();

  const editor = useImageEditor();
  const [showExport, setShowExport] = useState(false);
  const [showResize, setShowResize] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToolChange = useCallback(
    (tool: typeof editor.activeTool) => {
      if (tool === "resize") {
        setShowResize(true);
        return;
      }
      editor.setActiveTool(tool);
      if (tool === "crop") {
        editor.setIsCropping(true);
        editor.setCropRect(null);
      } else {
        editor.setIsCropping(false);
        editor.setCropRect(null);
      }
      if (tool !== "marquee") {
        editor.cancelSelection();
      }
    },
    [editor]
  );

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <>
      <Helmet>
        <title>{msgs.title}</title>
        <meta name="description" content={msgs.description} />
        <meta property="og:title" content={msgs.title} />
        <meta property="og:description" content={msgs.description} />
        <link rel="canonical" href={`https://photo.localtool.tech${location.pathname}`} />
        {supportedLanguages.map((lang) => (
          <link
            key={lang}
            rel="alternate"
            hrefLang={lang}
            href={`https://photo.localtool.tech/${lang}${location.pathname.replace(/^\/(en|es|pt|fr|de|hi|ja|ko|id|ar|zh)/, "")}`}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href="https://photo.localtool.tech/en" />
      </Helmet>

      <div className="border-b border-border bg-muted p-2 text-sm">
        <span className="font-semibold">{msgs.home}</span>
        <span className="ml-3">·</span>
        {supportedLanguages.map((lang) => (
          <Link
            key={lang}
            to={`/${lang}${location.pathname.replace(/^\/(en|es|pt|fr|de|hi|ja|ko|id|ar|zh)/, "")}`}
            className={`ml-2 rounded px-2 py-1 text-xs ${currentLang === lang ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}
          >
            {languageNames[lang]}
          </Link>
        ))}
      </div>

      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <WelcomeDialog />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) editor.loadImage(file);
          e.target.value = "";
        }}
      />

      <TopToolbar
        hasImage={editor.hasImage}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        zoom={editor.zoom}
        onUpload={handleUploadClick}
        onExport={() => setShowExport(true)}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onZoomIn={() => editor.setZoom(Math.min(editor.zoom + 25, 500))}
        onZoomOut={() => editor.setZoom(Math.max(editor.zoom - 25, 10))}
        onZoomFit={() => {
          // Re-calculate fit zoom
          const canvas = editor.canvasRef.current;
          const container = canvas?.parentElement;
          if (canvas && container) {
            const maxW = container.clientWidth - 40;
            const maxH = container.clientHeight - 40;
            const scale = Math.min(
              maxW / editor.imageWidth,
              maxH / editor.imageHeight,
              1
            );
            editor.setZoom(Math.round(scale * 100));
          }
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          activeTool={editor.activeTool}
          hasImage={editor.hasImage}
          onToolChange={handleToolChange}
          onRotateCW={() => editor.rotate("cw")}
          onRotateCCW={() => editor.rotate("ccw")}
          onFlipH={() => editor.flip("horizontal")}
          onFlipV={() => editor.flip("vertical")}
        />

        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Crop action bar */}
          {editor.activeTool === "crop" && editor.cropRect && (
            <div className="absolute left-1/2 top-2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 shadow-lg">
              <span className="font-mono text-[11px] text-muted-foreground">
                {editor.cropRect.width} × {editor.cropRect.height}
              </span>
              <Button
                size="sm"
                className="h-6 gap-1 px-2 text-[11px]"
                onClick={editor.applyCrop}
              >
                <Check className="h-3 w-3" /> Apply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-[11px]"
                onClick={() => {
                  editor.setCropRect(null);
                  editor.setActiveTool("select");
                }}
              >
                <X className="h-3 w-3" /> Cancel
              </Button>
            </div>
          )}

          {/* Marquee action bar */}
          {editor.activeTool === "marquee" && (editor.selectionRect || editor.floatingSelection) && (
            <div className="absolute left-1/2 top-2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 shadow-lg">
              {editor.selectionRect && !editor.floatingSelection && (
                <>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {editor.selectionRect.width} × {editor.selectionRect.height}
                  </span>
                  <Button size="sm" className="h-6 gap-1 px-2 text-[11px]" onClick={editor.copySelection}>
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                  <Button size="sm" variant="secondary" className="h-6 gap-1 px-2 text-[11px]" onClick={editor.cutSelection}>
                    <Scissors className="h-3 w-3" /> Cut
                  </Button>
                </>
              )}
              {editor.floatingSelection && (
                <>
                  <span className="text-[11px] text-muted-foreground">Drag to move, then paste</span>
                  <Button size="sm" className="h-6 gap-1 px-2 text-[11px]" onClick={editor.pasteSelection}>
                    <ClipboardPaste className="h-3 w-3" /> Paste
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-[11px]"
                onClick={editor.cancelSelection}
              >
                <X className="h-3 w-3" /> Cancel
              </Button>
            </div>
          )}

          <EditorCanvas
            canvasRef={editor.canvasRef}
            hasImage={editor.hasImage}
            zoom={editor.zoom}
            filterStyle={editor.getCanvasFilterStyle()}
            activeTool={editor.activeTool}
            imageWidth={editor.imageWidth}
            imageHeight={editor.imageHeight}
            cropRect={editor.cropRect}
            onCropChange={editor.setCropRect}
            onLoadImage={editor.loadImage}
            selectionRect={editor.selectionRect}
            onSelectionChange={editor.setSelectionRect}
            floatingSelection={editor.floatingSelection}
            onMoveFloatingSelection={editor.moveFloatingSelection}
            onResizeFloatingSelection={editor.resizeFloatingSelection}
          />
        </div>

        <RightSidebar
          adjustments={editor.adjustments}
          hasImage={editor.hasImage}
          history={editor.history}
          historyIndex={editor.historyIndex}
          backgroundColor={editor.backgroundColor}
          layers={editor.layers}
          activeLayerId={editor.activeLayerId}
          onAdjustmentChange={(key: keyof Adjustments, value: number) =>
            editor.setAdjustments((prev) => ({ ...prev, [key]: value }))
          }
          onResetAdjustments={editor.resetAdjustments}
          onApplyAdjustments={editor.flattenAdjustments}
          onRestoreHistory={editor.restoreHistory}
          onBackgroundColorChange={editor.setBackgroundColor}
          onSelectLayer={editor.setActiveLayerId}
          onToggleLayerVisibility={editor.toggleLayerVisibility}
          onDeleteLayer={editor.deleteLayer}
          onAddLayer={() => editor.addLayer()}
          onSetLayerOpacity={editor.setLayerOpacity}
          onReorderLayers={editor.reorderLayers}
          onMergeDown={editor.mergeDown}
        />
      </div>

      <StatusBar
        hasImage={editor.hasImage}
        imageWidth={editor.imageWidth}
        imageHeight={editor.imageHeight}
        zoom={editor.zoom}
        fileName={editor.fileName}
      />

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        onExport={editor.exportImage}
      />

      <ResizeDialog
        open={showResize}
        imageWidth={editor.imageWidth}
        imageHeight={editor.imageHeight}
        onClose={() => setShowResize(false)}
        onApply={editor.applyResize}
      />
    </div>
    </>
  );
};

export default Index;
