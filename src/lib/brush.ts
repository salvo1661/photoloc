export interface StrokePoint {
  x: number;
  y: number;
}

export interface BrushStyle {
  color: string;
  size: number;
  spread: number;
}

export type BrushMode = "draw" | "erase";

const brushStampCache = new Map<string, HTMLCanvasElement>();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseColor(color: string) {
  const normalized = color.trim().toLowerCase();

  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    if (hex.length === 3) {
      return {
        r: Number.parseInt(hex[0] + hex[0], 16),
        g: Number.parseInt(hex[1] + hex[1], 16),
        b: Number.parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 6) {
      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  const match = normalized.match(/\d+(\.\d+)?/g);
  if (match && match.length >= 3) {
    return {
      r: clamp(Number.parseFloat(match[0]), 0, 255),
      g: clamp(Number.parseFloat(match[1]), 0, 255),
      b: clamp(Number.parseFloat(match[2]), 0, 255),
    };
  }

  return { r: 17, g: 17, b: 17 };
}

function rgbaString(color: ReturnType<typeof parseColor>, alpha: number) {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`;
}

function getBrushStamp(brush: BrushStyle) {
  const size = Math.max(1, brush.size);
  const spread = Math.max(0, brush.spread);
  const cacheKey = `${brush.color}:${size.toFixed(2)}:${spread.toFixed(2)}`;
  const cached = brushStampCache.get(cacheKey);
  if (cached) return cached;

  const coreRadius = size / 2;
  const outerRadius = Math.max(coreRadius, coreRadius + spread);
  const padding = 2;
  const diameter = Math.ceil(outerRadius * 2 + padding * 2);
  const center = diameter / 2;

  const canvas = document.createElement("canvas");
  canvas.width = diameter;
  canvas.height = diameter;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const rgb = parseColor(brush.color);
  const hardStop = outerRadius <= 0 ? 1 : clamp(coreRadius / outerRadius, 0, 1);

  const gradient = ctx.createRadialGradient(center, center, 0, center, center, outerRadius);
  gradient.addColorStop(0, rgbaString(rgb, 1));
  gradient.addColorStop(Math.max(0, hardStop * 0.7), rgbaString(rgb, 1));
  gradient.addColorStop(hardStop, rgbaString(rgb, spread > 0 ? 0.92 : 1));
  gradient.addColorStop(clamp(hardStop + (1 - hardStop) * 0.45, 0, 1), rgbaString(rgb, 0.35));
  gradient.addColorStop(1, rgbaString(rgb, 0));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
  ctx.fill();

  brushStampCache.set(cacheKey, canvas);
  return canvas;
}

function drawStamp(ctx: CanvasRenderingContext2D, brush: BrushStyle, point: StrokePoint) {
  const stamp = getBrushStamp(brush);
  const x = point.x - stamp.width / 2;
  const y = point.y - stamp.height / 2;
  ctx.drawImage(stamp, x, y);
}

export function drawStrokePath(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  brush: BrushStyle,
  mode: BrushMode = "draw"
) {
  if (!points.length) return;

  const spacing = Math.max(0.5, Math.min(brush.size, Math.max(brush.size + brush.spread, 1) * 0.18));

  ctx.save();
  if (mode === "erase") {
    ctx.globalCompositeOperation = "destination-out";
  }

  if (points.length === 1) {
    drawStamp(ctx, brush, points[0]);
    ctx.restore();
    return;
  }

  drawStamp(ctx, brush, points[0]);

  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) {
      drawStamp(ctx, brush, to);
      continue;
    }

    const steps = Math.max(1, Math.ceil(distance / spacing));
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      drawStamp(ctx, brush, {
        x: from.x + dx * t,
        y: from.y + dy * t,
      });
    }
  }

  ctx.restore();
}
