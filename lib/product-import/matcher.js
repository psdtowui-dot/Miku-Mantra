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
 * List of known non-product asset filename patterns to exclude from product matching.
 * E.g. site branding, banners, favicon, verification badges, etc.
 */
const NON_PRODUCT_PATTERNS = [
  /^banner\d*([-_].*)?$/i,
  /^banner\d+xx$/i,
  /^logo$/i,
  /^mikumantra-logo$/i,
  /^aurelia-logo$/i,
  /^verification-logo$/i,
  /^fav-?icon\d*$/i,
  /^mikumantra-jewelry-designer$/i
];

/**
 * Checks if a filename belongs to non-product site graphics.
 */
export function isNonProductAsset(filename) {
  if (!filename) return false;
  const lastDot = filename.lastIndexOf('.');
  const baseName = lastDot !== -1 ? filename.slice(0, lastDot) : filename;
  return NON_PRODUCT_PATTERNS.some(pattern => pattern.test(baseName));
}

/**
 * Splits a filename into base name, view/sequence suffix, and extension.
 * E.g. "mayurvedachandbaliearrings-1.jpg" -> base: "mayurvedachandbaliearrings", suffix: "1", order: 1, ext: "jpg"
 * E.g. "product.jpg" -> base: "product", suffix: "", order: 0, ext: "jpg"
 * E.g. "product-main.jpg" -> base: "product", suffix: "main", order: 0, ext: "jpg"
 * E.g. "MM1001-front.webp" -> base: "mm1001", suffix: "front", order: 1, ext: "webp"
 * E.g. "9c6703cf-172e-4d86-9e2a-81624a3d5f12-mayurvedachandbaliearrings-1.jpg" (uploaded with uuid prefix)
 */
export function analyzeFilename(filename) {
  if (!filename) return { base: '', suffix: '', ext: '', order: 99, raw: '', cleanedName: '' };

  const lastDot = filename.lastIndexOf('.');
  const ext = lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : '';
  let nameWithoutExt = lastDot !== -1 ? filename.slice(0, lastDot) : filename;

  // If filename starts with a UUID (e.g., from /api/admin/upload), strip the UUID
  const uuidPrefixMatch = nameWithoutExt.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[-_](.+)$/i);
  if (uuidPrefixMatch) {
    nameWithoutExt = uuidPrefixMatch[1];
  }

  // Check for view/index suffixes:
  // e.g. -1, _1, (1), -main, _main, -front, -back, -side, -angle, -detail, -model, -thumb, -thumbnail, -hero
  const suffixMatch = nameWithoutExt.match(/[-_ ]?\(?(main|hero|front|back|side|top|bottom|angle|detail|zoom|model|thumb|thumbnail|view|\d+)\)?$/i);
  let suffix = '';
  let baseName = nameWithoutExt;
  let order = 0; // Default for no-suffix main product image is 0 (primary!)

  if (suffixMatch) {
    suffix = suffixMatch[1].toLowerCase();
    baseName = nameWithoutExt.slice(0, suffixMatch.index);
    if (/^\d+$/.test(suffix)) {
      order = parseInt(suffix, 10);
    } else if (suffix === 'main' || suffix === 'hero') {
      order = 0;
    } else if (suffix === 'front') {
      order = 1;
    } else if (suffix === 'back') {
      order = 2;
    } else if (suffix === 'side') {
      order = 3;
    } else if (suffix === 'top' || suffix === 'bottom' || suffix === 'angle') {
      order = 4;
    } else if (suffix === 'detail' || suffix === 'zoom') {
      order = 5;
    } else if (suffix === 'model') {
      order = 6;
    } else if (suffix === 'thumb' || suffix === 'thumbnail') {
      order = 90;
    }
  }

  return {
    raw: filename,
    cleanedName: nameWithoutExt,
    base: normalizeText(baseName),
    suffix,
    order,
    ext,
    isSiteAsset: isNonProductAsset(filename)
  };
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'a', 'an', 'in', 'of', 'to', 'at', 'by', 'from',
  'is', 'are', 'on', 'set', 'fine', 'jewellery', 'jewelry', 'product', 'image', 'photo'
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
  const seenFilenames = new Set();
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
          rawName: fname,
          cleanedName: analyzed.cleanedName,
          isSiteAsset: analyzed.isSiteAsset
        });
        seenFilenames.add(fname.toLowerCase());
      }
    } catch (err) {
      console.warn(`[scanAvailableImages] Could not scan directory ${dirRelativePath}:`, err.message);
    }
  };

  // 1. Scan public/images
  scanDir('public/images', '/images', 'public_images');

  // 2. Scan images/ at root (if not already found in public/images)
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
          rawName: fname,
          cleanedName: analyzed.cleanedName,
          isSiteAsset: analyzed.isSiteAsset
        });
      }
    } catch (dbErr) {
      console.warn('[scanAvailableImages] MongoDB uploads scan error:', dbErr.message);
    }
  }

  return images;
}

