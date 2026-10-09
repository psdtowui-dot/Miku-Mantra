import assert from 'assert';
import { validateCouponRules } from '../lib/cart-pricing.js';

async function runTests() {
  console.log('\n=========================================');
  console.log('RUNNING COUPON SYSTEM UNIT & INTEGRATION TESTS');
  console.log('=========================================\n');

  let passed = 0;

  // --- UNIT TESTS FOR validateCouponRules ---
  console.log('--- SECTION 1: UNIT TESTS ---');

  // Test 1: Valid percentage coupon
  const p1 = validateCouponRules({
    id: 'c1',
    code: 'SAVE20',
    active: true,
    type: 'percent',
    value: 20
  }, 5000);
  assert.strictEqual(p1.valid, true);
  assert.strictEqual(p1.discount, 1000);
  assert.strictEqual(p1.code, 'SAVE20');
  console.log('[PASS] Unit 1: Percentage discount calculation (20% of 5000 = 1000)');
  passed++;

  // Test 2: Valid flat coupon with minOrder met
  const p2 = validateCouponRules({
    id: 'c2',
    code: 'FLAT500',
    active: true,
    type: 'flat',
    value: 500,
    minOrder: 2000
  }, 3000);
  assert.strictEqual(p2.valid, true);
  assert.strictEqual(p2.discount, 500);
  console.log('[PASS] Unit 2: Flat discount calculation (₹500 off on ₹3000)');
  passed++;

  // Test 3: Minimum order requirement not met
  const p3 = validateCouponRules({
    id: 'c3',
    code: 'MIN1000',
    active: true,
    type: 'flat',
    value: 200,
    minOrder: 1000
  }, 800);
  assert.strictEqual(p3.valid, false);
  assert.strictEqual(p3.reason, 'MINIMUM_PURCHASE_NOT_MET');
  assert.strictEqual(p3.discount, 0);
  console.log('[PASS] Unit 3: Minimum order requirement enforced (800 < 1000)');
  passed++;

  // Test 4: Inactive coupon
  const p4 = validateCouponRules({
    id: 'c4',
    code: 'INACTIVE',
    active: false,
    value: 100
  }, 5000);
  assert.strictEqual(p4.valid, false);
  assert.strictEqual(p4.reason, 'COUPON_INACTIVE');
  console.log('[PASS] Unit 4: Inactive coupon rejected');
  passed++;

  // Test 5: Expired coupon (past endDate)
  const p5 = validateCouponRules({
    id: 'c5',
    code: 'EXPIRED1',
    active: true,
    value: 100,
    endDate: new Date(Date.now() - 86400000).toISOString()
  }, 5000);
  assert.strictEqual(p5.valid, false);
  assert.strictEqual(p5.reason, 'COUPON_EXPIRED');
  console.log('[PASS] Unit 5: Expired coupon (endDate) rejected');
  passed++;

  // Test 6: Expired coupon (past expiresAt)
  const p6 = validateCouponRules({
    id: 'c6',
    code: 'EXPIRED2',
    active: true,
    value: 100,
    expiresAt: new Date(Date.now() - 3600000).toISOString()
  }, 5000);
  assert.strictEqual(p6.valid, false);
  assert.strictEqual(p6.reason, 'COUPON_EXPIRED');
  console.log('[PASS] Unit 6: Expired coupon (expiresAt) rejected');
  passed++;

  // Test 7: Future coupon not yet active (startDate)
  const p7 = validateCouponRules({
    id: 'c7',
    code: 'FUTURE',
    active: true,
    value: 100,
    startDate: new Date(Date.now() + 86400000).toISOString()
  }, 5000);
  assert.strictEqual(p7.valid, false);
  assert.strictEqual(p7.reason, 'COUPON_NOT_STARTED');
  console.log('[PASS] Unit 7: Future coupon (not yet started) rejected');
  passed++;

  // Test 8: Usage limit exceeded
  const p8 = validateCouponRules({
    id: 'c8',
    code: 'LIMITED',
    active: true,
    value: 100,
    usageLimit: 10,
    usedCount: 10
  }, 5000);
  assert.strictEqual(p8.valid, false);
  assert.strictEqual(p8.reason, 'USAGE_LIMIT_EXCEEDED');
  console.log('[PASS] Unit 8: Usage limit exceeded rejected');
  passed++;

  // Test 9: Max discount cap
  const p9 = validateCouponRules({
    id: 'c9',
    code: 'BIGDISCOUNT',
    active: true,
    type: 'percent',
    value: 50,
    maxDiscount: 2000
  }, 10000);
  assert.strictEqual(p9.valid, true);
  assert.strictEqual(p9.discount, 2000); // 50% of 10000 is 5000, capped at 2000
  console.log('[PASS] Unit 9: Max discount cap applied (5000 capped to 2000)');
  passed++;

  // Test 10: Discount capped at subtotal (cannot exceed cart total)
  const p10 = validateCouponRules({
    id: 'c10',
    code: 'SUPERFLAT',
    active: true,
    type: 'flat',
    value: 5000
  }, 3000);
  assert.strictEqual(p10.valid, true);
  assert.strictEqual(p10.discount, 3000); // cannot exceed subtotal
  console.log('[PASS] Unit 10: Discount capped at cart subtotal');
  passed++;

  // --- SECTION 2: HTTP API INTEGRATION TESTS ---
  console.log('\n--- SECTION 2: HTTP API INTEGRATION TESTS (PORT 3000) ---');
  const BASE_URL = 'http://localhost:3000/api';

  // Test 11: HTTP POST /api/coupons/validate with MIKUMANTRA10 and ₹7,06,000 subtotal
  const res11 = await fetch(`${BASE_URL}/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'MIKUMANTRA10', subtotal: 706000 })
  });
  assert.strictEqual(res11.status, 200);
  const data11 = await res11.json();
  assert.strictEqual(data11.valid, true);
  assert.strictEqual(data11.code, 'MIKUMANTRA10');
  assert.strictEqual(data11.type, 'percent');
  assert.strictEqual(data11.discount, 70600);
  console.log('[PASS] API 11: POST /api/coupons/validate MIKUMANTRA10 with subtotal ₹7,06,000 -> 200 OK, discount ₹70,600');
  passed++;

  // Test 12: HTTP POST /api/coupons/validate with WELCOME2000 (minOrder 10000)
  const res12 = await fetch(`${BASE_URL}/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'WELCOME2000', subtotal: 20000 })
  });
  assert.strictEqual(res12.status, 200);
  const data12 = await res12.json();
  assert.strictEqual(data12.valid, true);
  assert.strictEqual(data12.discount, 2000);
  console.log('[PASS] API 12: POST /api/coupons/validate WELCOME2000 (subtotal ₹20,000) -> 200 OK, discount ₹2,000');
  passed++;

  // Test 13: HTTP POST /api/coupons/validate with WELCOME2000 subtotal below minOrder
  const res13 = await fetch(`${BASE_URL}/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'WELCOME2000', subtotal: 4000 })
  });
  assert.strictEqual(res13.status, 400);
  const data13 = await res13.json();
  assert.ok(data13.error.includes('10,000') || data13.error.includes('minimum'));
  console.log('[PASS] API 13: POST /api/coupons/validate WELCOME2000 with subtotal ₹4,000 < ₹10,000 -> 400 Bad Request');
  passed++;

  // Test 14: HTTP POST /api/coupons/validate with inactive coupon (SUMMER2023)
  const res14 = await fetch(`${BASE_URL}/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'SUMMER2023', subtotal: 50000 })
  });
  assert.ok(res14.status === 400 || res14.status === 404);
  console.log('[PASS] API 14: POST /api/coupons/validate inactive coupon (SUMMER2023) -> 404/400 rejected');
  passed++;

  // Test 15: HTTP POST /api/coupons/validate with non-existent coupon
  const res15 = await fetch(`${BASE_URL}/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'FAKE_CODE_XYZ', subtotal: 50000 })
  });
  assert.strictEqual(res15.status, 404);
  console.log('[PASS] API 15: POST /api/coupons/validate non-existent coupon -> 404 Not Found');
  passed++;

  // Test 16: HTTP POST /api/cart/pricing with coupon calculation
  const res16 = await fetch(`${BASE_URL}/cart/pricing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ id: 'p1', name: 'Ring', price: 100000, qty: 1 }],
      coupon: 'MIKUMANTRA10'
    })
  });
  assert.strictEqual(res16.status, 200);
  const data16 = await res16.json();
  assert.strictEqual(data16.subtotal, 100000);
  assert.strictEqual(data16.discount, 10000);
  assert.strictEqual(data16.couponValid, true);
  assert.strictEqual(data16.couponCode, 'MIKUMANTRA10');
  console.log('[PASS] API 16: POST /api/cart/pricing with MIKUMANTRA10 -> Subtotal ₹1,00,000, Discount ₹10,000 verified');
  passed++;

  console.log('\n=========================================');
  console.log(`ALL ${passed}/${passed} TESTS PASSED SUCCESSFULLY!`);
  console.log('=========================================\n');
}

runTests().catch(err => {
  console.error('\n[FAIL] Test suite failed:', err);
  process.exit(1);
});
