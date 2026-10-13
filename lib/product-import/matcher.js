import fs from 'fs';
import path from 'path';

/**
 * Normalizes any text into a lowercase alphanumeric string without punctuation or spaces.
 * E.g., "Mayur-Veda Chandbali Earrings" -> "mayurvedachandbaliearrings"
 */
export function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Splits a filename into base name, view/sequence suffix, and extension.
 * E.g. "mayurvedachandbaliearrings-1.jpg" -> base: "mayurvedachandbaliearrings", suffix: "1", ext: "jpg"
 * E.g. "MM1001-front.webp" -> base: "mm1001", suffix: "front", ext: "webp"
 * E.g. "9c6703cf-172e-4d86-9e2a-81624a3d5f12-mayurvedachandbaliearrings-1.jpg" (uploaded with uuid)
 */
export function analyzeFilename(filename) {
  if (!filename) return { base: '', suffix: '', ext: '', order: 99, raw: '' };

  const lastDot = filename.lastIndexOf('.');
  const ext = lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : '';
  let nameWithoutExt = lastDot !== -1 ? filename.slice(0, lastDot) : filename;

  // If filename starts with a UUID (e.g., from /api/admin/upload), strip the UUID
  const uuidPrefixMatch = nameWithoutExt.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[-_](.+)$/i);
  if (uuidPrefixMatch) {
    nameWithoutExt = uuidPrefixMatch[1];
  }

  // Check for view/index suffixes:
  // e.g. -1, -2, _1, _2, -front, -back, -side, -angle, -detail, -model, -thumb
  const suffixMatch = nameWithoutExt.match(/[-_]?(front|back|side|angle|detail|model|thumb|\d+)$/i);
  let suffix = '';
  let baseName = nameWithoutExt;
  let order = 99;

  if (suffixMatch) {
    suffix = suffixMatch[1].toLowerCase();
    baseName = nameWithoutExt.slice(0, suffixMatch.index);
    if (/^\d+$/.test(suffix)) {
      order = parseInt(suffix, 10);
    } else if (suffix === 'front') {
      order = 1;
    } else if (suffix === 'back') {
      order = 2;
    } else if (suffix === 'side') {
      order = 3;
    } else if (suffix === 'angle') {
      order = 4;
    } else if (suffix === 'detail') {
      order = 5;
    }
  }

  return {
    raw: filename,
    cleanedName: nameWithoutExt,
    base: normalizeText(baseName),
    suffix,
    order,
    ext
  };
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'a', 'an', 'in', 'of', 'to', 'at', 'by', 'from',
  'is', 'are', 'on', 'set', 'fine', 'jewellery', 'jewelry'
]);

/**
 * Extract meaningful keywords from a product name.
 */
export function extractKeywords(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word));
}

/**
 * Scans available local image directories and database uploads.
 * Supported directories:
 * - public/images/
 * - images/
 * - public/uploads/
 * - public/products/
 */
