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

export const PRODUCTS = [
  { id:'p01', slug:'celestine-diamond-pendant', name:'Celestine Diamond Pendant', category:'diamond', gender:'women', collection:'trending', metal:'18K Rose Gold', stone:'Diamond', purity:'18K', weight:'4.20 g', size:'—', sku:'AUR-CDP-001', price:78500, mrp:92000, rating:0, reviews:0, images:[IMG.dia1, IMG.dia2, IMG.dia3], badge:'Trending', description:'A radiant teardrop silhouette set with 32 brilliant-cut diamonds, hand-finished in 18K rose gold. A timeless heirloom for the modern muse.' },
  { id:'p02', slug:'meher-22k-choker', name:'Meher 22K Bridal Choker', category:'wedding', gender:'women', collection:'editors-choice', metal:'22K Yellow Gold', stone:'Uncut Polki', purity:'22K', weight:'42.80 g', size:'Adjustable', sku:'AUR-MBC-002', price:485000, mrp:520000, rating:0, reviews:0, images:[IMG.bride1, IMG.bride2, IMG.bride3], badge:'Editor\u2019s Pick', description:'An heirloom bridal choker in 22K gold, adorned with uncut polki and freshwater pearls — meticulously handcrafted over 120 hours.' },
  { id:'p03', slug:'aureus-solitaire-ring', name:'Aureus Solitaire Ring', category:'diamond', gender:'women', collection:'new-arrival', metal:'Platinum', stone:'Solitaire Diamond (0.50 ct)', purity:'PT950', weight:'3.10 g', size:'12', sku:'AUR-ASR-003', price:135000, mrp:150000, rating:0, reviews:0, images:[IMG.ring1, IMG.ring2, IMG.ring4], badge:'New', description:'A cathedral-set 0.50 ct brilliant round solitaire on a hand-polished platinum band. GIA certified. Made to promise forever.' },
  { id:'p04', slug:'ilara-gold-earrings', name:'Ilara Gold Danglers', category:'gold', gender:'women', collection:'best-sellers', metal:'22K Yellow Gold', stone:'—', purity:'22K', weight:'6.50 g', size:'—', sku:'AUR-IGD-004', price:64500, mrp:72000, rating:0, reviews:0, images:[IMG.gold1, IMG.gold2, IMG.gold3], badge:'Bestseller', description:'Feather-light 22K gold danglers with a hand-etched jaali motif. Effortless from desk to dinner.' },
  { id:'p05', slug:'noor-diamond-tennis', name:'Noor Diamond Tennis Bracelet', category:'diamond', gender:'women', collection:'trending', metal:'18K White Gold', stone:'Diamond (2.10 ct)', purity:'18K', weight:'12.40 g', size:'6.5 in', sku:'AUR-NDT-005', price:298000, mrp:335000, rating:0, reviews:0, images:[IMG.dia3, IMG.dia4, IMG.dia1], badge:'Trending', description:'A luminous river of 48 F-VS diamonds set in 18K white gold. The bracelet that never leaves your wrist.' },
  { id:'p06', slug:'raja-mens-signet', name:"Raja Men's Signet Ring", category:'men', gender:'men', collection:'new-arrival', metal:'18K Yellow Gold', stone:'Onyx', purity:'18K', weight:'9.80 g', size:'20', sku:'AUR-RMS-006', price:89500, mrp:99500, rating:0, reviews:0, images:[IMG.ring3, IMG.ring2, IMG.ring1], badge:'New', description:'A bold onyx signet on a substantial 18K band — quiet power, worn on the hand.' },
  { id:'p07', slug:'saanvi-daily-chain', name:'Saanvi Daily Gold Chain', category:'daily-wear', gender:'women', collection:'best-sellers', metal:'22K Yellow Gold', stone:'—', purity:'22K', weight:'8.20 g', size:'18 in', sku:'AUR-SDC-007', price:72000, mrp:78500, rating:0, reviews:0, images:[IMG.gold4, IMG.gold1, IMG.gold3], badge:'Bestseller', description:'The everyday chain, reimagined. A silken 22K rope that layers with anything.' },
  { id:'p08', slug:'zara-emerald-set', name:'Zara Emerald Statement Set', category:'wedding', gender:'women', collection:'editors-choice', metal:'22K Yellow Gold', stone:'Emerald & Diamond', purity:'22K', weight:'56.30 g', size:'Set', sku:'AUR-ZES-008', price:685000, mrp:740000, rating:0, reviews:0, images:[IMG.bride2, IMG.bride3, IMG.bride1], badge:'Editor\u2019s Pick', description:'Necklace, earrings and maang tikka in Zambian emeralds and uncut diamonds. A regal ensemble.' },
  { id:'p09', slug:'aria-rose-gold-bangle', name:'Aria Rose Gold Bangle', category:'gold', gender:'women', collection:'trending', metal:'18K Rose Gold', stone:'—', purity:'18K', weight:'11.50 g', size:'2.4', sku:'AUR-ARB-009', price:112000, mrp:125000, rating:0, reviews:0, images:[IMG.pex1, IMG.gold2, IMG.ring1], badge:'Trending', description:'A soft, sculptural bangle in blush rose gold — the accent of an unforgettable evening.' },
  { id:'p10', slug:'elio-huggie-earrings', name:'Elio Diamond Huggie Earrings', category:'daily-wear', gender:'women', collection:'new-arrival', metal:'18K White Gold', stone:'Diamond (0.20 ct)', purity:'18K', weight:'2.10 g', size:'—', sku:'AUR-EHE-010', price:42500, mrp:48000, rating:0, reviews:0, images:[IMG.dia2, IMG.dia4, IMG.dia1], badge:'New', description:'Barely-there huggies with a whisper of diamonds — for every day, every ear.' },
  { id:'p11', slug:'anaya-mangalsutra', name:'Anaya Modern Mangalsutra', category:'wedding', gender:'women', collection:'best-sellers', metal:'22K Yellow Gold', stone:'Diamond', purity:'22K', weight:'10.90 g', size:'20 in', sku:'AUR-AMM-011', price:98500, mrp:110000, rating:0, reviews:0, images:[IMG.gold3, IMG.dia1, IMG.gold1], badge:'Bestseller', description:'A contemporary mangalsutra in 22K gold with black beads and a diamond pendant — tradition, refreshed.' },
  { id:'p12', slug:'kavi-mens-bracelet', name:"Kavi Men's Kada Bracelet", category:'men', gender:'men', collection:'editors-choice', metal:'22K Yellow Gold', stone:'—', purity:'22K', weight:'22.10 g', size:'2.6', sku:'AUR-KMK-012', price:198000, mrp:215000, rating:0, reviews:0, images:[IMG.pex2, IMG.ring3, IMG.gold4], badge:'Editor\u2019s Pick', description:'A substantial hand-carved kada with a satin finish. Weighty presence, quiet luxury.' },
];

