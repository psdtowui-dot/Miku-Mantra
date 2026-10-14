// Curated product catalog for MikuMantra
export const CATEGORIES = [
  { slug: 'gold', name: 'Gold', img: 'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?crop=entropy&cs=srgb&fm=jpg&q=85' },
  { slug: 'diamond', name: 'Diamond', img: 'https://images.unsplash.com/photo-1685970731194-e27b477e87ba?crop=entropy&cs=srgb&fm=jpg&q=85' },
  { slug: 'wedding', name: 'Wedding', img: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85' },
  { slug: 'daily-wear', name: 'Daily Wear', img: 'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?crop=entropy&cs=srgb&fm=jpg&q=85' },
  { slug: 'men', name: 'Men', img: 'https://images.unsplash.com/photo-1631982690223-8aa4be0a2497?crop=entropy&cs=srgb&fm=jpg&q=85' },
  { slug: 'women', name: 'Women', img: 'https://images.unsplash.com/photo-1610173827043-9db50e0d8ef9?crop=entropy&cs=srgb&fm=jpg&q=85' },
];

export const COLLECTIONS = [
  { slug: 'trending', name: 'Trending' },
  { slug: 'best-sellers', name: 'Best Sellers' },
  { slug: 'new-arrival', name: 'New Arrival' },
  { slug: 'editors-choice', name: "Editor's Choice" },
];

const IMG = {
  gold1: 'https://images.unsplash.com/photo-1651160670627-2896ddf7822f?crop=entropy&cs=srgb&fm=jpg&q=85',
  gold2: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85',
  gold3: 'https://images.unsplash.com/photo-1585960622850-ed33c41d6418?crop=entropy&cs=srgb&fm=jpg&q=85',
  gold4: 'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?crop=entropy&cs=srgb&fm=jpg&q=85',
  dia1: 'https://images.unsplash.com/photo-1685970731194-e27b477e87ba?crop=entropy&cs=srgb&fm=jpg&q=85',
  dia2: 'https://images.unsplash.com/photo-1693213085235-ea6deadf8cee?crop=entropy&cs=srgb&fm=jpg&q=85',
  dia3: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?crop=entropy&cs=srgb&fm=jpg&q=85',
  dia4: 'https://images.unsplash.com/photo-1589128777073-263566ae5e4d?crop=entropy&cs=srgb&fm=jpg&q=85',
  bride1: 'https://images.unsplash.com/photo-1610173827043-9db50e0d8ef9?crop=entropy&cs=srgb&fm=jpg&q=85',
  bride2: 'https://images.unsplash.com/photo-1600685890506-593fdf55949b?crop=entropy&cs=srgb&fm=jpg&q=85',
  bride3: 'https://images.unsplash.com/photo-1684868682581-4cac3af5b8d4?crop=entropy&cs=srgb&fm=jpg&q=85',
  ring1: 'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?crop=entropy&cs=srgb&fm=jpg&q=85',
  ring2: 'https://images.unsplash.com/photo-1629118639934-2b241503956c?crop=entropy&cs=srgb&fm=jpg&q=85',
  ring3: 'https://images.unsplash.com/photo-1631982690223-8aa4be0a2497?crop=entropy&cs=srgb&fm=jpg&q=85',
  ring4: 'https://images.unsplash.com/photo-1598560917807-1bae44bd2be8?crop=entropy&cs=srgb&fm=jpg&q=85',
  pex1: 'https://images.pexels.com/photos/37488824/pexels-photo-37488824.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  pex2: 'https://images.pexels.com/photos/30206324/pexels-photo-30206324.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
};

// Curated product catalog metadata for MikuMantra
// Notice: Authoritative product catalog is stored dynamically in MongoDB.
// Hardcoded product items have been completely removed to prevent stale/deleted products from flashing or rendering.
export const PRODUCTS = [];

export function getProduct(slug) { return null; }
export function getRelated(slug) { return []; }
export function filterProducts() { return []; }
export function formatINR(n){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);}

export function formatRating(val) {
  const num = Number(val);
  if (isNaN(num) || num <= 0) return '0.0';
  return num.toFixed(1);
}

