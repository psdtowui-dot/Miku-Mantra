import { slugify } from '../products.js';
import vm from 'node:vm';

/**
 * Safe JavaScript & JSON Product Data Parser
 * Parses .json and .js data files without executing arbitrary code on the server.
 */

// Strip single-line (//) and multi-line (/* ... */) comments from JS string
export function stripComments(code) {
  if (!code) return '';
  let result = '';
  let inString = false;
  let stringChar = '';
  let i = 0;
  const len = code.length;

  while (i < len) {
    const ch = code[i];
    const next = code[i + 1];

    if (inString) {
      result += ch;
      if (ch === '\\' && i + 1 < len) {
        result += code[i + 1];
        i += 2;
        continue;
      }
      if (ch === stringChar) {
        inString = false;
      }
      i++;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') {
        inString = true;
        stringChar = ch;
        result += ch;
        i++;
      } else if (ch === '/' && next === '/') {
        // Skip till newline
        i += 2;
        while (i < len && code[i] !== '\n' && code[i] !== '\r') {
          i++;
        }
      } else if (ch === '/' && next === '*') {
        // Skip till */
        i += 2;
        while (i < len && !(code[i] === '*' && code[i + 1] === '/')) {
          i++;
        }
        i += 2; // skip */
      } else {
        result += ch;
        i++;
      }
    }
  }
  return result;
}

/**
 * Extract JavaScript data expression from module export syntax.
 * Supports:
 * - export const products = [ ... ]
 * - export default [ ... ]
 * - module.exports = [ ... ]
 * - module.exports = { products: [ ... ] }
 * - const products = [ ... ]; export default products;
 */
