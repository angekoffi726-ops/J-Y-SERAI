import { useCallback, useEffect, useRef, useState } from 'react';
import { PosterPreview } from './components/PosterPreview';
import { StudioControls } from './components/StudioControls';
import { LoadedPhoto, loadNormalizedPhoto, loadStaticImage } from './utils/imageLoader';
import {
  DEFAULT_TRANSFORM,
  OFFICIAL_POSTER_URL,
  POSTER_OVERLAY_URL,
  PhotoTransform,
  clampPan,
  computePhotoMetrics,
  exportPosterPngBlob,
} from './utils/posterCanvas';

const OUTPUT_FILENAME = 'affiche-largage-des-amarres-jy-serai.png';

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [basePoster, setBasePoster] = useState<HTMLImageElement | null>(null);
  const [overlayPoster, setOverlayPoster] = useState<HTMLImageElement | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  const [photo, setPhoto] = useState<LoadedPhoto | null>(null);
  const [transform, setTransform] = useState<PhotoTransform>(DEFAULT_TRANSFORM);
  const [isValidated, setIsValidated] = useState(false);
  const [importSequence, setImportSequence] = useState(0);

  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  // Load official poster & transparent frame cutout on mount
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      loadStaticImage(OFFICIAL_POSTER_URL),
      loadStaticImage(POSTER_OVERLAY_URL),
    ])
      .then(([baseImg, overlayImg]) => {
        if (cancelled) return;
        setBasePoster(baseImg);
        setOverlayPoster(overlayImg);
        setAssetsReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Impossible de charger la maquette officielle.';
        setAssetsError(message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectFile = useCallback(async (file: File) => {
    setErrorMessage(null);
    setShareNotice(null);
    setIsImporting(true);

    try {
      const loaded = await loadNormalizedPhoto(file);
      setPhoto(loaded);
      setTransform(DEFAULT_TRANSFORM);
      setIsValidated(false);
      setImportSequence((prev) => prev + 1);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'importation de la photo.";
      setErrorMessage(message);
    } finally {
      setIsImporting(false);
    }
  }, []);

  const handlePanChange = useCallback((panX: number, panY: number) => {
    setTransform((prev) => ({
      ...prev,
      panX,
      panY,
    }));
  }, []);

  const handleZoomChange = useCallback(
    (zoom: number) => {
      if (!photo) return;
      setTransform((prev) => {
        const metrics = computePhotoMetrics(
          photo.width,
          photo.height,
          prev.rotation,
          zoom
        );
        const clamped = clampPan(prev.panX, prev.panY, metrics);
        return {
          ...prev,
          zoom,
          panX: clamped.panX,
          panY: clamped.panY,
        };
      });
    },
    [photo]
  );

  const handleRotate90 = useCallback(() => {
    if (!photo) return;
    setTransform((prev) => {
      const nextRotation = (prev.rotation + 90) % 360;
      const metrics = computePhotoMetrics(
        photo.width,
        photo.height,
        nextRotation,
        prev.zoom
      );
      const clamped = clampPan(prev.panX, prev.panY, metrics);
      return {
        ...prev,
        rotation: nextRotation,
        panX: clamped.panX,
        panY: clamped.panY,
      };
    });
  }, [photo]);

  const handleRecenter = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      panX: 0,
      panY: 0,
      zoom: 1,
    }));
  }, []);

  const handleValidate = useCallback(() => {
    if (!photo) return;
    setErrorMessage(null);
    setIsValidated(true);
  }, [photo]);

  const handleEditAgain = useCallback(() => {
    setIsValidated(false);
    setShareNotice(null);
  }, []);

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handleDownload = useCallback(async () => {
    if (!photo || !overlayPoster) return;
    setErrorMessage(null);
    setIsExporting(true);

    try {
      const blob = await exportPosterPngBlob({
        basePoster,
        overlayPoster,
        userPhoto: photo.element,
        userWidth: photo.width,
        userHeight: photo.height,
        transform,
      });
      triggerBlobDownload(blob, OUTPUT_FILENAME);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Impossible de générer le fichier PNG. Réessaie.';
      setErrorMessage(message);
    } finally {
      setIsExporting(false);
    }
  }, [photo, overlayPoster, basePoster, transform]);

  const handleShare = useCallback(async () => {
    if (!photo || !overlayPoster) return;
    setErrorMessage(null);
    setShareNotice(null);
    setIsSharing(true);

    try {
      const blob = await exportPosterPngBlob({
        basePoster,
        overlayPoster,
        userPhoto: photo.element,
        userWidth: photo.width,
        userHeight: photo.height,
        transform,
      });

      const file = new File([blob], OUTPUT_FILENAME, { type: 'image/png' });
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };

      if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({
            files: [file],
            title: "J'Y SERAI — Largage des Amarres",
            text: `Je serai au Largage des Amarres (27 - 29 novembre 2026 à Soubré) ! Prépare ton affiche ici : ${window.location.href}`,
          });
          return;
        } catch (shareErr: unknown) {
          if (shareErr instanceof Error && shareErr.name === 'AbortError') {
            return;
          }
          // Fall through to download fallback if native share failed
        }
      }

      // Fallback: download PNG and invite manual share on WhatsApp/Facebook/Instagram
      triggerBlobDownload(blob, OUTPUT_FILENAME);
      setShareNotice(
        'Ton affiche PNG a été téléchargée ! Publie-la maintenant sur WhatsApp, Facebook ou Instagram.'
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Impossible de préparer l'affiche pour le partage.";
      setErrorMessage(message);
    } finally {
      setIsSharing(false);
    }
  }, [photo, overlayPoster, basePoster, transform]);

  const handleResetAll = useCallback(() => {
    setPhoto((prev) => {
      if (prev?.element) {
        prev.element.width = 0;
        prev.element.height = 0;
      }
      return null;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setTransform({ ...DEFAULT_TRANSFORM });
    setIsValidated(false);
    setErrorMessage(null);
    setShareNotice(null);
    setImportSequence(0);
  }, []);

  const handleRequestUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="relative min-h-screen bg-[#051338] text-slate-100 flex flex-col overflow-x-hidden">
      {/* Professional Royal Blue Gradient: Deep Midnight Blue Edges + Intense Royal Blue Center */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_85%_68%_at_50%_42%,#1749D8_0%,#0E339E_38%,#071B52_72%,#051338_100%)]"
      />

      {/* Clean Top Studio Bar (3-zone contract) */}
      <header className="relative z-10 border-b border-white/[0.12] bg-[#051338]/82 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 py-3.5">
          <span className="font-display text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0">
            LARGAGE DES AMARRES
          </span>

          <p className="hidden md:block text-xs sm:text-sm font-medium text-slate-200/90 whitespace-nowrap truncate">
            27 – 29 Novembre 2026 · Paroisse des Saints Martyrs de l&apos;Ouganda de Soubré
          </p>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Right Column on Desktop / Top on Smartphone: Official Poster Preview */}
          <div className="order-1 lg:order-2 lg:col-span-7">
            <PosterPreview
              basePoster={basePoster}
              overlayPoster={overlayPoster}
              assetsReady={assetsReady}
              assetsError={assetsError}
              photo={photo}
              transform={transform}
              isValidated={isValidated}
              importSequence={importSequence}
              onPanChange={handlePanChange}
              onZoomChange={handleZoomChange}
              onRequestUpload={handleRequestUpload}
              onDropFile={handleSelectFile}
            />
          </div>

          {/* Left Column on Desktop / Bottom on Smartphone: Studio Controls */}
          <div className="order-2 lg:order-1 lg:col-span-5">
            <StudioControls
              photo={photo}
              transform={transform}
              isValidated={isValidated}
              isImporting={isImporting}
              isExporting={isExporting}
              isSharing={isSharing}
              errorMessage={errorMessage}
              shareNotice={shareNotice}
              fileInputRef={fileInputRef}
              onSelectFile={handleSelectFile}
              onZoomChange={handleZoomChange}
              onRotate90={handleRotate90}
              onRecenter={handleRecenter}
              onValidate={handleValidate}
              onEditAgain={handleEditAgain}
              onDownload={handleDownload}
              onShare={handleShare}
              onResetAll={handleResetAll}
              onDismissError={() => setErrorMessage(null)}
              onDismissShareNotice={() => setShareNotice(null)}
            />
          </div>
        </div>
      </main>

      {/* Quiet Event Footer */}
      <footer className="relative z-10 border-t border-white/[0.12] bg-[#051338]/75 py-5 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-300 text-center sm:text-left">
          <span>
            Scouts de la Région de San Pedro « Les Navigateurs » · Largage des Amarres
          </span>
          <span>
            27 – 29 Novembre 2026 · Soubré
          </span>
        </div>
      </footer>
    </div>
  );
}
