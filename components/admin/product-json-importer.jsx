'use client';
import { useState, useRef, useMemo, useEffect } from 'react';
import {
  Upload, FileText, Image as ImageIcon, CheckCircle2, AlertCircle,
  X, ArrowRight, ArrowLeft, Loader2, RefreshCw, Copy, Check,
  Download, Eye, Sparkles, Plus, AlertTriangle, Layers, Trash2, Code2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { formatINR } from '@/lib/products';

const SAMPLE_JSON = [
  {
    "name": "Celestine Diamond Pendant",
    "price": 78500,
    "mrp": 92000,
    "category": "diamond",
    "collection": "trending",
    "gender": "women",
    "sku": "AUR-CDP-001",
    "stock": 15,
    "metal": "18K Rose Gold",
    "stone": "Diamond",
    "purity": "18K",
    "weight": "4.20 g",
    "size": "Standard",
    "badge": "Bestseller",
    "description": "A radiant teardrop silhouette set with 32 brilliant-cut diamonds, hand-finished in 18K rose gold."
  },
  {
    "name": "Meher 22K Bridal Choker",
    "price": 485000,
    "mrp": 520000,
    "category": "wedding",
    "collection": "editors-choice",
    "gender": "women",
    "sku": "AUR-MBC-002",
    "stock": 5,
    "metal": "22K Yellow Gold",
    "stone": "Uncut Polki",
    "purity": "22K",
    "weight": "42.80 g",
    "size": "Adjustable",
    "badge": "Bridal",
    "description": "An heirloom bridal choker in 22K gold, adorned with uncut polki and freshwater pearls."
  }
];

const SAMPLE_JS = `// Curated Product Catalog for MikuMantra
export const PRODUCTS = [
  {
    name: "Celestine Diamond Pendant",
    price: 78500,
    mrp: 92000,
    category: "diamond",
    collection: "trending",
    gender: "women",
    sku: "AUR-CDP-001",
    stock: 15,
    metal: "18K Rose Gold",
    stone: "Diamond",
    purity: "18K",
    weight: "4.20 g",
    size: "Standard",
    badge: "Bestseller",
    description: "A radiant teardrop silhouette set with 32 brilliant-cut diamonds, hand-finished in 18K rose gold."
  },
  {
    name: "Meher 22K Bridal Choker",
    price: 485000,
    mrp: 520000,
    category: "wedding",
    collection: "editors-choice",
    gender: "women",
    sku: "AUR-MBC-002",
    stock: 5,
    metal: "22K Yellow Gold",
    stone: "Uncut Polki",
    purity: "22K",
    weight: "42.80 g",
    size: "Adjustable",
    badge: "Bridal",
    description: "An heirloom bridal choker in 22K gold, adorned with uncut polki and freshwater pearls."
  }
];
`;

// Helper: Normalize name/slug/sku for resilient fuzzy and exact matching
function normalizeKey(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    // Strip file extensions
    .replace(/\.[a-z0-9]+$/i, '')
    // Strip common image sequence/angle markers: _1, -1, (1), _front, _back, _side, _model, -01, etc.
    .replace(/[\s_-]+(1|2|3|4|5|6|7|8|9|01|02|03|04|05|front|back|side|top|model|angle|thumb|photo|\(\d+\))$/i, '')
    // Replace non-alphanumeric chars with spaces
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Robust Resilient Parser for standard JSON and JavaScript product files (.js / .mjs / .cjs)
function parseCatalogData(rawText) {
  if (!rawText || !rawText.trim()) throw new Error('File content is empty');
  const trimmed = rawText.trim();

  // 1. Attempt standard JSON parsing
  try {
    return JSON.parse(trimmed);
  } catch (_) {}

  // 2. Strip imports that could cause syntax errors in Function()
  let sanitized = trimmed
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?/gm, '')
    .replace(/^import\s+['"][^'"]+['"];?/gm, '');

  // 3. Execution in isolated Function sandbox with resilient with() proxy scope
  try {
    const transformed = sanitized
      .replace(/export\s+default\s+/g, 'var __defaultExport = ')
      .replace(/export\s+(const|let|var)\s+/g, 'var ')
      .replace(/export\s+/g, '');

    const scopeStore = { module: { exports: null }, exports: {} };

    const createDummy = (name) => {
      const dummy = function() { return ''; };
      dummy.__isDummy = true;
      return new Proxy(dummy, {
        get: (t, p) => {
          if (p === '__isDummy') return true;
          if (p === Symbol.toPrimitive || p === 'toString' || p === 'valueOf') {
            return () => String(name);
          }
          return `${String(name)}_${String(p)}`;
        }
      });
    };

    const globalRef = typeof window !== 'undefined' ? window : globalThis;

    const safeScope = new Proxy(scopeStore, {
      has: (target, prop) => {
        if (prop === '__scope__') return false;
        return true;
      },
      get: (target, prop) => {
        if (prop === Symbol.unscopables) return undefined;
        if (prop in target) return target[prop];
        if (prop in globalRef) return globalRef[prop];
        return createDummy(prop);
      },
      set: (target, prop, value) => {
        target[prop] = value;
        return true;
      }
    });

    const code = `
      with (__scope__) {
        ${transformed}
      }
    `;

    const fn = new Function('__scope__', code);
    fn(safeScope);

    // Look for explicit or default export in scopeStore
    const explicitKeys = ['PRODUCTS', 'products', 'CATALOG', 'catalog', 'ITEMS', 'items', 'DATA', 'data', '__defaultExport'];
    for (const key of explicitKeys) {
      const val = scopeStore[key];
      if (val && !val.__isDummy) {
        if (Array.isArray(val) || (typeof val === 'object' && val.products)) return val;
      }
    }

    if (scopeStore.module?.exports && !scopeStore.module.exports.__isDummy) {
      const exp = scopeStore.module.exports;
      if (Array.isArray(exp) || (typeof exp === 'object' && exp.products)) return exp;
    }

    // Look for any array in scopeStore that contains objects with 'name' or 'price'
    for (const val of Object.values(scopeStore)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && (val[0].name || val[0].price || val[0].id || val[0].sku)) {
        return val;
      }
    }
  } catch (err1) {
    // Proceed to expression evaluation
  }

  // 4. Attempt direct expression evaluation (for raw array/object literal with unquoted keys, single quotes, etc.)
  try {
    const expr = sanitized
      .replace(/export\s+default\s+/g, '')
      .replace(/export\s+(?:const|let|var)\s+\w+\s*=\s*/g, '')
      .replace(/module\.exports\s*=\s*/g, '')
      .trim()
      .replace(/;+$/, '');

    const fnExpr = new Function('return (' + expr + ');');
    const exprRes = fnExpr();
    if (exprRes && (Array.isArray(exprRes) || typeof exprRes === 'object')) {
      return exprRes;
    }
  } catch (err2) {}

  // 5. Fallback: Extract from first '[' to last ']'
  const firstBracket = sanitized.indexOf('[');
  const lastBracket = sanitized.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      const arrCode = sanitized.slice(firstBracket, lastBracket + 1);
      const fnArr = new Function('return (' + arrCode + ');');
      const arrRes = fnArr();
      if (Array.isArray(arrRes)) return arrRes;
    } catch (_) {}
  }

  throw new Error('Could not parse JavaScript or JSON product data. Please check syntax.');
}