export function getNormalizedSpecs(p) {
  if (!p) return [];
  if (p.specifications !== undefined && p.specifications !== null && Array.isArray(p.specifications) && p.specifications.length > 0) {
    return [...p.specifications].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  // Support specs object (e.g. from .js product file)
  if (p.specs && typeof p.specs === 'object' && !Array.isArray(p.specs)) {
    return Object.entries(p.specs).map(([label, value], idx) => ({
      id: `spec-${idx}`,
      label: String(label).trim(),
      value: typeof value === 'object' ? JSON.stringify(value) : String(value).trim(),
      enabled: true,
      order: idx
    }));
  }

  // Create dynamic specifications array from legacy fields
  const specs = [];
  let order = 0;

  // Metal
  const metalVal = p.metal || p.metalComposition;
  if (metalVal) {
    specs.push({ id: 'legacy-metal', label: 'Metal', value: metalVal, enabled: true, order: order++ });
  }

  // Purity
  const purityVal = p.purity || p.goldPurity;
  if (purityVal) {
    specs.push({ id: 'legacy-purity', label: 'Purity', value: purityVal, enabled: true, order: order++ });
  }

  // Stone
  const stoneVal = p.stone || p.stoneDetails;
  if (stoneVal) {
    specs.push({ id: 'legacy-stone', label: 'Stone', value: stoneVal, enabled: true, order: order++ });
  }

  // Weight
  const weightVal = p.weight;
  if (weightVal) {
    specs.push({ id: 'legacy-weight', label: 'Weight', value: weightVal, enabled: true, order: order++ });
  }

  // Size
  const sizeVal = p.size || p.productSize;
  if (sizeVal) {
    specs.push({ id: 'legacy-size', label: 'Size', value: sizeVal, enabled: true, order: order++ });
  }

  return specs;
}

export const DEFAULT_PRODUCT_BENEFITS = [
  { id: 'benefit-bis', title: 'BIS Hallmarked', icon: 'ShieldCheck', description: 'Certified purity by BIS', enabled: true, order: 0 },
  { id: 'benefit-sgl', title: 'SGL Certified', icon: 'Award', description: 'Independently graded diamonds', enabled: true, order: 1 },
  { id: 'benefit-shipping', title: 'Free Shipping', icon: 'Truck', description: 'Insured, tracked, delivered', enabled: true, order: 2 },
  { id: 'benefit-returns', title: '15-Day Return', icon: 'RefreshCw', description: 'Full refund, no questions', enabled: true, order: 3 },
];

export function getNormalizedBenefits(p) {
  if (!p) return [];
  if (p.productBenefits !== undefined && p.productBenefits !== null && Array.isArray(p.productBenefits)) {
    return [...p.productBenefits].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  return [];
}

export const DEFAULT_PRODUCT_FILTERS = [
  {
    id: 'filter-category',
    name: 'Category',
    key: 'category',
    type: 'options',
    enabled: true,
    order: 0,
    options: [
      { id: 'opt-cat-gold', name: 'Gold', value: 'gold', enabled: true, order: 0 },
      { id: 'opt-cat-diamond', name: 'Diamond', value: 'diamond', enabled: true, order: 1 },
      { id: 'opt-cat-wedding', name: 'Wedding', value: 'wedding', enabled: true, order: 2 },
      { id: 'opt-cat-daily-wear', name: 'Daily Wear', value: 'daily-wear', enabled: true, order: 3 },
      { id: 'opt-cat-men', name: 'Men', value: 'men', enabled: true, order: 4 },
      { id: 'opt-cat-women', name: 'Women', value: 'women', enabled: true, order: 5 }
    ]
  },
  {
    id: 'filter-gender',
    name: 'Gender',
    key: 'gender',
    type: 'options',
    enabled: true,
    order: 1,
    options: [
      { id: 'opt-gen-women', name: 'Women', value: 'women', enabled: true, order: 0 },
      { id: 'opt-gen-men', name: 'Men', value: 'men', enabled: true, order: 1 }
    ]
  },
  {
    id: 'filter-collection',
    name: 'Collection',
    key: 'collection',
    type: 'options',
    enabled: true,
    order: 2,
    options: [
      { id: 'opt-col-trending', name: 'Trending', value: 'trending', enabled: true, order: 0 },
      { id: 'opt-col-bestsellers', name: 'Best Sellers', value: 'best-sellers', enabled: true, order: 1 },
      { id: 'opt-col-newarrival', name: 'New Arrival', value: 'new-arrival', enabled: true, order: 2 },
      { id: 'opt-col-editorschoice', name: "Editors Choice", value: 'editors-choice', enabled: true, order: 3 }
    ]
  },
  {
    id: 'filter-metal',
    name: 'Metal',
    key: 'metal',
    type: 'options',
    enabled: true,
    order: 3,
    options: [
      { id: 'opt-met-yg', name: 'Yellow Gold', value: 'Yellow Gold', enabled: true, order: 0 },
      { id: 'opt-met-rg', name: 'Rose Gold', value: 'Rose Gold', enabled: true, order: 1 },
      { id: 'opt-met-wg', name: 'White Gold', value: 'White Gold', enabled: true, order: 2 },
      { id: 'opt-met-pt', name: 'Platinum', value: 'Platinum', enabled: true, order: 3 }
    ]
  },
  {
    id: 'filter-stone',
    name: 'Stone',
    key: 'stone',
    type: 'options',
    enabled: true,
    order: 4,
    options: [
      { id: 'opt-stn-dia', name: 'Diamond', value: 'Diamond', enabled: true, order: 0 },
      { id: 'opt-stn-polki', name: 'Polki', value: 'Uncut Polki', enabled: true, order: 1 },
      { id: 'opt-stn-emr', name: 'Emerald', value: 'Emerald', enabled: true, order: 2 },
      { id: 'opt-stn-onyx', name: 'Onyx', value: 'Onyx', enabled: true, order: 3 },
      { id: 'opt-stn-none', name: 'None', value: 'None', enabled: true, order: 4 }
    ]
  },
  {
    id: 'filter-price',
    name: 'Price',
    key: 'price',
    type: 'price',
    enabled: true,
    order: 5,
    priceConfig: { min: 0, max: 1000000, step: 5000 },
    options: []
  }
];

export function slugify(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}



