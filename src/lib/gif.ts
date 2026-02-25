import { parseGIF, decompressFrames } from 'gifuct-js';
// @ts-expect-error gif.js has no type definitions
import GIF from 'gif.js';

export interface DecodedFrame {
  patch: ImageData;
  delay: number;
  dims: { width: number; height: number; top: number; left: number };
  disposalType: number;
}

export interface TextOpts {
  text: string;
  position: 'top' | 'center' | 'bottom';
  font: string;
  fontSize: number;
  color: string;
  outline: boolean;
  outlineColor: string;
  outlineThickness: number;
  padding: number;
  bgActive: boolean;
  bgColor: string;
  bgOpacity: number;
}

export async function decodeGif(url: string): Promise<{
  frames: DecodedFrame[];
  width: number;
  height: number;
}> {
  const resp = await fetch(url);
  const buf = await resp.arrayBuffer();
  const parsed = parseGIF(buf);
  const raw = decompressFrames(parsed, true);

  const width = parsed.lsd.width;
  const height = parsed.lsd.height;

  const frames: DecodedFrame[] = raw.map((f: any) => ({
    patch: new ImageData(
      new Uint8ClampedArray(f.patch),
      f.dims.width,
      f.dims.height
    ),
    delay: f.delay,
    dims: f.dims,
    disposalType: f.disposalType
  }));

  return { frames, width, height };
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: TextOpts
) {
  const size = opts.fontSize;
  ctx.font = `bold ${size}px "${opts.font}", sans-serif`;
  ctx.textAlign = 'center';

  const maxWidth = width * 0.95;
  const lines = wrapText(ctx, opts.text, maxWidth);
  const lineHeight = size * 1.2;
  const x = width / 2;

  // compute starting y so lines stack from the chosen edge
  const pad = opts.padding;
  let startY: number;
  if (opts.position === 'top') {
    ctx.textBaseline = 'top';
    startY = pad;
  } else if (opts.position === 'center') {
    ctx.textBaseline = 'middle';
    startY = (height - (lines.length - 1) * lineHeight) / 2;
  } else {
    ctx.textBaseline = 'bottom';
    startY = height - pad - (lines.length - 1) * lineHeight;
  }

  // draw background band
  if (opts.bgActive) {
    const totalHeight = lines.length * lineHeight;
    let bgY: number;
    if (opts.position === 'top') {
      bgY = 0;
    } else if (opts.position === 'center') {
      bgY = startY - lineHeight / 2;
    } else {
      bgY = height - totalHeight - pad;
    }
    ctx.save();
    ctx.globalAlpha = opts.bgOpacity;
    ctx.fillStyle = opts.bgColor;
    ctx.fillRect(0, bgY, width, totalHeight + pad * 2);
    ctx.restore();
  }

  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight;

    if (opts.outline) {
      ctx.strokeStyle = opts.outlineColor;
      ctx.lineWidth = opts.outlineThickness;
      ctx.lineJoin = 'round';
      ctx.strokeText(lines[i], x, y);
    }

    ctx.fillStyle = opts.color;
    ctx.fillText(lines[i], x, y);
  }
}

export function exportGif(
  frames: DecodedFrame[],
  width: number,
  height: number,
  opts: TextOpts,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width,
      height,
      workerScript: '/gif.worker.js'
    });

    // compositing canvas — handles disposal modes
    const compCanvas = document.createElement('canvas');
    compCanvas.width = width;
    compCanvas.height = height;
    const compCtx = compCanvas.getContext('2d')!;

    // per-frame output canvas
    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const outCtx = outCanvas.getContext('2d')!;

    for (const frame of frames) {
      // handle disposal before drawing new frame
      // disposalType 2 = restore to background
      if (frame.disposalType === 2) {
        compCtx.clearRect(0, 0, width, height);
      }

      // patch frame onto composite
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = frame.dims.width;
      tempCanvas.height = frame.dims.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(frame.patch, 0, 0);
      compCtx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);

      // copy composite to output, then draw text
      outCtx.clearRect(0, 0, width, height);
      outCtx.drawImage(compCanvas, 0, 0);
      drawText(outCtx, width, height, opts);

      gif.addFrame(outCtx, { copy: true, delay: frame.delay });
    }

    gif.on('finished', (blob: Blob) => resolve(blob));
    gif.on('error', (err: Error) => reject(err));
    if (onProgress) {
      gif.on('progress', onProgress);
    }

    gif.render();
  });
}
