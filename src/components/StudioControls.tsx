import React, { useRef } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Compass,
  Download,
  ImagePlus,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Share2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { LoadedPhoto } from '../utils/imageLoader';
import { MAX_ZOOM, MIN_ZOOM, PhotoTransform } from '../utils/posterCanvas';

interface StudioControlsProps {
  photo: LoadedPhoto | null;
  transform: PhotoTransform;
  isValidated: boolean;
  isImporting: boolean;
  isExporting: boolean;
  isSharing: boolean;
  errorMessage: string | null;
  shareNotice: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectFile: (file: File) => void;
  onZoomChange: (zoom: number) => void;
  onRotate90: () => void;
  onRecenter: () => void;
  onValidate: () => void;
  onEditAgain: () => void;
  onDownload: () => void;
  onShare: () => void;
  onResetAll: () => void;
  onDismissError: () => void;
  onDismissShareNotice: () => void;
}

export const StudioControls: React.FC<StudioControlsProps> = ({
  photo,
  transform,
  isValidated,
  isImporting,
  isExporting,
  isSharing,
  errorMessage,
  shareNotice,
  fileInputRef,
  onSelectFile,
  onZoomChange,
  onRotate90,
  onRecenter,
  onValidate,
  onEditAgain,
  onDownload,
  onShare,
  onResetAll,
  onDismissError,
  onDismissShareNotice,
}) => {
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = fileInputRef || localInputRef;

  const hasPhoto = Boolean(photo);
  const zoomPercent = Math.round(transform.zoom * 100);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectFile(file);
    }
    e.target.value = '';
  };

  const triggerFilePicker = () => {
    inputRef.current?.click();
  };

  const stepZoom = (delta: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, transform.zoom + delta));
    onZoomChange(Number(next.toFixed(2)));
  };

  return (
    <section
      aria-label="Studio de personnalisation"
      className="rounded-2xl border border-white/[0.14] bg-[#07163E]/88 backdrop-blur-md p-5 sm:p-7 shadow-[0_24px_64px_rgba(3,10,36,0.5)] flex flex-col justify-between gap-6"
    >
      <div className="space-y-6">
        {/* Intro Header */}
        <header className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FF7315]">
            <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Scouts Les Navigateurs · San Pedro</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white text-balance">
            J&apos;Y SERAI !
          </h1>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
            Prépare ton affiche pour le Largage des Amarres.
          </p>
          <p className="text-xs text-slate-300/90 leading-relaxed">
            Importe uniquement ta photo depuis ton téléphone ou ton ordinateur. Traitement 100% local sur ton appareil, sans inscription.
          </p>
        </header>

        {/* Hidden File Input */}
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={onDismissError}
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-rose-300 hover:bg-rose-500/20 hover:text-white transition-colors"
              aria-label="Fermer le message d'erreur"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Primary Import / Replace CTA */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={triggerFilePicker}
            disabled={isImporting}
            className="w-full min-h-[48px] rounded-xl bg-[#FF7315] hover:bg-[#ff822e] active:scale-[0.99] disabled:opacity-60 px-5 py-3.5 text-sm sm:text-base font-display font-bold tracking-wide text-white shadow-[0_8px_24px_rgba(255,115,21,0.28)] transition-all duration-150 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                <span>IMPORTATION EN COURS...</span>
              </>
            ) : hasPhoto ? (
              <>
                <ImagePlus className="h-5 w-5 shrink-0" />
                <span>REMPLACER MA PHOTO</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-5 w-5 shrink-0" />
                <span>IMPORTER MA PHOTO</span>
              </>
            )}
          </button>
          <p className="text-center text-xs text-slate-400">
            Formats acceptés : JPG, JPEG, PNG, WEBP
          </p>
        </div>

        {/* Hairline Divider */}
        <div className="border-t border-white/[0.08]" />

        {/* Photo Adjustment Zone */}
        <div
          className={`space-y-5 transition-opacity duration-200 ${
            !hasPhoto ? 'opacity-45 pointer-events-none select-none' : isValidated ? 'opacity-65' : 'opacity-100'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <SlidersHorizontal className="h-4 w-4 text-[#1E56F0]" aria-hidden="true" />
              <span>Réglage de la photo</span>
            </div>
            {hasPhoto && (
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {transform.rotation}° · {zoomPercent}%{isValidated ? ' · Validé' : ''}
              </span>
            )}
          </div>

          {/* Zoom Slider */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <label htmlFor="zoom-slider" className="font-medium text-slate-300">
                Curseur de zoom
              </label>
              <span className="font-mono text-xs font-semibold text-[#FF7315] tabular-nums">
                {zoomPercent}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => stepZoom(-0.1)}
                disabled={!hasPhoto || isValidated || transform.zoom <= MIN_ZOOM}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-white/[0.14] bg-[#0B215C] text-slate-100 hover:bg-[#102E7D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Réduire le zoom"
              >
                <Minimize2 className="h-4 w-4" />
              </button>

              <input
                id="zoom-slider"
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={transform.zoom}
                disabled={!hasPhoto || isValidated}
                onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                className="studio-slider flex-1"
              />

              <button
                type="button"
                onClick={() => stepZoom(0.1)}
                disabled={!hasPhoto || isValidated || transform.zoom >= MAX_ZOOM}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-white/[0.14] bg-[#0B215C] text-slate-100 hover:bg-[#102E7D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Augmenter le zoom"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Rotation & Recenter Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onRotate90}
              disabled={!hasPhoto || isValidated}
              className="flex-1 min-w-[140px] min-h-[44px] rounded-xl border border-white/[0.14] bg-[#0B215C] hover:bg-[#102E7D] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCw className="h-4 w-4 text-[#FF7315] shrink-0" />
              <span className="whitespace-nowrap">Pivoter 90°</span>
            </button>

            <button
              type="button"
              onClick={onRecenter}
              disabled={!hasPhoto || isValidated}
              className="flex-1 min-w-[190px] min-h-[44px] rounded-xl border border-white/[0.14] bg-[#0B215C] hover:bg-[#102E7D] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4 text-[#60A5FA] shrink-0" />
              <span className="whitespace-nowrap">RECENTRER MA PHOTO</span>
            </button>
          </div>
        </div>

        {/* Hairline Divider */}
        <div className="border-t border-white/[0.08]" />

        {/* Validation, Download & Share Actions */}
        <div className="space-y-3">
          {!isValidated ? (
            <button
              type="button"
              onClick={onValidate}
              disabled={!hasPhoto}
              className="w-full min-h-[48px] rounded-xl bg-[#1546D4] hover:bg-[#1E56F0] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed px-5 py-3 text-sm sm:text-base font-display font-bold tracking-wide text-white shadow-[0_8px_24px_rgba(21,70,212,0.3)] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">VALIDER MA PHOTO</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onEditAgain}
              className="w-full min-h-[48px] rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-5 py-3 text-sm font-semibold text-emerald-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Modifier les réglages de ma photo</span>
            </button>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onDownload}
              disabled={!hasPhoto || isExporting}
              className="w-full min-h-[48px] rounded-xl border border-white/[0.14] bg-white text-[#050811] hover:bg-slate-100 active:scale-[0.99] disabled:opacity-40 disabled:bg-slate-700 disabled:text-slate-300 disabled:border-transparent disabled:cursor-not-allowed px-5 py-3 text-sm sm:text-base font-display font-bold tracking-wide transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span className="whitespace-nowrap">Génération PNG...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">TÉLÉCHARGER MON AFFICHE</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onShare}
              disabled={!hasPhoto || isSharing}
              className="w-full min-h-[48px] rounded-xl border border-[#3B82F6]/45 bg-[#1546D4]/25 hover:bg-[#1546D4]/40 active:scale-[0.99] disabled:opacity-40 disabled:border-white/[0.1] disabled:bg-transparent disabled:text-slate-400 disabled:cursor-not-allowed px-5 py-3 text-sm sm:text-base font-display font-bold tracking-wide text-white transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSharing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span className="whitespace-nowrap">Préparation...</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 text-[#FF7315] shrink-0" />
                  <span className="whitespace-nowrap">PARTAGER</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onResetAll}
              className="w-full min-h-[46px] rounded-xl border border-[#FF7315]/75 bg-[#06143A] hover:bg-[#0D2566] hover:border-[#FF7315] active:scale-[0.99] px-5 py-2.5 text-sm font-display font-bold tracking-wide text-white transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-[#FF7315] shrink-0" />
              <span className="whitespace-nowrap">RÉINITIALISER</span>
            </button>
          </div>

          {/* Share Notice / Fallback Helper */}
          {shareNotice && (
            <div className="rounded-xl border border-[#3B82F6]/40 bg-[#0B215C]/80 px-4 py-3 text-xs sm:text-sm text-slate-100">
              <div className="flex items-start justify-between gap-2">
                <p className="leading-relaxed">{shareNotice}</p>
                <button
                  type="button"
                  onClick={onDismissShareNotice}
                  className="min-h-[28px] min-w-[28px] flex items-center justify-center rounded-md text-slate-300 hover:text-white"
                  aria-label="Fermer la notification de partage"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Photo File Metadata */}
      {hasPhoto && (
        <div className="pt-2 border-t border-white/[0.1] flex items-center justify-between gap-3">
          <span className="text-xs text-slate-300 truncate" title={photo?.fileName}>
            Photo active : {photo?.fileName}
          </span>
        </div>
      )}
    </section>
  );
};