export async function scanAvailableImages(db = null) {
  const images = [];
  const seenUrls = new Set();
  const cwd = process.cwd();

  const scanDir = (dirRelativePath, urlPrefix, source) => {
    const fullPath = path.join(cwd, dirRelativePath);
    if (!fs.existsSync(fullPath)) return;

    try {
      const files = fs.readdirSync(fullPath, { withFileTypes: true });
      for (const file of files) {
        if (!file.isFile()) continue;
        const fname = file.name;
        const ext = path.extname(fname).toLowerCase().replace('.', '');
        if (!['jpg', 'jpeg', 'png', 'webp', 'svg', 'avif', 'gif'].includes(ext)) continue;

        const url = `${urlPrefix}/${fname}`;
        if (seenUrls.has(url)) continue;
        seenUrls.add(url);

        const analyzed = analyzeFilename(fname);
        images.push({
          filename: fname,
          url,
          source,
          ext: analyzed.ext,
          base: analyzed.base,
          suffix: analyzed.suffix,
          order: analyzed.order,
          rawName: fname
        });
      }
    } catch (err) {
      console.warn(`[scanAvailableImages] Could not scan directory ${dirRelativePath}:`, err.message);
    }
  };

  // 1. Scan public/images
  scanDir('public/images', '/images', 'public_images');

  // 2. Scan images/ at root (if not already copied or different)
  scanDir('images', '/images', 'root_images');

  // 3. Scan public/uploads
  scanDir('public/uploads', '/uploads', 'public_uploads');

  // 4. Scan public/products
  scanDir('public/products', '/products', 'public_products');

  // 5. Scan MongoDB uploads collection if db is provided
  if (db) {
    try {
      const dbUploads = await db.collection('uploads').find({}, { projection: { filename: 1, contentType: 1 } }).toArray();
      for (const u of dbUploads) {
        const fname = u.filename;
        if (!fname) continue;
        const url = `/api/uploads/${fname}`;
        if (seenUrls.has(url) || seenUrls.has(`/uploads/${fname}`)) continue;
        seenUrls.add(url);

        const analyzed = analyzeFilename(fname);
        images.push({
          filename: fname,
          url,
          source: 'db_uploads',
          ext: analyzed.ext,
          base: analyzed.base,
          suffix: analyzed.suffix,
          order: analyzed.order,
          rawName: fname
        });
      }
    } catch (dbErr) {
      console.warn('[scanAvailableImages] MongoDB uploads scan error:', dbErr.message);
    }
  }

  return images;
}

/**
 * Matches candidate images to a single product using the 7-priority algorithm:
 * 1. Exact product ID or SKU match
 * 2. Exact product slug match
 * 3. Exact product name match
 * 4. Normalized filename match (from product.images)
 * 5. Partial name and keyword matching
 * 6. Existing product-to-image mapping
 * 7. Multi-image ordering & gallery grouping
 */
