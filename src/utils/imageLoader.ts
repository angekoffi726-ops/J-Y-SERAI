export interface LoadedPhoto {
  element: HTMLCanvasElement;
  width: number;
  height: number;
  fileName: string;
}

const ACCEPTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_WORKING_DIMENSION = 2800; // Crisp high-res processing without mobile OOM

export function validatePhotoFile(file: File): string | null {
  const hasValidType = file.type ? ACCEPTED_MIME_TYPES.has(file.type.toLowerCase()) : false;
  const hasValidExt = ACCEPTED_EXTENSIONS.test(file.name);

  if (!hasValidType && !hasValidExt) {
    return 'Format non pris en charge. Utilise une photo JPG, JPEG, PNG ou WEBP.';
  }

  if (file.size === 0) {
    return 'Le fichier sélectionné semble vide. Choisis une autre photo.';
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'La photo est trop volumineuse (maximum 25 Mo). Choisis une image plus légère.';
  }

  return null;
}

export async function loadNormalizedPhoto(file: File): Promise<LoadedPhoto> {
  const validationError = validatePhotoFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  // Prefer createImageBitmap with EXIF orientation support so phone portraits never rotate wrongly
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const canvas = normalizeSourceToCanvas(bitmap, bitmap.width, bitmap.height);
      bitmap.close();
      return {
        element: canvas,
        width: canvas.width,
        height: canvas.height,
        fileName: file.name,
      };
    } catch {
      // Fallback to standard HTMLImageElement decoding below
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("Impossible de lire cette photo. Vérifie qu'il s'agit bien d'une image valide."));
      image.src = objectUrl;
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) {
      throw new Error('Dimensions de la photo invalides.');
    }

    const canvas = normalizeSourceToCanvas(img, width, height);
    return {
      element: canvas,
      width: canvas.width,
      height: canvas.height,
      fileName: file.name,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function normalizeSourceToCanvas(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number
): HTMLCanvasElement {
  const longest = Math.max(srcWidth, srcHeight);
  const scale = longest > MAX_WORKING_DIMENSION ? MAX_WORKING_DIMENSION / longest : 1;

  const targetWidth = Math.max(1, Math.round(srcWidth * scale));
  const targetHeight = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Votre navigateur ne permet pas le traitement local de l'image.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas;
}

export function loadStaticImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossible de charger la maquette (${src}).`));
    img.src = src;
  });
}
