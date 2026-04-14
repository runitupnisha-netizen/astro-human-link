// Client-side image validation before upload
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_DIMENSION = 100;
const MAX_DIMENSION = 8000;

export const validateImage = (file: File): Promise<ImageValidationResult> => {
  return new Promise((resolve) => {
    // Type check
    if (!ALLOWED_TYPES.includes(file.type)) {
      resolve({ valid: false, error: "Only JPEG, PNG, WebP, and GIF images are allowed." });
      return;
    }

    // Size check
    if (file.size > MAX_FILE_SIZE) {
      resolve({ valid: false, error: "Image must be under 10MB." });
      return;
    }

    if (file.size < 1024) {
      resolve({ valid: false, error: "Image file appears to be empty or corrupted." });
      return;
    }

    // Dimension check
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
        resolve({ valid: false, error: `Image must be at least ${MIN_DIMENSION}x${MIN_DIMENSION} pixels.` });
        return;
      }
      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        resolve({ valid: false, error: `Image dimensions exceed ${MAX_DIMENSION}px limit.` });
        return;
      }
      // Aspect ratio check (no extreme ratios)
      const ratio = img.width / img.height;
      if (ratio > 5 || ratio < 0.2) {
        resolve({ valid: false, error: "Image has an extreme aspect ratio. Please use a more standard photo." });
        return;
      }
      resolve({ valid: true });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: "Could not read image. File may be corrupted." });
    };
    img.src = url;
  });
};
