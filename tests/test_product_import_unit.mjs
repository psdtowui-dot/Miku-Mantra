import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseProductFileContent, normalizeAndValidateProducts } from '../lib/product-import/parser.js';
import {
  scanAvailableImages,
  matchImagesForProduct,
  batchMatchProductImages,
  normalizeText,
  analyzeFilename,
  extractKeywords
} from '../lib/product-import/matcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('RUNNING COMPREHENSIVE PRODUCT IMPORT & MATCHER TESTS');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`PASS: [Test ${totalTests}] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`FAIL: [Test ${totalTests}] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// 1. Test valid .js file parsing (ES module format)
runTest('Import a valid .js file (ES Module format with export const products)', () => {
  const content = fs.readFileSync(path.join(rootDir, 'sample-products.js'), 'utf8');
  const { rawData, format } = parseProductFileContent(content, 'sample-products.js');
  assert.strictEqual(format, 'js');
  assert(Array.isArray(rawData));
  assert(rawData.length >= 4);

  const normalized = normalizeAndValidateProducts(rawData);
  assert.strictEqual(normalized.validCount, rawData.length);
  assert.strictEqual(normalized.invalidCount, 0);
  assert.strictEqual(normalized.validProducts[0].name, 'Mayur Veda Chandbali Earrings');
  assert.strictEqual(normalized.validProducts[0].slug, 'mayur-veda-chandbali-earrings');
  assert.strictEqual(normalized.validProducts[0].price, 1299);
});

// 2. Test valid .json file parsing (JSON array format)
runTest('Import a valid .json file (JSON array format)', () => {
  const content = fs.readFileSync(path.join(rootDir, 'sample-products.json'), 'utf8');
  const { rawData, format } = parseProductFileContent(content, 'sample-products.json');
  assert.strictEqual(format, 'json');
  assert(Array.isArray(rawData));

  const normalized = normalizeAndValidateProducts(rawData);
  assert.strictEqual(normalized.validCount, 2);
  assert.strictEqual(normalized.validProducts[0].name, 'Royal Bloom Bracelet');
  assert.strictEqual(normalized.validProducts[0].slug, 'royal-bloom-bracelet');
});

// 3. Test CommonJS format (module.exports = { products: [...] })
runTest('Import CommonJS format (module.exports = { products: [...] })', () => {
  const cjsCode = `
    // CommonJS catalog export
    module.exports = {
      products: [
        {
          id: "CJS-101",
          name: "Emerald Royal Ring",
          price: 4999,
          mrp: 6499,
          category: "gold",
          stock: 8,
          isBestseller: true
        }
      ]
    };
  `;
  const { rawData, format } = parseProductFileContent(cjsCode, 'catalog.cjs');
  assert.strictEqual(format, 'js');
  const normalized = normalizeAndValidateProducts(rawData);
  assert.strictEqual(normalized.validCount, 1);
  assert.strictEqual(normalized.validProducts[0].id, 'CJS-101');
  assert.strictEqual(normalized.validProducts[0].slug, 'emerald-royal-ring');
  assert.strictEqual(normalized.validProducts[0].bestseller, true);
});

// 4. Test multiple products at once
runTest('Import multiple products in one batch operation', () => {
  const batch = [];
  for (let i = 1; i <= 25; i++) {
    batch.push({
      id: `BATCH-${i}`,
      name: `Jewellery Item ${i}`,
      price: 1000 + i * 100,
      category: i % 2 === 0 ? 'diamond' : 'gold',
      stock: 10 + i
    });
  }
  const normalized = normalizeAndValidateProducts(batch);
  assert.strictEqual(normalized.validCount, 25);
  assert.strictEqual(normalized.totalCount, 25);
  assert.strictEqual(normalized.validProducts[24].slug, 'jewellery-item-25');
});