export function extractDataExpression(code) {
  let cleaned = stripComments(code).trim();

  // Remove leading 'use strict'; or similar directives
  cleaned = cleaned.replace(/^\s*(?:'use strict'|"use strict");?\s*/i, '');

  // Look for assignment patterns:
  // 1. export const/let/var <identifier> = <expr>
  // 2. export default <expr>
  // 3. module.exports = <expr>
  // 4. exports.<identifier> = <expr>
  // 5. const/let/var <identifier> = <expr>
  const exportMatch = cleaned.match(/(?:export\s+default|export\s+(?:const|let|var)\s+[a-zA-Z0-9_$]+\s*=|module\.exports\s*=|exports(?:\.[a-zA-Z0-9_$]+|\[['"][a-zA-Z0-9_$]+['"]\])?\s*=|(?:const|let|var)\s+[a-zA-Z0-9_$]+\s*=)\s*([\s\S]+)/);

  let candidate = exportMatch ? exportMatch[1].trim() : cleaned;

  // Trim trailing semicolons or subsequent export statements (e.g. export default products;)
  candidate = candidate.replace(/;?\s*(?:export\s+default\s+[a-zA-Z0-9_$]+;?|export\s*\{[^}]*\};?)*\s*$/, '').trim();

  // Find where the top-level array `[` or object `{` starts
  const firstBracket = candidate.indexOf('[');
  const firstBrace = candidate.indexOf('{');

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const lastBracket = candidate.lastIndexOf(']');
    if (lastBracket !== -1 && lastBracket > firstBracket) {
      return candidate.substring(firstBracket, lastBracket + 1);
    }
  } else if (firstBrace !== -1) {
    const lastBrace = candidate.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace > firstBrace) {
      return candidate.substring(firstBrace, lastBrace + 1);
    }
  }

  return candidate;
}

/**
 * Safe Recursive-Descent Parser for JS Data Literals
 * Supports objects, arrays, strings (single, double, template literals),
 * numbers, booleans, null, undefined, trailing commas, and unquoted keys.
 * Never executes code.
 */
class SafeDataParser {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.len = input.length;
  }

  skipWhitespace() {
    while (this.pos < this.len) {
      const c = this.input[this.pos];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        this.pos++;
      } else {
        break;
      }
    }
  }

  peek() {
    this.skipWhitespace();
    return this.pos < this.len ? this.input[this.pos] : null;
  }

  parseValue() {
    this.skipWhitespace();
    if (this.pos >= this.len) throw new Error('Unexpected end of input');

    const c = this.input[this.pos];

    if (c === '[') return this.parseArray();
    if (c === '{') return this.parseObject();
    if (c === '"' || c === "'" || c === '`') return this.parseString();
    if (c === '-' || c === '+' || (c >= '0' && c <= '9')) return this.parseNumber();

    // Identifiers: true, false, null, undefined
    const ident = this.parseIdentifier();
    if (ident === 'true') return true;
    if (ident === 'false') return false;
    if (ident === 'null') return null;
    if (ident === 'undefined') return undefined;

    throw new Error(`Unexpected token at position ${this.pos}: "${ident || c}"`);
  }

  parseArray() {
    this.pos++; // skip '['
    const arr = [];
    while (this.pos < this.len) {
      this.skipWhitespace();
      if (this.peek() === ']') {
        this.pos++;
        return arr;
      }

      const val = this.parseValue();
      arr.push(val);

      this.skipWhitespace();
      const next = this.peek();
      if (next === ',') {
        this.pos++;
        this.skipWhitespace();
        if (this.peek() === ']') {
          this.pos++;
          return arr; // trailing comma allowed
        }
      } else if (next === ']') {
        this.pos++;
        return arr;
      } else {
        throw new Error(`Expected ',' or ']' at position ${this.pos}, found '${next}'`);
      }
    }
    throw new Error('Unterminated array');
  }

  parseObject() {
    this.pos++; // skip '{'
    const obj = {};
    while (this.pos < this.len) {
      this.skipWhitespace();
      if (this.peek() === '}') {
        this.pos++;
        return obj;
      }

      let key = '';
      const c = this.peek();
      if (c === '"' || c === "'" || c === '`') {
        key = this.parseString();
      } else {
        key = this.parseIdentifier();
      }

      if (!key) {
        throw new Error(`Expected object key at position ${this.pos}`);
      }

      this.skipWhitespace();
      if (this.peek() !== ':') {
        throw new Error(`Expected ':' after key "${key}" at position ${this.pos}`);
      }
      this.pos++; // skip ':'

      const val = this.parseValue();
      obj[key] = val;

      this.skipWhitespace();
      const next = this.peek();
      if (next === ',') {
        this.pos++;
        this.skipWhitespace();
        if (this.peek() === '}') {
          this.pos++;
          return obj; // trailing comma allowed
        }
      } else if (next === '}') {
        this.pos++;
        return obj;
      } else {
        throw new Error(`Expected ',' or '}' at position ${this.pos}, found '${next}'`);
      }
    }
    throw new Error('Unterminated object');
  }

  parseString() {
    const quote = this.input[this.pos];
    this.pos++; // skip quote
    let str = '';
    while (this.pos < this.len) {
      const c = this.input[this.pos];
      if (c === '\\') {
        this.pos++;
        if (this.pos >= this.len) break;
        const esc = this.input[this.pos];
        if (esc === 'n') str += '\n';
        else if (esc === 'r') str += '\r';
        else if (esc === 't') str += '\t';
        else if (esc === 'b') str += '\b';
        else if (esc === 'f') str += '\f';
        else if (esc === 'u' && this.pos + 4 < this.len) {
          const hex = this.input.substring(this.pos + 1, this.pos + 5);
          str += String.fromCharCode(parseInt(hex, 16));
          this.pos += 4;
        } else {
          str += esc;
        }
        this.pos++;
      } else if (c === quote) {
        this.pos++; // skip closing quote
        return str;
      } else {
        str += c;
        this.pos++;
      }
    }
    throw new Error(`Unterminated string starting with ${quote}`);
  }

  parseNumber() {
    const start = this.pos;
    if (this.input[this.pos] === '-' || this.input[this.pos] === '+') {
      this.pos++;
    }
    while (this.pos < this.len) {
      const c = this.input[this.pos];
      if ((c >= '0' && c <= '9') || c === '.' || c === 'e' || c === 'E' || c === '+' || c === '-') {
        this.pos++;
      } else {
        break;
      }
    }
    const numStr = this.input.substring(start, this.pos);
    const num = Number(numStr);
    if (isNaN(num)) {
      throw new Error(`Invalid number: "${numStr}" at position ${start}`);
    }
    return num;
  }

  parseIdentifier() {
    this.skipWhitespace();
    const start = this.pos;
    while (this.pos < this.len) {
      const c = this.input[this.pos];
      if (/[a-zA-Z0-9_$-]/.test(c)) {
        this.pos++;
      } else {
        break;
      }
    }
    return this.input.substring(start, this.pos);
  }
}

/**
 * Sandboxed safe parser for complex JavaScript product catalog files.
 * Handles files with constant references (e.g. IMG.pic, IMG1),
 * multiple declarations, ES module syntax, and CommonJS exports.
 * Strictly runs in a isolated blank VM sandbox with no access to process,
 * require, fs, fetch, or system APIs, and has a 2000ms timeout.
 */
