import { useState, useRef, useCallback, useEffect } from "react";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useParams, useLocation, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  supportedLanguages,
  languageNames,
  getMessages,
  localizePath,
} from "../i18n";
import { Check, X, Copy, Scissors, ClipboardPaste, ChevronDown, Github } from "lucide-react";
import type { Adjustments } from "@/hooks/useImageEditor";

const Index = () => {
  const params = useParams();
  const currentLang = params.lang && supportedLanguages.includes(params.lang) ? params.lang : "en";
  const msgs = getMessages(currentLang);
  const location = useLocation();
  const canonicalPath = localizePath(location.pathname, currentLang);

  const editor = useImageEditor();
  const { setTextLanguage } = editor;
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

  useEffect(() => {
    setTextLanguage(currentLang);
  }, [currentLang, setTextLanguage]);

  return (
    <>
      <Helmet>
        <html lang={currentLang} />
        <title>{msgs.meta.title}</title>
        <meta name="description" content={msgs.meta.description} />
        <meta property="og:title" content={msgs.meta.title} />
        <meta name="twitter:title" content={msgs.meta.title} />
        <meta property="og:description" content={msgs.meta.description} />
        <meta name="twitter:description" content={msgs.meta.description} />
        <link rel="canonical" href={`https://photo.localtool.tech${canonicalPath}`} />
        {supportedLanguages.map((lang) => (
          <link
            key={lang}
            rel="alternate"
            hrefLang={lang}
            href={`https://photo.localtool.tech${localizePath(location.pathname, lang)}`}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href="https://photo.localtool.tech/en" />
      </Helmet>

      <div className="border-b border-border bg-muted px-3 py-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{msgs.meta.home}</span>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/salvo1661/photoloc"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[11px] font-semibold text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
            >
              <Github className="h-3.5 w-3.5" />
              Open Source Project
            </a>
            <a
              href="https://leanvibe.io/vibe/photoloc"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[11px] font-semibold text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
            >
              <img
                src="https://leanvibe.io/favicon-32x32.png"
                alt="LeanVibe"
                className="h-3.5 w-3.5"
              />
              Listed on LeanVibe
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                  {languageNames[currentLang]}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {supportedLanguages.map((lang) => (
                  <DropdownMenuItem key={lang} asChild>
                    <Link
                      to={localizePath(location.pathname, lang)}
                      className={currentLang === lang ? "font-semibold" : ""}
                    >
                      {languageNames[lang]}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <WelcomeDialog messages={msgs} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.psd,.psb"
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
        messages={msgs}
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
          messages={msgs}
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
                {editor.cropRect.width} {msgs.ui.symbols.times} {editor.cropRect.height}
              </span>
              <Button
                size="sm"
                className="h-6 gap-1 px-2 text-[11px]"
                onClick={editor.applyCrop}
              >
                <Check className="h-3 w-3" /> {msgs.ui.crop.apply}
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
                <X className="h-3 w-3" /> {msgs.ui.crop.cancel}
              </Button>
            </div>
          )}

          {/* Marquee action bar */}
          {editor.activeTool === "marquee" && (editor.selectionRect || editor.floatingSelection) && (
            <div className="absolute left-1/2 top-2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 shadow-lg">
              {editor.selectionRect && !editor.floatingSelection && (
                <>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {editor.selectionRect.width} {msgs.ui.symbols.times} {editor.selectionRect.height}
                  </span>
                  <Button size="sm" className="h-6 gap-1 px-2 text-[11px]" onClick={editor.copySelection}>
                    <Copy className="h-3 w-3" /> {msgs.ui.marquee.copy}
                  </Button>
                  <Button size="sm" variant="secondary" className="h-6 gap-1 px-2 text-[11px]" onClick={editor.cutSelection}>
                    <Scissors className="h-3 w-3" /> {msgs.ui.marquee.cut}
                  </Button>
                </>
              )}
              {editor.floatingSelection && (
                <>
                  <span className="text-[11px] text-muted-foreground">{msgs.ui.marquee.dragToMoveThenPaste}</span>
                  <Button size="sm" className="h-6 gap-1 px-2 text-[11px]" onClick={editor.pasteSelection}>
                    <ClipboardPaste className="h-3 w-3" /> {msgs.ui.marquee.paste}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-[11px]"
                onClick={editor.cancelSelection}
              >
                <X className="h-3 w-3" /> {msgs.ui.marquee.cancel}
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
            messages={msgs}
            isLoading={editor.isLoading}
            cropRect={editor.cropRect}
            onCropChange={editor.setCropRect}
            onLoadImage={editor.loadImage}
            selectionRect={editor.selectionRect}
            onSelectionChange={editor.setSelectionRect}
            floatingSelection={editor.floatingSelection}
            onMoveFloatingSelection={editor.moveFloatingSelection}
            onResizeFloatingSelection={editor.resizeFloatingSelection}
            brushColor={editor.brushColor}
            brushSize={editor.brushSize}
            brushSpread={editor.brushSpread}
            onDrawStroke={editor.drawStroke}
            onAddText={editor.addTextAt}
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
          activeTool={editor.activeTool}
          brushColor={editor.brushColor}
          brushSize={editor.brushSize}
          brushSpread={editor.brushSpread}
          textSettings={editor.textSettings}
          textFontOptions={editor.textFontOptions}
          messages={msgs}
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
          onBrushColorChange={editor.setBrushColor}
          onBrushSizeChange={editor.setBrushSize}
          onBrushSpreadChange={editor.setBrushSpread}
          onTextContentChange={(value) =>
            editor.setTextSettings((prev) => ({ ...prev, content: value }))
          }
          onTextFontFamilyChange={editor.setTextFontFamily}
          onTextFontSizeChange={(value) =>
            editor.setTextSettings((prev) => ({ ...prev, fontSize: value }))
          }
          onTextFontColorChange={(value) =>
            editor.setTextSettings((prev) => ({ ...prev, fontColor: value }))
          }
          onTextFontWeightChange={(value) =>
            editor.setTextSettings((prev) => ({ ...prev, fontWeight: value }))
          }
        />
      </div>

      <StatusBar
        hasImage={editor.hasImage}
        imageWidth={editor.imageWidth}
        imageHeight={editor.imageHeight}
        zoom={editor.zoom}
        fileName={editor.fileName}
        messages={msgs}
      />

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        onExport={editor.exportImage}
        messages={msgs}
      />

      <ResizeDialog
        open={showResize}
        imageWidth={editor.imageWidth}
        imageHeight={editor.imageHeight}
        onClose={() => setShowResize(false)}
        onApply={editor.applyResize}
        messages={msgs}
      />
    </div>
    </>
  );
};

export default Index;