export function matchImagesForProduct(product, availableImages = [], existingProducts = []) {
  const normId = normalizeText(product.id);
  const normSku = normalizeText(product.sku);
  const normSlug = normalizeText(product.slug);
  const normName = normalizeText(product.name);
  const keywords = extractKeywords(product.name);

  // If the product already specified images in its file:
  const providedImages = Array.isArray(product.images) ? product.images : [];
  const providedBasenames = providedImages.map(img => {
    const filename = path.basename(img);
    return analyzeFilename(filename);
  });

  const matches = [];
  const alternatives = [];

  for (const img of availableImages) {
    let score = 0;
    let matchType = '';
    let matchReason = '';

    // Check Priority 4: Exact or Normalized Filename Match (if product provided images in file)
    for (const prov of providedBasenames) {
      if (prov.raw && (img.filename === prov.raw || img.filename.endsWith(prov.raw))) {
        score = 98;
        matchType = 'provided_filename_exact';
        matchReason = `Exact filename match with provided image "${prov.raw}"`;
        break;
      }
      if (prov.base && img.base === prov.base && (prov.suffix === img.suffix || (!prov.suffix && img.order === 1))) {
        score = 90;
        matchType = 'provided_filename_normalized';
        matchReason = `Normalized filename match with provided image "${prov.raw}"`;
        break;
      }
    }

    // Check Priority 1: Exact product ID or SKU match
    if (score < 95) {
      if (normId && img.base === normId) {
        score = 96;
        matchType = 'id_exact';
        matchReason = `Exact match with Product ID (${product.id})`;
      } else if (normSku && img.base === normSku) {
        score = 95;
        matchType = 'sku_exact';
        matchReason = `Exact match with Product SKU (${product.sku})`;
      }
    }

    // Check Priority 2: Exact product slug match
    if (score < 90 && normSlug && img.base === normSlug) {
      score = 92;
      matchType = 'slug_exact';
      matchReason = `Exact match with Product Slug (${product.slug})`;
    }

    // Check Priority 3: Exact product name match
    if (score < 85 && normName && (img.base === normName || normName === img.base)) {
      score = 88;
      matchType = 'name_exact';
      matchReason = `Exact match with Product Name (${product.name})`;
    }

    // Check Priority 5: Keyword & Significant Token Matching
    if (score < 70 && keywords.length >= 2) {
      const imgRawTokens = extractKeywords(img.cleanedName || img.filename);
      if (imgRawTokens.length > 0) {
        const matchingTokens = keywords.filter(k => imgRawTokens.some(t => t.includes(k) || k.includes(t)));
        const ratio = matchingTokens.length / keywords.length;

        // Strict threshold: at least 70% of product keywords must match
        if (ratio >= 0.70 && matchingTokens.length >= 2) {
          score = Math.round(55 + ratio * 20); // 69 to 75
          matchType = 'keyword_match';
          matchReason = `Matched ${matchingTokens.length}/${keywords.length} keywords (${matchingTokens.join(', ')})`;
        } else if (ratio >= 0.5 && matchingTokens.length >= 2) {
          score = Math.round(40 + ratio * 20);
          matchType = 'partial_keyword';
          matchReason = `Candidate suggestion: partial keyword overlap (${matchingTokens.join(', ')})`;
        }
      }
    }

    if (score >= 70) {
      matches.push({
        ...img,
        confidence: score,
        matchType,
        matchReason
      });
    } else if (score >= 40) {
      alternatives.push({
        ...img,
        confidence: score,
        matchType,
        matchReason
      });
    }
  }

  // Priority 6: Existing Product Image Mapping
  // If product already exists in database with matching ID, SKU, or slug
  if (matches.length === 0 && existingProducts.length > 0) {
    const existing = existingProducts.find(p =>
      (product.id && p.id === product.id) ||
      (product.slug && p.slug === product.slug) ||
      (product.sku && p.sku && p.sku === product.sku)
    );

    if (existing && Array.isArray(existing.images) && existing.images.length > 0) {
      existing.images.forEach((imgUrl, idx) => {
        matches.push({
          filename: path.basename(imgUrl),
          url: imgUrl,
          source: 'existing_product_database',
          confidence: 80,
          order: idx + 1,
          matchType: 'existing_db_product',
          matchReason: `Inherited from existing product in catalog (${existing.name})`
        });
      });
    }
  }

  // Priority 7: Sort matches by order (order: 1, 2, 3, 4, etc.)
  matches.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  // Determine final matched image URLs
  // Deduplicate by URL
  const seenMatchedUrls = new Set();
  const dedupedMatches = [];
  for (const m of matches) {
    if (!seenMatchedUrls.has(m.url)) {
      seenMatchedUrls.add(m.url);
      dedupedMatches.push(m);
    }
  }

  const matchedUrls = dedupedMatches.map(m => m.url);

  // If product already had valid image URLs (e.g. https://... or existing /uploads/...)
  // and they still exist, preserve them if no better match
  if (matchedUrls.length === 0 && providedImages.length > 0) {
    providedImages.forEach((url, idx) => {
      dedupedMatches.push({
        filename: path.basename(url),
        url,
        source: 'file_provided',
        confidence: 75,
        order: idx + 1,
        matchType: 'file_provided',
        matchReason: 'Specified in product file'
      });
    });
  }

  const bestConfidence = dedupedMatches.length > 0
    ? Math.max(...dedupedMatches.map(m => m.confidence))
    : 0;

  const status = dedupedMatches.length === 0
    ? 'missing_images'
    : bestConfidence >= 75
      ? 'matched'
      : 'needs_image_review';

  return {
    images: dedupedMatches.map(m => m.url),
    matchedDetails: dedupedMatches,
    alternatives: alternatives.slice(0, 10),
    confidence: bestConfidence,
    status,
    needsReview: status !== 'matched'
  };
}

/**
 * Batch matches images for an array of normalized products.
 */
export async function batchMatchProductImages(products, { db = null, availableImages = null, existingProducts = [] } = {}) {
  const assets = availableImages || await scanAvailableImages(db);

  return products.map(product => {
    const matchResult = matchImagesForProduct(product, assets, existingProducts);
    return {
      ...product,
      images: matchResult.images,
      _imageMatch: {
        confidence: matchResult.confidence,
        status: matchResult.status,
        needsReview: matchResult.needsReview,
        matchedDetails: matchResult.matchedDetails,
        alternatives: matchResult.alternatives
      }
    };
  });
}
