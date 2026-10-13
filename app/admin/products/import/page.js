'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatINR } from '@/lib/products';
import {
  UploadCloud, FileCode, CheckCircle2, AlertTriangle, AlertCircle,
  Image as ImageIcon, RefreshCw, ArrowLeft, ArrowRight, Check, X,
  Trash2, Plus, Download, Eye, ExternalLink, Sparkles, Filter,
  FileText, Search, ShieldCheck, Layers, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductImportPage() {
  const router = useRouter();

  // Step management: 'upload' -> 'preview' -> 'result'
  const [step, setStep] = useState('upload');

  // File & Content state
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [filename, setFilename] = useState('');
  const [pasteMode, setPasteMode] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Preview & Processing state
  const [products, setProducts] = useState([]);
  const [invalidProducts, setInvalidProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip'); // 'skip' | 'update'
  const [filterView, setFilterView] = useState('all'); // 'all' | 'duplicates' | 'needs_review' | 'ready'
  const [searchTerm, setSearchTerm] = useState('');

  // Image Modal state
  const [selectedProductIdx, setSelectedProductIdx] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [availableImages, setAvailableImages] = useState([]);
  const [imageSearch, setImageSearch] = useState('');
  const [uploadingLocalImage, setUploadingLocalImage] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');

  // Save / Execution state
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  // Load available local images on mount
  useEffect(() => {
    fetch('/api/admin/product-import/scan-images', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d?.images) setAvailableImages(d.images);
      })
      .catch(e => console.error('Failed to load project images:', e));
  }, []);

  // Handle local file selection (.js or .json)
  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const lower = selected.name.toLowerCase();
    if (!lower.endsWith('.js') && !lower.endsWith('.json')) {
      return toast.error('Please select a valid .js or .json product file.');
    }

    setFile(selected);
    setFilename(selected.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setFileContent(text);
        processPreview(text, selected.name);
      }
    };
    reader.onerror = () => toast.error('Failed to read selected file.');
    reader.readAsText(selected);
  };

  // Process and parse product preview from backend
  const processPreview = async (content, fname) => {
    setLoadingPreview(true);
    try {
      const res = await fetch('/api/admin/product-import/preview', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent: content,
          filename: fname || filename || 'imported-products.js',
          duplicateStrategy
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to preview product file');
      }

      setProducts(data.products || []);
      setInvalidProducts(data.invalidProducts || []);
      setSummary(data.summary || null);
      setStep('preview');
      toast.success(`Successfully parsed ${data.summary?.totalParsed || 0} product(s)!`);
    } catch (err) {
      toast.error(err.message || 'Error processing product file');
      console.error('Preview error:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Upload local image files directly to the server
  const handleLocalImageUpload = async (e, targetProductIdx = null) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadingLocalImage(true);
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    try {
      const res = await fetch('/api/admin/product-import/upload-local-image', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      toast.success(`Successfully uploaded ${data.count} local image(s)!`);

      // Refresh available images list
      const scanRes = await fetch('/api/admin/product-import/scan-images', { credentials: 'include' });
      const scanData = await scanRes.json();
      if (scanData?.images) setAvailableImages(scanData.images);

      // If targeted to a specific product being edited in modal:
      if (targetProductIdx !== null && data.uploaded?.length) {
        const newUrls = data.uploaded.map(u => u.url || u.staticUrl);
        updateProductImages(targetProductIdx, [...(products[targetProductIdx].images || []), ...newUrls]);
      }
    } catch (err) {
      toast.error(err.message || 'Local image upload failed');
    } finally {
      setUploadingLocalImage(false);
    }
  };

  // Update images for a specific product
  const updateProductImages = (idx, newImages) => {
    setProducts(prev => {
      const updated = [...prev];
      const prod = { ...updated[idx], images: newImages };
      if (newImages.length > 0) {
        prod._imageMatch = {
          ...prod._imageMatch,
          status: 'matched',
          confidence: Math.max(prod._imageMatch?.confidence || 85, 85),
          needsReview: false
        };
      } else {
        prod._imageMatch = {
          ...prod._imageMatch,
          status: 'missing_images',
          needsReview: true
        };
      }
      updated[idx] = prod;
      return updated;
    });
  };

  // Quick field editor
  const handleFieldChange = (idx, field, val) => {
    setProducts(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  // Execute Save
  const handleExecuteImport = async () => {
    if (!products.length) return toast.error('No valid products to import.');

    setSaving(true);
    try {
      const res = await fetch('/api/admin/product-import/save', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          duplicateStrategy
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save imported products');

      setSaveResult(data);
      setStep('result');
      toast.success(`Import complete! ${data.importedCount} added, ${data.updatedCount} updated.`);
    } catch (err) {
      toast.error(err.message || 'Import execution failed');
      console.error('Import save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Sample file loaders for testing & reference
  const loadSampleJs = () => {
    const sample = `export const products = [
  {
    id: "MM1001",
    name: "Mayur Veda Chandbali Earrings",
    slug: "mayur-veda-chandbali-earrings",
    price: 1299,
    mrp: 1799,
    category: "Jewellery",
    gender: "women",
    collection: "best-sellers",
    description: "Elegant traditional chandbali earrings handcrafted with peacock motifs and fine pearl drops.",
    images: [], // Auto-matches with local project assets like mayurvedachandbaliearrings-1.jpg!
    stock: 20,
    isBestseller: true
  },
  {
    id: "MM1002",
    name: "Pearl Fiesta Earrings",
    slug: "pearl-fiesta-earrings",
    price: 1599,
    mrp: 2199,
    category: "Jewellery",
    gender: "women",
    collection: "trending",
    description: "A premium statement chandelier earring pair for festive and celebratory evenings.",
    images: [],
    stock: 15,
    isBestseller: false
  },
  {
    id: "MM1003",
    name: "Ocean Charm Necklace",
    slug: "ocean-charm-necklace",
    price: 2499,
    mrp: 3299,
    category: "Jewellery",
    gender: "women",
    collection: "trending",
    description: "Delicate layered necklace inspired by ocean ripples, set with soothing natural pearls.",
    images: [],
    stock: 12,
    isBestseller: true
  }
];`;
    setFileContent(sample);
    setFilename('sample-products.js');
    processPreview(sample, 'sample-products.js');
  };

  const loadSampleJson = () => {
    const sample = JSON.stringify([
      {
        id: "MM1004",
        name: "Amora Pendant Set",
        slug: "amora-pendant-set",
        price: 3499,
        mrp: 4499,
        category: "Jewellery",
        gender: "women",
        collection: "new-arrival",
        description: "Intricately sculpted floral pendant with matching studs.",
        images: [],
        stock: 18,
        isBestseller: true
      },
      {
        id: "MM1005",
        name: "Royal Bloom Bracelet",
        slug: "royal-bloom-bracelet",
        price: 2899,
        mrp: 3799,
        category: "Jewellery",
        gender: "women",
        collection: "editors-choice",
        description: "Regal handcrafted bloom motif cuff bracelet.",
        images: [],
        stock: 10,
        isBestseller: false
      }
    ], null, 2);
    setFileContent(sample);
    setFilename('sample-products.json');
    processPreview(sample, 'sample-products.json');
  };

  // Filtered preview items
  const filteredProducts = products.filter(p => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchText = (p.name || '') + ' ' + (p.slug || '') + ' ' + (p.sku || '') + ' ' + (p.id || '');
      if (!matchText.toLowerCase().includes(q)) return false;
    }
    if (filterView === 'duplicates') return p._duplicate?.isDuplicate;
    if (filterView === 'needs_review') return p._imageMatch?.needsReview;
    if (filterView === 'ready') return !p._duplicate?.isDuplicate && !p._imageMatch?.needsReview;
    return true;
  });

  return (
    <div className="pb-16 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/products"
              className="p-2 border border-stone-200 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition"
              title="Back to Products"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-2xl xs:text-3xl text-[#1A1A1A] font-light">
                Product File Import
              </h1>
              <div className="gold-line w-12 mt-1.5" />
            </div>
          </div>
          <p className="text-stone-600 text-sm mt-2">
            Import products from JavaScript (<code className="text-xs bg-stone-100 px-1 py-0.5 rounded">.js</code>) and JSON (<code className="text-xs bg-stone-100 px-1 py-0.5 rounded">.json</code>) files with automatic image matching.
          </p>
        </div>

        {/* Global Local Image Upload Button */}
        <div className="flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 rounded-lg text-sm font-medium transition shadow-sm">
            <UploadCloud className="w-4 h-4 text-stone-600" />
            <span>Upload Images Locally</span>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleLocalImageUpload(e)}
              disabled={uploadingLocalImage}
            />
          </label>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
        <div className={`p-3 sm:p-4 rounded-xl border text-center transition ${step === 'upload' ? 'bg-[#A27B5C]/10 border-[#A27B5C] text-[#A27B5C] font-semibold' : 'bg-white border-stone-200 text-stone-500'}`}>
          <div className="text-xs uppercase tracking-wider">Step 1</div>
          <div className="text-sm sm:text-base font-medium mt-0.5">Select & Upload File</div>
        </div>
        <div className={`p-3 sm:p-4 rounded-xl border text-center transition ${step === 'preview' ? 'bg-[#A27B5C]/10 border-[#A27B5C] text-[#A27B5C] font-semibold' : 'bg-white border-stone-200 text-stone-500'}`}>
          <div className="text-xs uppercase tracking-wider">Step 2</div>
          <div className="text-sm sm:text-base font-medium mt-0.5">Review & Match Images</div>
        </div>
        <div className={`p-3 sm:p-4 rounded-xl border text-center transition ${step === 'result' ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold' : 'bg-white border-stone-200 text-stone-500'}`}>
          <div className="text-xs uppercase tracking-wider">Step 3</div>
          <div className="text-sm sm:text-base font-medium mt-0.5">Import Results</div>
        </div>
      </div>

      {/* STEP 1: UPLOAD & SELECT */}
      {step === 'upload' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 shadow-sm">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-[#A27B5C] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileCode className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-stone-900">
                Choose a Product Catalog File
              </h2>
              <p className="text-stone-500 text-sm mt-1.5 mb-6">
                Supports ES Modules (<code className="text-xs bg-stone-100 px-1 py-0.5 rounded">export const products = [...]</code>), CommonJS, or JSON.
              </p>

              {/* Drag and Drop Zone */}
              <label className="border-2 border-dashed border-stone-300 hover:border-[#A27B5C] bg-stone-50/50 hover:bg-stone-50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition group">
                <UploadCloud className="w-12 h-12 text-stone-400 group-hover:text-[#A27B5C] mb-3 transition" />
                <span className="text-base font-medium text-stone-800">
                  Click to browse or drag & drop product file
                </span>
                <span className="text-xs text-stone-500 mt-1">
                  Supported formats: .js, .json (up to 20MB)
                </span>
                <input
                  type="file"
                  accept=".js,.json,application/json,text/javascript"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={loadingPreview}
                />
              </label>

              {loadingPreview && (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[#A27B5C]">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Parsing and scanning image matches...</span>
                </div>
              )}

              {/* Sample file buttons */}
              <div className="mt-8 pt-6 border-t border-stone-100 flex flex-wrap items-center justify-center gap-3">
                <span className="text-xs text-stone-400 uppercase tracking-wider w-full mb-1">
                  Try with pre-built sample files:
                </span>
                <button
                  type="button"
                  onClick={loadSampleJs}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium rounded-lg border border-stone-200 transition flex items-center gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-600" />
                  Load Sample .js File (ES Modules)
                </button>
                <button
                  type="button"
                  onClick={loadSampleJson}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium rounded-lg border border-stone-200 transition flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Load Sample .json File
                </button>
                <button
                  type="button"
                  onClick={() => setPasteMode(!pasteMode)}
                  className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium rounded-lg border border-stone-300 transition"
                >
                  {pasteMode ? 'Hide Code Editor' : 'Paste Code Directly'}
                </button>
              </div>

              {/* Direct Paste Area */}
              {pasteMode && (
                <div className="mt-6 text-left">
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                    Paste JavaScript or JSON code:
                  </label>
                  <textarea
                    rows={8}
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    placeholder="export const products = [ ... ];"
                    className="w-full font-mono text-xs p-3 bg-stone-900 text-stone-100 rounded-xl border border-stone-800 focus:outline-none focus:ring-2 focus:ring-[#A27B5C]"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => processPreview(fileContent, 'pasted-code.js')}
                      disabled={!fileContent.trim() || loadingPreview}
                      className="px-5 py-2 bg-[#A27B5C] hover:bg-[#8C6B4F] text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                    >
                      Process Pasted Code
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feature Highlights & Guidance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-stone-900 text-sm">7-Priority Automatic Matching</h3>
              <p className="text-stone-500 text-xs mt-1 leading-relaxed">
                Images are automatically mapped by product ID, SKU, URL slug, full product name, keywords, and numeric view indexes (1, 2, 3, 4).
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
                <UploadCloud className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-stone-900 text-sm">Local Image Storage</h3>
              <p className="text-stone-500 text-xs mt-1 leading-relaxed">
                Matches project assets in <code className="text-[11px] bg-stone-100 px-1 py-0.5 rounded">public/images</code> and allows instant local image file uploads directly into the catalog.
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-stone-900 text-sm">Non-Destructive Import</h3>
              <p className="text-stone-500 text-xs mt-1 leading-relaxed">
                Choose to skip or safely update existing products without resetting customer ratings, reviews, inventory, or orders.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 2: PREVIEW & REVIEW */}
      {step === 'preview' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div
              onClick={() => setFilterView('all')}
              className={`p-4 rounded-xl border cursor-pointer transition ${filterView === 'all' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 hover:border-stone-400'}`}
            >
              <div className="text-xs uppercase tracking-wider opacity-75">Total Parsed</div>
              <div className="text-2xl font-bold mt-1">{summary?.totalParsed || products.length}</div>
            </div>

            <div
              onClick={() => setFilterView('ready')}
              className={`p-4 rounded-xl border cursor-pointer transition ${filterView === 'ready' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white border-stone-200 hover:border-emerald-300'}`}
            >
              <div className="text-xs uppercase tracking-wider opacity-75">Ready to Save</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {products.filter(p => !p._duplicate?.isDuplicate && !p._imageMatch?.needsReview).length}
              </div>
            </div>

            <div
              onClick={() => setFilterView('duplicates')}
              className={`p-4 rounded-xl border cursor-pointer transition ${filterView === 'duplicates' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white border-stone-200 hover:border-amber-300'}`}
            >
              <div className="text-xs uppercase tracking-wider opacity-75">Duplicates</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {summary?.duplicateCount || 0}
              </div>
            </div>

            <div
              onClick={() => setFilterView('needs_review')}
              className={`p-4 rounded-xl border cursor-pointer transition ${filterView === 'needs_review' ? 'bg-purple-700 text-white border-purple-700' : 'bg-white border-stone-200 hover:border-purple-300'}`}
            >
              <div className="text-xs uppercase tracking-wider opacity-75">Needs Review</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                {products.filter(p => p._imageMatch?.needsReview).length}
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-white border-stone-200 col-span-2 sm:col-span-1">
              <div className="text-xs uppercase tracking-wider text-stone-500">Local Images</div>
              <div className="text-2xl font-bold text-stone-800 mt-1">
                {availableImages.length}
              </div>
            </div>
          </div>

          {/* Action & Strategy Bar */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-stone-600">Existing Products:</span>
                <select
                  value={duplicateStrategy}
                  onChange={(e) => setDuplicateStrategy(e.target.value)}
                  className="text-xs font-medium bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-[#A27B5C] outline-none"
                >
                  <option value="skip">Skip duplicates (Keep DB products)</option>
                  <option value="update">Update existing (Preserve stock & reviews)</option>
                </select>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Filter products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs pl-8 pr-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#A27B5C] w-48"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-3 py-1.5 border border-stone-300 text-stone-700 rounded-lg text-xs font-medium hover:bg-stone-50 transition"
              >
                Change File
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={saving || !products.length}
                className="px-5 py-2 bg-[#A27B5C] hover:bg-[#8C6B4F] text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Import ({products.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Products List Table */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Matched Images</th>
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price / MRP</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredProducts.map((p, idx) => {
                    const originalIdx = products.indexOf(p);
                    const isDup = p._duplicate?.isDuplicate;
                    const needsReview = p._imageMatch?.needsReview;
                    const imagesList = p.images || [];

                    return (
                      <tr key={idx} className="hover:bg-stone-50/70 transition">
                        <td className="py-3 px-4 text-stone-400 font-mono text-[11px]">
                          {originalIdx + 1}
                        </td>

                        {/* Images preview & match score */}
                        <td className="py-3 px-4 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            {imagesList.length > 0 ? (
                              <div className="flex -space-x-2 overflow-hidden py-1">
                                {imagesList.slice(0, 3).map((imgUrl, i) => (
                                  <img
                                    key={i}
                                    src={imgUrl}
                                    alt={`Product view ${i + 1}`}
                                    className="w-10 h-10 object-cover rounded-lg border-2 border-white shadow-sm bg-stone-100"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/verification-logo.png';
                                    }}
                                  />
                                ))}
                                {imagesList.length > 3 && (
                                  <span className="w-10 h-10 rounded-lg bg-stone-200 text-stone-700 text-[11px] font-bold flex items-center justify-center border-2 border-white">
                                    +{imagesList.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 text-stone-400 flex items-center justify-center">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-1">
                                {p._imageMatch?.confidence >= 75 ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {p._imageMatch.confidence}% Matched
                                  </span>
                                ) : imagesList.length > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    Needs Review
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                    No Image
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProductIdx(originalIdx);
                                  setShowImageModal(true);
                                }}
                                className="text-[11px] text-[#A27B5C] hover:underline font-medium mt-0.5 block"
                              >
                                {imagesList.length ? `${imagesList.length} view(s) - Manage` : 'Select Image'}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Name & Slug */}
                        <td className="py-3 px-4 min-w-[220px]">
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => handleFieldChange(originalIdx, 'name', e.target.value)}
                            className="font-medium text-stone-900 border-b border-transparent hover:border-stone-300 focus:border-[#A27B5C] focus:outline-none w-full bg-transparent"
                          />
                          <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                            <span>Slug: <code className="text-[10px] text-stone-600 bg-stone-100 px-1 py-0.2 rounded">{p.slug}</code></span>
                            {p.id && <span>ID: <code className="text-[10px] text-stone-500">{p.id}</code></span>}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded-md bg-stone-100 text-stone-700 font-medium capitalize text-[11px]">
                            {p.category}
                          </span>
                        </td>

                        {/* Price & MRP */}
                        <td className="py-3 px-4 min-w-[120px]">
                          <div className="font-semibold text-stone-900">
                            {formatINR(p.price)}
                          </div>
                          {p.mrp > p.price && (
                            <div className="text-[10px] text-stone-400 line-through">
                              {formatINR(p.mrp)}
                            </div>
                          )}
                        </td>

                        {/* Stock */}
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            value={p.stock}
                            onChange={(e) => handleFieldChange(originalIdx, 'stock', Number(e.target.value))}
                            className="w-16 px-1.5 py-1 text-center font-mono border border-stone-200 rounded focus:border-[#A27B5C] outline-none text-xs"
                          />
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 min-w-[140px]">
                          {isDup ? (
                            <div className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span>Exists in DB ({p._duplicate.duplicateField})</span>
                            </div>
                          ) : needsReview ? (
                            <div className="text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1">
                              <HelpCircle className="w-3 h-3 flex-shrink-0" />
                              <span>Review Images</span>
                            </div>
                          ) : (
                            <div className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                              <span>Ready to Save</span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductIdx(originalIdx);
                              setShowImageModal(true);
                            }}
                            className="p-1.5 text-stone-500 hover:text-[#A27B5C] hover:bg-stone-100 rounded transition"
                            title="Manage images"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 3: RESULT REPORT */}
      {step === 'result' && saveResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 shadow-sm text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900">
              Import Completed Successfully!
            </h2>
            <p className="text-stone-500 text-sm mt-1">
              Your catalog has been updated and caches have been refreshed.
            </p>

            {/* Results Grid */}
            <div className="grid grid-cols-4 gap-3 my-8">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                <div className="text-xs uppercase tracking-wider opacity-75">Added</div>
                <div className="text-2xl font-bold mt-1">{saveResult.importedCount}</div>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
                <div className="text-xs uppercase tracking-wider opacity-75">Updated</div>
                <div className="text-2xl font-bold mt-1">{saveResult.updatedCount}</div>
              </div>
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-stone-700">
                <div className="text-xs uppercase tracking-wider opacity-75">Skipped</div>
                <div className="text-2xl font-bold mt-1">{saveResult.skippedCount}</div>
              </div>
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
                <div className="text-xs uppercase tracking-wider opacity-75">Failed</div>
                <div className="text-2xl font-bold mt-1">{saveResult.failedCount}</div>
              </div>
            </div>

            {/* Action Links */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/admin/products"
                className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-semibold transition"
              >
                View Products Catalog
              </Link>
              <Link
                href="/shop"
                target="_blank"
                className="px-6 py-2.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded-lg text-sm font-semibold transition flex items-center gap-1.5"
              >
                <span>Storefront</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setProducts([]);
                  setSaveResult(null);
                }}
                className="px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-sm font-medium transition"
              >
                Import Another File
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* IMAGE MANAGEMENT MODAL */}
      <AnimatePresence>
        {showImageModal && selectedProductIdx !== null && products[selectedProductIdx] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-stone-900 text-base">
                    Manage Images for &ldquo;{products[selectedProductIdx].name}&rdquo;
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Select, reorder, or upload product gallery images locally.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* 1. Currently Assigned Gallery */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-700 mb-3 flex items-center justify-between">
                    <span>Assigned Images ({(products[selectedProductIdx].images || []).length})</span>
                    <span className="text-[11px] text-stone-400 font-normal">First image is primary</span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {(products[selectedProductIdx].images || []).map((imgUrl, i) => (
                      <div key={i} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shadow-sm">
                        <img src={imgUrl} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1 rounded font-bold">
                          #{i + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = [...(products[selectedProductIdx].images || [])];
                            cur.splice(i, 1);
                            updateProductImages(selectedProductIdx, cur);
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-md opacity-0 group-hover:opacity-100 transition shadow"
                          title="Remove image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Local upload drop button inside modal */}
                    <label className="w-24 h-24 rounded-xl border-2 border-dashed border-stone-300 hover:border-[#A27B5C] bg-stone-50 hover:bg-stone-100/70 flex flex-col items-center justify-center cursor-pointer transition text-stone-500">
                      <UploadCloud className="w-6 h-6 mb-1 text-stone-400" />
                      <span className="text-[10px] font-medium">Upload File</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLocalImageUpload(e, selectedProductIdx)}
                      />
                    </label>
                  </div>
                </div>

                {/* 2. Suggested Alternatives from Scanned Project Assets */}
                {products[selectedProductIdx]._imageMatch?.alternatives?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-purple-700 mb-2">
                      Suggested Matches Found in Project ({products[selectedProductIdx]._imageMatch.alternatives.length}):
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {products[selectedProductIdx]._imageMatch.alternatives.map((alt, ai) => (
                        <div
                          key={ai}
                          onClick={() => {
                            const cur = [...(products[selectedProductIdx].images || [])];
                            if (!cur.includes(alt.url)) {
                              updateProductImages(selectedProductIdx, [...cur, alt.url]);
                            }
                          }}
                          className="border border-stone-200 rounded-lg p-1 hover:border-purple-500 cursor-pointer bg-stone-50 group text-center"
                          title={alt.filename}
                        >
                          <img src={alt.url} alt={alt.filename} className="w-full h-16 object-cover rounded" />
                          <div className="text-[10px] font-mono text-stone-600 truncate mt-1">{alt.filename}</div>
                          <span className="text-[9px] text-purple-700 font-semibold">+ Add</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Browse All Scanned Local Images */}
                <div className="pt-4 border-t border-stone-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Browse All Local Assets ({availableImages.length})
                    </span>
                    <input
                      type="text"
                      placeholder="Search image filename..."
                      value={imageSearch}
                      onChange={(e) => setImageSearch(e.target.value)}
                      className="text-xs px-2.5 py-1 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#A27B5C] w-48"
                    />
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 border border-stone-100 rounded-xl bg-stone-50">
                    {availableImages
                      .filter(img => !imageSearch || img.filename.toLowerCase().includes(imageSearch.toLowerCase()))
                      .slice(0, 30)
                      .map((img, ii) => {
                        const isSelected = (products[selectedProductIdx].images || []).includes(img.url);
                        return (
                          <div
                            key={ii}
                            onClick={() => {
                              const cur = [...(products[selectedProductIdx].images || [])];
                              if (isSelected) {
                                updateProductImages(selectedProductIdx, cur.filter(u => u !== img.url));
                              } else {
                                updateProductImages(selectedProductIdx, [...cur, img.url]);
                              }
                            }}
                            className={`p-1 rounded-lg border cursor-pointer text-center transition ${isSelected ? 'border-[#A27B5C] bg-[#A27B5C]/10' : 'border-stone-200 bg-white hover:border-stone-400'}`}
                            title={img.filename}
                          >
                            <img src={img.url} alt={img.filename} className="w-full h-14 object-cover rounded" />
                            <div className="text-[9px] font-mono text-stone-600 truncate mt-0.5">{img.filename}</div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 4. Add by Custom URL */}
                <div className="pt-4 border-t border-stone-100">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 block mb-1">
                    Or Enter Image URL:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://... or /images/..."
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      className="text-xs flex-1 px-3 py-1.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#A27B5C] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!customImageUrl.trim()) return;
                        updateProductImages(selectedProductIdx, [...(products[selectedProductIdx].images || []), customImageUrl.trim()]);
                        setCustomImageUrl('');
                      }}
                      className="px-4 py-1.5 bg-stone-800 text-white rounded-lg text-xs font-semibold hover:bg-stone-700 transition"
                    >
                      Add URL
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="px-5 py-2 bg-[#A27B5C] text-white rounded-lg text-xs font-semibold hover:bg-[#8C6B4F] transition"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