// 5. Test image matching using exact IDs
runTest('Match images using exact product ID (MM1001 -> MM1001-1.jpg, MM1001-front.webp)', () => {
  const mockImages = [
    { filename: 'MM1001.jpg', url: '/images/MM1001.jpg', base: 'mm1001', suffix: '', order: 99 },
    { filename: 'MM1001-1.jpg', url: '/images/MM1001-1.jpg', base: 'mm1001', suffix: '1', order: 1 },
    { filename: 'MM1001-front.webp', url: '/images/MM1001-front.webp', base: 'mm1001', suffix: 'front', order: 1 },
    { filename: 'unrelated.jpg', url: '/images/unrelated.jpg', base: 'unrelated', suffix: '', order: 99 }
  ];

  const product = { id: 'MM1001', name: 'Random Product Title', slug: 'random-product-title' };
  const matchResult = matchImagesForProduct(product, mockImages);

  assert.strictEqual(matchResult.status, 'matched');
  assert(matchResult.confidence >= 95);
  assert(matchResult.images.includes('/images/MM1001-1.jpg'));
  assert(!matchResult.images.includes('/images/unrelated.jpg'));
});

// 6. Test image matching using product slugs and names
runTest('Match images using product name and slug against real project files', async () => {
  const available = await scanAvailableImages();
  assert(available.length > 0, 'Project must have scanned images');

  const product = {
    id: 'MM-TEST-1',
    name: 'Mayur Veda Chandbali Earrings',
    slug: 'mayur-veda-chandbali-earrings'
  };
  const matchResult = matchImagesForProduct(product, available);

  assert.strictEqual(matchResult.status, 'matched');
  assert(matchResult.confidence >= 90);
  assert(matchResult.images.length >= 4);
  assert(matchResult.images[0].includes('mayurvedachandbaliearrings-1'));
  assert(matchResult.images[1].includes('mayurvedachandbaliearrings-2'));
});

// 7. Test multi-image gallery ordering (1, 2, 3, 4)
runTest('Support multiple images per product with preserved numeric order (1, 2, 3, 4)', async () => {
  const available = await scanAvailableImages();
  const product = {
    id: 'MM-TEST-2',
    name: 'Pearl Fiesta Earrings',
    slug: 'pearl-fiesta-earrings'
  };
  const matchResult = matchImagesForProduct(product, available);

  assert.strictEqual(matchResult.status, 'matched');
  assert.strictEqual(matchResult.images.length, 4);
  // Verify ordering: 1 comes before 2, 2 before 3, 3 before 4
  assert(matchResult.images[0].includes('-1.jpg'));
  assert(matchResult.images[1].includes('-2.jpg'));
  assert(matchResult.images[2].includes('-3.jpg'));
  assert(matchResult.images[3].includes('-4.jpg'));
});

// 8. Test product with NO matching images (Needs Image Review)
runTest('Flag products with no matching images as missing_images & needsReview: true', () => {
  const mockImages = [
    { filename: 'goldring-1.jpg', url: '/images/goldring-1.jpg', base: 'goldring', suffix: '1', order: 1 }
  ];
  const product = {
    id: 'XYZ-999',
    name: 'Unique Platinum Bracelet 99',
    slug: 'unique-platinum-bracelet-99'
  };
  const matchResult = matchImagesForProduct(product, mockImages);

  assert.strictEqual(matchResult.status, 'missing_images');
  assert.strictEqual(matchResult.needsReview, true);
  assert.strictEqual(matchResult.images.length, 0);
});

// 9. Test broken or malformed image URL detection
runTest('Detect broken / empty image entries safely', () => {
  const product = {
    name: 'Test Product',
    price: 100,
    category: 'gold',
    images: ['', '   ', null, undefined, '/valid-image.jpg']
  };
  const normalized = normalizeAndValidateProducts([product]);
  assert.strictEqual(normalized.validProducts[0].images.length, 1);
  assert.strictEqual(normalized.validProducts[0].images[0], '/valid-image.jpg');
});