/**
 * Builds fast O(1) lookup indexes from the pool of available images.
 */
export function buildImageIndexes(availableImages) {
  const imagesByBase = new Map();
  const imageByExactFilename = new Map();
  const imageByCleanedName = new Map();
  const allProductAssets = [];

  for (const img of availableImages) {
    // Index by exact filename (case-insensitive)
    imageByExactFilename.set(img.filename.toLowerCase(), img);
    if (img.cleanedName) {
      imageByCleanedName.set(img.cleanedName.toLowerCase(), img);
    }

    // Exclude site graphics from auto-matching pool
    if (img.isSiteAsset) continue;

    allProductAssets.push(img);

    // Index by normalized base name
    if (img.base) {
      if (!imagesByBase.has(img.base)) {
        imagesByBase.set(img.base, []);
      }
      imagesByBase.get(img.base).push(img);
    }
  }

  // Pre-sort image variants within each base by order (order: 0, 1, 2, 3...)
  for (const [base, list] of imagesByBase.entries()) {
    list.sort((a, b) => {
      const diff = (a.order ?? 99) - (b.order ?? 99);
      if (diff !== 0) return diff;
      return a.filename.localeCompare(b.filename, undefined, { numeric: true });
    });
  }

  return {
    imagesByBase,
    imageByExactFilename,
    imageByCleanedName,
    allProductAssets
  };
}

/**
 * Matches candidate images to a single product using the multi-signal confidence system:
 *
 * Priority 1 — Exact Product ID / SKU (+100 / +95)
 * Priority 2 — Exact Slug (+90)
 * Priority 3 — Exact Normalized Name (+85)
 * Priority 4 — Provided image filenames in product file (+98 / +95)
 * Priority 5 — Strong unique normalized filename match (+75)
 * Priority 6 — Existing product database image preservation (+80)
 *
 * CRITICAL ANTI-MIXING RULE:
 * Generic keywords alone NEVER auto-match images!
 * Low-confidence matches (< 75) are NEVER assigned to products;
 * they are placed in `alternatives` for admin review only.
 */
