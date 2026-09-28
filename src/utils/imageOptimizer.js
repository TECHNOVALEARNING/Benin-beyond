/**
 * Utilitaire d'optimisation et compression d'images côté client
 * Réduit les fichiers de 3-10 Mo à 80-150 Ko pour un chargement instantané
 * et une synchronisation ultra-rapide avec Supabase et le cache local.
 */
export async function compressImage(file, maxWidth = 1280, maxHeight = 800, quality = 0.82) {
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
          // Fallback direct si context non dispo
          return resolve(e.target.result);
        }

        // Amélioration de l'interpolation
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Tentative d'export en WebP (taille minimale), fallback JPEG
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp')) {
            return resolve(webpData);
          }
        } catch {
          // Ignore et tente JPEG
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
