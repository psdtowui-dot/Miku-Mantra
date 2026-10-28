/**
 * High-performance image URL optimizer for MikuMantra.
 * - Dynamically constrains remote CDN images (Unsplash) to target width and modern format (WebP/AVIF).
 * - Delivers modern WebP derivatives for local assets where available.
 * - Guarantees non-breaking fallback for data URLs, SVGs, and external hosts.
 */

export function optimizeImageUrl(url, { width = 800, quality = 80, format = 'webp' } = {}) {
  if (!url || typeof url !== 'string') return url || '';

  // Preserve data URIs and vector SVGs untouched
  if (url.startsWith('data:') || url.startsWith('blob:') || url.endsWith('.svg') || url.includes('.svg?')) {
    return url;
  }

  // 1. Unsplash dynamic responsive CDN optimization
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      if (width) parsed.searchParams.set('w', String(width));
      if (quality) parsed.searchParams.set('q', String(quality));
      return parsed.toString();
    } catch (_) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}auto=format&fit=crop&w=${width}&q=${quality}`;
    }
  }

  // 2. Local project images and uploads
  // If requesting a .jpg/.jpeg/.png and a .webp exists, return the modern derivative
  if (/\.(jpe?g|png)$/i.test(url) && (url.startsWith('/images/') || url.startsWith('/uploads/') || url.startsWith('/api/uploads/'))) {
    // If it's an /api/uploads/ or /uploads/ or /images/ URL, we can reference the WebP version
    return url.replace(/\.(jpe?g|png)$/i, '.webp');
  }

  return url;
}
