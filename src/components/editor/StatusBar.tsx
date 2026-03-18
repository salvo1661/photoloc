interface StatusBarProps {
  hasImage: boolean;
  imageWidth: number;
  imageHeight: number;
  zoom: number;
  fileName: string;
}

export function StatusBar({
  hasImage,
  imageWidth,
  imageHeight,
  zoom,
  fileName,
}: StatusBarProps) {
  return (
    <div className="flex h-6 items-center justify-between border-t border-border bg-editor-toolbar px-3">
      <div className="flex items-center gap-3">
        {hasImage && (
          <>
            <span className="font-mono text-[10px] text-muted-foreground">
              {imageWidth} × {imageHeight}px
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {zoom}%
            </span>
          </>
        )}
      </div>
      <div>
        {fileName && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {fileName}
          </span>
        )}
      </div>
    </div>
  );
}
