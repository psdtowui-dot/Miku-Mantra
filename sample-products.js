/**
 * MikuMantra Fine Jewellery - Sample Product Catalog (.js)
 * Supports ES Modules (export const products = [...]) and CommonJS (module.exports = [...]).
 * Images are automatically matched with local assets in public/images/ and images/.
 */

export const products = [
  {
    id: "MM-1001",
    name: "Mayur Veda Chandbali Earrings",
    slug: "mayur-veda-chandbali-earrings",
    sku: "MM-CHAND-001",
    price: 1299,
    mrp: 1799,
    category: "wedding",
    gender: "women",
    collection: "trending",
    metal: "22K Yellow Gold",
    purity: "22K",
    stone: "Kundan & Pearls",
    weight: "18.50 g",
    size: "Standard",
    stock: 25,
    isBestseller: true,
    badge: "Trending",
    description: "Exquisite traditional chandbali earrings handcrafted with majestic peacock jaali work and freshwater pearl clusters.",
    images: [], // Automatically matches with /images/mayurvedachandbaliearrings-1.jpg, -2.jpg, -3.jpg, -4.jpg!
    specifications: [
      { id: "spec-metal", label: "Metal", value: "22K Yellow Gold", enabled: true, order: 0 },
      { id: "spec-purity", label: "Purity", value: "916 Hallmarked", enabled: true, order: 1 },
      { id: "spec-weight", label: "Weight", value: "18.50 g", enabled: true, order: 2 }
    ]
  },
  {
    id: "MM-1002",
    name: "Pearl Fiesta Earrings",
    slug: "pearl-fiesta-earrings",
    sku: "MM-PEARL-002",
    price: 1599,
    mrp: 2199,
    category: "daily-wear",
    gender: "women",
    collection: "best-sellers",
    metal: "18K Gold Polish",
    purity: "18K",
    stone: "Natural Freshwater Pearl",
    weight: "12.20 g",
    size: "Medium",
    stock: 20,
    isBestseller: true,
    badge: "Bestseller",
    description: "Graceful chandelier earrings cascading with luminous pearls for daytime elegance and festive celebrations.",
    images: [] // Automatically matches with /images/pearlfiestaearrings-1.jpg, -2.jpg, etc.!
  },
  {
    id: "MM-1003",
    name: "Ocean Charm Necklace",
    slug: "ocean-charm-necklace",
    sku: "MM-OCEAN-003",
    price: 2499,
    mrp: 3299,
    category: "daily-wear",
    gender: "women",
    collection: "new-arrival",
    metal: "18K Yellow Gold",
    purity: "18K",
    stone: "Mother of Pearl",
    weight: "14.80 g",
    size: "16-18 inches adjustable",
    stock: 15,
    isBestseller: false,
    badge: "New",
    description: "A contemporary layered necklace capturing ocean tides with iridescent mother-of-pearl charms.",
    images: [] // Automatically matches with /images/oceancharmnecklace-1.jpg, -2.jpg, etc.!
  },
  {
    id: "MM-1004",
    name: "Amora Pendant Set",
    slug: "amora-pendant-set",
    sku: "MM-AMORA-004",
    price: 3499,
    mrp: 4499,
    category: "gold",
    gender: "women",
    collection: "editors-choice",
    metal: "22K Yellow Gold",
    purity: "22K",
    stone: "Zirconia & Ruby",
    weight: "22.40 g",
    size: "Standard Set",
    stock: 10,
    isBestseller: false,
    badge: "Editor's Pick",
    description: "Regal floral pendant featuring romantic open-cut petal motifs with matching stud earrings.",
    images: [] // Automatically matches with /images/amorapendantset-1.jpg, -2.jpg, etc.!
  }
];