export default function ProductJsonImporter({ isOpen, onClose, existingProducts = [], onImportSuccess }) {
  // Step state: 'files' | 'preview' | 'importing' | 'summary'
  const [step, setStep] = useState('files');
  const [catalogText, setCatalogText] = useState('');
  const [catalogFileName, setCatalogFileName] = useState('');
  const [isPasting, setIsPasting] = useState(false);
  const [copiedType, setCopiedType] = useState(null);

  // Uploaded image files state: array of { id, file, name, previewUrl, matchedProductId }
  const [imageFiles, setImageFiles] = useState([]);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [isDraggingCatalog, setIsDraggingCatalog] = useState(false);

  // Import options
  const [matchMode, setMatchMode] = useState('update'); // 'update' | 'skip' | 'create_new'
  const [overwriteImages, setOverwriteImages] = useState(false);

  // Parsed and processed products list for preview: array of product objects with matched image items
  const [parsedProducts, setParsedProducts] = useState([]);
  const [catalogErrors, setCatalogErrors] = useState([]);

  // Progress state during execution
  const [importProgress, setImportProgress] = useState({ stage: '', percent: 0, current: 0, total: 0 });
  const [importSummary, setImportSummary] = useState(null);

  // Search filter inside preview table
  const [previewSearch, setPreviewSearch] = useState('');

  // Refs for hidden inputs
  const catalogFileInputRef = useRef(null);
  const imagesFileInputRef = useRef(null);

  // Cleanup object URLs on unmount or file reset
  useEffect(() => {
    return () => {
      imageFiles.forEach(img => {
        if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    };
  }, [imageFiles]);

  if (!isOpen) return null;

  // Handle .json or .js file selection
  const handleCatalogFileChange = (file) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.json') && !lower.endsWith('.js') && !lower.endsWith('.mjs') && !lower.endsWith('.cjs')) {
      toast.error('Please upload a valid .json or .js file');
      return;
    }
    setCatalogFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setCatalogText(content);
      toast.success(`Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.onerror = () => toast.error('Failed to read file');
    reader.readAsText(file);
  };

  // Handle multi-image file selection
  const handleImageFilesSelected = (files) => {
    if (!files || !files.length) return;
    const newItems = [];
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

    for (const f of Array.from(files)) {
      if (!allowed.includes(f.type) && !/\.(jpe?g|png|webp|svg)$/i.test(f.name)) {
        continue;
      }
      const previewUrl = URL.createObjectURL(f);
      newItems.push({
        id: Math.random().toString(36).slice(2, 9),
        file: f,
        name: f.name,
        size: f.size,
        previewUrl,
        matchedProductId: null
      });
    }

    if (!newItems.length) {
      toast.error('No supported image files found. Use JPG, PNG, WebP, or SVG.');
      return;
    }

    setImageFiles(prev => [...prev, ...newItems]);
    toast.success(`Added ${newItems.length} image file(s)`);
  };

  // Remove uploaded image
  const removeImageFile = (id) => {
    setImageFiles(prev => {
      const target = prev.find(img => img.id === id);
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(img => img.id !== id);
    });

    // Also remove from any parsed product
    setParsedProducts(prev => prev.map(p => ({
      ...p,
      matchedImages: p.matchedImages.filter(img => img.id !== id)
    })));
  };

  // Copy sample template
  const handleCopySample = (type = 'json') => {
    const content = type === 'js' ? SAMPLE_JS : JSON.stringify(SAMPLE_JSON, null, 2);
    navigator.clipboard.writeText(content);
    setCopiedType(type);
    toast.success(`Sample ${type.toUpperCase()} copied to clipboard`);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Download sample template
  const handleDownloadSample = (type = 'json') => {
    const isJs = type === 'js';
    const content = isJs ? SAMPLE_JS : JSON.stringify(SAMPLE_JSON, null, 2);
    const mime = isJs ? 'text/javascript' : 'application/json';
    const filename = isJs ? 'sample-products.js' : 'sample-products.json';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  // Run Auto-Matching Engine between uploaded catalog products, existing store products, and uploaded images
  const processAndMatch = () => {
    if (!catalogText.trim()) {
      toast.error('Please upload a .json / .js file or paste product data');
      return;
    }

    let parsed = null;
    try {
      parsed = parseCatalogData(catalogText);
    } catch (err) {
      toast.error(`Syntax or parsing error: ${err.message}`);
      setCatalogErrors([err.message]);
      return;
    }

    let rawList = [];
    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && Array.isArray(parsed.products)) {
      rawList = parsed.products;
    } else if (parsed && typeof parsed === 'object') {
      rawList = [parsed];
    } else {
      toast.error('Catalog must contain an array of products or an object with a "products" array');
      return;
    }

    if (!rawList.length) {
      toast.error('No products found in the provided file');
      return;
    }

    const errors = [];
    const productsProcessed = [];
    const usedImageIds = new Set();

    rawList.forEach((raw, index) => {
      const name = (raw.name || '').trim();
      if (!name) {
        errors.push(`Row ${index + 1}: Missing required field 'name'`);
        return;
      }

      const price = Number(raw.price);
      if (isNaN(price) || price < 0) {
        errors.push(`Row ${index + 1} (${name}): Price must be a valid positive number`);
        return;
      }

      // Check existing product match in store
      const normName = normalizeKey(name);
      const normSku = raw.sku ? normalizeKey(raw.sku) : '';
      const normSlug = raw.slug ? normalizeKey(raw.slug) : '';

      const existingMatch = existingProducts.find(p => {
        if (!p) return false;
        if (normalizeKey(p.name) === normName) return true;
        if (normSku && p.sku && normalizeKey(p.sku) === normSku) return true;
        if (normSlug && p.slug && normalizeKey(p.slug) === normSlug) return true;
        return false;
      });

      // Match images from uploaded files
      const matchedForThisProduct = [];
      const rawImgField = raw.images || raw.image || raw.img || raw.thumbnail || [];
      const explicitImages = Array.isArray(rawImgField)
        ? rawImgField
        : (typeof rawImgField === 'string'
            ? (rawImgField.includes(',') || rawImgField.includes('\n')
                ? rawImgField.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
                : [rawImgField.trim()])
            : []);

      // Rule 1: Match explicit filenames specified in file
      imageFiles.forEach(img => {
        if (usedImageIds.has(img.id)) return;
        const baseNameWithExt = img.name.toLowerCase();
        const matchesExplicit = explicitImages.some(exp => {
          if (!exp || typeof exp !== 'string') return false;
          const expClean = exp.trim().toLowerCase().split('/').pop();
          return expClean === baseNameWithExt;
        });

        if (matchesExplicit) {
          matchedForThisProduct.push(img);
          usedImageIds.add(img.id);
        }
      });

      // Rule 2: Match by Product Name, SKU, or Slug
      imageFiles.forEach(img => {
        if (usedImageIds.has(img.id)) return;
        const normImg = normalizeKey(img.name);

        const matchesName = normImg.length > 2 && (normImg === normName || normImg.includes(normName) || normName.includes(normImg));
        const matchesSku = normSku && normSku.length > 2 && (normImg === normSku || normImg.includes(normSku));
        const matchesSlug = normSlug && normSlug.length > 2 && (normImg === normSlug || normImg.includes(normSlug));

        if (matchesName || matchesSku || matchesSlug) {
          matchedForThisProduct.push(img);
          usedImageIds.add(img.id);
        }
      });

      // Natural sort matched images so image-1, image-2 appear in correct order
      matchedForThisProduct.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      // Retain any existing web URLs already present in JSON
      const remoteUrls = explicitImages.filter(img => typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/') || img.startsWith('data:')));

      // Extract all product information from .js file
      const description = (raw.description || raw.desc || raw.details || raw.about || raw.productDescription || '').trim();
      const badge = (raw.badge || '').trim();
      const metal = (raw.metal || raw.metalComposition || '').trim();
      const purity = (raw.purity || raw.goldPurity || '').trim();
      const stone = (raw.stone || raw.stoneDetails || '').trim();
      const weight = (raw.weight || '').trim();
      const size = (raw.size || raw.productSize || '').trim();
      const video = (raw.video || '').trim();
      const rating = raw.rating !== undefined && !isNaN(Number(raw.rating)) ? Number(raw.rating) : 0;
      const reviews = raw.reviews !== undefined && !isNaN(parseInt(raw.reviews)) ? parseInt(raw.reviews) : 0;
      const featured = raw.featured !== undefined ? Boolean(raw.featured) : (badge.toLowerCase() === 'bestseller' || badge.toLowerCase() === 'trending');
      const bestseller = raw.bestseller !== undefined ? Boolean(raw.bestseller) : (badge.toLowerCase() === 'bestseller');
      const newArrival = raw.newArrival !== undefined ? Boolean(raw.newArrival) : (badge.toLowerCase() === 'new' || (raw.collection && raw.collection === 'new-arrival'));
      const seoTitle = (raw.seoTitle || '').trim();
      const seoDescription = (raw.seoDescription || '').trim();

      productsProcessed.push({
        tempId: `prod_${index}_${Math.random().toString(36).slice(2, 7)}`,
        raw,
        name,
        price,
        mrp: raw.mrp ? Number(raw.mrp) : price,
        stock: raw.stock !== undefined ? parseInt(raw.stock) : 10,
        category: raw.category || 'gold',
        collection: raw.collection || 'trending',
        gender: raw.gender || 'women',
        sku: raw.sku || '',
        slug: raw.slug || '',
        existingMatch: existingMatch || null,
        status: existingMatch ? 'update' : 'new',
        matchedImages: matchedForThisProduct,
        remoteUrls,
        description,
        badge,
        metal,
        purity,
        stone,
        weight,
        size,
        video,
        rating,
        reviews,
        featured,
        bestseller,
        newArrival,
        specifications: raw.specifications,
        productBenefits: raw.productBenefits,
        seoTitle,
        seoDescription
      });
    });

    if (errors.length > 0 && productsProcessed.length === 0) {
      setCatalogErrors(errors);
      toast.error('Errors found in catalog file. Please fix and retry.');
      return;
    }

    setCatalogErrors(errors);
    setParsedProducts(productsProcessed);
    setStep('preview');
    toast.success(`Matched ${productsProcessed.length} product(s) with ${usedImageIds.size} image(s)!`);
  };

  // Find images that didn't match any product
  const unmatchedImages = useMemo(() => {
    const matchedIds = new Set();
    parsedProducts.forEach(p => {
      p.matchedImages.forEach(img => matchedIds.add(img.id));
    });
    return imageFiles.filter(img => !matchedIds.has(img.id));
  }, [imageFiles, parsedProducts]);

  // Manually attach an unmatched image to a product
  const attachImageToProduct = (imageId, targetTempId) => {
    const imageObj = imageFiles.find(img => img.id === imageId);
    if (!imageObj) return;

    setParsedProducts(prev => prev.map(p => {
      const cleaned = p.matchedImages.filter(img => img.id !== imageId);
      if (p.tempId === targetTempId) {
        return { ...p, matchedImages: [...cleaned, imageObj] };
      }
      return { ...p, matchedImages: cleaned };
    }));
    toast.success(`Assigned ${imageObj.name} to product`);
  };

  // Detach a matched image from a product
  const detachImageFromProduct = (tempId, imageId) => {
    setParsedProducts(prev => prev.map(p => {
      if (p.tempId === tempId) {
        return {
          ...p,
          matchedImages: p.matchedImages.filter(img => img.id !== imageId)
        };
      }
      return p;
    }));
  };

  // Make an image primary (first) for a product
  const makeImagePrimary = (tempId, imageIndex) => {
    if (imageIndex === 0) return;
    setParsedProducts(prev => prev.map(p => {
      if (p.tempId === tempId) {
        const next = [...p.matchedImages];
        const [target] = next.splice(imageIndex, 1);
        next.unshift(target);
        return { ...p, matchedImages: next };
      }
      return p;
    }));
  };

  // Execute Batch Upload and Product Import
  const executeImport = async () => {
    if (!parsedProducts.length) return;
    setStep('importing');

    try {
      // 1. Collect all matched image files to upload
      const allImagesToUpload = [];
      const imageMap = new Map(); // fileId -> serverUrl

      parsedProducts.forEach(p => {
        p.matchedImages.forEach(img => {
          if (!imageMap.has(img.id)) {
            allImagesToUpload.push(img);
            imageMap.set(img.id, null);
          }
        });
      });

      // 2. Upload images in batches via /api/admin/upload-batch (or sequential fallback)
      if (allImagesToUpload.length > 0) {
        setImportProgress({
          stage: 'Uploading matched product images...',
          percent: 10,
          current: 0,
          total: allImagesToUpload.length
        });

        const batchSize = 6;
        for (let i = 0; i < allImagesToUpload.length; i += batchSize) {
          const chunk = allImagesToUpload.slice(i, i + batchSize);
          const formData = new FormData();
          chunk.forEach(item => formData.append('files', item.file));

          try {
            const upRes = await fetch('/api/admin/upload-batch', {
              method: 'POST',
              credentials: 'include',
              body: formData
            });

            if (upRes.ok) {
              const upData = await upRes.json();
              const uploads = upData.uploads || [];
              chunk.forEach((item, chunkIdx) => {
                const matchedUp = uploads.find(u => u.originalName === item.name) || uploads[chunkIdx];
                if (matchedUp?.url) {
                  imageMap.set(item.id, matchedUp.url);
                }
              });
            } else {
              // Fallback to single upload per item
              for (const singleItem of chunk) {
                const singleForm = new FormData();
                singleForm.append('file', singleItem.file);
                const sRes = await fetch('/api/admin/upload', {
                  method: 'POST',
                  credentials: 'include',
                  body: singleForm
                });
                if (sRes.ok) {
                  const sData = await sRes.json();
                  if (sData.url) imageMap.set(singleItem.id, sData.url);
                }
              }
            }
          } catch (uploadErr) {
            console.warn('Batch upload network error, continuing with available images:', uploadErr);
          }

          const currentDone = Math.min(i + batchSize, allImagesToUpload.length);
          const pct = Math.round(10 + (currentDone / allImagesToUpload.length) * 50);
          setImportProgress({
            stage: `Uploaded ${currentDone} of ${allImagesToUpload.length} image(s)...`,
            percent: pct,
            current: currentDone,
            total: allImagesToUpload.length
          });
        }
      }

      // 3. Assemble final product payloads with server URLs
      setImportProgress({
        stage: 'Saving products to store catalog...',
        percent: 75,
        current: parsedProducts.length,
        total: parsedProducts.length
      });

      const finalProductPayloads = parsedProducts.map(p => {
        const uploadedUrls = p.matchedImages
          .map(img => imageMap.get(img.id))
          .filter(Boolean);

        const allImages = [...uploadedUrls, ...(p.remoteUrls || [])];

        return {
          ...p.raw,
          name: p.name,
          slug: p.slug,
          price: p.price,
          mrp: p.mrp,
          stock: p.stock,
          category: p.category,
          collection: p.collection,
          gender: p.gender,
          sku: p.sku,
          description: p.description,
          badge: p.badge,
          metal: p.metal,
          purity: p.purity,
          stone: p.stone,
          weight: p.weight,
          size: p.size,
          rating: p.rating,
          reviews: p.reviews,
          video: p.video,
          featured: p.featured,
          bestseller: p.bestseller,
          newArrival: p.newArrival,
          specifications: p.specifications,
          productBenefits: p.productBenefits,
          seoTitle: p.seoTitle,
          seoDescription: p.seoDescription,
          images: allImages
        };
      });

      // 4. Send bulk import request to backend
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: finalProductPayloads,
          matchMode,
          overwriteImages
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Import request failed');
      }

      setImportProgress({ stage: 'Completed!', percent: 100, current: parsedProducts.length, total: parsedProducts.length });
      setImportSummary(data);
      setStep('summary');

      toast.success(`Import complete! ${data.createdCount || 0} created, ${data.updatedCount || 0} updated.`);
      if (onImportSuccess) onImportSuccess();

    } catch (err) {
      console.error('Import error:', err);
      toast.error(err.message || 'Import failed');
      setStep('preview');
    }
  };

  // Filter preview products based on search term
  const filteredPreview = useMemo(() => {
    if (!previewSearch.trim()) return parsedProducts;
    const q = previewSearch.toLowerCase();
    return parsedProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }, [parsedProducts, previewSearch]);

  const matchedExistingCount = parsedProducts.filter(p => p.existingMatch).length;
  const newProductsCount = parsedProducts.length - matchedExistingCount;
  const totalMatchedImagesCount = parsedProducts.reduce((acc, p) => acc + p.matchedImages.length, 0);
  const withDescriptionCount = parsedProducts.filter(p => !!p.description).length;

  return (
    <div className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-[#FAF6EF] text-[#9C6B30] border border-[#9C6B30]/20">
                <FileText size={18} />
              </span>
              <div>
                <h3 className="font-display text-lg sm:text-xl font-semibold text-neutral-900">
                  Import Products from JSON / JS
                </h3>
                <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
                  Upload catalog details from .json or .js, automatically match existing products & attach matching images.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="bg-[#FAF6EF]/30 px-5 sm:px-8 py-2.5 border-b border-neutral-100 flex items-center gap-6 text-xs shrink-0 overflow-x-auto">
          <div className={`flex items-center gap-2 font-medium ${step === 'files' ? 'text-[#9C6B30]' : 'text-neutral-400'}`}>
            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${step === 'files' ? 'bg-[#9C6B30] text-white' : 'bg-neutral-200 text-neutral-600'}`}>1</span>
            <span>Upload .JSON / .JS & Images</span>
          </div>
          <div className="w-6 h-px bg-neutral-200" />
          <div className={`flex items-center gap-2 font-medium ${step === 'preview' ? 'text-[#9C6B30]' : 'text-neutral-400'}`}>
            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${step === 'preview' ? 'bg-[#9C6B30] text-white' : 'bg-neutral-200 text-neutral-600'}`}>2</span>
            <span>Review & Match</span>
          </div>
          <div className="w-6 h-px bg-neutral-200" />
          <div className={`flex items-center gap-2 font-medium ${step === 'importing' || step === 'summary' ? 'text-[#9C6B30]' : 'text-neutral-400'}`}>
            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${step === 'importing' || step === 'summary' ? 'bg-[#9C6B30] text-white' : 'bg-neutral-200 text-neutral-600'}`}>3</span>
            <span>Finish Import</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-neutral-50/50">

          {/* STEP 1: FILE UPLOADS & MATCH CONFIG */}
          {step === 'files' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Template Helper Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-amber-50/60 border border-amber-200/60 rounded-xl text-amber-900 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#9C6B30] shrink-0" />
                  <span>Need catalog templates? Download or copy ready-to-use .json or .js templates.</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleCopySample('json')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-neutral-700 hover:text-[#9C6B30] hover:border-[#9C6B30] font-medium transition-all shadow-2xs text-[11px] cursor-pointer"
                  >
                    {copiedType === 'json' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    {copiedType === 'json' ? 'Copied JSON' : 'Copy JSON'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopySample('js')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-neutral-700 hover:text-[#9C6B30] hover:border-[#9C6B30] font-medium transition-all shadow-2xs text-[11px] cursor-pointer"
                  >
                    {copiedType === 'js' ? <Check size={13} className="text-emerald-600" /> : <Code2 size={13} />}
                    {copiedType === 'js' ? 'Copied JS' : 'Copy JS'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadSample('json')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#9C6B30] text-white font-medium hover:bg-[#855a27] transition-all shadow-2xs text-[11px] cursor-pointer"
                  >
                    <Download size={13} />
                    .JSON File
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadSample('js')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1A1A1A] text-white font-medium hover:bg-neutral-800 transition-all shadow-2xs text-[11px] cursor-pointer"
                  >
                    <Download size={13} />
                    .JS File
                  </button>
                </div>
              </div>

              {/* Catalog File Dropzone (.json or .js) */}
              <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} className="text-[#9C6B30]" /> Product Catalog (.json or .js) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPasting(!isPasting)}
                    className="text-[11px] text-[#9C6B30] hover:underline font-medium cursor-pointer"
                  >
                    {isPasting ? 'Upload .json / .js file instead' : 'Or paste text directly'}
                  </button>
                </div>

                {!isPasting ? (
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDraggingCatalog(true); }}
                    onDragLeave={() => setIsDraggingCatalog(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setIsDraggingCatalog(false);
                      if (e.dataTransfer.files?.[0]) handleCatalogFileChange(e.dataTransfer.files[0]);
                    }}
                    onClick={() => catalogFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDraggingCatalog ? 'border-[#9C6B30] bg-[#FAF6EF]/40' : 'border-neutral-200 hover:border-[#9C6B30] bg-neutral-50/50 hover:bg-white'}`}
                  >
                    <input
                      ref={catalogFileInputRef}
                      type="file"
                      accept=".json,.js,.mjs,.cjs"
                      onChange={e => handleCatalogFileChange(e.target.files?.[0])}
                      className="hidden"
                    />
                    <FileText size={32} className={`mx-auto mb-2 ${catalogFileName ? 'text-emerald-600' : 'text-neutral-400'}`} />
                    {catalogFileName ? (
                      <div className="space-y-1">
                        <span className="text-sm font-semibold text-neutral-800">{catalogFileName}</span>
                        <p className="text-xs text-emerald-600 font-medium">File selected. Click or drag another file to replace.</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-neutral-700">Choose or Drag & Drop a .json or .js file here</span>
                        <p className="text-[11px] text-neutral-400">
                          Supports JSON arrays or JS files (e.g. <code>export const PRODUCTS = [...]</code>, <code>export default [...]</code>, or <code>lib/products.js</code>)
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <textarea
                      value={catalogText}
                      onChange={e => setCatalogText(e.target.value)}
                      placeholder='[\n  {\n    "name": "Diamond Pendant",\n    "price": 45000,\n    "category": "diamond",\n    "sku": "AUR-DP-01"\n  }\n]\n// or export const PRODUCTS = [...]'
                      rows={6}
                      className="w-full p-3 font-mono text-xs border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30] transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Images Dropzone */}
              <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-[#9C6B30]" /> Product Image Files
                    </label>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Select multiple images at once. Files with matching names (e.g. <code>Celestine Diamond Pendant.jpg</code> or <code>AUR-CDP-001.png</code>) will automatically link!
                    </p>
                  </div>
                  {imageFiles.length > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#FAF6EF] text-[#9C6B30] border border-[#9C6B30]/30 font-semibold">
                      {imageFiles.length} file(s) selected
                    </span>
                  )}
                </div>

                <div
                  onDragOver={e => { e.preventDefault(); setIsDraggingImages(true); }}
                  onDragLeave={() => setIsDraggingImages(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setIsDraggingImages(false);
                    if (e.dataTransfer.files) handleImageFilesSelected(e.dataTransfer.files);
                  }}
                  onClick={() => imagesFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDraggingImages ? 'border-[#9C6B30] bg-[#FAF6EF]/40' : 'border-neutral-200 hover:border-[#9C6B30] bg-neutral-50/50 hover:bg-white'}`}
                >
                  <input
                    ref={imagesFileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => handleImageFilesSelected(e.target.files)}
                    className="hidden"
                  />
                  <Upload size={30} className="mx-auto mb-2 text-[#9C6B30]" />
                  <span className="text-xs font-semibold text-neutral-700 block">
                    Click to browse or Drag & Drop multiple product images
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Supports JPG, PNG, WebP, SVG. Select 10, 50, or 100+ images.</p>
                </div>

                {/* Thumbnails preview strip */}
                {imageFiles.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-neutral-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-neutral-600">Selected Photos ({imageFiles.length})</span>
                      <button
                        type="button"
                        onClick={() => setImageFiles([])}
                        className="text-[10px] text-red-600 hover:underline font-medium cursor-pointer"
                      >
                        Clear all images
                      </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto py-1 hide-scrollbar">
                      {imageFiles.slice(0, 30).map(img => (
                        <div key={img.id} className="relative group shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100">
                          <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeImageFile(img.id); }}
                            className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] truncate px-1 text-center font-mono">
                            {img.name.slice(0, 10)}
                          </span>
                        </div>
                      ))}
                      {imageFiles.length > 30 && (
                        <div className="shrink-0 w-14 h-14 rounded-lg border border-dashed border-neutral-300 flex items-center justify-center text-[10px] text-neutral-500 font-bold bg-neutral-50">
                          +{imageFiles.length - 30} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Matching & Conflict Rules */}
              <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs space-y-4">
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                  Product Conflict & Matching Strategy
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'update',
                      title: 'Update Existing Products',
                      desc: 'If product name or SKU matches, update price, details & merge matched images.'
                    },
                    {
                      id: 'skip',
                      title: 'Skip Existing Products',
                      desc: 'If product already exists in store, ignore it and only import brand new items.'
                    },
                    {
                      id: 'create_new',
                      title: 'Always Create as New',
                      desc: 'Create new catalog items with auto-assigned unique slugs even if name matches.'
                    }
                  ].map(opt => (
                    <label
                      key={opt.id}
                      onClick={() => setMatchMode(opt.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${matchMode === opt.id ? 'border-[#9C6B30] bg-[#FAF6EF]/30 ring-1 ring-[#9C6B30]' : 'border-neutral-200 hover:border-neutral-300 bg-white'}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-neutral-800">{opt.title}</span>
                        <input
                          type="radio"
                          name="matchMode"
                          checked={matchMode === opt.id}
                          onChange={() => setMatchMode(opt.id)}
                          className="accent-[#9C6B30]"
                        />
                      </div>
                      <span className="text-[11px] text-neutral-400 leading-relaxed">{opt.desc}</span>
                    </label>
                  ))}
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700">
                    <input
                      type="checkbox"
                      checked={overwriteImages}
                      onChange={e => setOverwriteImages(e.target.checked)}
                      className="accent-[#9C6B30] h-4 w-4 rounded-md"
                    />
                    <span>Replace existing product images with newly matched images (default is to append/merge)</span>
                  </label>
                </div>
              </div>

              {/* Errors Output */}
              {catalogErrors.length > 0 && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Please resolve the following errors:
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                    {catalogErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PREVIEW & IMAGE MATCHING TABLE */}
          {step === 'preview' && (
            <div className="space-y-6">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold block">Total In Catalog</span>
                  <span className="text-xl font-bold text-neutral-800 font-display mt-0.5 block">{parsedProducts.length}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-purple-200/80 bg-purple-50/20 shadow-2xs">
                  <span className="text-[10px] text-purple-700 uppercase tracking-widest font-semibold block">With Description</span>
                  <span className="text-xl font-bold text-purple-800 font-display mt-0.5 block">{withDescriptionCount}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-2xs">
                  <span className="text-[10px] text-amber-700 uppercase tracking-widest font-semibold block">Matches Existing</span>
                  <span className="text-xl font-bold text-amber-800 font-display mt-0.5 block">
                    {matchedExistingCount} {matchMode === 'update' ? '(Update)' : matchMode === 'skip' ? '(Skip)' : '(Duplicate)'}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/20 shadow-2xs">
                  <span className="text-[10px] text-blue-700 uppercase tracking-widest font-semibold block">Brand New Items</span>
                  <span className="text-xl font-bold text-blue-800 font-display mt-0.5 block">{newProductsCount}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
                  <span className="text-[10px] text-emerald-700 uppercase tracking-widest font-semibold block">Matched Images</span>
                  <span className="text-xl font-bold text-emerald-800 font-display mt-0.5 block">{totalMatchedImagesCount}</span>
                </div>
              </div>

              {/* Unmatched Images Section if any */}
              {unmatchedImages.length > 0 && (
                <div className="bg-amber-50/60 border border-amber-200/70 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-600" />
                      <span className="text-xs font-bold text-amber-900">
                        {unmatchedImages.length} Image(s) didn't match automatically
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-700">Assign them manually below or proceed without them</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto py-1 hide-scrollbar">
                    {unmatchedImages.map(img => (
                      <div key={img.id} className="p-2 bg-white rounded-lg border border-amber-200 shrink-0 w-44 flex flex-col justify-between space-y-2 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <img src={img.previewUrl} alt={img.name} className="w-10 h-10 object-cover rounded-md border" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-neutral-700 block truncate" title={img.name}>{img.name}</span>
                            <span className="text-[9px] text-neutral-400">{(img.size / 1024).toFixed(0)} KB</span>
                          </div>
                        </div>
                        <select
                          defaultValue=""
                          onChange={e => {
                            if (e.target.value) attachImageToProduct(img.id, e.target.value);
                          }}
                          className="w-full text-[10px] p-1 border border-neutral-200 rounded bg-neutral-50 focus:outline-none"
                        >
                          <option value="">Assign to product...</option>
                          {parsedProducts.map(p => (
                            <option key={p.tempId} value={p.tempId}>
                              {p.name.slice(0, 24)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Preview List */}
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
                <div className="p-3.5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50">
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Catalog Preview ({filteredPreview.length} items)
                  </span>
                  <input
                    value={previewSearch}
                    onChange={e => setPreviewSearch(e.target.value)}
                    placeholder="Filter preview list..."
                    className="px-3 py-1.5 text-xs border border-neutral-200 rounded-md bg-white focus:outline-none focus:border-[#9C6B30] w-64"
                  />
                </div>

                <div className="divide-y divide-neutral-100 max-h-[460px] overflow-y-auto">
                  {filteredPreview.map((item, index) => (
                    <div key={item.tempId} className="p-4 hover:bg-neutral-50/40 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Left Info */}
                        <div className="space-y-1.5 max-w-lg">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono text-neutral-400 font-bold">#{index + 1}</span>
                            <span className="text-sm font-semibold text-neutral-900">{item.name}</span>
                            {item.existingMatch ? (
                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                                Matches: {item.existingMatch.name}
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                                New Item
                              </span>
                            )}
                            {item.badge && (
                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 font-medium">
                            <span className="capitalize">{item.category}</span>
                            <span>•</span>
                            <span className="font-semibold text-neutral-800">{formatINR(item.price)}</span>
                            {item.mrp > item.price && (
                              <span className="line-through text-neutral-400">{formatINR(item.mrp)}</span>
                            )}
                            <span>•</span>
                            <span>Stock: {item.stock}</span>
                            {item.sku && <span>• SKU: {item.sku}</span>}
                          </div>

                          {/* Description info taken from .js file */}
                          {item.description ? (
                            <p className="text-[11px] text-neutral-600 line-clamp-2 leading-relaxed bg-[#FAF6EF]/50 p-2 rounded-md border border-[#9C6B30]/15" title={item.description}>
                              <span className="font-semibold text-[#9C6B30]">Description: </span>
                              {item.description}
                            </p>
                          ) : (
                            <p className="text-[10px] text-neutral-400 italic">No description provided in file</p>
                          )}

                          {/* Specifications pills from .js file */}
                          {(item.metal || item.purity || item.stone || item.weight || item.size) && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] pt-0.5">
                              {item.metal && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                  Metal: {item.metal}
                                </span>
                              )}
                              {item.purity && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                  Purity: {item.purity}
                                </span>
                              )}
                              {item.stone && item.stone !== '—' && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                                  Stone: {item.stone}
                                </span>
                              )}
                              {item.weight && (
                                <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                                  Wt: {item.weight}
                                </span>
                              )}
                              {item.size && item.size !== '—' && (
                                <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                                  Size: {item.size}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Matched Images Strip */}
                        <div className="flex items-center gap-2 overflow-x-auto py-1">
                          {item.matchedImages.map((img, imgIdx) => (
                            <div
                              key={img.id}
                              className={`relative group shrink-0 w-12 h-12 rounded-lg overflow-hidden border ${imgIdx === 0 ? 'border-[#9C6B30] ring-1 ring-[#9C6B30]' : 'border-neutral-200'}`}
                              title={img.name}
                            >
                              <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                              {imgIdx === 0 && (
                                <span className="absolute top-0.5 left-0.5 bg-[#9C6B30] text-white text-[7px] font-bold px-1 rounded uppercase tracking-wider">
                                  Primary
                                </span>
                              )}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                {imgIdx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => makeImagePrimary(item.tempId, imgIdx)}
                                    title="Make Primary Image"
                                    className="p-1 rounded bg-[#9C6B30] text-white hover:bg-[#b07d3b] cursor-pointer"
                                  >
                                    <Sparkles size={9} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => detachImageFromProduct(item.tempId, img.id)}
                                  title="Detach image"
                                  className="p-1 rounded bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                                >
                                  <X size={9} />
                                </button>
                              </div>
                            </div>
                          ))}

                          {item.matchedImages.length === 0 && (
                            <div className="px-3 py-2 rounded-lg border border-dashed border-neutral-300 text-[11px] text-neutral-400 bg-neutral-50 flex items-center gap-1.5">
                              <ImageIcon size={13} /> No local photos matched
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PROGRESS & EXECUTION */}
          {step === 'importing' && (
            <div className="py-16 max-w-md mx-auto text-center space-y-5">
              <div className="relative w-16 h-16 mx-auto">
                <Loader2 className="animate-spin text-[#9C6B30] w-16 h-16" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-display text-lg font-semibold text-neutral-900">
                  {importProgress.stage || 'Importing products...'}
                </h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Please hold on while photos are uploaded and catalog updates are applied.
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                <motion.div
                  className="bg-[#9C6B30] h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${importProgress.percent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-xs font-mono font-semibold text-neutral-500">
                {importProgress.percent}%
              </span>
            </div>
          )}

          {/* SUMMARY STEP */}
          {step === 'summary' && importSummary && (
            <div className="py-10 max-w-lg mx-auto text-center space-y-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h4 className="font-display text-2xl font-semibold text-neutral-900">
                  Import Completed Successfully
                </h4>
                <p className="text-xs text-neutral-500 mt-1">
                  All products and matched media assets have been saved to your store.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-left">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">Created</span>
                  <span className="text-lg font-bold text-emerald-700">{importSummary.createdCount || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">Updated</span>
                  <span className="text-lg font-bold text-amber-700">{importSummary.updatedCount || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">Skipped</span>
                  <span className="text-lg font-bold text-neutral-600">{importSummary.skippedCount || 0}</span>
                </div>
              </div>

              {importSummary.errors?.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-left text-xs text-amber-800">
                  <span className="font-semibold block mb-1">Notices:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {importSummary.errors.map((e, idx) => (
                      <li key={idx}>{e.name ? `${e.name}: ` : ''}{e.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg bg-[#1A1A1A] text-white hover:bg-[#9C6B30] text-xs font-semibold uppercase tracking-widest transition-colors cursor-pointer"
              >
                Close & View Products
              </button>
            </div>
          )}

        </div>

        {/* Footer Navigation Bar */}
        {(step === 'files' || step === 'preview') && (
          <div className="px-5 sm:px-8 py-3.5 border-t border-neutral-100 flex items-center justify-between bg-white shrink-0">
            {step === 'files' ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep('files')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Files
              </button>
            )}

            {step === 'files' ? (
              <button
                type="button"
                onClick={processAndMatch}
                className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 text-xs tracking-wider uppercase rounded-md hover:bg-[#9C6B30] transition-colors font-semibold cursor-pointer"
              >
                Continue to Preview <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={executeImport}
                className="inline-flex items-center gap-2 bg-[#9C6B30] text-white px-6 py-2.5 text-xs tracking-wider uppercase rounded-md hover:bg-[#855a27] transition-colors font-semibold shadow-md cursor-pointer"
              >
                Import {parsedProducts.length} Product(s) <Check size={14} />
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