export function matchImagesForProduct(product, availableImages = [], existingProducts = [], prebuiltIndexes = null) {
  const indexes = prebuiltIndexes || buildImageIndexes(availableImages);
  const { imagesByBase, imageByExactFilename, imageByCleanedName, allProductAssets } = indexes;

  const normId = normalizeText(product.id);
  const normSku = normalizeText(product.sku);
  const normSlug = normalizeText(product.slug);
  const normName = normalizeText(product.name);

  const matches = [];
  const alternatives = [];
  const seenMatchedUrls = new Set();

  const addMatch = (img, confidence, matchType, matchReason) => {
    if (seenMatchedUrls.has(img.url)) return;
    seenMatchedUrls.add(img.url);
    matches.push({
      ...img,
      confidence,
      matchType,
      matchReason
    });
  };

  // Check Priority 4: Provided images in product file
  const providedImages = Array.isArray(product.images) ? product.images : [];
  for (const provUrl of providedImages) {
    if (!provUrl || typeof provUrl !== 'string') continue;
    const trimmed = provUrl.trim();
    if (!trimmed) continue;

    // If it's a valid remote URL (http:// or https://)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      addMatch(
        {
          filename: path.basename(trimmed) || 'remote-image.jpg',
          url: trimmed,
          source: 'file_provided_remote',
          order: matches.length + 1,
          ext: path.extname(trimmed).replace('.', '').toLowerCase() || 'jpg'
        },
        95,
        'provided_remote_url',
        'Valid remote URL specified in product file'
      );
      continue;
    }

    // Local image filename or relative path
    const baseFname = path.basename(trimmed).toLowerCase();
    const cleanFname = baseFname.replace(/\.[a-z0-9]+$/i, '');

    if (imageByExactFilename.has(baseFname)) {
      const img = imageByExactFilename.get(baseFname);
      addMatch(img, 98, 'provided_filename_exact', `Exact filename match with provided image "${baseFname}"`);
    } else if (imageByCleanedName.has(cleanFname)) {
      const img = imageByCleanedName.get(cleanFname);
      addMatch(img, 95, 'provided_filename_normalized', `Matched cleaned filename for provided image "${baseFname}"`);
    } else {
      // Specified local path not yet scanned or direct path
      addMatch(
        {
          filename: path.basename(trimmed),
          url: trimmed.startsWith('/') ? trimmed : `/${trimmed}`,
          source: 'file_provided_path',
          order: matches.length + 1,
          ext: path.extname(trimmed).replace('.', '').toLowerCase() || 'jpg'
        },
        85,
        'provided_local_path',
        `Local path specified in product file: "${trimmed}"`
      );
    }
  }

  // Priority 1: Exact Product ID or SKU match
  if (normId && imagesByBase.has(normId)) {
    const list = imagesByBase.get(normId);
    for (const img of list) {
      const conf = img.suffix ? 95 : 100;
      addMatch(img, conf, 'id_exact', `Exact match with Product ID (${product.id})`);
    }
  } else if (normSku && imagesByBase.has(normSku)) {
    const list = imagesByBase.get(normSku);
    for (const img of list) {
      addMatch(img, 95, 'sku_exact', `Exact match with Product SKU (${product.sku})`);
    }
  }

  // Priority 2: Exact product slug match
  if (normSlug && imagesByBase.has(normSlug)) {
    const list = imagesByBase.get(normSlug);
    for (const img of list) {
      addMatch(img, 90, 'slug_exact', `Exact match with Product Slug (${product.slug})`);
    }
  }

  // Priority 3: Exact product name match
  if (normName && imagesByBase.has(normName)) {
    const list = imagesByBase.get(normName);
    for (const img of list) {
      addMatch(img, 85, 'name_exact', `Exact match with Product Name (${product.name})`);
    }
  }

  // Priority 5: Strong Normalized Filename Match (Score 75)
  // ONLY if NO matches have been found yet!
  if (matches.length === 0) {
    // Check if any image base matches product name/slug with minor accessory words like "set", "pair"
    const accessoryWords = ['set', 'pair', 'combo', 'pack'];
    for (const [base, list] of imagesByBase.entries()) {
      const matchesWithAccessory = accessoryWords.some(w =>
        (normName && (normName + w === base || normName === base + w)) ||
        (normSlug && (normSlug + w === base || normSlug === base + w))
      );
      if (matchesWithAccessory) {
        for (const img of list) {
          addMatch(img, 75, 'strong_filename_match', `Strong normalized match with accessory term for (${product.name})`);
        }
      }
    }
  }

  // Priority 6: Existing Product Image Mapping
  // If product already exists in database with matching ID, SKU, or slug and has valid images
  if (matches.length === 0 && existingProducts.length > 0) {
    const existing = existingProducts.find(p =>
      (product.id && p.id === product.id) ||
      (product.slug && p.slug === product.slug) ||
      (product.sku && p.sku && p.sku === product.sku)
    );

    if (existing && Array.isArray(existing.images) && existing.images.length > 0) {
      existing.images.forEach((imgUrl, idx) => {
        addMatch(
          {
            filename: path.basename(imgUrl),
            url: imgUrl,
            source: 'existing_product_database',
            order: idx + 1
          },
          80,
          'existing_db_product',
          `Preserved from existing catalog product (${existing.name})`
        );
      });
    }
  }

  // Suggestions for Admin Review: Find candidate images that share multiple words
  // BUT NEVER auto-assign them! These go strictly into `alternatives`.
  const keywords = extractKeywords(product.name);
  if (keywords.length >= 2) {
    for (const img of allProductAssets) {
      if (seenMatchedUrls.has(img.url)) continue;
      const imgTokens = extractKeywords(img.cleanedName || img.filename);
      if (imgTokens.length < 2) continue;

      const matchingTokens = keywords.filter(k => imgTokens.some(t => t === k || t.includes(k) || k.includes(t)));
      const ratio = matchingTokens.length / keywords.length;

      if (matchingTokens.length >= 2 && ratio >= 0.5) {
        const score = Math.round(40 + ratio * 20); // 50 to 60 max, always < 70
        alternatives.push({
          ...img,
          confidence: score,
          matchType: 'partial_keyword_suggestion',
          matchReason: `Suggested match: ${matchingTokens.length}/${keywords.length} keywords (${matchingTokens.join(', ')})`
        });
      }
    }
  }

  // Sort matches by order (order: 0, 1, 2, 3...)
  matches.sort((a, b) => {
    const diff = (a.order ?? 99) - (b.order ?? 99);
    if (diff !== 0) return diff;
    // If same order, prefer original source format (jpg/png) for canonical catalog consistency
    if ((a.ext === 'jpg' || a.ext === 'png') && b.ext === 'webp') return -1;
    if (a.ext === 'webp' && (b.ext === 'jpg' || b.ext === 'png')) return 1;
    return a.filename.localeCompare(b.filename, undefined, { numeric: true });
  });

  // Deduplicate matches so that duplicate format/upload copies don't crowd the same position slot
  const deduplicatedMatches = [];
  const seenOrderKeys = new Set();
  for (const m of matches) {
    const orderKey = m.order !== undefined && m.order !== null ? String(m.order) : m.url;
    if (!seenOrderKeys.has(orderKey)) {
      seenOrderKeys.add(orderKey);
      deduplicatedMatches.push(m);
    }
  }

  const finalMatches = deduplicatedMatches.length > 0 ? deduplicatedMatches : matches;

  const bestConfidence = finalMatches.length > 0
    ? Math.max(...finalMatches.map(m => m.confidence))
    : 0;

  const status = finalMatches.length === 0
    ? 'missing_images'
    : bestConfidence >= 75
      ? 'matched'
      : 'needs_image_review';

  return {
    images: finalMatches.map(m => m.url),
    matchedDetails: finalMatches,
    alternatives: alternatives.slice(0, 10),
    confidence: bestConfidence,
    status,
    needsReview: status !== 'matched'
  };
}