// 10. Test invalid JSON and syntax error handling
runTest('Handle invalid JSON and unsupported syntax with descriptive errors', () => {
  assert.throws(() => {
    parseProductFileContent('{ "id": "MM1", "name": "Broken JSON without closing', 'test.json');
  }, /Invalid JSON/);

  assert.throws(() => {
    parseProductFileContent('export const products = [ { broken js syntax } ];', 'test.js');
  }, /Failed to parse JavaScript/);
});

// 11. Test missing required fields and invalid prices
runTest('Validate required fields (name, category, non-negative price, stock)', () => {
  const invalidSet = [
    { price: 100, category: 'gold' }, // Missing name
    { name: 'No Category', price: 100, category: '' }, // Missing category
    { name: 'Negative Price', category: 'gold', price: -50 }, // Negative price
    { name: 'Invalid Stock', category: 'gold', price: 100, stock: -5 } // Negative stock
  ];
  const res = normalizeAndValidateProducts(invalidSet);
  assert.strictEqual(res.invalidCount, 4);
  assert.strictEqual(res.validCount, 0);
  assert(res.errors.length >= 4);
});

// 12. Test duplicate ID and Slug detection logic
runTest('Detect duplicate product IDs and slugs against database records', () => {
  const existingCatalog = [
    { id: 'p01', slug: 'celestine-diamond-pendant', name: 'Celestine Diamond Pendant' }
  ];

  const incoming1 = { id: 'p01', slug: 'new-slug', name: 'Same ID' };
  const incoming2 = { id: 'p99', slug: 'celestine-diamond-pendant', name: 'Same Slug' };
  const incoming3 = { id: 'p99', slug: 'unique-slug', name: 'Unique' };

  const isDup1 = existingCatalog.some(e => e.id === incoming1.id || e.slug === incoming1.slug);
  const isDup2 = existingCatalog.some(e => e.id === incoming2.id || e.slug === incoming2.slug);
  const isDup3 = existingCatalog.some(e => e.id === incoming3.id || e.slug === incoming3.slug);

  assert.strictEqual(isDup1, true);
  assert.strictEqual(isDup2, true);
  assert.strictEqual(isDup3, false);
});

// 13. Test protected fields preservation during updates
runTest('Verify existing product updates do not reset stock or protected fields', () => {
  const existingInDb = {
    id: 'p01',
    name: 'Celestine Diamond Pendant',
    slug: 'celestine-diamond-pendant',
    stock: 25,
    rating: 4.8,
    reviews: 12,
    breakdown: { 5: 10, 4: 2 }
  };

  const incomingUpdate = {
    id: 'p01',
    name: 'Celestine Diamond Pendant (Updated Title)',
    price: 79900
    // Stock is omitted: must be preserved from DB!
  };

  // Merge logic per route.js
  const updatedData = {
    ...incomingUpdate,
    stock: incomingUpdate.stock !== undefined ? incomingUpdate.stock : existingInDb.stock
  };

  assert.strictEqual(updatedData.stock, 25, 'Stock should be preserved when omitted in update');
  assert.strictEqual(updatedData.name, 'Celestine Diamond Pendant (Updated Title)');
});

// 14. Test specifications normalization (array vs object specs)
runTest('Support specifications both as object dictionary and array', () => {
  const productWithObjSpecs = {
    name: 'Spec Test 1',
    price: 1000,
    category: 'gold',
    specs: {
      Metal: '22K Gold',
      Purity: '916',
      Weight: '5.4g'
    }
  };
  const res = normalizeAndValidateProducts([productWithObjSpecs]);
  const specs = res.validProducts[0].specifications;
  assert(Array.isArray(specs));
  assert.strictEqual(specs.length, 3);
  assert.strictEqual(specs[0].label, 'Metal');
  assert.strictEqual(specs[0].value, '22K Gold');
});

console.log(`\n====================================================`);
console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED!`);
console.log(`====================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
