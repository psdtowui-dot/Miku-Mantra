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
  { id:'p01', slug:'celestine-diamond-pendant', name:'Celestine Diamond Pendant', category:'diamond', gender:'women', collection:'trending', metal:'18K Rose Gold', stone:'Diamond', purity:'18K', weight:'4.20 g', size:'—', sku:'AUR-CDP-001', price:78500, mrp:92000, rating:0, reviews:0, images:[IMG.dia1, IMG.dia2, IMG.dia3], badge:'Bestseller', description:'A radiant teardrop silhouette set with 32 brilliant-cut diamonds, hand-finished in 18K rose gold. A timeless heirloom for the modern muse.' },
  { id:'p02', slug:'meher-22k-choker', name:'Meher 22K Bridal Choker', category:'wedding', gender:'women', collection:'editors-choice', metal:'22K Yellow Gold', stone:'Uncut Polki', purity:'22K', weight:'42.80 g', size:'Adjustable', sku:'AUR-MBC-002', price:485000, mrp:520000, rating:0, reviews:0, images:[IMG.bride1, IMG.bride2, IMG.bride3], badge:'Bridal', description:'An heirloom bridal choker in 22K gold, adorned with uncut polki and freshwater pearls — meticulously handcrafted over 120 hours.' },
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
  if(category)list=list.filter(p=>p.category===category);
  if(collection)list=list.filter(p=>p.collection===collection);
  if(gender)list=list.filter(p=>p.gender===gender);
  if(metal)list=list.filter(p=>p.metal.toLowerCase().includes(metal.toLowerCase()));
  if(stone)list=list.filter(p=>p.stone.toLowerCase().includes(stone.toLowerCase()));
  if(min!=null)list=list.filter(p=>p.price>=min);
  if(max!=null)list=list.filter(p=>p.price<=max);
  if(sort==='price-asc')list.sort((a,b)=>a.price-b.price);
  else if(sort==='price-desc')list.sort((a,b)=>b.price-a.price);
  else if(sort==='rating')list.sort((a,b)=>b.rating-a.rating);
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

export function formatRating(rating) {
  const r = Number(rating) || 0;
  return Number.isInteger(r) ? `${r}.0` : r.toFixed(1);
}

export function getNormalizedSpecs(p) {
  if (!p) return [];
  if (p.specifications !== undefined && p.specifications !== null) {
    return Array.isArray(p.specifications)
      ? [...p.specifications].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : [];
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