function safeVmParse(jsCode) {
  // Strip import statements which cannot run in standalone script
  let code = jsCode
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?/gm, '')
    .replace(/^import\s+['"][^'"]+['"];?/gm, '');

  // Transform export syntax to standard assignments
  code = code
    .replace(/export\s+default\s+/g, 'module.exports = ')
    .replace(/export\s+(const|let|var)\s+/g, 'var ')
    .replace(/export\s+/g, '');

  const sandbox = {
    module: { exports: null },
    exports: {}
  };

  // Run in completely blank sandbox
  const context = vm.createContext(sandbox);
  vm.runInContext(code, context, { timeout: 2000 });

  const exp = sandbox.module?.exports;

  const isProductLike = (v) => {
    return v && typeof v === 'object' && !Array.isArray(v) &&
      (v.name || v.title || v.id || v.sku || v.price !== undefined || v.description || v.shortDesc || v.longDesc);
  };

  const isProductArray = (v) => {
    return Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' &&
      (v[0].name || v[0].title || v[0].id || v[0].sku || v[0].price !== undefined || v[0].description);
  };

  // 1. Direct array in module.exports
  if (Array.isArray(exp) && exp.length > 0) return exp;

  // 2. Object with products/items/data in module.exports
  if (exp && typeof exp === 'object') {
    if (Array.isArray(exp.products)) return exp.products;
    if (Array.isArray(exp.items)) return exp.items;
    if (Array.isArray(exp.data)) return exp.data;
    if (isProductLike(exp)) return [exp];
  }

  // 3. Check known catalog variable names in sandbox scope
  const catalogKeys = ['products', 'PRODUCTS', 'catalog', 'CATALOG', 'items', 'ITEMS', 'data', 'DATA', 'productList'];
  for (const k of catalogKeys) {
    const val = sandbox[k];
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') {
      if (Array.isArray(val.products)) return val.products;
      if (Array.isArray(val.items)) return val.items;
    }
  }

  // 4. Check sandbox.exports
  if (sandbox.exports && typeof sandbox.exports === 'object') {
    if (Array.isArray(sandbox.exports.products)) return sandbox.exports.products;
    if (Array.isArray(sandbox.exports.items)) return sandbox.exports.items;
    if (Array.isArray(sandbox.exports.data)) return sandbox.exports.data;
  }

  // 5. Scan all scope variables for an array of products
  for (const [k, v] of Object.entries(sandbox)) {
    if (k === 'module' || k === 'exports') continue;
    if (isProductArray(v)) {
      return v;
    }
  }

  // 6. Check single product object in scope
  for (const [k, v] of Object.entries(sandbox)) {
    if (k === 'module' || k === 'exports') continue;
    if (isProductLike(v)) {
      return [v];
    }
  }

  if (exp) return exp;
  return sandbox;
}

/**
 * Parse any raw text content from .json or .js file.
 * Returns { rawData, format: 'json' | 'js' }
 */
