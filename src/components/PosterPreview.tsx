import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ImagePlus, Move } from 'lucide-react';
import { LoadedPhoto } from '../utils/imageLoader';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  POSTER_HEIGHT,
  POSTER_WIDTH,
  PhotoTransform,
  clampPan,
  computePhotoMetrics,
  renderPosterToContext,
} from '../utils/posterCanvas';

interface PosterPreviewProps {
  basePoster: HTMLImageElement | null;
  overlayPoster: HTMLImageElement | null;
  assetsReady: boolean;
  assetsError: string | null;
  photo: LoadedPhoto | null;
  transform: PhotoTransform;
  isValidated: boolean;
  importSequence: number;
  onPanChange: (panX: number, panY: number) => void;
  onZoomChange: (zoom: number) => void;
  onRequestUpload: () => void;
  onDropFile: (file: File) => void;
}

export const PosterPreview: React.FC<PosterPreviewProps> = ({
  basePoster,
  overlayPoster,
  assetsReady,
  assetsError,
  photo,
  transform,
  isValidated,
  importSequence,
  onPanChange,
  onZoomChange,
  onRequestUpload,
  onDropFile,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{
    mode: 'none' | 'pan' | 'pinch';
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
    startPinchDist: number;
    originZoom: number;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    originPanX: 0,
    originPanY: 0,
    startPinchDist: 0,
    originZoom: 1,
  });

  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isFileHover, setIsFileHover] = useState(false);

  // Redraw the 1254x1254 canvas smoothly whenever assets, photo, or transform updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rafId = requestAnimationFrame(() => {
      renderPosterToContext(ctx, {
        basePoster,
        overlayPoster,
        userPhoto: photo ? photo.element : null,
        userWidth: photo ? photo.width : 0,
        userHeight: photo ? photo.height : 0,
        transform,
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [basePoster, overlayPoster, photo, transform]);

  const canInteractiveAdjust = Boolean(photo) && !isValidated;

  const getPinchDistance = (pts: Array<{ x: number; y: number }>) => {
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.hypot(dx, dy);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canInteractiveAdjust || !photo) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      gestureRef.current = {
        mode: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        originPanX: transform.panX,
        originPanY: transform.panY,
        startPinchDist: 0,
        originZoom: transform.zoom,
      };
      setIsDraggingPhoto(true);
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      gestureRef.current = {
        ...gestureRef.current,
        mode: 'pinch',
        startPinchDist: Math.max(10, getPinchDistance(pts)),
        originZoom: transform.zoom,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId) || !photo || !canvasRef.current) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const gesture = gestureRef.current;

    if (gesture.mode === 'pinch' && pointersRef.current.size >= 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = getPinchDistance(pts);
      const scaleFactor = dist / gesture.startPinchDist;
      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Number((gesture.originZoom * scaleFactor).toFixed(2)))
      );
      onZoomChange(nextZoom);
      return;
    }

    if (gesture.mode === 'pan' && pointersRef.current.size === 1) {
      const rect = canvasRef.current.getBoundingClientRect();
      if (!rect.width) return;

      const ratio = POSTER_WIDTH / rect.width;
      const dx = (e.clientX - gesture.startX) * ratio;
      const dy = (e.clientY - gesture.startY) * ratio;

      const metrics = computePhotoMetrics(
        photo.width,
        photo.height,
        transform.rotation,
        transform.zoom
      );
      const clamped = clampPan(gesture.originPanX + dx, gesture.originPanY + dy, metrics);
      onPanChange(clamped.panX, clamped.panY);
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) {
      gestureRef.current.mode = 'none';
      setIsDraggingPhoto(false);
    } else if (pointersRef.current.size === 1) {
      const remaining = Array.from(pointersRef.current.values())[0];
      gestureRef.current = {
        mode: 'pan',
        startX: remaining.x,
        startY: remaining.y,
        originPanX: transform.panX,
        originPanY: transform.panY,
        startPinchDist: 0,
        originZoom: transform.zoom,
      };
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!canInteractiveAdjust) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, transform.zoom + delta));
    onZoomChange(Number(nextZoom.toFixed(2)));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isFileHover) setIsFileHover(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsFileHover(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsFileHover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onDropFile(file);
    }
  };

  return (
    <section
      aria-label="Aperçu de mon affiche"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-2xl border backdrop-blur-md p-4 sm:p-6 shadow-[0_24px_64px_rgba(3,10,36,0.5)] transition-colors duration-200 ${
        isFileHover
          ? 'border-[#FF7315] bg-[#0B2260]/95'
          : 'border-white/[0.14] bg-[#07163E]/88'
      }`}
    >
      {/* Card Header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
          Aperçu de mon affiche
        </h2>
      </div>

      {/* Poster Canvas Container */}
      <motion.div
        key={importSequence}
        initial={importSequence > 0 ? { opacity: 0.85, scale: 0.985 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto w-full max-w-[580px] overflow-hidden rounded-xl border border-white/[0.14] bg-[#061336] shadow-[0_24px_64px_rgba(2,8,28,0.65)]"
      >
        {!assetsReady && !assetsError && (
          <div className="aspect-square w-full flex flex-col items-center justify-center gap-3 bg-[#081A4B] text-slate-300">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3B82F6] border-t-[#FF7315]" />
            <p className="text-sm font-medium">Chargement de la maquette officielle...</p>
          </div>
        )}

        {assetsError && (
          <div className="aspect-square w-full flex flex-col items-center justify-center gap-2 bg-[#081A4B] p-6 text-center text-rose-300">
            <p className="text-sm font-semibold">{assetsError}</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={POSTER_WIDTH}
          height={POSTER_HEIGHT}
          className={`aspect-square w-full h-auto block select-none ${
            !assetsReady ? 'hidden' : ''
          }`}
          aria-label="Affiche officielle Largage des Amarres J'Y SERAI"
        />

        {/* Interactive Hitbox strictly aligned over the square photo opening (x=408..944, y=329..802 in 1254x1254) */}
        {assetsReady && !photo && (
          <button
            type="button"
            onClick={onRequestUpload}
            style={{
              left: '32.6%',
              top: '26.3%',
              width: '42.8%',
              height: '37.8%',
            }}
            className="group absolute flex flex-col items-center justify-center gap-2.5 rounded-xl bg-slate-950/35 hover:bg-slate-950/55 focus-visible:outline-2 focus-visible:outline-[#FF7315] transition-colors duration-200 cursor-pointer p-3 text-center"
            aria-label="Importer ma photo dans le cadre"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FF7315] text-white shadow-lg group-hover:scale-105 transition-transform duration-150">
              <ImagePlus className="h-5 w-5" />
            </span>
            <span className="text-xs sm:text-sm font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              Clique ici pour ajouter ta photo
            </span>
          </button>
        )}

        {assetsReady && canInteractiveAdjust && (
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onWheel={handleWheel}
            style={{
              left: '32.6%',
              top: '26.3%',
              width: '42.8%',
              height: '37.8%',
              touchAction: 'none',
            }}
            role="application"
            aria-label="Zone de déplacement de la photo dans le cadre"
            className={`absolute rounded-xl transition-shadow duration-150 ${
              isDraggingPhoto
                ? 'cursor-grabbing ring-2 ring-[#FF7315]/80'
                : 'cursor-grab hover:ring-2 hover:ring-white/40'
            }`}
          />
        )}
      </motion.div>

      {/* Contextual Footer Under Poster */}
      <div className="mt-4">
        {!photo ? (
          <p className="text-center text-xs sm:text-sm text-slate-300">
            Importe ta photo pour l&apos;insérer automatiquement dans le cadre de l&apos;affiche.
          </p>
        ) : isValidated ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3.5 text-left">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <span>Cadrage validé · Affiche officielle prête</span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Scouts de la Région de San Pedro « Les Navigateurs » · Largage des Amarres · 27 – 29 Novembre 2026 · Paroisse des Saints Martyrs de l&apos;Ouganda de Soubré
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-300">
            <Move className="h-4 w-4 shrink-0 text-[#FF7315]" aria-hidden="true" />
            <span>Glisse ta photo directement dans le cadre ou utilise le zoom pour ajuster ton portrait.</span>
          </div>
        )}
      </div>
    </section>
  );
};
