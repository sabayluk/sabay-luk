// ⭐️ lib/imageOptimizer.js: Smart Client-Side Image & Slip Compression ⭐️
// បង្រួមទំហំរូបភាព និង Slip ដោយស្វ័យប្រវត្តិ (Client-side Canvas Compression)
// កាត់បន្ថយទំហំពីច្រើន Megabytes (MB) មកសល់ត្រឹម Kilobytes (KB) តែគុណភាពច្បាស់ល្អ មិនស៊ី Memory Server & Database

const PRESETS = {
  slip: { maxWidth: 900, maxHeight: 1200, quality: 0.78, mimeType: 'image/jpeg' },
  product: { maxWidth: 1200, maxHeight: 1200, quality: 0.80, mimeType: 'image/jpeg' },
  logo: { maxWidth: 600, maxHeight: 600, quality: 0.85, mimeType: 'image/jpeg' },
  banner: { maxWidth: 1400, maxHeight: 800, quality: 0.80, mimeType: 'image/jpeg' },
  thumbnail: { maxWidth: 300, maxHeight: 300, quality: 0.75, mimeType: 'image/jpeg' },
  location: { maxWidth: 1000, maxHeight: 1000, quality: 0.80, mimeType: 'image/jpeg' }
};

/**
 * បម្លែង DataURL ទៅជា File Object
 */
export function dataURLtoFile(dataUrl, filename = 'image.jpg') {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime, lastModified: Date.now() });
}

/**
 * បង្រួមរូបភាព ឬវិក្កយបត្រ (File / Blob / DataURL) ឱ្យសន្សំសំចៃ Memory បំផុត
 * @param {File|Blob|string} fileOrSource
 * @param {Object|string|number} options - Preset name ('slip'|'product'|'logo') ឬ MaxWidth ឬ Options Object
 * @param {number} [legacyQuality]
 * @returns {Promise<File>}
 */
export async function compressImage(fileOrSource, options = {}, legacyQuality) {
  if (typeof window === 'undefined' || !fileOrSource) {
    return fileOrSource;
  }

  // Parse options & presets
  let config = { ...PRESETS.product };
  if (typeof options === 'string' && PRESETS[options]) {
    config = { ...PRESETS[options] };
  } else if (typeof options === 'number') {
    config.maxWidth = options;
    config.maxHeight = options;
    if (typeof legacyQuality === 'number') {
      config.quality = legacyQuality;
    }
  } else if (typeof options === 'object') {
    if (options.preset && PRESETS[options.preset]) {
      config = { ...PRESETS[options.preset], ...options };
    } else {
      config = { ...config, ...options };
    }
  }

  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.80,
    mimeType = 'image/jpeg',
    targetMaxKb = 250
  } = config;

  // Handle if input is already a small file without dimension bloat
  const isFile = fileOrSource instanceof File || fileOrSource instanceof Blob;
  const originalName = isFile && fileOrSource.name ? fileOrSource.name : `image_${Date.now()}.jpg`;

  return new Promise((resolve) => {
    let sourceUrl = '';
    let isCreatedBlobUrl = false;

    if (typeof fileOrSource === 'string') {
      sourceUrl = fileOrSource;
    } else if (isFile) {
      sourceUrl = URL.createObjectURL(fileOrSource);
      isCreatedBlobUrl = true;
    } else {
      return resolve(fileOrSource);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const cleanup = () => {
      if (isCreatedBlobUrl && sourceUrl) {
        try { URL.revokeObjectURL(sourceUrl); } catch (_) {}
      }
    };

    img.onload = () => {
      cleanup();

      let naturalWidth = img.naturalWidth || img.width;
      let naturalHeight = img.naturalHeight || img.height;

      // បើទំហំរូបតូចស្រាប់ហើយ ទាំងវិមាត្រ និង KB មិនបាច់ប្រឹងបង្រួមទេ
      if (isFile && fileOrSource.size < 40 * 1024 && naturalWidth <= maxWidth && naturalHeight <= maxHeight) {
        return resolve(fileOrSource);
      }

      // គណនាវិមាត្រសមាមាត្រ Aspect Ratio ថ្មី
      let targetWidth = naturalWidth;
      let targetHeight = naturalHeight;

      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
        targetWidth = Math.round(targetWidth * ratio);
        targetHeight = Math.round(targetHeight * ratio);
      }

      // គូរលើ Canvas ជាមួយ High Quality Smoothing
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return resolve(fileOrSource);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // ផ្ទៃខាងក្រោយពណ៌ស បើសិនជារូបមាន Transparent PNG ផ្ទេរមក JPEG
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // ប្រព័ន្ធបង្រួមទំហំឆ្លាតវៃ (Multi-pass compression if file is still too big)
      const exportToBlob = (currQuality) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(fileOrSource);
            }

            // បើទំហំនៅតែធំជាង targetMaxKb ហើយ quality លើសពី 0.60 ធ្វើការបង្រួមមួយតង់ទៀត
            if (targetMaxKb && blob.size > targetMaxKb * 1024 && currQuality > 0.62) {
              return exportToBlob(currQuality - 0.12);
            }

            const cleanBase = originalName.replace(/\.[^/.]+$/, '');
            const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
            const finalFile = new File([blob], `${cleanBase}.${ext}`, {
              type: mimeType,
              lastModified: Date.now()
            });

            resolve(finalFile);
          },
          mimeType,
          currQuality
        );
      };

      exportToBlob(quality);
    };

    img.onerror = () => {
      cleanup();
      resolve(fileOrSource);
    };

    img.src = sourceUrl;
  });
}

/**
 * បង្រួមរូបភាព និងបញ្ចេញជា Base64 Data URL តូចល្មម (សន្សំ Memory LocalStorage & State)
 */
export async function compressImageToDataUrl(fileOrSource, options = {}) {
  const compressedFile = await compressImage(fileOrSource, options);
  if (!compressedFile) return null;
  if (typeof compressedFile === 'string') return compressedFile;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result || null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(compressedFile);
  });
}

/**
 * Backward-compatible function for existing code
 */
export const compressMediaFile = async (file, maxWidthOrPreset = 1200, quality = 0.80) => {
  return await compressImage(file, maxWidthOrPreset, quality);
};
