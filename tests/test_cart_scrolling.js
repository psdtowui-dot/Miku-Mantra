import fs from 'fs';
import path from 'path';

console.log('==================================================');
console.log('VERIFYING INDEPENDENT CART PRODUCT LIST SCROLLING');
console.log('==================================================\n');

let allPassed = true;
function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    allPassed = false;
  }
}

// 1. Inspect app/globals.css for custom scrollbar and fixed layout rules
const globalsCss = fs.readFileSync(path.resolve('app/globals.css'), 'utf-8');

assert(
  globalsCss.includes('body.cart-fixed-layout'),
  'globals.css defines body.cart-fixed-layout to lock page height and body scrolling on desktop'
);

assert(
  globalsCss.includes('overflow: hidden !important') && globalsCss.includes('height: 100vh !important'),
  'body.cart-fixed-layout enforces overflow: hidden and height: 100vh'
);

assert(
  globalsCss.includes('body.cart-fixed-layout footer') && globalsCss.includes('display: none !important'),
  'body.cart-fixed-layout hides footer on desktop to prevent below-the-fold body scrolling'
);

assert(
  globalsCss.includes('.cart-product-scrollbar'),
  'globals.css defines .cart-product-scrollbar utility class'
);

assert(
  globalsCss.includes('overscroll-behavior: contain'),
  'cart-product-scrollbar includes overscroll-behavior: contain to prevent scroll chaining to window'
);

assert(
  globalsCss.includes('-webkit-overflow-scrolling: touch'),
  'cart-product-scrollbar supports iOS/mobile touch scrolling momentum'
);

assert(
  globalsCss.includes('rgba(156, 107, 48'),
  'cart-product-scrollbar uses brand gold/bronze theme color'
);

// 2. Inspect app/cart/page.js
const cartPage = fs.readFileSync(path.resolve('app/cart/page.js'), 'utf-8');

assert(
  cartPage.includes('headerHeight') && cartPage.includes('setHeaderHeight'),
  'cart/page.js dynamically measures header height'
);

assert(
  cartPage.includes('cart-fixed-layout'),
  'cart/page.js toggles cart-fixed-layout on document.body for desktop viewports'
);

assert(
  cartPage.includes('lg:h-[calc(100dvh-5rem)]') || cartPage.includes('calc(100vh - ${headerHeight}px)'),
  'cart/page.js main viewport height is constrained to available viewport height accounting for header'
);

assert(
  cartPage.includes('lg:overflow-hidden'),
  'cart/page.js main tag has lg:overflow-hidden preventing unwanted desktop page scroll'
);

assert(
  cartPage.includes('lg:col-span-2 flex flex-col lg:h-full lg:min-h-0 lg:overflow-hidden'),
  'Left column is a flex column with min-h-0 taking full grid height'
);

assert(
  cartPage.includes('freeEnabled && subtotal > 0') && cartPage.includes('shrink-0'),
  'Free shipping progress bar has shrink-0 anchoring it at the top of the left column'
);

assert(
  cartPage.includes('flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1.5 sm:pr-2.5 space-y-3 sm:space-y-4 cart-product-scrollbar'),
  'Product list wrapper has flex-1, min-h-0, overflow-y-auto, overscroll-contain, and cart-product-scrollbar'
);

assert(
  cartPage.includes('lg:col-span-1 lg:self-start lg:sticky lg:top-0'),
  'Order Summary aside column is fixed / sticky on the right side and self-aligns without stretching'
);

assert(
  cartPage.includes('max-h-[520px] sm:max-h-[600px] lg:max-h-none'),
  'Product list handles smaller mobile screens responsively with clean max-height'
);

// 3. HTTP API & Page Rendering Check
console.log('\n--- Checking HTTP Server Response ---');
try {
  const res = await fetch('http://localhost:3000/cart');
  assert(res.status === 200, `GET /cart returns 200 OK (received ${res.status})`);
  const html = await res.text();
  assert(html.includes('Your bag awaits'), 'SSR correctly renders empty cart state when no client session is passed');
  assert(cartPage.includes('Shopping Bag') && cartPage.includes('Your Selection'), 'Cart component defines Shopping Bag heading for populated cart');
  assert(cartPage.includes('cart-product-scrollbar'), 'Cart component implements cart-product-scrollbar on product list');
} catch (e) {
  console.error('Failed to connect to local server:', e.message);
  allPassed = false;
}

console.log('\n==================================================');
if (allPassed) {
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('==================================================');
  process.exit(0);
} else {
  console.error('SOME VERIFICATIONS FAILED!');
  console.log('==================================================');
  process.exit(1);
}