/**
 * Batch matches images across an array of products with cross-product conflict prevention.
 * Ensures:
 * 1. An image is claimed exclusively by the product with the highest confidence match.
 * 2. If two products tie for the same image with equal confidence, it is marked as a conflict
 *    and neither product receives it automatically without admin review.
 * 3. Similar products (e.g. "Ocean Charm Necklace" and "Ocean Shell Charm Necklace") NEVER mix images.
 */
export async function batchMatchProductImages(products, { db = null, availableImages = null, existingProducts = [] } = {}) {
  const assets = availableImages || await scanAvailableImages(db);
  const indexes = buildImageIndexes(assets);

  // 1. Initial matching for each product
  const perProductMatches = products.map((product, pIdx) => {
    const result = matchImagesForProduct(product, assets, existingProducts, indexes);
    return {
      productIndex: pIdx,
      product,
      result
    };
  });

  // 2. Map claims by image URL: imageUrl -> [{ productIndex, confidence, matchType }]
  const imageClaims = new Map();
  perProductMatches.forEach(({ productIndex, result }) => {
    result.matchedDetails.forEach(m => {
      if (!imageClaims.has(m.url)) {
        imageClaims.set(m.url, []);
      }
      imageClaims.get(m.url).push({
        productIndex,
        confidence: m.confidence,
        matchType: m.matchType
      });
    });
  });

  // 3. Resolve conflicts
  const conflicts = [];
  const assignedImagesPerProduct = new Map(); // productIndex -> Set of image URLs

  imageClaims.forEach((claims, url) => {
    if (claims.length === 1) {
      const { productIndex } = claims[0];
      if (!assignedImagesPerProduct.has(productIndex)) {
        assignedImagesPerProduct.set(productIndex, new Set());
      }
      assignedImagesPerProduct.get(productIndex).add(url);
    } else {
      // Multiple products claimed this image!
      // Sort claims by confidence descending
      claims.sort((a, b) => b.confidence - a.confidence);
      const topClaim = claims[0];
      const secondClaim = claims[1];

      if (topClaim.confidence > secondClaim.confidence) {
        // Clear winner with higher confidence
        if (!assignedImagesPerProduct.has(topClaim.productIndex)) {
          assignedImagesPerProduct.set(topClaim.productIndex, new Set());
        }
        assignedImagesPerProduct.get(topClaim.productIndex).add(url);
      } else {
        // Equal confidence tie between two products -> CONFLICT!
        // Do NOT auto-assign. Report conflict for safety.
        conflicts.push({
          url,
          filename: path.basename(url),
          contendingProducts: claims.map(c => ({
            productIndex: c.productIndex,
            name: products[c.productIndex]?.name,
            id: products[c.productIndex]?.id,
            confidence: c.confidence
          }))
        });
      }
    }
  });

  // 4. Construct final matched products
  return perProductMatches.map(({ productIndex, product, result }) => {
    const validAssignedUrls = assignedImagesPerProduct.get(productIndex) || new Set();

    // Filter matched details to only assigned URLs
    const finalMatchedDetails = result.matchedDetails.filter(m => validAssignedUrls.has(m.url));

    const productConflicts = conflicts.filter(c =>
      c.contendingProducts.some(p => p.productIndex === productIndex)
    );

    const hasConflict = productConflicts.length > 0;
    const bestConfidence = finalMatchedDetails.length > 0
      ? Math.max(...finalMatchedDetails.map(m => m.confidence))
      : 0;

    let status = 'matched';
    if (finalMatchedDetails.length === 0) {
      status = 'missing_images';
    } else if (hasConflict || bestConfidence < 75) {
      status = 'needs_image_review';
    }

    return {
      ...product,
      images: finalMatchedDetails.map(m => m.url),
      _imageMatch: {
        confidence: bestConfidence,
        status,
        needsReview: status !== 'matched',
        matchedDetails: finalMatchedDetails,
        alternatives: result.alternatives,
        conflicts: productConflicts
      }
    };
  });
}
