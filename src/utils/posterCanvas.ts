export const POSTER_WIDTH = 1254;
export const POSTER_HEIGHT = 1254;

export const OFFICIAL_POSTER_URL = '/assets/aistudio/LARGAGE_JY_SERAI_6ccc61ab.png';
export const POSTER_OVERLAY_URL = '/assets/poster-overlay.png';

// Exact coordinates measured from the official 1254x1254 poster template.
// The visible square opening spans x=[408..944], y=[329..802] (537x474 visible,
// bottom edge gracefully tucked behind the curved "J'Y SERAI" banner).
// We add a 2-3px bleed inside the opaque blue/orange border so zero seam appears.
export const FRAME_CLIP = {
  x: 406,
  y: 327,
  width: 541,
  height: 481,
  radius: 20,
} as const;

export const FRAME_CENTER_X = FRAME_CLIP.x + FRAME_CLIP.width / 2; // 676.5
export const FRAME_CENTER_Y = FRAME_CLIP.y + FRAME_CLIP.height / 2; // 567.5
export const FRAME_BASE_SQUARE = 545;

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

export interface PhotoTransform {
  panX: number; // Offset in poster native pixels (1254x1254 space)
  panY: number; // Offset in poster native pixels (1254x1254 space)
  zoom: number; // 1.0 to 3.0 multiplier over cover fit
  rotation: number; // 0, 90, 180, 270
}

export interface PhotoMetrics {
  rotW: number;
  rotH: number;
  baseScale: number;
  totalScale: number;
  halfW: number;
  halfH: number;
  minPanX: number;
  maxPanX: number;
  minPanY: number;
  maxPanY: number;
}

export const DEFAULT_TRANSFORM: PhotoTransform = {
  panX: 0,
  panY: 0,
  zoom: 1,
  rotation: 0,
};

export function computePhotoMetrics(
  imgWidth: number,
  imgHeight: number,
  rotation: number,
  zoom: number
): PhotoMetrics {
  const normalizedRot = ((rotation % 360) + 360) % 360;
  const isQuarterTurn = normalizedRot === 90 || normalizedRot === 270;
  const rotW = isQuarterTurn ? imgHeight : imgWidth;
  const rotH = isQuarterTurn ? imgWidth : imgHeight;

  // Cover the 545x545 square frame completely at zoom = 1
  const baseScale = Math.max(FRAME_BASE_SQUARE / rotW, FRAME_BASE_SQUARE / rotH);
  const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  const totalScale = baseScale * clampedZoom;

  const halfW = (rotW * totalScale) / 2;
  const halfH = (rotH * totalScale) / 2;

  const halfClipW = FRAME_CLIP.width / 2; // 270.5
  const halfClipH = FRAME_CLIP.height / 2; // 240.5

  const maxPanX = Math.max(0, halfW - halfClipW);
  const minPanX = -maxPanX;

  const maxPanY = Math.max(0, halfH - halfClipH);
  const minPanY = -maxPanY;

  return {
    rotW,
    rotH,
    baseScale,
    totalScale,
    halfW,
    halfH,
    minPanX,
    maxPanX,
    minPanY,
    maxPanY,
  };
}

export function clampPan(
  panX: number,
  panY: number,
  metrics: PhotoMetrics
): { panX: number; panY: number } {
  return {
    panX: Math.min(metrics.maxPanX, Math.max(metrics.minPanX, panX)),
    panY: Math.min(metrics.maxPanY, Math.max(metrics.minPanY, panY)),
  };
}

export function renderPosterToContext(
  ctx: CanvasRenderingContext2D,
  options: {
    basePoster: HTMLImageElement | null;
    overlayPoster: HTMLImageElement | null;
    userPhoto: HTMLImageElement | HTMLCanvasElement | null;
    userWidth: number;
    userHeight: number;
    transform: PhotoTransform;
  }
): void {
  const { basePoster, overlayPoster, userPhoto, userWidth, userHeight, transform } = options;

  ctx.clearRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (!userPhoto || !overlayPoster) {
    if (basePoster) {
      ctx.drawImage(basePoster, 0, 0, POSTER_WIDTH, POSTER_HEIGHT);
    }
    return;
  }

  const metrics = computePhotoMetrics(
    userWidth,
    userHeight,
    transform.rotation,
    transform.zoom
  );
  const clamped = clampPan(transform.panX, transform.panY, metrics);

  // 1. Clip strictly inside the frame bleed region and paint a deep backdrop
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(
      FRAME_CLIP.x,
      FRAME_CLIP.y,
      FRAME_CLIP.width,
      FRAME_CLIP.height,
      FRAME_CLIP.radius
    );
  } else {
    ctx.rect(FRAME_CLIP.x, FRAME_CLIP.y, FRAME_CLIP.width, FRAME_CLIP.height);
  }
  ctx.clip();

  ctx.fillStyle = '#0B1328';
  ctx.fillRect(FRAME_CLIP.x, FRAME_CLIP.y, FRAME_CLIP.width, FRAME_CLIP.height);

  // 2. Draw user photo with exact pan, rotation, and scale
  ctx.translate(FRAME_CENTER_X + clamped.panX, FRAME_CENTER_Y + clamped.panY);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(metrics.totalScale, metrics.totalScale);
  ctx.drawImage(userPhoto, -userWidth / 2, -userHeight / 2, userWidth, userHeight);
  ctx.restore();

  // 3. Superimpose the official poster overlay (with transparent square cutout)
  ctx.drawImage(overlayPoster, 0, 0, POSTER_WIDTH, POSTER_HEIGHT);
}

export async function exportPosterPngBlob(options: {
  basePoster: HTMLImageElement | null;
  overlayPoster: HTMLImageElement | null;
  userPhoto: HTMLImageElement | HTMLCanvasElement;
  userWidth: number;
  userHeight: number;
  transform: PhotoTransform;
}): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Impossible d'initialiser le moteur de rendu PNG.");
  }

  renderPosterToContext(ctx, options);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('La génération du fichier PNG a échoué.'));
        }
      },
      'image/png',
      1.0
    );
  });
}