export function getProduct(slug){return PRODUCTS.find(p=>p.slug===slug);}
export function getRelated(slug){const p=getProduct(slug);if(!p)return[];return PRODUCTS.filter(x=>x.id!==p.id && x.category===p.category).slice(0,4);}
export function filterProducts({category,collection,gender,metal,stone,min,max,sort}={}){
  let list=[...PRODUCTS];
  const norm = str => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if(category) {
    const cNorm = norm(category);
    list=list.filter(p=>norm(p.category)===cNorm || (cNorm==='men' && norm(p.gender)==='men') || (cNorm==='women' && norm(p.gender)==='women'));
  }
  if(collection) {
    const colNorm = norm(collection);
    list=list.filter(p=>{
      const pColNorm = norm(p.collection);
      const pBadgeNorm = norm(p.badge);
      if (pColNorm === colNorm) return true;
      if (colNorm === 'trending') return pColNorm === 'trending' || pBadgeNorm === 'trending';
      if (colNorm === 'bestseller' || colNorm === 'bestsellers') return pColNorm === 'bestseller' || pColNorm === 'bestsellers' || pBadgeNorm === 'bestseller' || pBadgeNorm === 'bestsellers';
      if (colNorm === 'newarrival' || colNorm === 'newarrivals' || colNorm === 'new') return pColNorm === 'newarrival' || pColNorm === 'newarrivals' || pColNorm === 'new' || pBadgeNorm === 'new' || pBadgeNorm === 'newarrival' || pBadgeNorm === 'newarrivals';
      if (colNorm === 'editorschoice' || colNorm === 'editorspick' || colNorm === 'editor') return pColNorm === 'editorschoice' || pColNorm === 'editorspick' || pBadgeNorm === 'editorschoice' || pBadgeNorm === 'editorspick';
      return pColNorm === colNorm || pBadgeNorm === colNorm;
    });
  }
  if(gender) {
    const gNorm = norm(gender);
    list=list.filter(p=>norm(p.gender)===gNorm || norm(p.gender)==='unisex');
  }
  if(metal) {
    const mNorm = norm(metal);
    list=list.filter(p=>norm(p.metal).includes(mNorm));
  }
  if(stone) {
    const sNorm = norm(stone);
    list=list.filter(p=>norm(p.stone).includes(sNorm));
  }
  if(min!=null)list=list.filter(p=>p.price>=min);
  if(max!=null)list=list.filter(p=>p.price<=max);
  if(sort==='price-asc')list.sort((a,b)=>a.price-b.price);
  else if(sort==='price-desc')list.sort((a,b)=>b.price-a.price);
  else if(sort==='rating') {
    list.sort((a,b)=>{
      const rDiff = (b.rating || 0) - (a.rating || 0);
      if (rDiff !== 0) return rDiff;
      return (b.reviews || 0) - (a.reviews || 0);
    });
  }
  else if(sort==='newest')list.sort((a,b)=>a.collection==='new-arrival'?-1:1);
  else if(sort==='discount'){
    list.sort((a,b)=>{
      const discA = a.mrp > a.price && a.mrp > 0 ? ((a.mrp - a.price) / a.mrp) * 100 : 0;
      const discB = b.mrp > b.price && b.mrp > 0 ? ((b.mrp - b.price) / b.mrp) * 100 : 0;
      if (discB !== discA) return discB - discA;
      return (b.mrp - b.price) - (a.mrp - a.price);
    });
  }
  return list;
}
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

/**
 * Convert string to a URL-safe, clean slug:
 * - Lowercase
 * - Convert spaces & underscores to hyphens
 * - Strip invalid characters
 * - Collapse consecutive hyphens
 * - Trim leading & trailing hyphens
 */
export function slugify(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}