export function parseProductFileContent(content, filename = '') {
  if (!content || typeof content !== 'string') {
    throw new Error('File content is empty or invalid.');
  }

  const trimmed = content.trim();
  const lowerName = (filename || '').toLowerCase();
  const isExplicitJson = lowerName.endsWith('.json') || (trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'));

  // 1. Try parsing as standard JSON first if it looks like JSON
  if (isExplicitJson) {
    try {
      const parsed = JSON.parse(trimmed);
      return { rawData: parsed, format: 'json' };
    } catch (jsonErr) {
      if (lowerName.endsWith('.json')) {
        throw new Error(`Invalid JSON file: ${jsonErr.message}`);
      }
    }
  }

  // 2. Try parsing with SafeDataParser first for pure literal data
  try {
    const expr = extractDataExpression(trimmed);
    const parser = new SafeDataParser(expr);
    const parsed = parser.parseValue();
    if (parsed && (Array.isArray(parsed) || typeof parsed === 'object')) {
      return { rawData: parsed, format: 'js' };
    }
  } catch (_) {
    // If literal parser fails (e.g. variable references or complex syntax), proceed to safe VM sandbox
  }

  // 3. Parse with safe isolated VM sandbox (handles variable references, exports, template literals)
  try {
    const parsed = safeVmParse(trimmed);
    return { rawData: parsed, format: 'js' };
  } catch (vmErr) {
    throw new Error(`Failed to parse JavaScript product file safely: ${vmErr.message}`);
  }
}

/**
 * Extract description safely from multiple potential property names.
 */
function extractDescription(raw) {
  if (!raw) return '';
  const d = raw.description ?? raw.longDesc ?? raw.desc ?? raw.shortDesc ?? raw.caption ?? raw.details ?? raw.about ?? raw.productDescription ?? raw.info ?? raw.summary ?? raw.content;
  if (d === undefined || d === null) return '';
  if (typeof d === 'string') return d.trim();
  if (Array.isArray(d)) return d.map(item => typeof item === 'string' ? item : (item?.text || JSON.stringify(item))).join('\n\n').trim();
  if (typeof d === 'object') return (d.text || d.en || d.value || JSON.stringify(d)).trim();
  return String(d).trim();
}

/**
 * Normalizes input raw products (array or object with products/items/data) into
 * standard MikuMantra product records with schema validation while preserving ALL custom fields.
 */
export function normalizeAndValidateProducts(rawData) {
  let list = [];

  if (Array.isArray(rawData)) {
    list = rawData;
  } else if (rawData && typeof rawData === 'object') {
    if (Array.isArray(rawData.products)) list = rawData.products;
    else if (Array.isArray(rawData.items)) list = rawData.items;
    else if (Array.isArray(rawData.data)) list = rawData.data;
    else if (Array.isArray(rawData.catalog)) list = rawData.catalog;
    else if (rawData.name || rawData.title) {
      list = [rawData];
    } else {
      throw new Error('Product file must contain an array of products or an object with a "products" array.');
    }
  } else {
    throw new Error('Invalid product data structure. Expected an array or object containing products.');
  }

  const validProducts = [];
  const invalidProducts = [];
  const errors = [];

  list.forEach((raw, idx) => {
    const index = idx + 1;
    const itemErrors = [];

    if (!raw || typeof raw !== 'object') {
      invalidProducts.push({
        raw,
        index,
        errors: [`Item #${index} is not a valid product object.`]
      });
      return;
    }

    const name = String(raw.name || raw.title || '').trim();
    if (!name) itemErrors.push('Product name is required.');

    // Category: default to gold if completely omitted
    let category = '';
    if (raw.category !== undefined && raw.category !== null) {
      category = String(raw.category).trim().toLowerCase();
    } else if (raw.cat !== undefined && raw.cat !== null) {
      category = String(raw.cat).trim().toLowerCase();
    } else {
      category = 'gold';
    }
    if (!category) itemErrors.push('Product category is required.');

    // Price & MRP
    const priceNum = raw.price !== undefined && raw.price !== '' ? Number(raw.price) : NaN;
    if (isNaN(priceNum) || priceNum < 0) {
      itemErrors.push('Price must be a valid non-negative number.');
    }

    let mrpNum = raw.mrp !== undefined && raw.mrp !== '' ? Number(raw.mrp) : priceNum;
    if (isNaN(mrpNum) || mrpNum < priceNum) {
      mrpNum = priceNum;
    }

    // Stock
    let stockNum = 10;
    if (raw.stock !== undefined && raw.stock !== '') {
      const s = parseInt(raw.stock, 10);
      if (isNaN(s) || s < 0) {
        itemErrors.push('Stock quantity must be a non-negative integer.');
      } else {
        stockNum = s;
      }
    }

    // Slug: Keep provided slug or generate from name
    const rawSlug = String(raw.slug || '').trim();
    const cleanSlug = rawSlug ? slugify(rawSlug) : slugify(name);
    if (!cleanSlug && name) {
      itemErrors.push('A valid URL slug could not be derived from the product name.');
    }

    // SKU
    const sku = String(raw.sku || raw.id || '').trim();

    // ID: preserve provided id if present
    const id = raw.id ? String(raw.id).trim() : null;

    // Images: parse array or comma/newline separated string
    let images = [];
    if (Array.isArray(raw.images)) {
      images = raw.images
        .map(img => (img != null ? (typeof img === 'string' ? img.trim() : (img?.url || String(img)).trim()) : ''))
        .filter(img => img && img !== 'null' && img !== 'undefined');
    } else if (typeof raw.images === 'string') {
      images = raw.images
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(img => img && img !== 'null' && img !== 'undefined');
    } else if (raw.image) {
      const s = String(raw.image).trim();
      if (s && s !== 'null' && s !== 'undefined') images = [s];
    }

    // Specifications: support array or object { label: value }
    let specifications = [];
    if (Array.isArray(raw.specifications)) {
      specifications = raw.specifications.map((s, sIdx) => {
        if (!s) return null;
        if (typeof s === 'string') {
          const parts = s.split(/[:=]/);
          return {
            id: `spec-${sIdx}`,
            label: (parts[0] || '').trim(),
            value: (parts.slice(1).join(':') || '').trim(),
            enabled: true,
            order: sIdx
          };
        }
        return {
          id: s.id || `spec-${sIdx}`,
          label: String(s.label || s.key || s.name || '').trim(),
          value: String(s.value !== undefined ? s.value : (s.val || '')).trim(),
          enabled: s.enabled !== false,
          order: s.order !== undefined && !isNaN(s.order) ? Number(s.order) : sIdx
        };
      }).filter(s => s && (s.label || s.value));
    } else if (raw.specs && typeof raw.specs === 'object') {
      specifications = Object.entries(raw.specs).map(([label, value], sIdx) => ({
        id: `spec-${sIdx}`,
        label: String(label).trim(),
        value: typeof value === 'object' ? JSON.stringify(value) : String(value).trim(),
        enabled: true,
        order: sIdx
      }));
    }

    // Product Benefits
    let productBenefits = [];
    if (Array.isArray(raw.productBenefits)) {
      productBenefits = raw.productBenefits.map((b, bIdx) => ({
        id: b.id || `benefit-${bIdx}`,
        title: String(b.title || '').trim(),
        icon: String(b.icon || 'ShieldCheck').trim(),
        description: String(b.description || '').trim(),
        enabled: b.enabled !== false,
        order: b.order !== undefined ? Number(b.order) : bIdx
      })).filter(b => b.title);
    }

    // Reviews if provided
    let reviewsList = [];
    if (Array.isArray(raw.reviews)) {
      reviewsList = raw.reviews.map((r, rIdx) => {
        if (!r) return null;
        if (typeof r === 'string') {
          return {
            id: `rev-${rIdx}-${Math.random().toString(36).slice(2, 6)}`,
            reviewerName: 'Verified Customer',
            rating: 5,
            title: '',
            comment: r.trim(),
            verifiedPurchase: true
          };
        }
        const ratingNum = Number(r.rating || r.stars || r.score);
        return {
          id: r.id || `rev-${rIdx}-${Math.random().toString(36).slice(2, 6)}`,
          reviewerName: String(r.reviewerName || r.author || r.name || 'Verified Customer').trim(),
          rating: isNaN(ratingNum) ? 5 : Math.min(5, Math.max(1, ratingNum)),
          title: String(r.title || '').trim(),
          comment: String(r.comment || r.review || r.text || '').trim(),
          verifiedPurchase: r.verifiedPurchase !== false,
          date: r.date || r.createdAt || null
        };
      }).filter(r => r && (r.comment || r.title));
    }

    // Normalized Product Object:
    // IMPORTANT: Spread `...raw` first to PRESERVE ALL ORIGINAL / CUSTOM FIELDS
    const normalized = {
      ...raw,
      ...(id ? { id } : {}),
      name,
      slug: cleanSlug,
      sku: sku || undefined,
      category,
      gender: String(raw.gender || 'women').toLowerCase(),
      collection: String(raw.collection || 'trending').toLowerCase(),
      metal: String(raw.metal || raw.metalComposition || '').trim(),
      stone: String(raw.stone || raw.stoneDetails || '').trim(),
      purity: String(raw.purity || raw.goldPurity || '').trim(),
      weight: String(raw.weight || '').trim(),
      size: String(raw.size || raw.productSize || '').trim(),
      price: priceNum,
      mrp: mrpNum,
      stock: stockNum,
      description: extractDescription(raw),
      images,
      badge: String(raw.badge || (raw.isBestseller || raw.bestseller ? 'Bestseller' : '')).trim(),
      bestseller: Boolean(raw.bestseller || raw.isBestseller),
      featured: Boolean(raw.featured || raw.isFeatured),
      newArrival: Boolean(raw.newArrival || raw.isNewArrival),
      video: String(raw.video || '').trim(),
      seoTitle: String(raw.seoTitle || `${name} | MikuMantra Fine Jewellery`).trim(),
      seoDescription: String(raw.seoDescription || (raw.description ? String(raw.description).slice(0, 155) : '')).trim(),
      specifications,
      productBenefits,
      ...(reviewsList.length > 0 ? { extractedReviews: reviewsList } : {}),
      _originalIndex: index,
      _hasProvidedImages: images.length > 0
    };

    if (itemErrors.length > 0) {
      invalidProducts.push({
        raw,
        normalized,
        index,
        errors: itemErrors
      });
      errors.push(`Product #${index} (${name || 'Unnamed'}): ${itemErrors.join(' ')}`);
    } else {
      validProducts.push(normalized);
    }
  });

  return {
    validProducts,
    invalidProducts,
    totalCount: list.length,
    validCount: validProducts.length,
    invalidCount: invalidProducts.length,
    errors
  };
}
