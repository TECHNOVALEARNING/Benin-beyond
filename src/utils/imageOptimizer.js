/**
 * Utilitaire d'optimisation et compression d'images côté client
 * Préserve une netteté Full HD (2048x1536 max, qualité 90%) tout en réduisant
 * le poids des photos pour un affichage instantané et sans flou.
 */
export async function compressImage(file, maxWidth = 2048, maxHeight = 1536, quality = 0.90) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    throw new Error('Le fichier sélectionné n’est pas une image valide.');
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcul des dimensions proportionnelles
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target.result);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Tentative d'export en WebP haute définition
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp')) {
            return resolve(webpData);
          }
        } catch {
          // Ignore
        }

        try {
          const jpegData = canvas.toDataURL('image/jpeg', quality);
          return resolve(jpegData);
        } catch {
          return resolve(e.target.result);
        }
      };

      img.onerror = () => {
        resolve(e.target.result);
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      resolve('');
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compresse une image et retourne un Blob binaire prêt à être téléversé
 * dans Supabase Storage sans surcharger la mémoire avec du base64.
 */
export async function compressImageToBlob(file, maxWidth = 2048, maxHeight = 1536, quality = 0.90) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir en Blob WebP si supporté, sinon JPEG
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
              const baseName = file.name ? file.name.substring(0, file.name.lastIndexOf('.')) : 'photo';
              const optimizedFile = new File([blob], `${baseName}.${ext}`, {
                type: blob.type,
                lastModified: Date.now()
              });
              resolve(optimizedFile);
            } else {
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
